import React from 'react'
import ReactDOM from 'react-dom/client'
import gsap from 'gsap'
import { VideoScreen } from '../components/video/VideoScreen'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useKioskStore } from '../store/useKioskStore'
import '../styles/index.css'

// Kalite katmanını main süreçten oku (video penceresi ambient efekt taşımaz ama
// tutarlılık ve olası ileriki kullanım için store senkron tutulur).
try {
  useKioskStore.getState().setPerfTier(window.eksim.getPerfTier())
} catch {
  /* köprü yoksa varsayılan tier kalır */
}

/**
 * PERF: Bu pencerede GSAP yalnızca açılış IntroScreen'inde kullanılır (tek
 * seferlik, kısa). Native <video> oynatımı GSAP/React döngüsünden tamamen
 * bağımsızdır (tarayıcının kendi decode/composite hattı) — bu sınırlama video
 * akıcılığını ETKİLEMEZ, yalnızca intro animasyonunun kare hesaplama sıklığını
 * düşürür (bkz. map/main.tsx'teki aynı ayarın gerekçesi).
 */
gsap.ticker.fps(30)

/** Video penceresi giriş noktası (Monitör 2). */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* map/main.tsx ile aynı gözetimsiz-kiosk güvenlik ağı — bkz. oradaki not. */}
    <ErrorBoundary retryMs={4000}>
      <VideoScreen />
    </ErrorBoundary>
  </React.StrictMode>
)
