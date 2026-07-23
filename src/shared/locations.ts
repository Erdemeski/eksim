import type { EksimLocation } from './types'

/**
 * Eksim Holding'in harita üzerindeki proje/tesis portföyü.
 *
 * Enerji Grubu (sector: 'energy'): Eksim Enerji'nin gerçek santral portföyü
 * (araştırılmış, güncel liste). Dicle Grubu ve Gıda Grubu (sector: 'dicle' |
 * 'food') bölümleri ise dosyanın SONUNDA, ayrı başlıklar altında yer alan
 * TEMSİLİ (placeholder) noktalardır — gerçek proje verisi netleşince
 * güncellenmelidir (bkz. ilgili bölüm başındaki notlar).
 *
 * `coordinates` [boylam, enlem] (LngLat) sırasındadır — `svgPoint` KASITLI
 * OLARAK verilmez; konum, `svgMapService.projectLngLat`'in turkey.svg'nin
 * kendi gömülü kalibrasyon noktalarından türettiği Web Mercator projeksiyonuyla
 * OTOMATİK hesaplanır. Böylece tüm pinler TEK bir doğrulanabilir kaynaktan
 * (gerçek coğrafi koordinat) gelir; elle seçilmiş piksel tahmini yoktur.
 *
 * Video çözümü (IVideoSource): önce lokal `videoId`.mp4, yoksa `videoUrl`
 * (çevrimiçi), o da yoksa global fallback (`eksim.mp4`). `videoId` =
 * `src/renderer/assets/videos/` altındaki dosyanın uzantısız adı; dosyayı
 * klasöre atmak yeterli, kod değişmeden yerelden oynar.
 *
 * Kapasite alanları: `totalMw` = toplam (mevcut + planlanan) kurulu güç;
 * `capacities` = türe göre MEVCUT kırılım (RES/GES/HES); `additionalMw` =
 * "işlemde olan ilave kapasite artışı projesi" — rakamlar Eksim Enerji'nin
 * kendi proje listesinden birebir aktarılmıştır, aralarındaki aritmetik
 * ilişki (dolum/genişletme) yorumlanmadan olduğu gibi sunulur. `totalMw: 0`
 * (kapasite alanları olmadan) LocationPopup'ta MW bloklarının otomatik
 * gizlenmesini tetikler — bkz. Dicle/Gıda bölümleri.
 */
