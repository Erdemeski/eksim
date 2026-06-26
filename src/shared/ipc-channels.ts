/**
 * Üç süreçte de (main / preload / renderer) tek kaynaktan import edilen
 * IPC kanal isimleri. String literal tekrarı yasak — tüm kanallar burada.
 *
 * Akış: Harita penceresi figür olayını üretir → preload `send` → main `on` →
 * main yalnızca video penceresine `webContents.send` ile iletir (broadcast).
 */
export const IpcChannel = {
  /** Harita → main → video: figür yerleşti/hareket etti (tam durum yükü). */
  FIGURE_UPDATE: 'figure:update',
  /** Harita → main → video: figür ekrandan kaldırıldı (3 nokta yok). */
  FIGURE_LIFTED: 'figure:lifted',
  /** main → her iki pencere: figureTouch bayrağı değişti (Ctrl+Shift+F). */
  FIGURE_TOUCH_CHANGED: 'config:figure-touch-changed'
} as const

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel]
