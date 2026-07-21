import type { BrowserWindow } from 'electron'
import { createKioskWindow } from './createKioskWindow'
import type { PerfTier } from '../../shared/perf'

/** Monitör 1: interaktif harita penceresi (MapLibre + GSAP). */
export function createMapWindow(bounds: Electron.Rectangle, perfTier: PerfTier): BrowserWindow {
  return createKioskWindow('map', bounds, perfTier)
}
