import React, { useId } from 'react'
import type { EksimLocation, Point } from '@shared/types'
import type { ConnectionVariant } from '@shared/sectors'
import { locationToViewBox } from '../../services/svgMapService'

interface ConnectionGridProps {
  locations: EksimLocation[]
  /** 'electric' → mevcut elektrik akımı ızgarası (Dicle/Enerji); 'conveyor' →
      Gıda için tedarik-yolu (konveyör) akışı. */
  variant: ConnectionVariant
  /** Sektörün vurgu rengi (bkz. shared/sectors.ts SECTOR_META) — taban ve akan
      çizginin tonları buradan türetilir. */
  color: string
  /**
   * Çizgi kalınlığı çarpanı. Varsayılan 1 (ana harita ölçeği). Bölge penceresi
   * gibi DAHA YAKINLAŞMIŞ (küçük viewBox) bir SVG'de kullanılınca <1 verilir ki
   * ekran kalınlığı standart kalsın (bkz. RegionDetailOverlay). Dash desenleri
   * değişmez — kusursuz akış döngüsü korunur.
   */
  strokeScale?: number
}

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

/** Hex rengi beyaza doğru karıştırır (amount 0→aynı renk, 1→beyaz) — taban
    rengine göre daha parlak "akan" tonu türetmek için. Render başına bir kez
    çalışır (sıcak yol değil), performans etkisi yok. */
function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const mix = (channel: number): string =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, '0')
  return `#${mix((n >> 16) & 0xff)}${mix((n >> 8) & 0xff)}${mix(n & 0xff)}`
}

/**
 * Tesisler arasında akan bağlantı dokusu — Dicle/Enerji için parlayan
 * elektrik ağı, Gıda için yeşil tedarik-yolu (konveyör) akışı. Aynı MST
 * iskeleti (`buildSpanningEdges`) her iki varyantta da paylaşılır; yalnız
 * çizgi stili ve animasyon sınıfı değişir.
 *
 * PERF: bileşende HİÇ JS animasyonu yok. Her iki varyant da salt CSS
 * `@keyframes` ile çalışır (bkz. index.css `.eg-*` / `.cg-*`): ana iş
 * parçacığına dokunmaz. Konveyör varyantı elektrik ızgarasından da hafiftir —
 * glow filtresi (feGaussianBlur) hiç kullanmaz.
 *
 * "Tümü" modunda birden fazla ConnectionGrid aynı anda mount olabileceğinden
 * (Dicle + Enerji, ikisi de 'electric') glow filtresinin id'si `useId` ile
 * örnek başına türetilir — sabit id kullanılsaydı SVG'de yinelenen id
 * oluşurdu.
 */
export function ConnectionGrid({
  locations,
  variant,
  color,
  strokeScale = 1
}: ConnectionGridProps): React.JSX.Element {
  const glowId = `cg-glow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const points = locations.map(locationToViewBox)
  const arcs = buildSpanningEdges(points).map(([i, j]) => arcPath(points[i], points[j]))

  if (variant === 'conveyor') {
    const beltColor = lighten(color, 0.45)
    return (
      <g pointerEvents="none">
        {arcs.map((d, i) => (
          <g key={`c${i}`}>
            {/* Sabit ray — animasyonsuz, en ucuz katman (glow filtresi yok). */}
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={0.35 * strokeScale}
              strokeLinecap="round"
              strokeDasharray="1.2 2.6"
              opacity={0.3}
            />
            {/* Sabit hızda akan, eşit aralıklı "ürün" noktaları. */}
            <path
              className="cg-belt"
              d={d}
              fill="none"
              stroke={beltColor}
              strokeWidth={0.9 * strokeScale}
              strokeLinecap="round"
              strokeDasharray="0.9 5.1"
              style={{ animationDelay: `${i * 0.25}s` }}
            />
          </g>
        ))}
      </g>
    )
  }

  const flowColor = lighten(color, 0.55)
  return (
    <g pointerEvents="none">
      <defs>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation={1.1 * strokeScale} result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* PERF: Glow filtresi yalnızca STATİK/opacity-animasyonlu `.eg-base`'e
          uygulanır (filtre rasteri cache'lenir, opacity kompozit ucuz). Sürekli
          strokeDashoffset ile akan `.eg-flow` filtre DIŞINDA tutulur — aksi halde
          her kare tam yeniden rasterize olurdu. Görünüm: base zaten parlıyor. */}
      {arcs.map((d, i) => (
        <g key={`a${i}`}>
          <path
            className="eg-base"
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={0.4 * strokeScale}
            opacity={0.25}
            filter={`url(#${glowId})`}
            style={{ animationDelay: `${i * 0.3}s` }}
          />
          <path
            className="eg-flow"
            d={d}
            fill="none"
            stroke={flowColor}
            strokeWidth={0.8 * strokeScale}
            strokeLinecap="round"
            strokeDasharray="3 37"
          />
        </g>
      ))}
    </g>
  )
}
