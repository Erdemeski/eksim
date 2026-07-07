import type { EksimLocation } from '@shared/types'
import { FALLBACK_VIDEO_ID, FALLBACK_VIDEO_URL } from '@shared/locations'

/** Çözümlenmiş video kaynağının türü (kaynak önceliği için). */
export type VideoKind = 'local' | 'remote' | 'fallback'

export interface ResolvedVideo {
  src: string
  kind: VideoKind
  loop: boolean
}

/**
 * Bir tesis için oynatılacak videoyu çözen soyutlama. Bugün yalnızca
 * LocalMp4Source var; ileride HLS/WebRTC kaynağı aynı arayüzle eklenebilir
 * (Open/Closed) — VideoScreen kaynağın somut türünü bilmez.
 */
export interface IVideoSource {
  resolve(location: EksimLocation | null): ResolvedVideo
  /** Hiçbir tesis kaynağı yokken/başarısızken kullanılacak global fallback. */
  resolveFallback(): ResolvedVideo
}

/**
 * `videoId`'yi manifest anahtarına indirger: dizin yolunu at, `.mp4` uzantısını
 * temizle. Böylece `'geyve'`, `'geyve.mp4'` ve `'src/.../geyve.mp4'` aynı
 * anahtara (`'geyve'`) çözülür — sık yapılan tam-yol hatasına dayanıklı.
 */
function normalizeVideoId(value: string): string {
  return value.split(/[\\/]/).pop()?.replace(/\.mp4$/i, '') ?? ''
}

/**
 * İki yöntemli çözüm (kullanıcı isteği):
 *   1) Tesise ait LOKAL statik mp4 paketlenmişse onu kullan.
 *   2) Yoksa tesiste tanımlı ÇEVRİMİÇİ videoUrl varsa onu kullan.
 *   3) Hiçbiri yoksa global fallback'e döngüyle düş.
 *
 * Lokal videolar `src/renderer/assets/videos/<videoId>.mp4` altına konur ve
 * Vite tarafından derleme zamanı keşfedilir (manifest). Klasördeki her dosya
 * uzantısız adıyla (örn. `geyve`) anahtarlanır; dosya yoksa çevrimiçi URL'ye
 * ya da global fallback'e düşülür.
 */
export class LocalMp4Source implements IVideoSource {
  private readonly localManifest: Record<string, string>

  constructor() {
    // Eager glob → { '../assets/videos/geyve.mp4': '/assets/...url' }
    const modules = import.meta.glob('../assets/videos/*.mp4', {
      eager: true,
      query: '?url',
      import: 'default'
    }) as Record<string, string>

    this.localManifest = {}
    for (const [path, url] of Object.entries(modules)) {
      const base = normalizeVideoId(path)
      if (base) this.localManifest[base] = url
    }
  }

  resolve(location: EksimLocation | null): ResolvedVideo {
    // videoId hem 'geyve', hem 'geyve.mp4', hem tam yol olarak verilebilir →
    // normalize edip manifest anahtarıyla (uzantısız dosya adı) eşle.
    const key = location?.videoId ? normalizeVideoId(location.videoId) : ''
    if (key && this.localManifest[key]) {
      return { src: this.localManifest[key], kind: 'local', loop: true }
    }
    if (location?.videoUrl) {
      return { src: location.videoUrl, kind: 'remote', loop: true }
    }
    return this.resolveFallback()
  }

  resolveFallback(): ResolvedVideo {
    // Global fallback da aynı öncelik zincirine tabi: yerel eksim.mp4 varsa
    // onu kullan (çevrimdışı bile çalışır), yoksa online URL'e düş.
    const local = this.localManifest[FALLBACK_VIDEO_ID]
    if (local) return { src: local, kind: 'fallback', loop: true }
    return { src: FALLBACK_VIDEO_URL, kind: 'fallback', loop: true }
  }
}
