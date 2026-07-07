import React from 'react'
import ReactDOM from 'react-dom/client'
import gsap from 'gsap'
import { MapScreen } from '../components/map/MapScreen'
import '../styles/index.css'

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
    <MapScreen />
  </React.StrictMode>
)
