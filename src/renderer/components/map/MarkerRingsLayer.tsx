import React, { useEffect, useLayoutEffect, useState } from 'react'
import type { EksimLocation, Point } from '@shared/types'
import { locationToViewBox, viewBoxToScreen } from '../../services/svgMapService'
import MagicRings from './MagicRings'

interface MarkerRingsLayerProps {
  /** Rings gösterilecek konum — countdown (dwell) veya preview (idle) modunda. */
  location: EksimLocation | null
  color: string
  svgRef: React.RefObject<SVGSVGElement | null>
  containerRef: React.RefObject<HTMLElement | null>
}

/** Ekran-uzayında rings kutusu boyutu (px) — pin baloncuğunu (~65px) sarar. */
const RING_BOX = 132

/**
 * Dwell/idle-önizlemede pinin çevresinde reactbits MagicRings (WebGL/three)
 * efekti.
 *
 * STABİLİTE (kritik): `MagicRings` burada KALICI mount edilir — `location`
 * null olduğunda unmount EDİLMEZ, yalnız `paused` prop'u ve opacity/0 ile
 * gizlenir (LightRays/MapBackground'daki aynı "context canlı kalır, aç/kapat
 * prop'la" deseni). Önceki sürüm `location` null'a düştüğünde bileşeni
 * unmount edip her yeni dwell/preview'da YENİDEN mount ediyordu — bu, her
 * hover/aktivasyon döngüsünde bir WebGL bağlamı yaratıp yok ediyordu; React
 * StrictMode'un (npm run dev) mount/cleanup/mount ikilemesiyle birleşince ve
 * bağlam biriktikçe, bir noktada yakalanmamış bir hataya (ErrorBoundary
 * yokken tüm pencereyi boşaltan bir React unmount'una) yol açtığı gözlendi.
 * Tek kalıcı bağlam bu riski tamamen ortadan kaldırır.
 */
/**
 * Pin baloncuğunun süzülme genliği (bkz. index.css `eksim-bubble-float` →
 * translateY -2.6, viewBox birimi). Rings ekran-uzayında olduğundan bu genlik
 * CTM ölçeğiyle piksele çevrilir ki rings ile baloncuk BİREBİR aynı fazda bobsun.
 */
const BUBBLE_BOB_VB = 2.6

export function MarkerRingsLayer({
  location,
  color,
  svgRef,
  containerRef
}: MarkerRingsLayerProps): React.JSX.Element {
  const [pos, setPos] = useState<Point>({ x: -9999, y: -9999 })
  // Baloncuğun süzülme genliğinin EKRAN-uzayı karşılığı (px) — CTM ölçeğinden.
  const [bobPx, setBobPx] = useState(3)
  const [resizeNonce, setResizeNonce] = useState(0)

  useEffect(() => {
    const onResize = (): void => setResizeNonce((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useLayoutEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    // location null iken konumu KASITLI güncellemiyoruz — görünmez olduğundan
    // (opacity:0) önemsiz, ve son bilinen konumda kalması bir sonraki
    // gösterimde konum sıçramasını önler.
    if (!location || !svg || !container) return
    const vb = locationToViewBox(location)
    const screen = viewBoxToScreen(svg, vb)
    // 1 viewBox biriminin ekran-uzayı karşılığı (dikey ölçek) → bob px'i.
    const screen1 = viewBoxToScreen(svg, { x: vb.x, y: vb.y + 1 })
    if (!screen || !screen1) return
    const rect = container.getBoundingClientRect()
    setPos({ x: screen.x - rect.left, y: screen.y - rect.top })
    setBobPx(Math.abs(screen1.y - screen.y) * BUBBLE_BOB_VB)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.id, resizeNonce, svgRef, containerRef])

  const active = !!location
  // Baloncukla AYNI faz kayması (LocationMarker'daki floatDelay ile birebir):
  // aynı pin `point`'i → aynı gecikme → rings ve baloncuk kilitli bobar.
  const floatDelay = location
    ? -(((): number => {
        const p = locationToViewBox(location)
        return (p.x + p.y) % 3.6
      })())
    : 0

  return (
    <div
      className="pointer-events-none absolute z-[16] eksim-rings-float"
      style={{
        left: pos.x - RING_BOX / 2,
        top: pos.y - RING_BOX / 2,
        width: RING_BOX,
        height: RING_BOX,
        opacity: active ? 1 : 0,
        transition: 'opacity 0.3s ease',
        animationDelay: `${floatDelay}s`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['--rings-bob' as any]: `${bobPx}px`
      }}
    >
      <MagicRings
        color={color}
        colorTwo="#ffffff"
        ringCount={2}
        speed={0.7}
        attenuation={13}
        lineThickness={1}
        baseRadius={0.2}
        radiusStep={0.1}
        scaleRate={0.10}
        opacity={0.7}
        noiseAmount={0.04}
        ringGap={1}
        fadeIn={0.5}
        fadeOut={0.6}
        followMouse={false}
        hoverScale={1}
        parallax={0}
        clickBurst={false}
        paused={!active}
      />
    </div>
  )
}
