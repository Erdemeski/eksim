/**
 * Tüm süreçlerde paylaşılan tipler. Süreçler arası tek "sözleşme".
 */
import type { PerfTier } from './perf'

/** Ekran uzayında 2B nokta (piksel). */
export interface Point {
  x: number
  y: number
}

/** Bir tesisin coğrafi konumu [boylam, enlem] (MapLibre sırası). */
export type LngLat = [number, number]

/** Eksim Holding sektörleri. */
export type Sector = 'energy' | 'dicle' | 'food'

/** Harita üzerindeki bir tesis/lokasyon kaydı. */
export interface EksimLocation {
  id: string
  name: string
  sector: Sector
  /** Kısa tanıtım metni (HUD + video ekranı altyazısı). */
  description: string
  /** Coğrafi referans [boylam, enlem] — svgPoint yoksa buradan projelendirilir. */
  coordinates: LngLat
  /**
   * SVG viewBox koordinatındaki KESİN konum (px). Verilirse otoriterdir
   * (projeksiyon sapması olmaz); verilmezse coordinates'tan hesaplanır.
   * Marker SVG içinde bu noktaya çizilir → çözünürlükten bağımsız, kaymaz.
   */
  svgPoint?: Point
  /**
   * Tesisin bulunduğu ilin simplemaps kodu (ör. "TR35" = İzmir) — hover/idle
   * önizlemede ilin siyasi sınırını boyayan ProvinceHighlight bu koda göre
   * trProvinces.ts'ten path seçer.
   */
  provinceId: string
  /** Lokal video dosyası temel adı (resources/videos/<videoId>.mp4). Opsiyonel. */
  videoId?: string
  /** Lokal video yoksa kullanılacak çevrimiçi video URL'i. Opsiyonel. */
  videoUrl?: string
  /**
   * Sahadaki santral türleri — popup ikonu ve pin amblemi bu listeden çizilir.
   * Birden fazla olabilir (ör. RES+GES hibrit saha); ilki birincil/accent renk
   * ve ana ikon olarak kullanılır.
   */
  kinds: FacilityKind[]
  /** Toplam (mevcut + planlanan) kurulu güç (MW). */
  totalMw: number
  /** Türe göre MEVCUT kurulu güç kırılımı (verilmişse; popup'ta rozet olarak gösterilir). */
  capacities?: FacilityCapacity[]
  /** İşlemde olan ilave kapasite artışı projesi (MW) — varsa. */
  additionalMw?: number
  /**
   * Haritada üst üste binen yakın sahalar tek pinde birleştirildiğinde, o
   * pinin kapsadığı gerçek projelerin adı+gücü (popup'ta isim bazlı rozet
   * olarak gösterilir). Tek-projeli pinlerde verilmez.
   */
  subprojects?: FacilitySubproject[]
}

/** Tesis görsel tipi (amblem + ikon seçimi için). */
export type FacilityKind = 'wind' | 'solar' | 'hydro' | 'food' | 'grid'

/** Bir santral türünün kurulu gücü (MW). */
export interface FacilityCapacity {
  kind: FacilityKind
  mw: number
}

/** Birleştirilmiş bir pinin kapsadığı tek bir gerçek projenin adı + gücü. */
export interface FacilitySubproject {
  name: string
  mw: number
}

/** Figür algılama modu. */
export type FigureMode = 'pointer' | 'tangible'

/**
 * touchMath.resolveFigure çıktısı. Eşleşme yoksa null döner.
 */
export interface FigureResult {
  mode: FigureMode
  /** Ekran uzayında figürün merkezi (px). */
  centroid: Point
  /** Derece cinsinden dönüş açısı (0–360). pointer modunda 0. */
  rotation: number
  /** tangible modda eşleşen kalibrasyon profili; pointer modda null. */
  figureId: string | null
}

/**
 * Renderer'dan main'e (ve oradan video penceresine) gönderilen olay yükü.
 * Harita, ekran koordinatını coğrafi konuma çözüp en yakın tesisi ekler.
 */
export interface FigureEventPayload {
  result: FigureResult
  /** Çözümlenen tesis (yoksa null). */
  location: EksimLocation | null
}

/** Tek bir fiziksel figürün kapasitif kalibrasyon profili. */
export interface CalibrationProfile {
  figureId: string
  /**
   * Figür tabanındaki 3 pedin oluşturduğu üçgenin kenar uzunlukları (px),
   * artan sırada. Ölçülen kenarlarla toleranslı eşleştirilir.
   */
  sides: [number, number, number]
}

/** touchMath davranışını yöneten çalışma zamanı yapılandırması. */
export interface TouchConfig {
  /** false: fare/tek dokunuş; true: yalnızca 3 noktalı figür. */
  figureTouch: boolean
  /** Kenar eşleşmesinde izin verilen oransal hata payı (örn. 0.12 = %12). */
  tolerance: number
  calibrations: CalibrationProfile[]
}

/** Pencerenin hangi monitör/rol için açıldığı. */
export type WindowRole = 'map' | 'video'

/**
 * main, pencere rolünü `additionalArguments` ile preload'a bu önekle geçirir.
 * Böylece rol, dosya adından değil ana süreçten otoriter olarak gelir.
 */
export const WINDOW_ROLE_ARG = '--eksim-role='

/**
 * preload'un contextBridge ile renderer'a açtığı API yüzeyi.
 * window.eksim üzerinden tip güvenli erişilir.
 */
export interface EksimBridge {
  /** Bu pencerenin rolünü senkron döndürür (map | video). */
  getWindowRole: () => WindowRole
  /** main süreçte çözülmüş kalite katmanını senkron döndürür (high | low). */
  getPerfTier: () => PerfTier
  /** Harita → main → video: figür yerleşti/hareket etti. */
  emitFigure: (event: FigureEventPayload) => void
  /** Harita → main → video: figür kaldırıldı. */
  emitFigureLifted: () => void
  /** Video: figür güncellemelerini dinle. Aboneliği iptal eden fn döner. */
  onFigure: (handler: (event: FigureEventPayload) => void) => () => void
  /** Video: figür kaldırma olayını dinle. İptal fn döner. */
  onFigureLifted: (handler: () => void) => () => void
  /** main'den gelen figureTouch değişimini dinle. İptal fn döner. */
  onFigureTouchChanged: (handler: (value: boolean) => void) => () => void
}
