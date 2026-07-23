import React, { useLayoutEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { EksimLocation, FacilityKind } from '@shared/types'
import { viewBoxToScreen } from '../../services/svgMapService'
import { FACILITY_LABEL, FACILITY_COLOR, SectorIcon } from './SectorGraphics'
import { regionBBox, type MapRegion } from './regions'

interface RegionPopupProps {
  region: MapRegion
  members: EksimLocation[]
  svgRef: React.RefObject<SVGSVGElement | null>
  containerRef: React.RefObject<HTMLElement | null>
}

/** Bölge kenarı ile kart arası dikey boşluk (px). */
const GAP = 26

/** Üye pinleri türe göre sayar (bir pin birden çok türe katkı verebilir). */
function kindCounts(members: EksimLocation[]): Array<{ kind: FacilityKind; count: number }> {
  const counts = new Map<FacilityKind, number>()
  for (const m of members) {
    for (const k of m.kinds) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([kind, count]) => ({ kind, count }))
}

/**
 * Standby (boşta önizleme) döngüsünde sırası bölgeye gelince gösterilen özet
 * kartı — bölge adı, kısa açıklama ve içindeki tür/sayı rozetleri. Pencereyi
 * AÇMAZ (yalnız bilgi). Bölgenin üst-orta kenarına `viewBoxToScreen` ile
 * hizalanır (ana harita statik → tek ölçüm yeterli). Cam tasarım LocationPopup
 * diliyle tutarlı.
 */
export function RegionPopup({
  region,
  members,
  svgRef,
  containerRef
}: RegionPopupProps): React.JSX.Element | null {
  const [placed, setPlaced] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(
    null
  )

  useLayoutEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return
    const b = regionBBox(region, 0)
    const cx = b.x + b.width / 2
    const top = viewBoxToScreen(svg, { x: cx, y: b.y })
    const bottom = viewBoxToScreen(svg, { x: cx, y: b.y + b.height })
    if (!top || !bottom) return
    const rect = container.getBoundingClientRect()
    const topY = top.y - rect.top
    const placement: 'top' | 'bottom' = topY < 240 ? 'bottom' : 'top'
    const anchor = placement === 'top' ? top : bottom
    setPlaced({
      x: anchor.x - rect.left,
      y: anchor.y - rect.top + (placement === 'top' ? -GAP : GAP),
      placement
    })
  }, [region, svgRef, containerRef])

  if (!placed) return null
  const counts = kindCounts(members)

  return (
    <div className="pointer-events-none absolute" style={{ left: placed.x, top: placed.y }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: placed.placement === 'top' ? 8 : -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transform: placed.placement === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
          width: 300,
          borderRadius: 22,
          background: 'rgba(10, 16, 32, 0.6)',
          backdropFilter: 'blur(16px) saturate(1.5)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
          border: '1px solid rgba(255,255,255,0.13)',
          boxShadow:
            '0 0 2px 1px rgba(255,255,255,0.10) inset, 0 18px 48px -16px rgba(2,6,16,0.8)'
        }}
      >
        <div className="px-4 pb-3 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">Bölge</p>
          <h3 className="mt-1 text-[19px] font-bold leading-tight tracking-tight text-white">
            {region.name}
          </h3>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-300/80">{region.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {counts.map(({ kind, count }) => (
              <span
                key={kind}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white/90"
                style={{
                  background: `${FACILITY_COLOR[kind]}1f`,
                  boxShadow: `inset 0 0 0 1px ${FACILITY_COLOR[kind]}55`
                }}
              >
                <SectorIcon kind={kind} style={{ color: FACILITY_COLOR[kind], width: 14, height: 14 }} />
                {FACILITY_LABEL[kind]}
                <span className="tabular-nums text-white/60">· {count}</span>
              </span>
            ))}
          </div>

          <p className="mt-3 text-[10.5px] font-medium tracking-wide text-white/45">
            Ayrıntı için bölgeye dokunun
          </p>
        </div>
      </motion.div>
    </div>
  )
}
