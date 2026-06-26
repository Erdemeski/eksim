import React from 'react'
import ReactDOM from 'react-dom/client'
import { VideoScreen } from '../components/video/VideoScreen'
import '../styles/index.css'

/** Video penceresi giriş noktası (Monitör 2). */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <VideoScreen />
  </React.StrictMode>
)
