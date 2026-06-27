import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { EKSIM_LOCATIONS } from '@shared/locations'

interface MapIdlePanelProps {
  /** Boştayken (aktif tesis yok ve intro bitti) göster. */
  show: boolean
}

const energyCount = EKSIM_LOCATIONS.filter((l) => l.sector === 'energy').length
const foodCount = EKSIM_LOCATIONS.filter((l) => l.sector === 'food').length

/** Boşta dönen kısa, interaktif ipuçları/özetler. */
const TIPS: string[] = [
  'Bir tesise yaklaşın — keşfe başlayın',
  `${EKSIM_LOCATIONS.length} tesis · ${energyCount} Enerji · ${foodCount} Gıda`,
  'Yenilenebilir enerjiden entegre gıdaya',
  EKSIM_LOCATIONS.map((l) => l.name.split(' ')[0]).join(' · ')
]

/**
 * Harita penceresi boşta panel'i (eski konum kartının yerine). Tesis detayları
 * artık yalnızca video ekranında; burada şirket sloganı + dönen kısa interaktif
 * özetler gösterilir. Etkileşim başlayınca (aktif tesis) gizlenir.
 */
export function MapIdlePanel({ show }: MapIdlePanelProps): React.JSX.Element {
  const [tip, setTip] = useState(0)

  useEffect(() => {
    if (!show) return
    const id = window.setInterval(() => setTip((t) => (t + 1) % TIPS.length), 3800)
    return () => window.clearInterval(id)
  }, [show])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-10">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-eksim-glow/60">
              Eksim Holding
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white/90">
              Enerji ve Gıdada Geleceğin Mimarı
            </h2>

            <div className="mt-4 h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tip}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="text-sm tracking-wide text-eksim-energy"
                >
                  {TIPS[tip]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
