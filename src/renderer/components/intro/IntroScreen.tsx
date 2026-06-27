import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { TURKEY_PATH_D, TURKEY_VIEWBOX } from '../map/turkeyGeometry'

interface IntroScreenProps {
  /** Türkiye haritasının kendini çizdiği animasyonu göster (harita penceresi). */
  drawMap?: boolean
  onDone: () => void
}

/**
 * Açılış intro'su (GSAP). Marka belirir, (harita penceresinde) Türkiye silüeti
 * stroke-dashoffset ile kendini çizer, vurgu çizgisi süzülür, slogan girer ve
 * tüm sahne yumuşakça kaybolup canlı ekrana devreder. Tıklayınca atlanır.
 */
export function IntroScreen({ drawMap = false, onDone }: IntroScreenProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const doneRef = useRef(false)

  const finish = (): void => {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: finish })
      tlRef.current = tl

      if (drawMap) {
        tl.fromTo(
          '.intro-map path',
          { strokeDashoffset: 1, opacity: 0.9 },
          { strokeDashoffset: 0, duration: 2.2, ease: 'power1.inOut' }
        )
      }
      tl.from('.intro-mark', { opacity: 0, y: 34, duration: 0.8, ease: 'power3.out' }, drawMap ? '-=1.6' : 0)
        .from('.intro-accent', { scaleX: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35')
        .from('.intro-sub', { opacity: 0, y: 14, duration: 0.6, ease: 'power2.out' }, '-=0.3')
        .to('.intro-root', { opacity: 0, duration: 0.7, delay: 0.7, ease: 'power2.in' })
    }, rootRef)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMap])

  const skip = (): void => {
    tlRef.current?.progress(1)
    finish()
  }

  return (
    <div
      ref={rootRef}
      onPointerDown={skip}
      className="intro-root absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-eksim-ink"
    >
      {drawMap && (
        <svg
          viewBox={TURKEY_VIEWBOX}
          preserveAspectRatio="xMidYMid meet"
          className="intro-map pointer-events-none absolute inset-0 h-full w-full opacity-25"
        >
          <path
            d={TURKEY_PATH_D}
            fill="none"
            stroke="#2EA6FF"
            strokeWidth={0.8}
            pathLength={1}
            strokeDasharray={1}
          />
        </svg>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <h1 className="intro-mark text-6xl font-bold tracking-tight text-white">
          EKSİM <span className="text-eksim-energy">HOLDİNG</span>
        </h1>
        <div
          className="intro-accent mt-5 h-[3px] w-56 origin-center rounded-full"
          style={{ background: 'linear-gradient(90deg, #2EA6FF, #34D399)' }}
        />
        <p className="intro-sub mt-5 text-lg uppercase tracking-[0.4em] text-eksim-glow/70">
          Enerji ve Gıdada Geleceği İnşa Ediyoruz
        </p>
      </div>
    </div>
  )
}
