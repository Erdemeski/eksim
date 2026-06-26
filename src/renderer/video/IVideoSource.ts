import type { EksimLocation } from '@shared/types'
import { FALLBACK_VIDEO_URL } from '@shared/locations'

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
}

/**
 * İki yöntemli çözüm (kullanıcı isteği):
 *   1) Tesise ait LOKAL statik mp4 paketlenmişse onu kullan.
 *   2) Yoksa tesiste tanımlı ÇEVRİMİÇİ videoUrl varsa onu kullan.
 *   3) Hiçbiri yoksa global fallback'e döngüyle düş.
 *
 * Lokal videolar `src/renderer/assets/videos/<videoId>.mp4` altına konur ve
 * Vite tarafından derleme zamanı keşfedilir (manifest). Şu an klasör boş →
 * doğal olarak çevrimiçi URL'lere düşülür.
 */
export class LocalMp4Source implements IVideoSource {
  private readonly localManifest: Record<string, string>

  constructor() {
    // Eager glob → { '../assets/videos/izmir-res.mp4': '/assets/...url' }
    const modules = import.meta.glob('../assets/videos/*.mp4', {
      eager: true,
      query: '?url',
      import: 'default'
    }) as Record<string, string>

    this.localManifest = {}
    for (const [path, url] of Object.entries(modules)) {
      const base = path.split('/').pop()?.replace(/\.mp4$/, '')
      if (base) this.localManifest[base] = url
    }
  }

  resolve(location: EksimLocation | null): ResolvedVideo {
    if (location?.videoId && this.localManifest[location.videoId]) {
      return { src: this.localManifest[location.videoId], kind: 'local', loop: true }
    }
    if (location?.videoUrl) {
      return { src: location.videoUrl, kind: 'remote', loop: true }
    }
    return { src: FALLBACK_VIDEO_URL, kind: 'fallback', loop: true }
  }
}
