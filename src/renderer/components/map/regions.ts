import type { EksimLocation } from '@shared/types'
import { TR_PROVINCES, type TrProvinceBBox } from './trProvinces'

/**
 * Harita "detay bölgesi" — pin sıkışıklığı yaşanan, birden fazla ili kapsayan
 * ve ana haritada tek bir KÜMEYE indirgenen coğrafi grup. Kümeye dokununca
 * bölge, ana haritadan bağımsız büyütülmüş bir pencerede açılır (bkz.
 * RegionDetailOverlay) — böylece figürlerin temas alanı için pinler yeterince
 * ayrık gösterilir; ana haritaya zoom eklenmez (koordinatlar sabit kalır).
 */
export interface MapRegion {
  id: string
  name: string
  description: string
  /** Kümeyi/pencereyi oluşturan iller (simplemaps kodları, bkz. trProvinces.ts). */
  provinceIds: string[]
}

/** Bir bölgenin küme olarak gösterilmesi için gereken minimum görünür pin. */
export const REGION_MIN_CLUSTER = 2

/**
 * Tanımlı detay bölgeleri. İlk etap yalnızca Güneydoğu Anadolu (Dicle Grubu'nun
 * 6 il dağıtım noktası + aynı bölgedeki enerji noktaları). Yeni bölge eklemek
 * için buraya bir kayıt eklemek yeterli — kümeleme/pencere otomatik çalışır.
 */
export const MAP_REGIONS: MapRegion[] = [
  {
    id: 'guneydogu',
    name: 'Güneydoğu Anadolu',
    description:
      "Dicle Grubu'nun elektrik dağıtım hizmet bölgesi ile bölgedeki enerji yatırımlarının yoğunlaştığı alan. Sıkışık pinler, ayrık gösterim için bölge penceresinde açılır.",
    provinceIds: ['TR21', 'TR63', 'TR47', 'TR72', 'TR56', 'TR73']
  }
]

/** Bir bölgenin üye illerinin sınır kutularının birleşimi (padding'li). */
export function regionBBox(region: MapRegion, pad = 12): TrProvinceBBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const id of region.provinceIds) {
    const province = TR_PROVINCES[id]
    if (!province) continue
    const { x, y, width, height } = province.bbox
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + width)
    maxY = Math.max(maxY, y + height)
  }
  return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 }
}

/** Bölgenin (padding'siz bbox) merkez noktası — küme rozeti/popup çıpası. */
export function regionCenter(region: MapRegion): { x: number; y: number } {
  const b = regionBBox(region, 0)
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

export interface RegionClusterData {
  region: MapRegion
  members: EksimLocation[]
}

export interface RegionPartition {
  /** Küme eşiğini geçen bölgeler (üyeleri ana haritadan gizlenir, kümeye toplanır). */
  clusters: RegionClusterData[]
  /** Hiçbir aktif kümeye ait olmayan, normal gösterilecek pinler. */
  loose: EksimLocation[]
}

/**
 * Görünür pinleri (sektör filtresi zaten uygulanmış) detay bölgelerine göre
 * ayırır: eşiği (REGION_MIN_CLUSTER) geçen bölgeler küme olur ve üyeleri
 * `loose`'tan çıkarılır; eşiği geçmeyen bölgelerin üyeleri normal pin olarak
 * kalır (tek pin → sıkışıklık yok → küme yok, kullanıcı kararı).
 */
export function partitionVisible(visible: EksimLocation[]): RegionPartition {
  const claimed = new Set<string>()
  const clusters: RegionClusterData[] = []
  for (const region of MAP_REGIONS) {
    const members = visible.filter((loc) => region.provinceIds.includes(loc.provinceId))
    if (members.length >= REGION_MIN_CLUSTER) {
      clusters.push({ region, members })
      for (const m of members) claimed.add(m.id)
    }
  }
  const loose = visible.filter((loc) => !claimed.has(loc.id))
  return { clusters, loose }
}
