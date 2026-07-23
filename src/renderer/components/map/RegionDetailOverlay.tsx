import React, { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { EksimLocation, Sector } from '@shared/types'
import { SECTOR_META } from '@shared/sectors'
import satelliteUrl from '../../assets/turkey-satellite.jpg'
import { MAP_RECT } from './turkeyGeometry'
import { TR_PROVINCES } from './trProvinces'
import { locationToViewBox, viewBoxToScreen } from '../../services/svgMapService'
import { LocationMarker } from './LocationMarker'
import { ConnectionGrid } from './ConnectionGrid'
import { PopupLayer, type DwellState } from './PopupLayer'
import { accentColor } from './SectorGraphics'
import type { MarkerVisualState } from './markerState'
import { regionBBox, type MapRegion } from './regions'

interface RegionDetailOverlayProps {
  region: MapRegion
  /** Bölgedeki görünür pinler (sektör filtresi uygulanmış). */
  members: EksimLocation[]
  /** Ana harita SVG'si — bölgenin ekran dikdörtgenini (kaynak) hesaplamak için. */
  mainSvgRef: React.RefObject<SVGSVGElement>
  /** Overlay SVG'si — MapScreen figür isabet testini bunun CTM'iyle yapar. */
  svgRef: React.RefObject<SVGSVGElement>
  figureTouch: boolean
  activeLocation: EksimLocation | null
  dwell: DwellState | null
  markerStateFor: (loc: EksimLocation) => MarkerVisualState
  onMarkerHover: (loc: EksimLocation, hovering: boolean) => void
  onClose: () => void
}

/** Üyeleri sektöre göre gruplar (her sektörün kendi bağlantı ızgarası). */
function groupBySector(members: EksimLocation[]): Array<[Sector, EksimLocation[]]> {
  const map = new Map<Sector, EksimLocation[]>()
  for (const loc of members) {
    const g = map.get(loc.sector)
    if (g) g.push(loc)
    else map.set(loc.sector, [loc])
  }
  return Array.from(map.entries())
}

/**
 * Sıkışık bir detay bölgesinin BÜYÜTÜLMÜŞ penceresi — ana haritaya zoom
 * eklemeden. Bölge, KENDİ SVG'sinde `viewBox={bölge bbox}` ile çizilir; il
 * yolları ve pin projeksiyonu ana haritayla AYNI simplemaps koordinat uzayında
 * olduğundan büyütme, koordinat sapması olmadan otomatik olur.
 *
 * Geçiş (FLIP, transform-only → GPU): pencere hedef (ortalanmış) dikdörtgende
 * konumlanır; `initial` transform onu ana haritadaki bölgenin ekran
 * dikdörtgenine geri eşler → oradan büyüyerek ortaya oturur. Pinler ancak geçiş
 * bitince (`pinsVisible`) belirir; kapanışta pencere geri küçülür (AnimatePresence
 * exit — MapScreen sarmalar).
 *
 * Etkileşim: pinler ana haritayla AYNI aktivasyon makinesini (markerStateFor /
 * onMarkerHover / activate) ve popup katmanını yeniden kullanır → figür/dwell →
 * aynı IPC ile video oynar.
 */
export function RegionDetailOverlay({
  region,
  members,
  mainSvgRef,
  svgRef,
  figureTouch,
  activeLocation,
  dwell,
  markerStateFor,
  onMarkerHover,
  onClose
}: RegionDetailOverlayProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const [pinsVisible, setPinsVisible] = useState(false)

  // Geometri: bölge bbox → viewBox; hedef (ortalanmış, bbox en-boyunu koruyan)
  // dikdörtgen; ana haritadaki kaynak dikdörtgenden hedefe FLIP transform'u.
  const geom = useMemo(() => {
    const bbox = regionBBox(region, 12)
    const winW = window.innerWidth
    const winH = window.innerHeight
    const aspect = bbox.width / bbox.height
    let w = winW * 0.86
    let h = w / aspect
    if (h > winH * 0.82) {
      h = winH * 0.82
      w = h * aspect
    }
    const target = { x: (winW - w) / 2, y: (winH - h) / 2, w, h }

    let source = target
    const svg = mainSvgRef.current
    if (svg) {
      const p1 = viewBoxToScreen(svg, { x: bbox.x, y: bbox.y })
      const p2 = viewBoxToScreen(svg, { x: bbox.x + bbox.width, y: bbox.y + bbox.height })
      if (p1 && p2) source = { x: p1.x, y: p1.y, w: p2.x - p1.x, h: p2.y - p1.y }
    }
    const from = {
      x: source.x + source.w / 2 - (target.x + target.w / 2),
      y: source.y + source.h / 2 - (target.y + target.h / 2),
      scale: source.w / target.w
    }
    // Ölçek: overlay birimlerinin ekran boyutunu ana harita ölçeğine yaklaştırır
    // (~963 = 1120 ana viewBox genişliği * 0.86 hedef oranı). Çizgi/pin
    // kalınlıkları buna göre inceltilir ki büyütmede "standart" görünsün.
    const unitScale = bbox.width / 963
    return {
      bbox,
      viewBox: `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`,
      target,
      from,
      unitScale,
      bubble: (38 * unitScale) * 1.4
    }
  }, [region, mainSvgRef])

  const clipId = `region-clip-${region.id}`
  const groups = groupBySector(members)

  return (
    <div ref={rootRef} className="fixed inset-0 z-50">
      {/* Karartma perdesi — dışına dokununca kapanır. */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'rgba(2, 6, 16, 0.68)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        onPointerDown={onClose}
        onTouchStart={onClose}
      />

      {/* Büyüyen bölge penceresi. */}
      <motion.div
        className="absolute overflow-hidden rounded-3xl"
        style={{
          left: geom.target.x,
          top: geom.target.y,
          width: geom.target.w,
          height: geom.target.h,
          background: '#0A1020',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 120px -30px rgba(2,6,16,0.9)'
        }}
        initial={{ x: geom.from.x, y: geom.from.y, scale: geom.from.scale, opacity: 0.5 }}
        animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        exit={{ x: geom.from.x, y: geom.from.y, scale: geom.from.scale, opacity: 0.3 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={() => setPinsVisible(true)}
      >
        <svg
          ref={svgRef}
          viewBox={geom.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full touch-none select-none"
        >
          <defs>
            <clipPath id={clipId}>
              {region.provinceIds.map((id) =>
                TR_PROVINCES[id] ? <path key={id} d={TR_PROVINCES[id].d} /> : null
              )}
            </clipPath>
          </defs>

          {/* Uydu dokusu (bölgeye kırpılı) + koyu perde → "uydu + stilize" zemin. */}
          <g clipPath={`url(#${clipId})`}>
            <image
              href={satelliteUrl}
              x={MAP_RECT.x}
              y={MAP_RECT.y}
              width={MAP_RECT.width}
              height={MAP_RECT.height}
              preserveAspectRatio="none"
            />
            <rect
              x={MAP_RECT.x}
              y={MAP_RECT.y}
              width={MAP_RECT.width}
              height={MAP_RECT.height}
              fill="#0A1020"
              opacity={0.42}
            />
          </g>

          {/* Accent il sınırları — non-scaling-stroke: yakınlaşmadan bağımsız keskin. */}
          {region.provinceIds.map((id) => {
            const province = TR_PROVINCES[id]
            if (!province) return null
            return (
              <path
                key={`o-${id}`}
                d={province.d}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1.4}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}

          {/* Pinler + bağlantı ızgaraları — geçiş bitince belirir. */}
          {pinsVisible && (
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              {groups.map(([sector, locs]) => (
                <ConnectionGrid
                  key={sector}
                  locations={locs}
                  variant={SECTOR_META[sector].connection}
                  color={SECTOR_META[sector].color}
                  strokeScale={geom.unitScale}
                />
              ))}
              {members.map((loc) => (
                <LocationMarker
                  key={loc.id}
                  location={loc}
                  point={locationToViewBox(loc)}
                  color={accentColor(loc.kinds)}
                  state={markerStateFor(loc)}
                  interactive={!figureTouch}
                  bubble={geom.bubble}
                  onHoverChange={(hovering) => onMarkerHover(loc, hovering)}
                />
              ))}
            </motion.g>
          )}
        </svg>

        {/* Başlık + kapat. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/55">Bölge</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-white">{region.name}</h2>
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onClose()
            }}
            aria-label="Bölge penceresini kapat"
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            style={{ background: 'rgba(10,16,32,0.6)', backdropFilter: 'blur(8px)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </motion.div>

      {/* Popup katmanı pencerenin DIŞINDA — pencere overflow-hidden olduğundan
          içinde kalsa kırpılırdı. Konum overlay SVG'sinin CTM'inden gelir,
          konteyner tam ekran root (kırpma yok). Popup'lar yalnız geçiş bittikten
          sonra (aktif/dwell) göründüğü için pencere kimlik transformundadır. */}
      <PopupLayer
        activeLocation={activeLocation}
        dwell={dwell}
        previewLocation={null}
        svgRef={svgRef}
        containerRef={rootRef}
      />
    </div>
  )
}
