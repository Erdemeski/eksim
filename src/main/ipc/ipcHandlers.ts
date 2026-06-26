import { ipcMain, type BrowserWindow } from 'electron'
import { IpcChannel } from '../../shared/ipc-channels'
import type { FigureEventPayload } from '../../shared/types'

/** ipcHandlers'ın ihtiyaç duyduğu pencere referansları. */
export interface IpcContext {
  mapWindow: BrowserWindow
  videoWindow: BrowserWindow
}

/** Pencere yok edilmişse güvenli send. */
function safeSend(win: BrowserWindow, channel: string, ...args: unknown[]): void {
  if (!win.isDestroyed()) win.webContents.send(channel, ...args)
}

/**
 * main süreci köprüsü: harita penceresinden gelen figür olaylarını video
 * penceresine iletir. Renderer'lar birbirini doğrudan görmez; tüm trafik
 * buradan akar (tek otorite).
 */
export function registerIpcHandlers(ctx: IpcContext): void {
  ipcMain.on(IpcChannel.FIGURE_UPDATE, (_e, payload: FigureEventPayload) => {
    safeSend(ctx.videoWindow, IpcChannel.FIGURE_UPDATE, payload)
  })

  ipcMain.on(IpcChannel.FIGURE_LIFTED, () => {
    safeSend(ctx.videoWindow, IpcChannel.FIGURE_LIFTED)
  })
}

/** figureTouch bayrağı değişimini her iki pencereye yayınlar. */
export function broadcastFigureTouch(ctx: IpcContext, value: boolean): void {
  safeSend(ctx.mapWindow, IpcChannel.FIGURE_TOUCH_CHANGED, value)
  safeSend(ctx.videoWindow, IpcChannel.FIGURE_TOUCH_CHANGED, value)
}

/** Süreç kapanırken IPC dinleyicilerini temizler. */
export function disposeIpcHandlers(): void {
  ipcMain.removeAllListeners(IpcChannel.FIGURE_UPDATE)
  ipcMain.removeAllListeners(IpcChannel.FIGURE_LIFTED)
}
