import React, { useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { EksimLocation, Point } from '@shared/types'
import { locationToViewBox, viewBoxToScreen } from '../../services/svgMapService'
import { accentColor } from './SectorGraphics'
import { LocationPopup, type PopupMode } from './LocationPopup'

/** Aktif dwell (geri sayım) durumu — MapScreen'den gelir. */
export interface DwellState {
  location: EksimLocation
  secondsLeft: number
  progress: number
}

interface PopupLayerProps {
  locations: readonly EksimLocation[]
  activeLocation: EksimLocation | null
  dwell: DwellState | null
  /** Popup katmanı gizli olmalı mı (ör. intro). */
  hidden?: boolean
  svgRef: React.RefObject<SVGSVGElement | null>
  containerRef: React.RefObject<HTMLElement | null>
}

/** Idle önizleme döngüsünde her pinin gösterim süresi (ms). */
const CYCLE_MS = 10000
/** Kartın yatay yarı-genişlik payı (ekran kenarına yaslanmayı önler). */
const X_PAD = 150

interface Resolved {
  location: EksimLocation
  mode: PopupMode
  secondsLeft: number
  progress: number
}

/**
 * Pin popup orkestratörü. Durum önceliği: active > countdown(dwell) > preview
 * (idle döngü). Idle'da pinleri sırayla, tek tek, loop halinde tanıtır. Konum
 * pin → ekran projeksiyonuyla hesaplanır (viewBoxToScreen); mod değişiminde
 * (aynı pin) konum sabit kalır → popup yerinde büyür.
 */
export function PopupLayer({
  locations,
  activeLocation,
  dwell,
  hidden = false,
  svgRef,
  containerRef
}: PopupLayerProps): React.JSX.Element | null {
  const [cycleIndex, setCycleIndex] = useState(0)
  const [pos, setPos] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null)
  const [resizeNonce, setResizeNonce] = useState(0)

  // Pencere yeniden boyutlanınca konumu tazele (aşağıdaki layout effect'i tetikler).
  useEffect(() => {
    const onResize = (): void => setResizeNonce((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Idle önizleme döngüsü — yalnızca boştayken (active/dwell/hidden yokken) döner.
  const idle = !activeLocation && !dwell && !hidden
  useEffect(() => {
    if (idle || locations.length === 0) {
      if (!idle) return
      const id = window.setInterval(
        () => setCycleIndex((i) => (i + 1) % locations.length),
        CYCLE_MS
      )
      return () => window.clearInterval(id)
    }
    return undefined
  }, [idle, locations.length])

  // Gösterilecek hedef + mod.
  let resolved: Resolved | null = null
  if (hidden) {
    resolved = null
  } else if (activeLocation) {
    resolved = { location: activeLocation, mode: 'active', secondsLeft: 0, progress: 1 }
  } else if (dwell) {
    resolved = {
      location: dwell.location,
      mode: 'countdown',
      secondsLeft: dwell.secondsLeft,
      progress: dwell.progress
    }
  } else if (locations.length > 0) {
    resolved = {
      location: locations[cycleIndex % locations.length],
      mode: 'preview',
      secondsLeft: 0,
      progress: 0
    }
  }

  const targetId = resolved?.location.id ?? null

  // Konumu hesapla — hedef pin veya resize değişince (mod değişince DEĞİL → sabit).
  useLayoutEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!resolved || !svg || !container) {
      setPos(null)
      return
    }
    const vb: Point = locationToViewBox(resolved.location)
    const screen = viewBoxToScreen(svg, vb)
    if (!screen) return
    const rect = container.getBoundingClientRect()
    const x = Math.min(Math.max(screen.x - rect.left, X_PAD), rect.width - X_PAD)
    const y = screen.y - rect.top
    // Popup her zaman pinin ALTINDA gösterilir (kullanıcı tercihi).
    setPos({ x, y, placement: 'bottom' })
    // resolved.mode kasıtlı olarak bağımlılık DEĞİL: aynı pinde büyürken kaymaz.
    // resizeNonce → pencere yeniden boyutlanınca yeniden hesapla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, resizeNonce, svgRef, containerRef])

  // z-30: harita (z-10) ve idle panel (z-20) ÜSTÜNDE, logo (z-40)/intro (z-50)
  // altında. pointer-events-none → harita hover etkileşimi bozulmaz. Bu sarmalayıcı
  // olmadan popup z-auto kalır ve z-10 uydu haritanın ARKASINDA boyanır (görünmez).
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <AnimatePresence>
        {resolved && pos && (
          <LocationPopup
            key={resolved.location.id}
            pos={{ x: pos.x, y: pos.y }}
            placement={pos.placement}
            mode={resolved.mode}
            location={resolved.location}
            kinds={resolved.location.kinds}
            color={accentColor(resolved.location.kinds)}
            countdown={resolved.secondsLeft}
            progress={resolved.progress}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
