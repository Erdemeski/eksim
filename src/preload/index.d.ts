import type { EksimBridge } from '../shared/types'

/**
 * Renderer tarafında window.eksim'i tip güvenli yapar.
 */
declare global {
  interface Window {
    eksim: EksimBridge
  }
}

export {}
