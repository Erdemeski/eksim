import type { EksimBridge } from '@shared/types'

/**
 * Renderer tarafında window.eksim'i tip güvenli yapar (preload köprüsü).
 * preload/index.d.ts ile aynı sözleşme; renderer tsconfig'i bunu görür.
 */
declare global {
  interface Window {
    eksim: EksimBridge
  }
}

export {}
