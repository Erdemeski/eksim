import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface MapIdlePanelProps {
  /** Boştayken (aktif tesis yok ve intro bitti) göster. */
  show: boolean
}

/**
 * Harita penceresi boşta marka çıpası (alt-orta). Projelerin tanıtımı artık
 * pinlerin üstünde sırayla açılan popup baloncuklarında (bkz. PopupLayer);
 * burada yalnızca sakin bir kurumsal başlık kalır. Aktif tesiste gizlenir.
 */
export function MapIdlePanel({ show }: MapIdlePanelProps): React.JSX.Element {
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
            <p className="mt-3 text-sm tracking-wide text-eksim-energy/90">
              Bir tesise yaklaşın ve keşfe başlayın
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
