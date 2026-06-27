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
  /** Saniye cinsinden geri sayım (varsayılan 3). */
  countdownSeconds?: number
  onActivate: (location: EksimLocation) => void
  onHoverChange?: (hovering: boolean) => void
}

const PROGRESS_R = 22
const PROGRESS_C = 2 * Math.PI * PROGRESS_R

/**
 * Haritadaki tek tesis noktası.
 *
 *  - Boşta: görünürlüğü artıran nabız atan halka + çekirdek.
 *  - Hover (interactive && !active): çekirdek büyür, çevresinde "magic rings"
 *    (genişleyen halkalar) belirir, 3 sn geri sayım halkası dolarken altında
 *    sayı görünür. Süre dolunca onActivate çağrılır (videoyu açar).
 *  - İmleç ayrılırsa geri sayım iptal edilir.
 */
export function LocationMarker({
  location,
  point,
  color,
  active,
  interactive,
  countdownSeconds = 3,
  onActivate,
  onHoverChange
}: LocationMarkerProps): React.JSX.Element {
  const groupRef = useRef<SVGGElement>(null)
  const ctxRef = useRef<gsap.Context | null>(null)
  const [hovering, setHovering] = useState(false)
  const [count, setCount] = useState(countdownSeconds)

  const cancelDwell = (): void => {
    ctxRef.current?.revert()
    ctxRef.current = null
    setCount(countdownSeconds)
  }

  const startDwell = (): void => {
    if (!interactive || active) return
    setHovering(true)
    onHoverChange?.(true)

    ctxRef.current = gsap.context(() => {
      // Çekirdek büyür.
      gsap.to('.lm-core', { attr: { r: 7 }, duration: 0.3, ease: 'back.out(2)' })
      // Magic rings — sürekli genişleyip sönen halkalar.
      gsap.fromTo(
        '.lm-ring',
        { attr: { r: 8 }, opacity: 0.65 },
        { attr: { r: 52 }, opacity: 0, duration: 1.7, ease: 'power1.out', repeat: -1, stagger: 0.45 }
      )
      // Geri sayım halkası dolar.
      gsap.fromTo(
        '.lm-progress',
        { attr: { 'stroke-dashoffset': PROGRESS_C } },
        { attr: { 'stroke-dashoffset': 0 }, duration: countdownSeconds, ease: 'none' }
      )
      // Sayı (3→2→1) ve tamamlanınca aktive et.
      const proxy = { v: countdownSeconds }
      gsap.to(proxy, {
        v: 0,
        duration: countdownSeconds,
        ease: 'none',
        onUpdate: () => setCount(Math.max(1, Math.ceil(proxy.v))),
        onComplete: () => onActivate(location)
      })
    }, groupRef)
  }

  const endDwell = (): void => {
    setHovering(false)
    onHoverChange?.(false)
    cancelDwell()
  }

  // Aktif olunca (başka yolla da seçilebilir) hover görsellerini temizle.
  useEffect(() => {
    if (active) {
      setHovering(false)
      cancelDwell()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => () => cancelDwell(), [])

  const showDwell = hovering && interactive && !active

  return (
    <g
      ref={groupRef}
      transform={`translate(${point.x}, ${point.y})`}
      onPointerEnter={startDwell}
      onPointerLeave={endDwell}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Geniş şeffaf hover hedefi. */}
      <circle r={28} fill="transparent" pointerEvents={interactive && !active ? 'all' : 'none'} />

      {/* Boşta görünürlük halkası (nabız). */}
      {!active && !showDwell && (
        <circle className="eksim-halo" r={11} fill="none" stroke={color} strokeWidth={1.4} />
      )}

      {/* Hover: magic rings + geri sayım halkası. */}
      {showDwell && (
        <>
          {[0, 1, 2].map((i) => (
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
          <circle
            className="lm-progress"
            r={PROGRESS_R}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={PROGRESS_C}
            strokeDashoffset={PROGRESS_C}
            transform="rotate(-90)"
            pointerEvents="none"
          />
          <text
            y={PROGRESS_R + 18}
            textAnchor="middle"
            fontSize={18}
            fontWeight={700}
            fill="#ffffff"
            pointerEvents="none"
          >
            {count}
          </text>
        </>
      )}

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
