import React, { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import type { EksimLocation, Point } from '@shared/types'

interface LocationMarkerProps {
  location: EksimLocation
  /** viewBox koordinatı. */
  point: Point
  color: string
  active: boolean
  /** Hover-dwell etkileşimi açık mı (figureTouch=false iken true). */
  interactive: boolean
  /** İmleç gir/çıkışını ebeveyne bildirir (dwell/geri sayım MapScreen'de yönetilir). */
  onHoverChange?: (hovering: boolean, location: EksimLocation) => void
}

/**
 * Haritadaki tek tesis noktası (yalnızca pin görselleri).
 *
 *  - Boşta: görünürlüğü artıran nabız atan halka + çekirdek.
 *  - Hover (interactive && !active): çekirdek büyür + "magic rings" (targeting).
 *    Geri sayım ve aktivasyon artık MapScreen'de (popup içinde gösterilir) —
 *    burada yalnızca hover görseli + ebeveyne bildirim var.
 */
export function LocationMarker({
  location,
  point,
  color,
  active,
  interactive,
  onHoverChange
}: LocationMarkerProps): React.JSX.Element {
  const groupRef = useRef<SVGGElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const [hovering, setHovering] = useState(false)

  const stopRings = (): void => {
    ctxRef.current?.revert()
    ctxRef.current = null
  }

  const handleEnter = (): void => {
    if (!interactive) return
    onHoverChange?.(true, location)
    if (active) return
    setHovering(true)
    ctxRef.current = gsap.context(() => {
      gsap.to('.lm-core', { attr: { r: 7 }, duration: 0.3, ease: 'back.out(2)' })
      gsap.fromTo(
        '.lm-ring',
        { attr: { r: 8 }, opacity: 0.65 },
        { attr: { r: 52 }, opacity: 0, duration: 1.7, ease: 'power1.out', repeat: -1, stagger: 0.45 }
      )
    }, groupRef)
  }

  const handleLeave = (): void => {
    if (!interactive) return
    onHoverChange?.(false, location)
    setHovering(false)
    stopRings()
  }

  // Aktif olunca hover görsellerini temizle.
  useEffect(() => {
    if (active) {
      setHovering(false)
      stopRings()
    }
  }, [active])

  useEffect(() => () => stopRings(), [])

  const showDwell = hovering && interactive && !active

  return (
    <g
      ref={groupRef}
      transform={`translate(${point.x}, ${point.y})`}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Geniş şeffaf hover hedefi. Aktifken de canlı kalır ki imlecin konumdan
          AYRILMASI algılanabilsin (ayrılınca video durur). */}
      <circle r={28} fill="transparent" pointerEvents={interactive ? 'all' : 'none'} />

      {/* Boşta görünürlük halkası (nabız). */}
      {!active && !showDwell && (
        <circle className="eksim-halo" r={11} fill="none" stroke={color} strokeWidth={1.4} />
      )}

      {/* Hover: targeting magic rings. */}
      {showDwell &&
        [0, 1, 2].map((i) => (
          <circle
            key={i}
            className="lm-ring"
            r={8}
            fill="none"
            stroke={color}
            strokeWidth={1.6}
            pointerEvents="none"
          />
        ))}

      {/* Çekirdek. */}
      <circle
        className="lm-core"
        r={active ? 5.5 : 3.6}
        fill={color}
        opacity={active ? 1 : 0.9}
        pointerEvents="none"
      />
      <circle r={active ? 2.4 : 1.7} fill="#ffffff" pointerEvents="none" />
    </g>
  )
}
