import React, { useCallback, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { TurkeyMap } from './TurkeyMap'
import { MapBackground } from './MapBackground'
import { LightRays } from './LightRays'
import { EnergyGrid } from './EnergyGrid'
import { LocationMarker } from './LocationMarker'
import { LocationPinEmblem } from './LocationPinEmblem'
import { PopupLayer, type DwellState } from './PopupLayer'
import { MapIdlePanel } from './MapIdlePanel'
import { RippleLayer } from './RippleLayer'
import { accentColor } from './SectorGraphics'
import { BrandLogo } from '../brand/BrandLogo'
import { IntroScreen } from '../intro/IntroScreen'
import { useFigureTouch } from '../../hooks/useFigureTouch'
import { useKioskStore } from '../../store/useKioskStore'
import { ipcService } from '../../services/ipcService'
import { locationToViewBox, nearestLocation, screenToViewBox } from '../../services/svgMapService'
import { EKSIM_LOCATIONS } from '@shared/locations'
import type { EksimLocation, FigureEventPayload, FigureResult } from '@shared/types'

/** Tesis vurgu rengi — hibrit sahalarda ayırt edici mor, tekil türde kendi rengi. */
function colorOf(loc: EksimLocation): string {
  return accentColor(loc.kinds)
}

/**
 * Tangible (figür) modu için boşta güvenlik ağı: figür kaldırma sinyali
 * kaçarsa bu süre sonunda boşta moda dön. Pointer (imleç) modunda kullanılmaz —
 * orada deaktivasyon imlecin konumdan ayrılmasına bağlıdır.
 */
const IDLE_MS = 15000
/** Pointer modu: imleç aktif konumdan ayrıldıktan sonra videoyu durdurma payı. */
const LEAVE_GRACE_MS = 400
/** Pointer modu: bir pine imleç gelince aktivasyona kadar geri sayım (sn). */
const DWELL_SECONDS = 3

/**
 * Monitör 1 — Türkiye SVG haritası deneyimi.
 *
 *  - Açılışta GSAP intro.
 *  - figureTouch=false: pine imleç → 3 sn dwell (geri sayım popup'ta) → seçim.
 *  - figureTouch=true: fiziksel figür (3 nokta) touchMath ile anında seçer.
 *  - Boşta: pinler arasında sırayla dönen tanıtım popup'ları (PopupLayer).
 */
export function MapScreen(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const dwellTween = useRef<gsap.core.Tween | null>(null)

  const figureTouch = useKioskStore((s) => s.touchConfig.figureTouch)
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const setFigure = useKioskStore((s) => s.setFigure)
  const [intro, setIntro] = useState(true)
  const [dwell, setDwell] = useState<DwellState | null>(null)

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
      dwellTween.current?.kill()
      dwellTween.current = null
      setDwell(null)
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

  const cancelDwell = useCallback(() => {
    dwellTween.current?.kill()
    dwellTween.current = null
    setDwell(null)
  }, [])

  // Pointer modu geri sayımı MapScreen'de (popup'ı besler). GSAP proxy tween:
  // secondsLeft (3→1) + pürüzsüz progress (0→1); tamamlanınca aktive eder.
  const startDwell = useCallback(
    (location: EksimLocation) => {
      dwellTween.current?.kill()
      setDwell({ location, secondsLeft: DWELL_SECONDS, progress: 0 })
      const proxy = { v: DWELL_SECONDS }
      dwellTween.current = gsap.to(proxy, {
        v: 0,
        duration: DWELL_SECONDS,
        ease: 'none',
        onUpdate: () =>
          setDwell({
            location,
            secondsLeft: Math.max(1, Math.ceil(proxy.v)),
            progress: 1 - proxy.v / DWELL_SECONDS
          }),
        onComplete: () => {
          dwellTween.current = null
          activate(location)
        }
      })
    },
    [activate]
  )

  // İmleç gir/çıkışı: aktif pin → grace (ayrılınca video durur); aktif olmayan
  // interaktif pin → dwell geri sayımı başlat/iptal (popup içinde görünür).
  const handleMarkerHover = useCallback(
    (loc: EksimLocation, hovering: boolean) => {
      const activeId = useKioskStore.getState().activeLocation?.id
      if (loc.id === activeId) {
        window.clearTimeout(idleTimer.current)
        if (!hovering) idleTimer.current = window.setTimeout(deactivate, LEAVE_GRACE_MS)
        return
      }
      if (hovering) startDwell(loc)
      else cancelDwell()
    },
    [deactivate, startDwell, cancelDwell]
  )

  // Tangible mod: 3 noktalı figür → en yakın tesis. Pointer sonuçları yok sayılır
  // (onları hover-dwell yapan LocationMarker/MapScreen yönetir).
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
  useEffect(
    () => () => {
      window.clearTimeout(idleTimer.current)
      dwellTween.current?.kill()
    },
    []
  )

  const accent = activeLocation ? colorOf(activeLocation) : '#2EA6FF'

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-eksim-ink ${figureTouch ? 'cursor-none' : ''}`}
    >
      <BrandLogo />

      {/* PERF: intro (drawMap) ekranı z-50'de tam opak kaplıyor; altındaki
          parçacık döngüsünü ve EnergyGrid'i bu pencerede durdurmak görünürde
          hiçbir şeyi değiştirmez ama açılıştaki en ağır CPU/GPU burst'ünü keser. */}
      <MapBackground paused={!!activeLocation || intro} />

      <div className="absolute inset-0 z-10">
        <TurkeyMap svgRef={svgRef}>
          {!intro && <EnergyGrid locations={EKSIM_LOCATIONS} />}

          {/* Pin yanı santral amblemleri (aktif/geri sayım pininde geri çekilir). */}
          {!intro &&
            EKSIM_LOCATIONS.map((loc) => (
              <LocationPinEmblem
                key={`emb-${loc.id}`}
                point={locationToViewBox(loc)}
                kinds={loc.kinds}
                dimmed={activeLocation?.id === loc.id || dwell?.location.id === loc.id}
              />
            ))}

          {EKSIM_LOCATIONS.map((loc) => (
            <LocationMarker
              key={loc.id}
              location={loc}
              point={locationToViewBox(loc)}
              color={colorOf(loc)}
              active={activeLocation?.id === loc.id}
              interactive={!figureTouch}
              onHoverChange={(hovering) => handleMarkerHover(loc, hovering)}
            />
          ))}

          {activeLocation && (
            <RippleLayer point={locationToViewBox(activeLocation)} color={accent} />
          )}
        </TurkeyMap>
      </div>

      {/* Üstten yayılan ışık hüzmeleri (gerçek WebGL/ogl, bkz. LightRays.tsx).
          z-15: harita katmanının (z-10) ÜSTÜNDE, idle panel/popup'ın (z-20/30)
          ALTINDA — pointer-events-none, etkileşimi etkilemez. Işıma pin aktifken
          de SÜRER (kullanıcı isteği); yalnızca pencere gizliyken durur (bileşen
          içindeki `document.hidden` koruması). */}
      {!intro && (
        <div className="pointer-events-none absolute inset-0 z-[15]">
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={0.3}
            lightSpread={0.5}
            rayLength={1}
            fadeDistance={1}
            saturation={1}
            pulsating
            followMouse
            mouseInfluence={0.08}
            noiseAmount={0}
            distortion={0}
            paused={false}
          />
        </div>
      )}

      {/* Pin popup katmanı (idle tanıtım + geri sayım + aktif detay). */}
      <PopupLayer
        locations={EKSIM_LOCATIONS}
        activeLocation={activeLocation}
        dwell={dwell}
        hidden={intro}
        svgRef={svgRef}
        containerRef={containerRef}
      />

      <div className="pointer-events-none absolute inset-0 z-20">
        <MapIdlePanel show={!activeLocation && !intro} />
      </div>

      {intro && <IntroScreen drawMap onDone={() => setIntro(false)} />}
    </div>
  )
}
