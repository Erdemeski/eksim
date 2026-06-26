import { create } from 'zustand'
import type { EksimLocation, FigureResult, TouchConfig } from '@shared/types'
import { DEFAULT_TOUCH_CONFIG } from '@shared/config'

/**
 * Renderer global state'i. Her pencere kendi store örneğini tutar; pencereler
 * arası senkronizasyon IPC köprüsüyle (window.eksim) yapılır.
 */
interface KioskState {
  /** Aktif figür algılama yapılandırması. */
  touchConfig: TouchConfig
  /** Son figür algılama sonucu (yoksa null). */
  figure: FigureResult | null
  /** Figürün çözümlendiği aktif tesis (yoksa null). */
  activeLocation: EksimLocation | null

  setFigureTouch: (value: boolean) => void
  setFigure: (figure: FigureResult | null) => void
  setActiveLocation: (location: EksimLocation | null) => void
}

export const useKioskStore = create<KioskState>((set) => ({
  touchConfig: DEFAULT_TOUCH_CONFIG,
  figure: null,
  activeLocation: null,

  setFigureTouch: (value) =>
    set((state) => ({ touchConfig: { ...state.touchConfig, figureTouch: value } })),
  setFigure: (figure) => set({ figure }),
  setActiveLocation: (location) => set({ activeLocation: location })
}))
