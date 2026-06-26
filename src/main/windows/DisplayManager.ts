import { screen } from 'electron'

/** Bir pencerenin yerleşeceği ekran dikdörtgeni. */
export interface KioskLayout {
  map: Electron.Rectangle
  video: Electron.Rectangle
  /** Gerçek çift monitör mü, yoksa tek monitör dev fallback mı? */
  dualMonitor: boolean
}

/**
 * Bağlı monitör sayısını tespit eder ve pencere yerleşimini belirler.
 *  - ≥2 monitör: harita 1. ekranda, video 2. ekranda (tam bounds).
 *  - 1 monitör (geliştirme): aynı ekranda yan yana ofsetli iki pencere.
 *
 * Ana süreçteki tek "monitör bilgisi" otoritesidir; pencere oluşturma
 * mantığından izole tutulur (SRP).
 */
export function resolveLayout(): KioskLayout {
  const displays = screen.getAllDisplays()

  if (displays.length >= 2) {
    return {
      map: displays[0].bounds,
      video: displays[1].bounds,
      dualMonitor: true
    }
  }

  const { workArea } = displays[0]
  const half = Math.floor(workArea.width / 2)
  return {
    map: { x: workArea.x, y: workArea.y, width: half, height: workArea.height },
    video: {
      x: workArea.x + half,
      y: workArea.y,
      width: workArea.width - half,
      height: workArea.height
    },
    dualMonitor: false
  }
}
