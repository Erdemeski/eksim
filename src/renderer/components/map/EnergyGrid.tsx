import React from 'react'
import type { EksimLocation, Point } from '@shared/types'
import { locationToViewBox } from '../../services/svgMapService'

interface EnergyGridProps {
  locations: EksimLocation[]
}

/** Büyük şehir ışıkları (gece uydu hissi) — sabit viewBox noktaları. */
const CITY_LIGHTS: Point[] = [
  { x: 205, y: 150 }, // İstanbul
  { x: 430, y: 232 }, // Ankara
  { x: 300, y: 360 }, // Antalya
  { x: 520, y: 330 }, // Adana
  { x: 700, y: 168 }, // Trabzon
  { x: 815, y: 205 }, // Erzurum
  { x: 250, y: 200 }, // Bursa
  { x: 600, y: 250 } // Sivas
]

/** İki nokta arasında hafif kavisli (perpendiküler kaldırılmış) bezier yolu. */
function arcPath(a: Point, b: Point): string {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy) || 1
  const nx = -dy / dist
  const ny = dx / dist
  const lift = dist * 0.22
  const cx = (a.x + b.x) / 2 + nx * lift
  const cy = (a.y + b.y) / 2 + ny * lift
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`
}

/**
 * PERF + görsel: tüm noktaları birbirine bağlayan TAM ÇİZGE yerine (n tesiste
 * n*(n-1)/2 ark — tesis sayısı arttıkça karesel büyür ve her ark filtre/GSAP
 * maliyeti taşır) minimum yayılan ağaç (Prim) kullanılır → tam n-1 ark, hepsi
 * bağlı, çapraz kesişen "spagetti" yok. Gerçek enerji şebekeleri de böyle
 * seyrek/ağaç yapıdadır — hem daha hafif hem daha "premium" görünür. n küçük
 * olduğu için O(n²) MST hesaplaması önemsiz (render başına bir kez).
 */
function buildSpanningEdges(points: Point[]): Array<[number, number]> {
  const n = points.length
  if (n < 2) return []
  const inTree = new Array<boolean>(n).fill(false)
  const minDist = new Array<number>(n).fill(Infinity)
  const parent = new Array<number>(n).fill(-1)
  minDist[0] = 0

  for (let step = 0; step < n; step++) {
    let u = -1
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && (u === -1 || minDist[i] < minDist[u])) u = i
    }
    if (u === -1) break
    inTree[u] = true
    for (let v = 0; v < n; v++) {
      if (inTree[v]) continue
      const d = Math.hypot(points[u].x - points[v].x, points[u].y - points[v].y)
      if (d < minDist[v]) {
        minDist[v] = d
        parent[v] = u
      }
    }
  }

  const edges: Array<[number, number]> = []
  for (let v = 0; v < n; v++) {
    if (parent[v] !== -1) edges.push([parent[v], v])
  }
  return edges
}

/**
 * Tesisler arasında akan, parlayan enerji ağı + gece şehir ışıkları.
 * Canlı/modern doku katmanı (reactbits/şebeke hissi).
 *
 * PERF: bileşende artık HİÇ JS animasyonu yok. Taban nabzı (`.eg-base`),
 * şehir ışığı titremesi (`.eg-city`) ve akan çizgi (`.eg-flow`,
 * stroke-dashoffset — Chromium'da CSS-animatable) tamamı CSS `@keyframes`
 * ile çalışır (bkz. index.css): ana iş parçacığına dokunmaz, görünüm birebir
 * aynı. Stagger, CSS `animationDelay` ile (aşağıda, render'da) verilir.
 */
export function EnergyGrid({ locations }: EnergyGridProps): React.JSX.Element {
  const points = locations.map(locationToViewBox)
  const arcs = buildSpanningEdges(points).map(([i, j]) => arcPath(points[i], points[j]))

  return (
    <g pointerEvents="none">
      <defs>
        <filter id="eg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Şehir ışıkları. animationDelay: eski GSAP stagger'ının (each:0.25,
          from:'random') yerini alan sabit-ama-karışık gecikme dizisi. */}
      {CITY_LIGHTS.map((p, i) => (
        <circle
          key={`c${i}`}
          className="eg-city"
          cx={p.x}
          cy={p.y}
          r={0.9}
          fill="#fff3cf"
          opacity={0.45}
          filter="url(#eg-glow)"
          style={{ animationDelay: `${((i * 3 + 1) % 8) * 0.25}s` }}
        />
      ))}

      {/* Enerji ağı arkları.
          PERF: Glow filtresi yalnızca STATİK/opacity-animasyonlu `.eg-base`'e
          uygulanır (filtre rasteri cache'lenir, opacity kompozit ucuz). Sürekli
          strokeDashoffset ile akan `.eg-flow` filtre DIŞINDA tutulur — aksi halde
          her kare tam yeniden rasterize olurdu. Görünüm: base zaten parlıyor. */}
      {arcs.map((d, i) => (
        <g key={`a${i}`}>
          <path
            className="eg-base"
            d={d}
            fill="none"
            stroke="#5fd0ff"
            strokeWidth={0.4}
            opacity={0.25}
            filter="url(#eg-glow)"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
          <path
            className="eg-flow"
            d={d}
            fill="none"
            stroke="#bdf0ff"
            strokeWidth={0.8}
            strokeLinecap="round"
            strokeDasharray="3 37"
          />
        </g>
      ))}
    </g>
  )
}
