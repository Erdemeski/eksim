import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TurkeyMap } from './TurkeyMap'
import { MapBackground } from './MapBackground'
import { EnergyGrid } from './EnergyGrid'
import { LocationMarker } from './LocationMarker'
import { MapIdlePanel } from './MapIdlePanel'
import { RippleLayer } from './RippleLayer'
import { IntroScreen } from '../intro/IntroScreen'
import { useFigureTouch } from '../../hooks/useFigureTouch'
import { useKioskStore } from '../../store/useKioskStore'
import { ipcService } from '../../services/ipcService'
import { locationToViewBox, nearestLocation, screenToViewBox } from '../../services/svgMapService'
import { EKSIM_LOCATIONS } from '@shared/locations'
import type { EksimLocation, FigureEventPayload, FigureResult } from '@shared/types'

const SECTOR_COLOR: Record<EksimLocation['sector'], string> = {
  energy: '#2EA6FF',
  food: '#34D399'
}

/**
 * Tangible (figür) modu için boşta güvenlik ağı: figür kaldırma sinyali
 * kaçarsa bu süre sonunda boşta moda dön. Pointer (imleç) modunda kullanılmaz —
 * orada deaktivasyon imlecin konumdan ayrılmasına bağlıdır.
 */
const IDLE_MS = 15000
/** Pointer modu: imleç aktif konumdan ayrıldıktan sonra videoyu durdurma payı. */
const LEAVE_GRACE_MS = 400

/**
 * Monitör 1 — Türkiye SVG haritası deneyimi.
 *
 *  - Açılışta GSAP intro.
 *  - figureTouch=false: noktalara hover-dwell (büyüme + magic rings + 3 sn geri
 *    sayım) ile seçim. Tıklama gerekmez.
 *  - figureTouch=true: fiziksel figür (3 nokta) touchMath ile anında seçer.
 *  - Boşta: MapIdlePanel (slogan + dönen özet). Aktifte: RippleLayer + IPC.
 */
export function MapScreen(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)

  const figureTouch = useKioskStore((s) => s.touchConfig.figureTouch)
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const setFigure = useKioskStore((s) => s.setFigure)
  const [intro, setIntro] = useState(true)

  const deactivate = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    setFigure(null)
    setActiveLocation(null)
    ipcService.emitFigureLifted()
  }, [setFigure, setActiveLocation])

  const armIdleTimer = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(deactivate, IDLE_MS)
  }, [deactivate])

  const activate = useCallback(
    (location: EksimLocation) => {
      window.clearTimeout(idleTimer.current) // bekleyen grace/idle iptal
      const result: FigureResult = {
        mode: figureTouch ? 'tangible' : 'pointer',
        centroid: location.svgPoint ?? { x: 0, y: 0 },
        rotation: 0,
        figureId: null
      }
      setFigure(result)
      setActiveLocation(location)
      const payload: FigureEventPayload = { result, location }
      ipcService.emitFigure(payload)
      // Pointer modu: imleç konumda kaldığı sürece video döner (loop) ve boşta
      // zamanlayıcı YOK — ayrılınca durur (bkz. handleMarkerHover). Tangible
      // modda ise figür kaldırma kaçarsa diye idle güvenlik ağı kurulur.
      if (figureTouch) armIdleTimer()
    },
    [figureTouch, setFigure, setActiveLocation, armIdleTimer]
  )

  // Pointer modu: yalnızca AKTİF konumun imleç varlığı deaktivasyonu yönetir.
  // İmleç aktif marker'da → oynatım sürer; ayrılınca → kısa grace sonrası durur
  // (jitter/geçiş boşluklarına tolerans). Diğer marker'ların hover'ı burada
  // yok sayılır (kendi dwell'lerini kendileri yönetir).
  const handleMarkerHover = useCallback(
    (loc: EksimLocation, hovering: boolean) => {
      if (loc.id !== useKioskStore.getState().activeLocation?.id) return
      window.clearTimeout(idleTimer.current)
      if (!hovering) idleTimer.current = window.setTimeout(deactivate, LEAVE_GRACE_MS)
    },
    [deactivate]
  )

  // Tangible mod: 3 noktalı figür → en yakın tesis. Pointer sonuçları yok sayılır
  // (onları hover-dwell yapan LocationMarker yönetir).
  const handleFigure = useCallback(
    (result: FigureResult) => {
      if (result.mode !== 'tangible') return
      const container = containerRef.current
      const svg = svgRef.current
      if (!container || !svg) return
      const rect = container.getBoundingClientRect()
      const vb = screenToViewBox(svg, result.centroid.x + rect.left, result.centroid.y + rect.top)
      if (!vb) return
      const location = nearestLocation(vb, EKSIM_LOCATIONS)
      if (location) activate(location)
      else deactivate()
    },
    [activate, deactivate]
  )

  useFigureTouch({ targetRef: containerRef, onFigure: handleFigure, onLift: deactivate })

  useEffect(
    () => ipcService.onFigureTouchChanged((v) => useKioskStore.getState().setFigureTouch(v)),
    []
  )
  useEffect(() => () => window.clearTimeout(idleTimer.current), [])

  const accent = activeLocation ? SECTOR_COLOR[activeLocation.sector] : '#2EA6FF'

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-eksim-ink ${figureTouch ? 'cursor-none' : ''}`}
    >
      <MapBackground />

      <div className="absolute inset-0 z-10">
        <TurkeyMap svgRef={svgRef}>
          <EnergyGrid locations={EKSIM_LOCATIONS} />

          {EKSIM_LOCATIONS.map((loc) => (
            <LocationMarker
              key={loc.id}
              location={loc}
              point={locationToViewBox(loc)}
              color={SECTOR_COLOR[loc.sector]}
              active={activeLocation?.id === loc.id}
              interactive={!figureTouch}
              onActivate={activate}
              onHoverChange={(hovering) => handleMarkerHover(loc, hovering)}
            />
          ))}

          {activeLocation && (
            <RippleLayer point={locationToViewBox(activeLocation)} color={accent} />
          )}
        </TurkeyMap>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <MapIdlePanel show={!activeLocation && !intro} />
      </div>

      {intro && <IntroScreen drawMap onDone={() => setIntro(false)} />}
    </div>
  )
}
