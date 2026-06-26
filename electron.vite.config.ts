import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * Tek araç (electron-vite) üç hedefi de yönetir:
 *  - main    : Electron ana süreç (Node ortamı)
 *  - preload : contextBridge köprüsü (izole ortam)
 *  - renderer: iki ayrı HTML entry (map.html / video.html) ortak bileşen havuzu
 *
 * Çift renderer entry, her monitörün bağımsız yüklenmesini ve izolasyonunu sağlar.
 */
export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') }
      }
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared')
      }
    },
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          map: resolve(__dirname, 'src/renderer/map.html'),
          video: resolve(__dirname, 'src/renderer/video.html')
        }
      }
    }
  }
})
