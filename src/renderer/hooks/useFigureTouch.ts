import { useEffect, type RefObject } from 'react'
import { resolveFigure } from '../utils/touchMath'
import { useKioskStore } from '../store/useKioskStore'
import type { FigureResult, Point } from '@shared/types'

export interface UseFigureTouchOptions {
  /** Olayların dinleneceği hedef element (ör. harita canvas konteyneri). */
  targetRef: RefObject<HTMLElement | null>
  /** Geçerli bir figür/işaretçi sonucu çözüldüğünde. */
  onFigure: (result: FigureResult) => void
  /** Temas tamamen kalktığında (figür ekrandan alındı). */
  onLift: () => void
}

/** TouchList'i hedef elemana göreli yerel koordinatlara çevirir. */
function toLocalPoints(list: TouchList, rect: DOMRect): Point[] {
  const points: Point[] = []
  for (let i = 0; i < list.length; i++) {
    const t = list.item(i)
    if (t) points.push({ x: t.clientX - rect.left, y: t.clientY - rect.top })
  }
  return points
}

/**
 * DOM olay katmanı ile saf `touchMath` arasındaki köprü.
 *
 * figureTouch'a göre dinleyici kümesini TAMAMEN ayırır (donanım zekâsı):
 *  - true  : yalnızca çoklu-dokunuş (touch) olayları; fare/işaretçi yok sayılır.
 *            Tam 3 temas → resolveFigure → onFigure; temas 0'a düşünce onLift.
 *  - false : yalnızca işaretçi (pointer = fare + tekli dokunuş); pointerdown'da
 *            tekil koordinat aktif konum kabul edilir (BYPASS modu).
 *
 * figureTouch değiştiğinde (Ctrl+Shift+F) effect yeniden bağlanır.
 */
export function useFigureTouch({ targetRef, onFigure, onLift }: UseFigureTouchOptions): void {
  const figureTouch = useKioskStore((s) => s.touchConfig.figureTouch)

  useEffect(() => {
    const el = targetRef.current
    if (!el) return
    // Anlık config'i closure'a kilitlemeden store'dan oku.
    const getConfig = (): ReturnType<typeof useKioskStore.getState> =>
      useKioskStore.getState()

    if (figureTouch) {
      const handleTouch = (e: TouchEvent): void => {
        e.preventDefault()
        const points = toLocalPoints(e.touches, el.getBoundingClientRect())
        const result = resolveFigure(points, getConfig().touchConfig)
        if (result) onFigure(result)
      }
      const handleTouchEnd = (e: TouchEvent): void => {
        if (e.touches.length === 0) onLift()
      }

      el.addEventListener('touchstart', handleTouch, { passive: false })
      el.addEventListener('touchmove', handleTouch, { passive: false })
      el.addEventListener('touchend', handleTouchEnd)
      el.addEventListener('touchcancel', handleTouchEnd)
      return () => {
        el.removeEventListener('touchstart', handleTouch)
        el.removeEventListener('touchmove', handleTouch)
        el.removeEventListener('touchend', handleTouchEnd)
        el.removeEventListener('touchcancel', handleTouchEnd)
      }
    }

    // Bypass modu: işaretçi (fare / tekli dokunuş).
    const handlePointer = (e: PointerEvent): void => {
      const rect = el.getBoundingClientRect()
      const point: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const result = resolveFigure([point], getConfig().touchConfig)
      if (result) onFigure(result)
    }
    el.addEventListener('pointerdown', handlePointer)
    return () => el.removeEventListener('pointerdown', handlePointer)
  }, [figureTouch, targetRef, onFigure, onLift])
}
