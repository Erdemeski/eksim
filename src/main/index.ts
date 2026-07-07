import { app, globalShortcut, BrowserWindow } from 'electron'
import { resolveLayout } from './windows/DisplayManager'
import { createMapWindow } from './windows/createMapWindow'
import { createVideoWindow } from './windows/createVideoWindow'
import {
  registerIpcHandlers,
  broadcastFigureTouch,
  disposeIpcHandlers,
  type IpcContext
} from './ipc/ipcHandlers'
import { DEFAULT_TOUCH_CONFIG } from '../shared/config'

/**
 * Ana süreç orkestratörü. Sorumlulukları izole modüllere dağıtır:
 *  - DisplayManager  : monitör tespiti / yerleşim
 *  - create*Window   : pencere fabrikaları (kiosk kuralları)
 *  - ipcHandlers     : pencereler arası köprü
 * Burada yalnızca yaşam döngüsü ve global kısayollar kalır.
 */

/**
 * Chromium anahtarları (app hazır olmadan, modül yüklenirken uygulanmalı).
 *
 * İkinci monitördeki video penceresi hiç odak almadığı için Chromium onu
 * "arka plan/örtülü" sayıp throttle eder → video ~1fps'e düşer (hem lokal hem
 * çevrimiçi mp4'te ciddi takılma). Aşağıdaki üç anahtar bu davranışı tamamen
 * kapatır; webPreferences.backgroundThrottling=false ile birlikte kusursuz,
 * tam-hız oynatım sağlar. Kiosk'ta her iki ekran da daima ön planda kabul edilir.
 */
function configureChromiumForKiosk(): void {
  app.commandLine.appendSwitch('disable-background-timer-throttling')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')
}

configureChromiumForKiosk()

let ipcContext: IpcContext | null = null
/** Çalışma zamanı figureTouch durumu (cold start varsayılanından başlar). */
let figureTouch = DEFAULT_TOUCH_CONFIG.figureTouch
/** Kasıtlı çıkış mı (kapanan pencere zincirleme quit'i tetiklemesin diye). */
let isQuitting = false

function registerShortcuts(): void {
  // Gizli çıkış (fuar/lobi personeli için).
  globalShortcut.register('CommandOrControl+Shift+E', () => app.quit())

  // Geliştirme/kalibrasyon: figureTouch modunu toggle et ve her iki ekrana yay.
  globalShortcut.register('CommandOrControl+Shift+F', () => {
    if (!ipcContext) return
    figureTouch = !figureTouch
    broadcastFigureTouch(ipcContext, figureTouch)
  })
}

app.whenReady().then(() => {
  const layout = resolveLayout()
  const mapWindow = createMapWindow(layout.map)
  const videoWindow = createVideoWindow(layout.video)

  ipcContext = { mapWindow, videoWindow }
  registerIpcHandlers(ipcContext)
  registerShortcuts()

  // Herhangi bir pencere kapanırsa tüm kiosk oturumunu sonlandır.
  for (const win of [mapWindow, videoWindow]) {
    win.on('closed', () => {
      if (!isQuitting) app.quit()
    })
  }
})

// macOS dışı: tüm pencereler kapanınca çık.
app.on('window-all-closed', () => app.quit())

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  disposeIpcHandlers()
})

// Tek instance kilidi: ikinci başlatma engellenir (kiosk dayanıklılığı).
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Donanım hızlandırma sorunlarına karşı pencerelerin tekrar odağa gelmesi.
app.on('second-instance', () => {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})
