import React from 'react'
import { TURKEY_PATH_D, TURKEY_VIEWBOX } from './turkeyGeometry'

interface TurkeyMapProps {
  /** SVG referansı — ekran↔viewBox dönüşümü ve olay bağlama için. */
  svgRef: React.Ref<SVGSVGElement>
  /** viewBox uzayında çizilecek katman (marker'lar, dalgalar). */
  children?: React.ReactNode
}

/**
 * Türkiye silüetini (tek path) kurumsal stilde, çözünürlükten bağımsız çizer.
 * `preserveAspectRatio="xMidYMid meet"` + %100 boyut → her ekranda en-boy
 * korunur, ortalanır. Çocuklar aynı viewBox uzayında olduğundan haritayla
 * birlikte ölçeklenir, asla kaymaz.
 */
export function TurkeyMap({ svgRef, children }: TurkeyMapProps): React.JSX.Element {
  return (
    <svg
      ref={svgRef}
      viewBox={TURKEY_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full touch-none select-none"
    >
      <defs>
        <linearGradient id="eksim-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16213d" />
          <stop offset="100%" stopColor="#0e1830" />
        </linearGradient>
        <filter id="eksim-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={TURKEY_PATH_D}
        fill="url(#eksim-land)"
        stroke="#2EA6FF"
        strokeWidth={0.6}
        strokeLinejoin="round"
        strokeLinecap="round"
        filter="url(#eksim-glow)"
        opacity={0.96}
      />

      {children}
    </svg>
  )
}
