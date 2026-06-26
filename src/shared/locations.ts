import type { EksimLocation } from './types'

/**
 * Eksim Holding tesis verisi (placeholder).
 *
 * `svgPoint` değerleri, turkey.svg'nin kendi gömülü kalibrasyon noktalarından
 * türetilen Web Mercator projeksiyonuyla (bkz. svgMapService) hesaplandı →
 * haritanın KESİN koordinat uzayına oturur, sapmaz. Marker'lar SVG içinde bu
 * noktaya çizildiği için her çözünürlükte haritayla birlikte ölçeklenir.
 *
 * Video çözümü (IVideoSource): önce lokal `videoId`.mp4, yoksa `videoUrl`
 * (çevrimiçi), o da yoksa global fallback. Şu an lokal video yok; çevrimiçi
 * örnek fon videolarıyla test edilir.
 */
export const EKSIM_LOCATIONS: EksimLocation[] = [
  {
    id: 'izmir-res',
    name: 'İzmir Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: 'Ege kıyısında yüksek kapasiteli rüzgâr enerjisi üretim sahası.',
    coordinates: [27.1428, 38.4237],
    svgPoint: { x: 116, y: 247 },
    videoUrl: 'https://filesamples.com/samples/video/mp4/sample_640x360.mp4'
  },
  {
    id: 'konya-ges',
    name: 'Konya Güneş Enerji Santrali',
    sector: 'energy',
    description: 'İç Anadolu güneş kuşağında geniş ölçekli fotovoltaik tesis.',
    coordinates: [32.4846, 37.8716],
    svgPoint: { x: 370, y: 280 },
    videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4'
  },
  {
    id: 'bandirma-gida',
    name: 'Bandırma Gıda Üretim Tesisi',
    sector: 'food',
    description: 'Marmara lojistik hattında entegre gıda işleme ve paketleme.',
    coordinates: [27.977, 40.3521],
    svgPoint: { x: 155, y: 130 },
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  }
]

/** Hiçbir lokal/online kaynak yoksa son çare döngü videosu (çevrimiçi). */
export const FALLBACK_VIDEO_URL = 'https://download.samplelib.com/mp4/sample-5s.mp4'

/** id ile hızlı erişim için yardımcı. */
export function findLocationById(id: string): EksimLocation | undefined {
  return EKSIM_LOCATIONS.find((loc) => loc.id === id)
}
