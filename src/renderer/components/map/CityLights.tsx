import React from 'react'
import type { Point } from '@shared/types'

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

/**
 * Gece şehir ışıkları — sektörden bağımsız, MapScreen'de BİR KEZ render edilir.
 *
 * Önceden EnergyGrid.tsx içindeydi; sektör seçimine göre birden fazla
 * ConnectionGrid aynı anda mount edilebildiğinden ("Tümü" modu → Dicle +
 * Enerji + Gıda ızgaraları bir arada) buraya, tekil bir bileşene taşındı —
 * aksi halde ışıklar ızgara sayısı kadar tekrar ederdi.
 *
 * PERF: titreme salt CSS `@keyframes` (`.eg-city`, index.css) — JS yok.
 */
export function CityLights(): React.JSX.Element {
  return (
    <g pointerEvents="none">
      <defs>
        <filter id="cg-city-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {CITY_LIGHTS.map((p, i) => (
        <circle
          key={`c${i}`}
          className="eg-city"
          cx={p.x}
          cy={p.y}
          r={0.9}
          fill="#fff3cf"
          opacity={0.45}
          filter="url(#cg-city-glow)"
          style={{ animationDelay: `${((i * 3 + 1) % 8) * 0.25}s` }}
        />
      ))}
    </g>
  )
}
