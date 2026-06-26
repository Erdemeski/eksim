import type { TouchConfig } from './types'

/**
 * touchMath varsayılan yapılandırması.
 *
 * `figureTouch` çalışma zamanında Zustand'da tutulur ve Ctrl+Shift+F ile
 * toggle edilir; buradaki değer yalnızca başlangıç (cold start) varsayılanıdır.
 *
 * Kalibrasyon kenarları (45/65/80 px) plandaki örnek değerlerdir; gerçek figür
 * üretildiğinde fiziksel ölçümle güncellenir. tolerance = %12 ekran/dokunmatik
 * gürültüsünü tolere eder.
 */
export const DEFAULT_TOUCH_CONFIG: TouchConfig = {
  figureTouch: false,
  tolerance: 0.12,
  calibrations: [
    {
      figureId: 'eksim-primary',
      sides: [45, 65, 80]
    }
  ]
}
