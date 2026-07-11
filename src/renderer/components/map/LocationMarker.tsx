import React, { useState } from 'react'
import type { EksimLocation, FacilityKind, Point } from '@shared/types'
import type { MarkerVisualState } from './markerState'
import windGif from '../../assets/wind.gif'
import solarGif from '../../assets/solar-panel.gif'
import hydroGif from '../../assets/hydro.gif'
import windAndPanelGif from '../../assets/wind-and-panel.gif'

interface LocationMarkerProps {
  location: EksimLocation
  /** viewBox koordinatı. */
  point: Point
  color: string
  /** Görsel durum — bkz. markerState.ts (idle/preview/countdown/active/suppressed). */
  state: MarkerVisualState
  /** Hover-dwell etkileşimi açık mı (figureTouch=false iken true). */
  interactive: boolean
  /** İmleç gir/çıkışını ebeveyne bildirir (dwell/geri sayım MapScreen'de yönetilir). */
  onHoverChange?: (hovering: boolean, location: EksimLocation) => void
}

/** Baloncuk çapı (viewBox birimi) — "ne büyük ne küçük", orta boy. */
const BUBBLE = 38

/**
 * Santral türlerine göre baloncuk GIF'i:
 * yalnız rüzgar → wind.gif; yalnız güneş → solar-panel.gif; yalnız hidro →
 * hydro.gif; rüzgar+güneş hibrit → wind-and-panel.gif.
 */
function bubbleGif(kinds: FacilityKind[]): string {
  if (kinds.includes('wind') && kinds.includes('solar')) return windAndPanelGif
  if (kinds.includes('solar')) return solarGif
  if (kinds.includes('hydro')) return hydroGif
  return windGif
}

/** Görsel durum → ölçek (baloncuk boyutu). preview'da küçülür ama kaybolmaz. */
function scaleFor(state: MarkerVisualState, hovering: boolean): number {
  switch (state) {
    case 'preview':
      return 0.68
    case 'active':
    case 'suppressed':
      return 0.4
    case 'countdown':
      return 1
    default:
      return hovering ? 1.1 : 1
  }
}

/**
 * Haritadaki tek tesis pini — düz beyaz yuvarlak "GIF baloncuğu".
 *
 *  - idle: hafif yukarı-aşağı süzülen (CSS `eksim-bubble-float`, compositor-only)
 *    beyaz daire; içinde türe göre animasyonlu GIF ikon. GIF, SVG `<image>`
 *    Chromium'da animasyon oynatmadığı için `<foreignObject>` + `<img>` ile çizilir.
 *  - Hover: daire hafif büyür + parlar (davetkarlık).
 *  - countdown (dwell, 3 sn): baloncuk KAYBOLMAZ, tam boyda kalır — çevresinde
 *    MagicRings efekti MarkerRingsLayer tarafından ayrıca çizilir.
 *  - preview (idle 10 sn önizleme): baloncuk küçülür (KAYBOLMAZ) + MagicRings.
 *  - active (seçim tamamlandı): baloncuk tamamen kaybolur, il boyanır.
 *  - suppressed (yakın komşu pin bilerek gizlenmiş): tamamen kaybolur.
 *
 * Şeffaf hover hedefi DAİMA canlı kalır → imlecin ayrılması baloncuk
 * gizliyken de algılanır. GIF `<img>` DOM'da hep kalır (gizlenirken unmount
 * edilmez) — yeniden yükleme/başa sarma titremesi olmaz.
 */
export function LocationMarker({
  location,
  point,
  color,
  state,
  interactive,
  onHoverChange
}: LocationMarkerProps): React.JSX.Element {
  const [hovering, setHovering] = useState(false)

  const handleEnter = (): void => {
    if (!interactive) return
    setHovering(true)
    onHoverChange?.(true, location)
  }

  const handleLeave = (): void => {
    if (!interactive) return
    setHovering(false)
    onHoverChange?.(false, location)
  }

  const hidden = state === 'active' || state === 'suppressed'
  const scale = scaleFor(state, hovering)
  // Pin sırasına bağlı sabit faz kayması → baloncuklar senkron zıplamaz.
  const floatDelay = -((point.x + point.y) % 3.6)

  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Geniş şeffaf hover hedefi. Aktif/gizliyken de canlı kalır ki imlecin
          konumdan AYRILMASI algılanabilsin (ayrılınca video durur). */}
      <circle r={28} fill="transparent" pointerEvents={interactive ? 'all' : 'none'} />

      <foreignObject
        x={-BUBBLE / 2}
        y={-BUBBLE / 2}
        width={BUBBLE}
        height={BUBBLE}
        pointerEvents="none"
        style={{ overflow: 'visible' }}
      >
        {/* Dış katman: gizlenme/küçülme/hover ölçeği (transition). İç katman:
            süzülme animasyonu (ayrı öğe → transform'lar çakışmaz). */}
        <div
          style={{
            width: BUBBLE,
            height: BUBBLE,
            opacity: hidden ? 0 : 1,
            transform: `scale(${scale})`,
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <div
            className="eksim-bubble-float"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animationDelay: `${floatDelay}s`,
              boxShadow:
                hovering || state === 'countdown'
                  ? `0 0 0 2px ${color}cc, 0 0 14px 3px ${color}88, 0 3px 10px rgba(2,6,16,0.55)`
                  : `0 0 0 1px rgba(255,255,255,0.55), 0 0 10px 1px ${color}44, 0 3px 8px rgba(2,6,16,0.45)`,
              transition: 'box-shadow 0.3s ease'
            }}
          >
            <img
              src={bubbleGif(location.kinds)}
              alt=""
              draggable={false}
              style={{
                width: '78%',
                height: '78%',
                objectFit: 'contain',
                userSelect: 'none'
              }}
            />
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
