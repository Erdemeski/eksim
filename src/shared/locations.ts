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
 * (çevrimiçi), o da yoksa global fallback.
 *
 * `videoId` = `src/renderer/assets/videos/` altındaki dosyanın uzantısız adı
 * (örn. `geyve.mp4` → `'geyve'`). Dosyayı klasöre atmak yeterli; kod değişmeden
 * otomatik yerelden oynar. Dosya henüz eklenmediyse `videoUrl` (çevrimiçi yedek)
 * devreye girer. Kiosk çevrimdışı çalışacaksa her tesise yerel mp4 önerilir.
 */
export const EKSIM_LOCATIONS: EksimLocation[] = [
  {
    id: 'ovacık-res',
    name: 'Ovacık Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: 'Ege kıyısında yüksek kapasiteli rüzgâr enerjisi üretim sahası.',
    coordinates: [39.1138, 27.2351],
    svgPoint: { x: 116, y: 200 },
    // Yerel için: src/renderer/assets/videos/ovacık.mp4 ekleyin (videoId aktif).
    videoId: 'ovacık',
    videoUrl: ''
  },
  {
    id: 'seferihisar-res',
    name: 'İzmir Seferihisar Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: 'Ege kıyısında yüksek kapasiteli rüzgâr enerjisi üretim sahası.',
    coordinates: [38.1657, 26.8665],
    svgPoint: { x: 110, y: 260 },
    // Yerel için: src/renderer/assets/videos/seferihisar.mp4 ekleyin (videoId aktif).
    videoId: 'seferihisar',
    videoUrl: ''
  },
  {
    id: 'viransehir-ges',
    name: 'Şanlıurfa Viranşehir Güneş Enerjisi Santrali',
    sector: 'energy',
    description: 'Güneydoğu anadolu bölgesinde yüksek kapasiteli güneş enerjisi üretim sahası.',
    coordinates: [37.2138, 39.7342],
    svgPoint: { x: 710, y: 310 },
    // Yerel için: src/renderer/assets/videos/viranşehir.mp4 ekleyin (videoId aktif).
    videoId: 'viranşehir',
    videoUrl: ''
  },
  {
    id: 'geyve-res',
    name: 'Geyve Rüzgar Enerjisi Santrali',
    sector: 'energy',
    description: "Sakarya'nın Geyve ilçesinde yer alan ve Eksim Enerji tarafından işletilen, Türkiye'nin önemli yenilenebilir enerji tesislerinden biridir.",
    coordinates: [40.5363, 30.3537],
    svgPoint: { x: 270, y: 123 },
    // Yerel: src/renderer/assets/videos/geyve.mp4 (mevcut).
    videoId: 'geyve'
  },
  {
    id: 'uzundere-hes',
    name: 'Uzundere Hidroelektrik Santrali',
    sector: 'energy',
    description: "Rize'nin Çayeli ilçesinde bulunan toplam 63 MW kurulu güce sahip bir hidroelektrik santralidir.",
    coordinates: [40.5845, 41.6168],
    svgPoint: { x: 800, y: 140 },
    // Yerel için: src/renderer/assets/videos/uzundere.mp4 ekleyin (videoId aktif).
    videoId: 'uzundere',
    videoUrl: ''
  },
/*   {
    id: 'bandirma-gida',
    name: 'Bandırma Gıda Üretim Tesisi',
    sector: 'food',
    description: 'Marmara lojistik hattında entegre gıda işleme ve paketleme.',
    coordinates: [27.977, 40.3521],
    svgPoint: { x: 155, y: 130 },
    // Yerel için: src/renderer/assets/videos/bandirma.mp4 ekleyin (videoId aktif).
    videoId: 'bandirma',
    videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  } */
]

/**
 * Global fallback videosu (hiçbir tesis aktif değilken veya kaynak
 * yüklenemediğinde). Diğer videoId'lerle aynı kurala tabi: önce
 * `src/renderer/assets/videos/eksim.mp4` yerelden aranır (bkz. LocalMp4Source),
 * bulunamazsa aşağıdaki online URL'e düşülür.
 */
export const FALLBACK_VIDEO_ID = 'eksim'
/** Yerel eksim.mp4 yoksa son çare döngü videosu (çevrimiçi). */
export const FALLBACK_VIDEO_URL = 'https://download.samplelib.com/mp4/sample-5s.mp4'

/** id ile hızlı erişim için yardımcı. */
export function findLocationById(id: string): EksimLocation | undefined {
  return EKSIM_LOCATIONS.find((loc) => loc.id === id)
}
