import React, { useEffect, useLayoutEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { EksimLocation } from '@shared/types'
import { viewBoxToScreen } from '../../services/svgMapService'
import { TR_PROVINCES } from './trProvinces'
import { accentColor } from './SectorGraphics'
import { LocationPopup, type PopupMode } from './LocationPopup'

/** Aktif dwell (geri sayım) durumu — MapScreen'den gelir. */
export interface DwellState {
  location: EksimLocation
  secondsLeft: number
  progress: number
}

interface PopupLayerProps {
  activeLocation: EksimLocation | null
  dwell: DwellState | null
  /**
   * Boşta döngüde sırası gelen pin (MapScreen yönetir — il boyama ve baloncuk
   * gizlemeyle aynı kaynak; yalnız tamamen boştayken non-null gelir).
   */
  previewLocation: EksimLocation | null
  /** Popup katmanı gizli olmalı mı (ör. screen saver). */
  hidden?: boolean
  svgRef: React.RefObject<SVGSVGElement | null>
  containerRef: React.RefObject<HTMLElement | null>
}

/** İl kenarı ile kart arası dikey boşluk (px). */
const PROVINCE_GAP = 28
/** Görünür alan yatay kenar payı (px) — kart pencere dışına taşmasın. */
const EDGE_PAD = 20
/**
 * En yüksek aktif kartın MUHAFAZAKÂR yükseklik tahmini (px). CANLI ÖLÇÜM DEĞİL
 * — yalnız "alta koyarsam taşar mı?" kararı için sabit eşik. Ölçüm-bağımsız
 * olması kritik: eski canlı-ölçüm + Y-clamp geri beslemesi güney illerinde
 * "Maximum update depth" ile map penceresini çökertiyordu (bkz. plan).
 */
const EST_CARD_H = 360

interface Resolved {
  location: EksimLocation
  mode: PopupMode
  secondsLeft: number
  progress: number
}

/** Kart genişliği moda göre sabit (LocationPopup'taki style ile birebir). */
function cardWidth(mode: PopupMode): number {
  return mode === 'active' ? 368 : 296
}

/**
 * Pin popup orkestratörü. Durum önceliği: active > countdown(dwell) > preview
 * (idle döngüsü MapScreen'de — buraya previewLocation olarak gelir).
 *
 * Konumlama: kart, pinin bulunduğu İLİN sınır kutusuna (bbox) göre hizalanır
 * (pine değil — bazı iller pinin hemen altında kalıp kartı taşırıyordu).
 * ÖLÇÜMSÜZ üst/alt yerleşim:
 *  - İl ALT kenarı ekranın altına yakınsa (alta koyulursa taşacaksa) kart
 *    ilin ÜST kenarına, `placement='top'` ile (CSS translateY(-100%)) açılır.
 *  - Değilse il ALT kenarına, `placement='bottom'`.
 *  - Yatayda kart genişliğine göre kesin clamp (sabit genişlik → ölçümsüz).
 * Hiçbir yerde kartın gerçek yüksekliği JS ile OKUNMAZ → çocuk→ebeveyn
 * setState geri besleme döngüsü (eski çökme kaynağı) yapısal olarak yok.
 */
export function PopupLayer({
  activeLocation,
  dwell,
  previewLocation,
  hidden = false,
  svgRef,
  containerRef
}: PopupLayerProps): React.JSX.Element | null {
  const [placed, setPlaced] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(
    null
  )
  const [resizeNonce, setResizeNonce] = useState(0)

  // Pencere yeniden boyutlanınca konumu tazele.
  useEffect(() => {
    const onResize = (): void => setResizeNonce((n) => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

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
  } else if (previewLocation) {
    resolved = { location: previewLocation, mode: 'preview', secondsLeft: 0, progress: 0 }
  }

  const targetId = resolved?.location.id ?? null
  const provinceId = resolved?.location.provinceId ?? null

  // TEK geçiş: il bbox'ından ölçümsüz {x, y, placement}. Mod (preview/countdown/
  // active) bilerek bağımlılık DEĞİL → aynı pinde büyürken kart kaymaz.
  useLayoutEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!resolved || !svg || !container || !provinceId) {
      setPlaced(null)
      return
    }
    const province = TR_PROVINCES[provinceId]
    if (!province) {
      setPlaced(null)
      return
    }
    const { bbox } = province
    const cx = bbox.x + bbox.width / 2
    const topScreen = viewBoxToScreen(svg, { x: cx, y: bbox.y })
    const bottomScreen = viewBoxToScreen(svg, { x: cx, y: bbox.y + bbox.height })
    if (!topScreen || !bottomScreen) return
    const rect = container.getBoundingClientRect()

    // Alta koyulursa (il alt kenarı + boşluk + tahmini kart) ekranı taşar mı?
    const bottomY = bottomScreen.y - rect.top
    const overflowsBelow = bottomY + PROVINCE_GAP + EST_CARD_H > rect.height - EDGE_PAD
    const placement: 'top' | 'bottom' = overflowsBelow ? 'top' : 'bottom'

    const anchorScreen = placement === 'top' ? topScreen : bottomScreen
    const rawX = anchorScreen.x - rect.left
    const rawY =
      placement === 'top'
        ? anchorScreen.y - rect.top - PROVINCE_GAP
        : anchorScreen.y - rect.top + PROVINCE_GAP

    const halfW = cardWidth(resolved.mode) / 2 + EDGE_PAD
    const clampedX = Math.min(Math.max(rawX, halfW), Math.max(halfW, rect.width - halfW))

    setPlaced({ x: clampedX, y: rawY, placement })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, provinceId, resizeNonce, svgRef, containerRef])

  // z-30: harita (z-10) ve idle panel (z-20) ÜSTÜNDE, logo (z-40) altında.
  // pointer-events-none → harita hover etkileşimi bozulmaz.
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <AnimatePresence>
        {resolved && placed && (
          <LocationPopup
            key={resolved.location.id}
            pos={{ x: placed.x, y: placed.y }}
            placement={placed.placement}
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
