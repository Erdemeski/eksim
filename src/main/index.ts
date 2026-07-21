import { app, globalShortcut, BrowserWindow } from 'electron'
import { inspect } from 'node:util'
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
import { resolvePerfTier } from './perfTier'

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
 * A) Odak/throttling: İkinci monitördeki video penceresi hiç odak almadığı için
 *    Chromium onu "arka plan/örtülü" sayıp throttle eder → video ~1fps'e düşer.
 *    Aşağıdaki üç anahtar + webPreferences.backgroundThrottling=false bunu kapatır.
 *
 * B) GPU kompozisyonu: yalnızca GÜVENLİ rasterization/zero-copy ipuçları.
 *    NOT (geri alındı): Daha önce burada `ignore-gpu-blocklist` +
 *    `enable-features=D3D11VideoDecoder` ile donanım video decode ZORLANIYORDU.
 *    Bu, Chromium'un bu GPU/sürücü için bilerek devre dışı bıraktığı decode
 *    yolunu zorla açtı ve konsolda tekrarlayan
 *    `ffmpeg_common.cc: Unsupported pixel format: -1` hatasına + saniyede bir
 *    kısa video takılmalarına yol açtı (decoder her hata sonrası sıfırlanıyor).
 *    Blocklist'i bypass etmek yerine Chromium'un kendi güvenli kararına
 *    (gerekirse software decode) güveniliyor; asıl performans kazancı render
 *    tarafındaki (harita) iş yükünü azaltmaktan geliyor (bkz. GSAP fps sınırı,
 *    EnergyGrid MST, aurora sadeleştirmesi).
 */
function configureChromiumForKiosk(): void {
  // A) Kiosk'ta her iki ekran da daima ön planda kabul edilsin.
  app.commandLine.appendSwitch('disable-background-timer-throttling')
  app.commandLine.appendSwitch('disable-renderer-backgrounding')
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows')

  // A2) Windows'a özgü: yerel pencere-örtülme takibi, odaksız ikinci monitör
  // penceresini "örtülü" sayıp render'ını kısabiliyor (çift monitör kioskta
  // bilinen takılma kaynağı). Takibi tamamen kapat → her iki pencere de daima
  // görünür kabul edilir. NOT: `disable-features` TEK çağrı olmalı (enable-features
  // gibi, tekrarlanan çağrılar birbirini ezer).
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion')

  // B) Yalnızca güvenli, blocklist'i etkilemeyen kompozisyon ipuçları.
  app.commandLine.appendSwitch('enable-gpu-rasterization')
  app.commandLine.appendSwitch('enable-zero-copy')
}

configureChromiumForKiosk()

/**
 * Teşhis: GPU özellik durumunu bir kez logla (kalıcı — sorun tekrarlarsa hızlı
 * teşhis için). `video_decode`/`gpu_compositing` değerleri bu makinenin
 * Chromium'un GPU/sürücü değerlendirmesinden ne aldığını gösterir; artık
 * zorlanmıyor, Chromium'un kendi (güvenli) kararı yansır. Dev'de ayrıca
 * pencerede `chrome://gpu` ile detaylı doğrulanabilir.
 */
function logGpuStatus(): void {
  const status = app.getGPUFeatureStatus()
  // eslint-disable-next-line no-console
  console.log('[GPU] feature status:', inspect(status, { colors: false, depth: 2 }))
  app
    .getGPUInfo('basic')
    // eslint-disable-next-line no-console
    .then((info) => console.log('[GPU] info:', inspect(info, { colors: false, depth: 3 })))
    .catch(() => {})
}

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
  logGpuStatus()
  // Kalite katmanını GPU hazır olduktan sonra çöz (operatör ayarı > otomatik).
  const perfTier = resolvePerfTier()
  const layout = resolveLayout()
  const mapWindow = createMapWindow(layout.map, perfTier)
  const videoWindow = createVideoWindow(layout.video, perfTier)

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
