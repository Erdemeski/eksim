import React from 'react'
import ReactDOM from 'react-dom/client'
import { MapScreen } from '../components/map/MapScreen'
import '../styles/index.css'

/** Harita penceresi giriş noktası (Monitör 1). */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MapScreen />
  </React.StrictMode>
)
