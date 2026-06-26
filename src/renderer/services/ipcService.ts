import type { EksimBridge, FigureEventPayload, WindowRole } from '@shared/types'

/**
 * Renderer kodunun window.eksim'e tek erişim noktası. Köprü yoksa (ör. saf
 * tarayıcı/test) güvenli no-op'lara düşer → bileşenler preload'a sıkı bağlı olmaz.
 */
const noopUnsub = (): void => {}

function getBridge(): EksimBridge | null {
  return typeof window !== 'undefined' && window.eksim ? window.eksim : null
}

export const ipcService = {
  getWindowRole(): WindowRole {
    return getBridge()?.getWindowRole() ?? 'map'
  },
  emitFigure(event: FigureEventPayload): void {
    getBridge()?.emitFigure(event)
  },
  emitFigureLifted(): void {
    getBridge()?.emitFigureLifted()
  },
  onFigure(handler: (event: FigureEventPayload) => void): () => void {
    return getBridge()?.onFigure(handler) ?? noopUnsub
  },
  onFigureLifted(handler: () => void): () => void {
    return getBridge()?.onFigureLifted(handler) ?? noopUnsub
  },
  onFigureTouchChanged(handler: (value: boolean) => void): () => void {
    return getBridge()?.onFigureTouchChanged(handler) ?? noopUnsub
  }
}
