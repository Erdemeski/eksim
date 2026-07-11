import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { EksimLocation, Point } from '@shared/types'
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
  /** Popup katmanı gizli olmalı mı (ör. intro). */
  hidden?: boolean
  svgRef: React.RefObject<SVGSVGElement | null>
  containerRef: React.RefObject<HTMLElement | null>
}

/** İlin alt kenarı ile kart arası dikey boşluk (px). */
const PROVINCE_GAP = 28
/** Görünür alan kenar payı (px) — kart pencere dışına taşmasın. */
const EDGE_PAD = 20

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
 * Konumlama: kart artık PİNE değil, pinin bulunduğu İLİN sınırının ALT
 * KENARINA hizalanır (bazı iller pinin hemen altında kalıp kartı taşırıyordu).
 * İki aşamalı:
 *  (1) İl bbox'ının alt-orta noktası ekrana projelenir + yatayda kart
 *      genişliğine göre KESİN clamp (genişlik moda göre sabit, tam hesaplanır).
 *  (2) `LocationPopup` kendi gerçek yüksekliğini (offsetHeight — transform/scale
 *      animasyonundan ETKİLENMEZ) `onMeasure` ile bildirir; dikeyde konteyner
 *      taşmasın diye burada ikinci bir clamp uygulanır. Ölçüm id'li bildirilir
 *      ve yalnız GÜNCEL hedefinki uygulanır — AnimatePresence çıkış/giriş
 *      geçişinde eski ve yeni kart aynı anda DOM'dayken paylaşılan bir ref'in
 *      yanlış (çıkan) karta bağlı kalma riskini ortadan kaldırır.
 * İkisi de useLayoutEffect/senkron state güncellemesiyle boyamadan ÖNCE
 * uygulanır → görünür sıçrama olmaz.
 */
export function PopupLayer({
  activeLocation,
  dwell,
  previewLocation,
  hidden = false,
  svgRef,
  containerRef
}: PopupLayerProps): React.JSX.Element | null {
  const rawAnchorRef = useRef<{ x: number; y: number } | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
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

  // Faz 1: İlin ALT KENARININ ortasına göre ham çıpa (Y henüz yükseklik-clamp'siz) + yatay clamp.
  useLayoutEffect(() => {
    const svg = svgRef.current
    const container = containerRef.current
    if (!resolved || !svg || !container || !provinceId) {
      rawAnchorRef.current = null
      setPos(null)
      return
    }
    const province = TR_PROVINCES[provinceId]
    if (!province) {
      rawAnchorRef.current = null
      setPos(null)
      return
    }
    const bottomCenter: Point = {
      x: province.bbox.x + province.bbox.width / 2,
      y: province.bbox.y + province.bbox.height
    }
    const screen = viewBoxToScreen(svg, bottomCenter)
    if (!screen) return
    const rect = container.getBoundingClientRect()
    const width = cardWidth(resolved.mode)
    const halfW = width / 2 + EDGE_PAD
    const rawX = screen.x - rect.left
    const rawY = screen.y - rect.top + PROVINCE_GAP
    const clampedX = Math.min(Math.max(rawX, halfW), Math.max(halfW, rect.width - halfW))
    rawAnchorRef.current = { x: clampedX, y: rawY }
    setPos({ x: clampedX, y: rawY })
    // resolved.mode/secondsLeft/progress kasıtlı bağımlılık DEĞİL — yalnız
    // hedef/il/resize değişince yeniden hesaplanır (aynı pinde büyürken kaymaz).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, provinceId, resizeNonce, svgRef, containerRef])

  // Faz 2: LocationPopup kendi gerçek yüksekliğini bildirdikçe (mod/içerik
  // değiştikçe tekrar tetiklenir) dikey konumu konteyner sınırları içinde tutar.
  const handleMeasure = useCallback(
    (locationId: string, height: number) => {
      if (locationId !== targetId) return // bayat/çıkan kartın ölçümünü yok say
      const anchor = rawAnchorRef.current
      const container = containerRef.current
      if (!anchor || !container) return
      const containerH = container.getBoundingClientRect().height
      const maxY = containerH - EDGE_PAD - height
      const clampedY = Math.min(anchor.y, Math.max(EDGE_PAD, maxY))
      setPos((p) => (p && Math.abs(p.y - clampedY) > 0.5 ? { x: p.x, y: clampedY } : p))
    },
    [targetId, containerRef]
  )

  // z-30: harita (z-10) ve idle panel (z-20) ÜSTÜNDE, logo (z-40)/intro (z-50)
  // altında. pointer-events-none → harita hover etkileşimi bozulmaz.
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <AnimatePresence>
        {resolved && pos && (
          <LocationPopup
            key={resolved.location.id}
            onMeasure={handleMeasure}
            pos={pos}
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
