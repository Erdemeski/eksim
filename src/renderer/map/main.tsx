import React from 'react'
import ReactDOM from 'react-dom/client'
import gsap from 'gsap'
import { MapScreen } from '../components/map/MapScreen'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useKioskStore } from '../store/useKioskStore'
import '../styles/index.css'

// Kalite katmanını main süreçten oku ve store'a yaz (efekt bütçesi buradan akar).
try {
  useKioskStore.getState().setPerfTier(window.eksim.getPerfTier())
} catch {
  /* köprü yoksa (ör. izole test) varsayılan tier kalır */
}

/**
 * PERF: Bu pencerede çok sayıda sürekli GSAP döngüsü var (kıyı akışı, enerji
 * ağı, şehir ışıkları, marker halo/dwell). GSAP varsayılan olarak ekran
 * yenileme hızında (60/75/144 Hz) her tween'i yeniden hesaplar. Bu ambient/
 * dekoratif efektler için 30fps'e sınırlamak görsel olarak fark edilmez (yavaş
 * sürüklenme/nabız) ama kare başına SVG öznitelik hesaplama + rasterizasyon
 * yükünü yarıya indirir — tek paylaşılan Chromium GPU sürecindeki video
 * penceresiyle rekabeti azaltır.
 */
gsap.ticker.fps(30)

/** Harita penceresi giriş noktası (Monitör 1). */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/* Kiosk gözetimsiz çalışır: yakalanmamış bir hata tüm kökü boşaltıp
        pencereyi düz koyu-lacivert `body` arkaplanına indirmesin (gözlemlenen
        çökme belirtisi) — hata birkaç saniye sonra sessizce kendini toparlar. */}
    <ErrorBoundary retryMs={4000}>
      <MapScreen />
    </ErrorBoundary>
  </React.StrictMode>
)
