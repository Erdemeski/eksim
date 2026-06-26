import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannel } from '../shared/ipc-channels'
import { WINDOW_ROLE_ARG } from '../shared/types'
import type { EksimBridge, FigureEventPayload, WindowRole } from '../shared/types'

/**
 * Güvenli köprü: Electron main ile React arasındaki TEK temas yüzeyi.
 * nodeIntegration kapalı, contextIsolation açık. Renderer yalnızca aşağıdaki
 * tip güvenli API'yi (window.eksim) görür.
 */

/** Pencere rolünü main'in geçtiği argümandan türet; yoksa URL'den düş. */
function resolveRole(): WindowRole {
  const arg = process.argv.find((a) => a.startsWith(WINDOW_ROLE_ARG))
  if (arg) {
    const value = arg.slice(WINDOW_ROLE_ARG.length)
    if (value === 'map' || value === 'video') return value
  }
  return window.location.pathname.includes('video') ? 'video' : 'map'
}

const bridge: EksimBridge = {
  getWindowRole: () => resolveRole(),

  emitFigure: (event: FigureEventPayload) => {
    ipcRenderer.send(IpcChannel.FIGURE_UPDATE, event)
  },

  emitFigureLifted: () => {
    ipcRenderer.send(IpcChannel.FIGURE_LIFTED)
  },

  onFigure: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, payload: FigureEventPayload): void =>
      handler(payload)
    ipcRenderer.on(IpcChannel.FIGURE_UPDATE, listener)
    return () => ipcRenderer.removeListener(IpcChannel.FIGURE_UPDATE, listener)
  },

  onFigureLifted: (handler) => {
    const listener = (): void => handler()
    ipcRenderer.on(IpcChannel.FIGURE_LIFTED, listener)
    return () => ipcRenderer.removeListener(IpcChannel.FIGURE_LIFTED, listener)
  },

  onFigureTouchChanged: (handler) => {
    const listener = (_e: Electron.IpcRendererEvent, value: boolean): void => handler(value)
    ipcRenderer.on(IpcChannel.FIGURE_TOUCH_CHANGED, listener)
    return () => ipcRenderer.removeListener(IpcChannel.FIGURE_TOUCH_CHANGED, listener)
  }
}

contextBridge.exposeInMainWorld('eksim', bridge)
