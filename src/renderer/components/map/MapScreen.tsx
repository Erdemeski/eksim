import React, { useCallback, useEffect, useRef } from 'react'
import { TurkeyMap } from './TurkeyMap'
import { RippleLayer } from './RippleLayer'
import { LocationHud } from './LocationHud'
import { useFigureTouch } from '../../hooks/useFigureTouch'
import { useKioskStore } from '../../store/useKioskStore'
import { ipcService } from '../../services/ipcService'
import {
  locationToViewBox,
  nearestLocation,
  screenToViewBox
} from '../../services/svgMapService'
import { EKSIM_LOCATIONS } from '@shared/locations'
import type { EksimLocation, FigureEventPayload, FigureResult } from '@shared/types'

const SECTOR_COLOR: Record<EksimLocation['sector'], string> = {
  energy: '#2EA6FF',
  food: '#34D399'
}

/**
 * Monitör 1 — Türkiye SVG haritası deneyimi.
 *
 * Akış: useFigureTouch → centroid (ekran px) → screenToViewBox → nearestLocation
 * → store + IPC (video ekranına). Aktif tesiste GSAP ripple + Framer Motion HUD.
 */
export function MapScreen(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const figureTouch = useKioskStore((s) => s.touchConfig.figureTouch)
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const setFigure = useKioskStore((s) => s.setFigure)

  const handleFigure = useCallback(
    (result: FigureResult) => {
      const container = containerRef.current
      const svg = svgRef.current
      if (!container || !svg) return

      // Hook element-yerel px verir; client'a çevirip viewBox'a projelendir.
      const rect = container.getBoundingClientRect()
      const viewBoxPoint = screenToViewBox(
        svg,
        result.centroid.x + rect.left,
        result.centroid.y + rect.top
      )
      if (!viewBoxPoint) return

      const location = nearestLocation(viewBoxPoint, EKSIM_LOCATIONS)
      setFigure(result)
      setActiveLocation(location)

      const payload: FigureEventPayload = { result, location }
      ipcService.emitFigure(payload)
    },
    [setFigure, setActiveLocation]
  )

  const handleLift = useCallback(() => {
    setFigure(null)
    setActiveLocation(null)
    ipcService.emitFigureLifted()
  }, [setFigure, setActiveLocation])

  useFigureTouch({ targetRef: containerRef, onFigure: handleFigure, onLift: handleLift })

  // main'den (Ctrl+Shift+F) gelen figureTouch değişimini store'a uygula.
  useEffect(() => ipcService.onFigureTouchChanged((v) => useKioskStore.getState().setFigureTouch(v)), [])

  const accent = activeLocation ? SECTOR_COLOR[activeLocation.sector] : '#2EA6FF'

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-eksim-ink ${figureTouch ? 'cursor-none' : ''}`}
    >
      <TurkeyMap svgRef={svgRef}>
        {EKSIM_LOCATIONS.map((loc) => {
          const p = locationToViewBox(loc)
          const isActive = activeLocation?.id === loc.id
          return (
            <g key={loc.id} transform={`translate(${p.x}, ${p.y})`} pointerEvents="none">
              <circle
                r={isActive ? 3.6 : 2.4}
                fill={SECTOR_COLOR[loc.sector]}
                opacity={isActive ? 1 : 0.7}
              />
            </g>
          )
        })}

        {activeLocation && (
          <RippleLayer point={locationToViewBox(activeLocation)} color={accent} />
        )}
      </TurkeyMap>

      <LocationHud location={activeLocation} />
    </div>
  )
}
