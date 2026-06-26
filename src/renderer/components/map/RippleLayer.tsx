import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { Point } from '@shared/types'

interface RippleLayerProps {
  /** Dalgaların yayılacağı viewBox noktası (tesis konumu). */
  point: Point
  /** Sektöre göre vurgu rengi (enerji mavi / gıda yeşil). */
  color: string
}

const RING_COUNT = 3

/**
 * Figür bir tesise oturduğunda o noktadan dışarı yayılan halka/pulse efekti.
 * SVG içinde çizilir (haritayla ölçeklenir); GSAP timeline ile sonsuz tekrar.
 * `gsap.context` + `revert` ile nokta/renk değişiminde temiz yeniden kurulum.
 */
export function RippleLayer({ point, color }: RippleLayerProps): React.JSX.Element {
  const groupRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.eksim-ripple',
        { attr: { r: 0 }, opacity: 0.6 },
        {
          attr: { r: 38 },
          opacity: 0,
          duration: 2.6,
          ease: 'power1.out',
          repeat: -1,
          stagger: 0.85
        }
      )
      gsap.to('.eksim-core', {
        attr: { r: 4.4 },
        duration: 0.9,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      })
    }, groupRef)
    return () => ctx.revert()
  }, [point.x, point.y, color])

  return (
    <g ref={groupRef} transform={`translate(${point.x}, ${point.y})`} pointerEvents="none">
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <circle
          key={i}
          className="eksim-ripple"
          r={0}
          fill="none"
          stroke={color}
          strokeWidth={1.1}
        />
      ))}
      <circle className="eksim-core" r={3} fill={color} />
      <circle r={1.6} fill="#ffffff" />
    </g>
  )
}
