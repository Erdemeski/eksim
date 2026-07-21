import type { BrowserWindow } from 'electron'
import { createKioskWindow } from './createKioskWindow'
import type { PerfTier } from '../../shared/perf'

/** Monitör 2: dikey video penceresi (Framer Motion geçişler). */
export function createVideoWindow(bounds: Electron.Rectangle, perfTier: PerfTier): BrowserWindow {
  return createKioskWindow('video', bounds, perfTier)
}
