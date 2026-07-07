import React from 'react'
import { ParticleField } from './ParticleField'

interface MapBackgroundProps {
  /** Bir tesis aktifken parçacık döngüsünü duraklat (GPU'yu videoya bırak). */
  paused?: boolean
}

/**
 * Harita arkaplanı: aurora gradient blobları + nokta ızgarası + parçacık alanı
 * + vinyet. Katmanlı derinlik (reactbits Aurora/Particles ruhunda), WebGL'siz.
 * pointer-events:none → etkileşim haritaya geçer.
 */
export function MapBackground({ paused = false }: MapBackgroundProps): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-eksim-ink">
      <div className="eksim-aurora eksim-aurora--energy" />
      <div className="eksim-aurora eksim-aurora--food" />
      <div className="eksim-aurora eksim-aurora--glow" />
      <div className="eksim-grid absolute inset-0 opacity-[0.05]" />
      <ParticleField className="absolute inset-0" paused={paused} />
      <div className="eksim-vignette absolute inset-0" />
    </div>
  )
}
