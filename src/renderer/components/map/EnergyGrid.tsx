import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
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
 * Tesisler arasında akan, parlayan enerji ağı + gece şehir ışıkları.
 * Canlı/modern doku katmanı (reactbits/şebeke hissi), GSAP ile akış ve titreşim.
 */
export function EnergyGrid({ locations }: EnergyGridProps): React.JSX.Element {
  const ref = useRef<SVGGElement>(null)
  const points = locations.map(locationToViewBox)
  const arcs: string[] = []
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      arcs.push(arcPath(points[i], points[j]))
    }
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to('.eg-flow', { strokeDashoffset: -40, duration: 2.4, ease: 'none', repeat: -1 })
      gsap.to('.eg-base', {
        opacity: 0.45,
        duration: 2.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.3
      })
      gsap.to('.eg-city', {
        opacity: 0.9,
        scale: 1.4,
        svgOrigin: '0 0',
        duration: 1.8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: { each: 0.25, from: 'random' }
      })
    }, ref)
    return () => ctx.revert()
  }, [arcs.length])

  return (
    <g ref={ref} pointerEvents="none">
      <defs>
        <filter id="eg-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.1" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Şehir ışıkları. */}
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
        />
      ))}

      {/* Enerji ağı arkları. */}
      {arcs.map((d, i) => (
        <g key={`a${i}`} filter="url(#eg-glow)">
          <path className="eg-base" d={d} fill="none" stroke="#5fd0ff" strokeWidth={0.4} opacity={0.25} />
          <path
            className="eg-flow"
            d={d}
            fill="none"
            stroke="#bdf0ff"
            strokeWidth={0.7}
            strokeLinecap="round"
            strokeDasharray="3 37"
          />
        </g>
      ))}
    </g>
  )
}
