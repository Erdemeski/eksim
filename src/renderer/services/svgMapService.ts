import type { EksimLocation, LngLat, Point } from '@shared/types'
import { euclidean } from '../utils/touchMath'

/**
 * svgMapService — Türkiye SVG haritasının koordinat zekâsı (MapLibre yok).
 *
 * Üç sorumluluk:
 *  1) Coğrafi (lng,lat) → SVG viewBox (x,y) projeksiyonu. Kalibrasyon, SVG'nin
 *     KENDİ gömülü `#points` dairelerinden alınır → sapmasız, otoriter.
 *  2) Ekran pikseli → viewBox dönüşümü (getScreenCTM ile; çözünürlük bağımsız).
 *  3) Bir viewBox noktasına en yakın tesisin hit-testi.
 */

/** turkey.svg'deki gömülü kalibrasyon noktaları (px ↔ lat/lng). */
const CALIBRATION: Array<{ px: Point; lng: number; lat: number }> = [
  { px: { x: 90.9, y: 384.7 }, lat: 36.13372868983344, lng: 26.620445987274163 },
  { px: { x: 545.5, y: 234.5 }, lat: 38.645329944972325, lng: 36.192312755397474 },
  { px: { x: 909.1, y: 39.2 }, lat: 41.78483151389593, lng: 43.84980616989612 }
]

/** Web Mercator y bileşeni (enlem derece → birimsiz). */
function mercatorY(latDeg: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360))
}

/** Basit en küçük kareler doğru uydurma: y = m·x + b. */
function linearFit(samples: Array<[number, number]>): { m: number; b: number } {
  const n = samples.length
  const meanX = samples.reduce((s, [x]) => s + x, 0) / n
  const meanY = samples.reduce((s, [, y]) => s + y, 0) / n
  let num = 0
  let den = 0
  for (const [x, y] of samples) {
    num += (x - meanX) * (y - meanY)
    den += (x - meanX) * (x - meanX)
  }
  const m = den === 0 ? 0 : num / den
  return { m, b: meanY - m * meanX }
}

// x boylama lineer, y ise mercatorY(enlem)'e lineer (Web Mercator).
const FIT_X = linearFit(CALIBRATION.map((c) => [c.lng, c.px.x]))
const FIT_Y = linearFit(CALIBRATION.map((c) => [mercatorY(c.lat), c.px.y]))

/** Coğrafi konumu SVG viewBox koordinatına projelendirir. */
export function projectLngLat([lng, lat]: LngLat): Point {
  return {
    x: FIT_X.m * lng + FIT_X.b,
    y: FIT_Y.m * mercatorY(lat) + FIT_Y.b
  }
}

/** Tesisin viewBox konumu: kesin svgPoint varsa o, yoksa projeksiyon. */
export function locationToViewBox(location: EksimLocation): Point {
  return location.svgPoint ?? projectLngLat(location.coordinates)
}

/**
 * Ekran (client) pikselini SVG viewBox koordinatına çevirir. getScreenCTM,
 * SVG'nin o anki ölçek/konumunu içerir → her çözünürlükte doğru sonuç.
 */
export function screenToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): Point | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

/**
 * viewBox koordinatını ekran (client) pikseline çevirir — `screenToViewBox`'ın
 * tersi. HTML overlay öğelerini (popup vb.) tam pin üstüne konumlamak için;
 * getScreenCTM slice/ölçek/konumu içerir → her çözünürlükte doğru.
 */
export function viewBoxToScreen(svg: SVGSVGElement, point: Point): Point | null {
  const ctm = svg.getScreenCTM()
  if (!ctm) return null
  const screen = new DOMPoint(point.x, point.y).matrixTransform(ctm)
  return { x: screen.x, y: screen.y }
}

/**
 * viewBox noktasına en yakın tesisi döndürür (maxDistance viewBox birimi
 * içinde). Yarıçap dışında eşleşme yoksa null.
 */
export function nearestLocation(
  point: Point,
  locations: readonly EksimLocation[],
  maxDistance = 50
): EksimLocation | null {
  let best: EksimLocation | null = null
  let bestDist = Infinity
  for (const loc of locations) {
    const dist = euclidean(point, locationToViewBox(loc))
    if (dist < bestDist) {
      bestDist = dist
      best = loc
    }
  }
  return best && bestDist <= maxDistance ? best : null
}
