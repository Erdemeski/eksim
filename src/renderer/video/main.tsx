import React from 'react'
import ReactDOM from 'react-dom/client'
import gsap from 'gsap'
import { VideoScreen } from '../components/video/VideoScreen'
import '../styles/index.css'

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
    <VideoScreen />
  </React.StrictMode>
)
