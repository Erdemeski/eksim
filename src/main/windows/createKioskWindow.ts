import { BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { WINDOW_ROLE_ARG } from '../../shared/types'
import type { WindowRole } from '../../shared/types'
import { PERF_TIER_ARG, type PerfTier } from '../../shared/perf'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** Geliştirme modu: electron-vite dev sunucusu çalışırken HMR aktif. */
const isDev = !!process.env['ELECTRON_RENDERER_URL']

const preloadPath = join(__dirname, '../preload/index.mjs')

/** Rolün yükleyeceği renderer entry HTML'i (map.html | video.html). */
function loadEntry(win: BrowserWindow, role: WindowRole): void {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(`${devUrl}/${role}.html`)
  } else {
    void win.loadFile(join(__dirname, `../renderer/${role}.html`))
  }
}

/**
 * Tek kiosk penceresi fabrikası. Harita ve video pencereleri aynı kararlılık
 * kurallarını paylaşsın diye buraya merkezîlendi (DRY); rol-özel sarmalayıcılar
 * createMapWindow / createVideoWindow bunu çağırır.
 *
 *  - Prod: kiosk + çerçevesiz + her zaman üstte (fuar/lobi kararlılığı).
 *  - Dev: çerçeveli, taşınabilir pencereler (geliştirici ergonomisi).
 */
export function createKioskWindow(
  role: WindowRole,
  bounds: Electron.Rectangle,
  perfTier: PerfTier
): BrowserWindow {
  const win = new BrowserWindow({
    ...bounds,
    show: false,
    frame: isDev,
    kiosk: !isDev,
    alwaysOnTop: !isDev,
    backgroundColor: '#0A1020',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // KRİTİK (kiosk): İki monitörden yalnızca biri odakta olabilir; video
      // penceresi (Monitör 2) hiç odak almaz. Varsayılan backgroundThrottling
      // odaksız/örtülü pencerenin timer/rAF/video kompozisyonunu ~1fps'e düşürür
      // → videoda ciddi takılma. Kiosk'ta her iki ekran da her zaman tam hızda
      // çalışmalı, bu yüzden kapatılır (app düzeyi switch'lerle birlikte).
      backgroundThrottling: false,
      additionalArguments: [`${WINDOW_ROLE_ARG}${role}`, `${PERF_TIER_ARG}${perfTier}`]
    }
  })

  win.once('ready-to-show', () => win.show())
  loadEntry(win, role)
  return win
}
