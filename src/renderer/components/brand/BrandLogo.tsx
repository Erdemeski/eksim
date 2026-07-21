import React from 'react'
import { motion } from 'framer-motion'
import logoUrl from '../../assets/eksim_beyaz_png.png'

interface BrandLogoProps {
  /** Ek konum/boyut sınıfları (varsayılan: sol üst). */
  className?: string
}

/**
 * Her iki pencerede sol üstte gösterilen kurumsal logo — beyaz varyant
 * (şeffaf zeminli PNG), kart/çerçeve/beyaz arkaplan OLMADAN doğrudan koyu
 * `bg-eksim-ink` zemin üzerine konumlanır (bkz. eksim_beyaz_png.png — zaten
 * koyu zemin için tasarlanmış). Yumuşak giriş animasyonu korunur.
 */
export function BrandLogo({ className = '' }: BrandLogoProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`pointer-events-none absolute left-6 top-6 z-40 ${className}`}
    >
      <img src={logoUrl} alt="Eksim Holding" className="h-14 w-auto select-none" draggable={false} />
    </motion.div>
  )
}
