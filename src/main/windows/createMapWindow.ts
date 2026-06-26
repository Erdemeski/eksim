import type { BrowserWindow } from 'electron'
import { createKioskWindow } from './createKioskWindow'

/** Monitör 1: interaktif harita penceresi (MapLibre + GSAP). */
export function createMapWindow(bounds: Electron.Rectangle): BrowserWindow {
  return createKioskWindow('map', bounds)
}
