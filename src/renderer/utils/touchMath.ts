import type {
  CalibrationProfile,
  FigureResult,
  Point,
  TouchConfig
} from '@shared/types'

/**
 * touchMath — Phygital kiosk'un kalbi.
 *
 * Ekrana konulan fiziksel figürün tabanındaki 3 kapasitif pedi, ekrandaki 3
 * eşzamanlı dokunuş olarak algılar; bunları öklid mesafesi → kalibrasyon
 * eşleştirme → ağırlık merkezi (centroid) → rotasyon zinciriyle çözer.
 *
 * Tüm fonksiyonlar SAF ve yan etkisizdir → izole birim test edilebilir.
 * React/DOM bağımlılığı yoktur; olay dinleme katmanı (useFigureTouch) ayrıdır.
 */

/** İki nokta arası öklid mesafesi: √((x₂-x₁)²+(y₂-y₁)²). */
export function euclidean(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/** Üçgenin üç kenar uzunluğu, ARTAN sırada. */
export function triangleSides(p1: Point, p2: Point, p3: Point): [number, number, number] {
  const sides = [euclidean(p1, p2), euclidean(p2, p3), euclidean(p3, p1)]
  sides.sort((a, b) => a - b)
  return sides as [number, number, number]
}

/**
 * Ölçülen kenarların (artan sıralı) bir kalibrasyon profiliyle toleranslı
 * eşleşip eşleşmediği. Her kenar için |ölçülen-beklenen|/beklenen ≤ tolerance.
 * Ekran/dokunmatik gürültüsünü tolere etmek için tolerance kullanılır (örn. %12).
 */
export function matchesCalibration(
  measured: readonly [number, number, number],
  calibration: CalibrationProfile,
  tolerance: number
): boolean {
  const expected = [...calibration.sides].sort((a, b) => a - b)
  return measured.every((side, i) => {
    const ref = expected[i]
    if (ref <= 0) return false
    return Math.abs(side - ref) / ref <= tolerance
  })
}

/** Üçgenin ağırlık merkezi: ((Σx)/3, (Σy)/3). */
export function centroid(p1: Point, p2: Point, p3: Point): Point {
  return {
    x: (p1.x + p2.x + p3.x) / 3,
    y: (p1.y + p2.y + p3.y) / 3
  }
}

/** Dereceyi [0, 360) aralığına normalize eder. */
function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Figürün dönüş açısı (derece, [0,360)).
 *
 * Referans olarak EN UZUN kenar alınır; bu kenarın orta noktasından, kenarda
 * yer almayan tepe noktasına (apex) doğru olan vektörün açısı hesaplanır.
 * Bu yöntem, dokunuş noktalarının geliş sırasından bağımsız ve tek-yönlü
 * (180° belirsizliği olmayan) kararlı bir oryantasyon verir — figür üçgeni
 * çeşitkenar (scalene) olduğunda benzersizdir.
 */
export function rotationAngle(p1: Point, p2: Point, p3: Point): number {
  const edges: Array<{ a: Point; b: Point; apex: Point; len: number }> = [
    { a: p1, b: p2, apex: p3, len: euclidean(p1, p2) },
    { a: p2, b: p3, apex: p1, len: euclidean(p2, p3) },
    { a: p3, b: p1, apex: p2, len: euclidean(p3, p1) }
  ]
  const longest = edges.reduce((max, e) => (e.len > max.len ? e : max), edges[0])

  const mid: Point = { x: (longest.a.x + longest.b.x) / 2, y: (longest.a.y + longest.b.y) / 2 }
  const radians = Math.atan2(longest.apex.y - mid.y, longest.apex.x - mid.x)
  return normalizeDegrees((radians * 180) / Math.PI)
}

/**
 * Ana çözümleyici — `figureTouch` bayrağına göre iki moddan birini uygular.
 *
 * figureTouch === false (geliştirici/test modu):
 *   3 noktalı donanım algoritması BYPASS edilir. İlk dokunuş/fare koordinatı
 *   aktif konum kabul edilir → { mode:'pointer', rotation:0, figureId:null }.
 *   Dokunuş yoksa null.
 *
 * figureTouch === true (Tangible Object modu):
 *   - touches tam olarak 3 DEĞİLSE → null (tekli dokunuş/fare reddedilir).
 *   - 3 ise kenarlar hesaplanır; ilk eşleşen kalibrasyon profili için
 *     centroid + rotation döndürülür. Hiçbiri eşleşmezse null.
 *
 * @param touches Ekran uzayındaki ham dokunuş noktaları (px).
 */
export function resolveFigure(
  touches: readonly Point[],
  config: TouchConfig
): FigureResult | null {
  if (!config.figureTouch) {
    const first = touches[0]
    if (!first) return null
    return { mode: 'pointer', centroid: { ...first }, rotation: 0, figureId: null }
  }

  // Tangible mod: tam olarak 3 temas noktası zorunlu.
  if (touches.length !== 3) return null

  const [p1, p2, p3] = touches
  const sides = triangleSides(p1, p2, p3)

  const profile = config.calibrations.find((cal) =>
    matchesCalibration(sides, cal, config.tolerance)
  )
  if (!profile) return null

  return {
    mode: 'tangible',
    centroid: centroid(p1, p2, p3),
    rotation: rotationAngle(p1, p2, p3),
    figureId: profile.figureId
  }
}
