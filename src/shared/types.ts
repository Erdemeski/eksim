/**
 * Tüm süreçlerde paylaşılan tipler. Süreçler arası tek "sözleşme".
 */

/** Ekran uzayında 2B nokta (piksel). */
export interface Point {
  x: number
  y: number
}

/** Bir tesisin coğrafi konumu [boylam, enlem] (MapLibre sırası). */
export type LngLat = [number, number]

/** Eksim Holding sektörleri. */
export type Sector = 'energy' | 'food'

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
  /** Lokal video dosyası temel adı (resources/videos/<videoId>.mp4). Opsiyonel. */
  videoId?: string
  /** Lokal video yoksa kullanılacak çevrimiçi video URL'i. Opsiyonel. */
  videoUrl?: string
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
