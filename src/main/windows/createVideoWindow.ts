import type { BrowserWindow } from 'electron'
import { createKioskWindow } from './createKioskWindow'

/** Monitör 2: dikey video penceresi (Framer Motion geçişler). */
export function createVideoWindow(bounds: Electron.Rectangle): BrowserWindow {
  return createKioskWindow('video', bounds)
}