export const EKSIM_LOCATIONS: EksimLocation[] = [
  {
    id: 'edirne-malkoclar',
    name: 'Edirne Malkoçlar Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "Edirne'nin Uzunköprü ilçesinde, Trakya rüzgâr koridorunda yer alan santral.",
    coordinates: [26.75, 41.2],
    provinceId: 'TR22',
    kinds: ['wind'],
    totalMw: 80,
    capacities: [{ kind: 'wind', mw: 80 }],
    additionalMw: 80,
    // Yerel için: src/renderer/assets/videos/malkoclar.mp4 ekleyin (videoId aktif).
    videoId: 'malkoclar'
  },
  {
    // Küçükyayla + Tekir-1 + Tekir-2: aynı Vize/Kırklareli bölgesinde birbirine
    // çok yakın üç saha, haritada üst üste binip pin tetiklemesini bozuyordu →
    // tek pinde birleştirildi (bkz. `subprojects`, popup'ta isim bazlı rozet).
    id: 'kirklareli-kucukyayla-tekir',
    name: 'Kırklareli Küçükyayla, Tekir-1 ve Tekir-2 Rüzgâr Enerji Santralleri',
    sector: 'energy',
    description:
      "Kırklareli'nin Vize ilçesinde, birbirine yakın üç sahayı (Küçükyayla, Tekir-1, Tekir-2) tek başlıkta birleştiren rüzgâr enerjisi santrali grubu.",
    coordinates: [27.7067, 41.5967],
    provinceId: 'TR39',
    kinds: ['wind'],
    totalMw: 186,
    capacities: [{ kind: 'wind', mw: 186 }],
    additionalMw: 196,
    subprojects: [
      { name: 'Küçükyayla RES', mw: 32 },
      { name: 'Tekir-1 RES', mw: 42 },
      { name: 'Tekir-2 RES', mw: 112 }
    ],
    // Yerel için: src/renderer/assets/videos/kucukyayla-tekir.mp4 ekleyin (videoId aktif).
    videoId: 'kucukyayla-tekir'
  },
  {
    // Silivri + Karaincirli: aynı İstanbul batısı rüzgar koridorunda üst üste
    // binen iki saha → tek pinde birleştirildi.
    id: 'istanbul-silivri-karaincirli',
    name: 'İstanbul Silivri ve Karaincirli Rüzgâr Enerji Santralleri',
    sector: 'energy',
    description:
      "İstanbul'un batısında, Silivri ve Karaincirli sahalarını bir araya getiren rüzgâr enerjisi santrali grubu.",
    coordinates: [28.2734, 41.0968],
    provinceId: 'TR34',
    kinds: ['wind'],
    totalMw: 209,
    capacities: [{ kind: 'wind', mw: 108.8 }],
    additionalMw: 100.2,
    subprojects: [
      { name: 'Silivri RES', mw: 129 },
      { name: 'Karaincirli RES', mw: 80 }
    ],
    // Yerel için: src/renderer/assets/videos/silivri-karaincirli.mp4 ekleyin (videoId aktif).
    videoId: 'silivri-karaincirli'
  },
  {
    id: 'sakarya-geyve',
    name: 'Sakarya Geyve Rüzgâr Enerji Santrali',
    sector: 'energy',
    description:
      "Sakarya'nın Geyve ilçesinde yer alan ve Eksim Enerji tarafından işletilen, Türkiye'nin önemli yenilenebilir enerji tesislerinden biridir.",
    coordinates: [30.3537, 40.5363],
    provinceId: 'TR54',
    kinds: ['wind'],
    totalMw: 150.2,
    capacities: [{ kind: 'wind', mw: 150.2 }],
    // Yerel: src/renderer/assets/videos/geyve.mp4 (mevcut).
    videoId: 'geyve'
  },
  {
    id: 'eskisehir-idrisyayla',
    name: 'Eskişehir İdrisyayla Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "Eskişehir'in Seyitgazi ilçesinde geliştirilen rüzgâr enerjisi santrali projesi.",
    coordinates: [30.7167, 39.4667],
    provinceId: 'TR26',
    kinds: ['wind'],
    totalMw: 54,
    capacities: [{ kind: 'wind', mw: 0 }],
    additionalMw: 54,
    // Yerel için: src/renderer/assets/videos/idrisyayla.mp4 ekleyin (videoId aktif).
    videoId: 'idrisyayla'
  },
  {
    id: 'balikesir-susurluk',
    name: 'Balıkesir Susurluk Rüzgâr ve Güneş Enerji Santrali',
    sector: 'energy',
    description: "Balıkesir'in Susurluk ilçesinde rüzgâr ve güneş enerjisini bir arada üreten hibrit saha.",
    coordinates: [28.1575, 39.9083],
    provinceId: 'TR10',
    kinds: ['wind', 'solar'],
    totalMw: 81.8,
    capacities: [
      { kind: 'wind', mw: 75 },
      { kind: 'solar', mw: 5 }
    ],
    additionalMw: 6.8,
    // Yerel için: src/renderer/assets/videos/susurluk.mp4 ekleyin (videoId aktif).
    videoId: 'susurluk'
  },
  {
    id: 'izmir-seferihisar',
    name: 'İzmir Seferihisar Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "Ege kıyısında, İzmir'in Seferihisar ilçesinde yüksek kapasiteli üretim sahası.",
    coordinates: [26.8665, 38.1657],
    provinceId: 'TR35',
    kinds: ['wind'],
    totalMw: 27.8,
    capacities: [{ kind: 'wind', mw: 21 }],
    additionalMw: 6.8,
    // Yerel için: src/renderer/assets/videos/seferihisar.mp4 ekleyin (videoId aktif).
    videoId: 'seferihisar'
  },
  {
    id: 'izmir-ovacik',
    name: 'İzmir Ovacık Rüzgâr ve Güneş Enerji Santrali',
    sector: 'energy',
    description: "İzmir'in Bergama ilçesinde rüzgâr ve güneş enerjisini bir arada üreten hibrit santral.",
    coordinates: [27.2351, 39.1138],
    provinceId: 'TR35',
    kinds: ['wind', 'solar'],
    totalMw: 41.6,
    capacities: [
      { kind: 'wind', mw: 35.6 },
      { kind: 'solar', mw: 6 }
    ],
    additionalMw: 6.8,
    // Yerel için: src/renderer/assets/videos/ovacik.mp4 ekleyin (videoId aktif).
    videoId: 'ovacik'
  },
  {
    id: 'mugla-acar',
    name: 'Muğla Datça Acar Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "Muğla'nın Datça yarımadasında geliştirilen rüzgâr enerjisi santrali projesi.",
    coordinates: [27.75, 36.78],
    provinceId: 'TR48',
    kinds: ['wind'],
    totalMw: 29.7,
    capacities: [{ kind: 'wind', mw: 29.7 }],
    additionalMw: 29.7,
    // Yerel için: src/renderer/assets/videos/acar.mp4 ekleyin (videoId aktif).
    videoId: 'acar'
  },
  {
    // İmrahor + Alya-1: aynı Antalya bölgesinde üst üste binen iki güneş sahası
    // → tek pinde birleştirildi.
    id: 'antalya-imrahor-alya-1',
    name: 'Antalya İmrahor ve Alya-1 Güneş Enerji Santrali',
    sector: 'energy',
    description: "Antalya'da İmrahor ve Alya-1 sahalarını bir araya getiren güneş enerjisi santrali grubu.",
    coordinates: [30.3917, 36.95],
    provinceId: 'TR07',
    kinds: ['solar'],
    totalMw: 171,
    capacities: [{ kind: 'solar', mw: 171 }],
    additionalMw: 171,
    subprojects: [
      { name: 'İmrahor GES', mw: 36 },
      { name: 'Alya-1 GES', mw: 135 }
    ],
    // Yerel için: src/renderer/assets/videos/imrahor-alya1.mp4 ekleyin (videoId aktif).
    videoId: 'imrahor-alya1'
  },
  {
    id: 'karaman-karaman',
    name: 'Karaman Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "İç Anadolu'da, Karaman merkezde yer alan rüzgâr enerjisi santrali.",
    coordinates: [33.2287, 37.1759],
    provinceId: 'TR70',
    kinds: ['wind'],
    totalMw: 70,
    capacities: [{ kind: 'wind', mw: 56 }],
    additionalMw: 14,
    // Yerel için: src/renderer/assets/videos/karaman.mp4 ekleyin (videoId aktif).
    videoId: 'karaman'
  },
  {
    id: 'osmaniye-hasanbeyli',
    name: 'Osmaniye Hasanbeyli Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "Osmaniye'nin Hasanbeyli ilçesinde, Amanos Dağları eteklerinde kurulu santral.",
    coordinates: [36.4744, 37.2939],
    provinceId: 'TR80',
    kinds: ['wind'],
    totalMw: 63.6,
    capacities: [{ kind: 'wind', mw: 63.6 }],
    // Yerel için: src/renderer/assets/videos/hasanbeyli.mp4 ekleyin (videoId aktif).
    videoId: 'hasanbeyli'
  },
  {
    id: 'sanliurfa-viransehir',
    name: 'Şanlıurfa Viranşehir Güneş Enerji Santrali',
    sector: 'energy',
    description: 'Güneydoğu Anadolu bölgesinde yüksek kapasiteli fotovoltaik üretim sahası.',
    coordinates: [39.7342, 37.2138],
    provinceId: 'TR63',
    kinds: ['solar'],
    totalMw: 191.6,
    capacities: [{ kind: 'solar', mw: 191.6 }],
    additionalMw: 191.6,
    // Yerel için: src/renderer/assets/videos/viransehir.mp4 ekleyin (videoId aktif).
    videoId: 'viransehir'
  },
  {
    id: 'rize-uzundere',
    name: 'Rize Uzundere Hidroelektrik Santrali',
    sector: 'energy',
    description: "Rize'nin Çayeli ilçesinde bulunan, Eksim Enerji'nin ilk hidroelektrik santralidir.",
    coordinates: [40.7333, 41.0833],
    provinceId: 'TR53',
    kinds: ['hydro'],
    totalMw: 63,
    capacities: [{ kind: 'hydro', mw: 63 }],
    // Yerel için: src/renderer/assets/videos/uzundere.mp4 ekleyin (videoId aktif).
    videoId: 'uzundere'
  },
  {
    id: 'tokat-killik',
    name: 'Tokat Killik Rüzgâr ve Güneş Enerji Santrali',
    sector: 'energy',
    description: "Tokat merkeze bağlı Killik köyünde rüzgâr ve güneşi bir arada değerlendiren hibrit santral.",
    coordinates: [36.35, 40.45],
    provinceId: 'TR60',
    kinds: ['wind', 'solar'],
    totalMw: 127.3,
    capacities: [
      { kind: 'wind', mw: 100.8 },
      { kind: 'solar', mw: 26.5 }
    ],
    additionalMw: 26.5,
    // Yerel için: src/renderer/assets/videos/killik.mp4 ekleyin (videoId aktif).
    videoId: 'killik'
  },
  {
    id: 'amasya-kayaduzu',
    name: 'Amasya Kayadüzü Rüzgâr ve Güneş Enerji Santrali',
    sector: 'energy',
    description: "Amasya'nın Merzifon ilçesinde rüzgâr ve güneş enerjisini bir arada üreten hibrit saha.",
    coordinates: [35.62, 40.83],
    provinceId: 'TR05',
    kinds: ['wind', 'solar'],
    totalMw: 108.1,
    capacities: [
      { kind: 'wind', mw: 82 },
      { kind: 'solar', mw: 19.3 }
    ],
    additionalMw: 6.8,
    // Yerel için: src/renderer/assets/videos/kayaduzu.mp4 ekleyin (videoId aktif).
    videoId: 'kayaduzu'
  },
  {
    id: 'yozgat-yozgat',
    name: 'Yozgat Rüzgâr Enerji Santrali',
    sector: 'energy',
    description: "İç Anadolu'da, Yozgat merkezde kurulu rüzgâr enerjisi santrali.",
    coordinates: [34.8147, 39.8181],
    provinceId: 'TR66',
    kinds: ['wind'],
    totalMw: 56,
    capacities: [{ kind: 'wind', mw: 56 }],
    additionalMw: 56,
    // Yerel için: src/renderer/assets/videos/yozgat.mp4 ekleyin (videoId aktif).
    videoId: 'yozgat'
  },

  // ---- Dicle Grubu (TEMSİLİ) ----
  // Aşağıdaki 6 nokta yer tutucudur: Dicle Elektrik'in hizmet bölgesi olan
  // Güneydoğu Anadolu illerinin il merkezlerine yerleştirilmiştir (gerçek
  // tesis/bölge müdürlüğü konumları DEĞİLDİR). `totalMw: 0` ve `capacities`
  // YOKLUĞU kasıtlı — LocationPopup bu durumda MW/kapasite bloklarını
  // otomatik gizler (bkz. `hasCapacity`). `videoId` verilmez → video
  // ekranında genel `eksim.mp4` tanıtım videosuna düşülür. Gerçek proje
  // listesi netleşince bu blok güncellenmeli/genişletilmelidir.
  {
    id: 'dicle-diyarbakir',
    name: 'Diyarbakır',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Diyarbakır'daki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [40.2306, 37.9144],
    provinceId: 'TR21',
    kinds: ['grid'],
    totalMw: 0
  },
  {
    id: 'dicle-sanliurfa',
    name: 'Şanlıurfa',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Şanlıurfa'daki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [38.7955, 37.1591],
    provinceId: 'TR63',
    kinds: ['grid'],
    totalMw: 0
  },
  {
    id: 'dicle-mardin',
    name: 'Mardin',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Mardin'deki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [40.7245, 37.3212],
    provinceId: 'TR47',
    kinds: ['grid'],
    totalMw: 0
  },
  {
    id: 'dicle-batman',
    name: 'Batman',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Batman'daki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [41.1351, 37.8812],
    provinceId: 'TR72',
    kinds: ['grid'],
    totalMw: 0
  },
  {
    id: 'dicle-siirt',
    name: 'Siirt',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Siirt'teki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [41.9427, 37.9333],
    provinceId: 'TR56',
    kinds: ['grid'],
    totalMw: 0
  },
  {
    id: 'dicle-sirnak',
    name: 'Şırnak',
    sector: 'dicle',
    description:
      "Dicle Grubu'nun Şırnak'taki elektrik dağıtım faaliyetini temsil eden yer tutucu nokta — gerçek tesis/bölge bilgisiyle güncellenecek.",
    coordinates: [42.4611, 37.5164],
    provinceId: 'TR73',
    kinds: ['grid'],
    totalMw: 0
  },

  // ---- Gıda Grubu (TEMSİLİ) ----
  // Aşağıdaki 5 nokta yer tutucudur: ülke geneline yayılmış, birbirinden
  // uzak il merkezlerine yerleştirilmiştir (gerçek tesis konumları DEĞİLDİR).
  // Aynı kurallar geçerli: totalMw:0, capacities yok, videoId yok.
  {
    id: 'gida-konya',
    name: 'Konya',
    sector: 'food',
    description:
      "Gıda Grubu'nun Konya'daki üretim faaliyetini temsil eden yer tutucu nokta — gerçek tesis bilgisiyle güncellenecek.",
    coordinates: [32.4846, 37.8746],
    provinceId: 'TR42',
    kinds: ['food'],
    totalMw: 0
  },
  {
    id: 'gida-bursa',
    name: 'Bursa',
    sector: 'food',
    description:
      "Gıda Grubu'nun Bursa'daki üretim faaliyetini temsil eden yer tutucu nokta — gerçek tesis bilgisiyle güncellenecek.",
    coordinates: [29.0611, 40.1826],
    provinceId: 'TR16',
    kinds: ['food'],
    totalMw: 0
  },
  {
    id: 'gida-izmir',
    name: 'İzmir',
    sector: 'food',
    description:
      "Gıda Grubu'nun İzmir'deki üretim faaliyetini temsil eden yer tutucu nokta — gerçek tesis bilgisiyle güncellenecek.",
    coordinates: [27.1428, 38.4237],
    provinceId: 'TR35',
    kinds: ['food'],
    totalMw: 0
  },
  {
    id: 'gida-ankara',
    name: 'Ankara',
    sector: 'food',
    description:
      "Gıda Grubu'nun Ankara'daki üretim faaliyetini temsil eden yer tutucu nokta — gerçek tesis bilgisiyle güncellenecek.",
    coordinates: [32.8597, 39.9334],
    provinceId: 'TR06',
    kinds: ['food'],
    totalMw: 0
  },
  {
    id: 'gida-adana',
    name: 'Adana',
    sector: 'food',
    description:
      "Gıda Grubu'nun Adana'daki üretim faaliyetini temsil eden yer tutucu nokta — gerçek tesis bilgisiyle güncellenecek.",
    coordinates: [35.3213, 37.0],
    provinceId: 'TR01',
    kinds: ['food'],
    totalMw: 0
  }
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
