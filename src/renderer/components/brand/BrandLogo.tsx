import React from 'react'
import { motion } from 'framer-motion'
import logoUrl from '../../assets/eksim_logo.jpg'

interface BrandLogoProps {
  /** Ek konum/boyut sınıfları (varsayılan: sol üst). */
  className?: string
}

/**
 * Her iki pencerede sol üstte gösterilen kurumsal logo — beyaz, yuvarlatılmış
 * kart içinde (logo JPG'si zaten beyaz zeminli → kart kusursuz oturur). Premium
 * his için yumuşak gölge + ince kenar + hafif giriş animasyonu.
 */
export function BrandLogo({ className = '' }: BrandLogoProps): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      className={`pointer-events-none absolute left-6 top-6 z-40 rounded-2xl bg-white p-1 shadow-xl ring-1 ring-black/5 ${className}`}
    >
      <img src={logoUrl} alt="Eksim Holding" className="h-32 w-auto select-none" draggable={false} />
    </motion.div>
  )
}
