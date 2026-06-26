import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { EksimLocation } from '@shared/types'

interface LocationHudProps {
  location: EksimLocation | null
}

const SECTOR_LABEL: Record<EksimLocation['sector'], string> = {
  energy: 'Enerji',
  food: 'Gıda'
}

const SECTOR_ACCENT: Record<EksimLocation['sector'], string> = {
  energy: 'text-eksim-energy',
  food: 'text-eksim-food'
}

/**
 * Harita köşesindeki tesis bilgi kartı. Figür yerleştiğinde Framer Motion ile
 * yumuşak girer, kaldırıldığında çıkar.
 */
export function LocationHud({ location }: LocationHudProps): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-8">
      <AnimatePresence mode="wait">
        {location && (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl rounded-2xl border border-eksim-line bg-eksim-surface/80 px-8 py-5 text-center backdrop-blur"
          >
            <p
              className={`text-xs font-semibold uppercase tracking-[0.35em] ${SECTOR_ACCENT[location.sector]}`}
            >
              {SECTOR_LABEL[location.sector]}
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{location.name}</h2>
            <p className="mt-2 text-sm text-eksim-glow/70">{location.description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
