import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

/**
 * touchMath saf fonksiyonlar için birim test ortamı. Node ortamı yeterli
 * (DOM gerekmez). @shared / @renderer alias'ları electron.vite.config ile aynı.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
