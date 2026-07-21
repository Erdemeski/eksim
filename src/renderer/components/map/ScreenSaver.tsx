import React from 'react'
import { motion } from 'framer-motion'
import { TURKEY_PATH_D, MAP_VIEWBOX } from './turkeyGeometry'
import { SilkBackground } from './SilkBackground'
import ShinyText from './ShinyText'
import logoUrl from '../../assets/eksim40yil.png'

interface ScreenSaverProps {
  /** Ekrana dokununca (pointer down) çağrılır — canlı haritaya geçer. */
  onDismiss: () => void
  /** Silk WebGL arka planının hedef fps'i (tier'dan). */
  effectFps?: number
  /** Silk WebGL arka planının DPR tavanı (tier'dan). */
  effectDpr?: number
}

/**
 * Ekran koruyucu / çekim ekranı (YALNIZ map penceresi). Uzun hareketsizlikte ve
 * açılışta gösterilir; dokununca canlı haritaya yumuşak geçişle devreder.
 *
 * Katmanlar (alttan üste): Silk (WebGL) arka plan → kontrast scrim → mevcut
 * harita sınırlarıyla birebir hizalı BEYAZ Türkiye silüeti → ortada Eksim
 * logosu → altında ShinyText (reactbits) + dokunma ikonu (nabız).
 *
 * Giriş/çıkış AnimatePresence ile MapScreen'de sarmalanır (opacity + hafif
 * scale). `z-[60]` → logo/popup dahil her şeyin üstünde.
 */
export function ScreenSaver({
  onDismiss,
  effectFps = 30,
  effectDpr = 2
}: ScreenSaverProps): React.JSX.Element {
  return (
    <motion.div
      key="screensaver"
      className="absolute inset-0 z-[60] overflow-hidden bg-eksim-ink"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={onDismiss}
    >
      {/* 1) Silk WebGL arka plan (marka lacivert tonu). */}
      <div className="absolute inset-0">
        <SilkBackground
          speed={3.4}
          scale={1}
          color="#1b2b4b"
          noiseIntensity={1.4}
          rotation={0}
          fps={effectFps}
          maxDpr={effectDpr}
        />
      </div>

      {/* 2) Kontrast scrim — silüet/metin okunur kalsın. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 42%, rgba(6,10,22,0.15), rgba(6,10,22,0.62) 100%)'
        }}
      />

      {/* 3) Beyaz Türkiye silüeti — TurkeyMap ile birebir hizalı (aynı viewBox +
          preserveAspectRatio). Yumuşak parlama için çift path. */}
      <svg
        viewBox={MAP_VIEWBOX}
        preserveAspectRatio="xMidYMid slice"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <defs>
          <filter id="ss-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <path d={TURKEY_PATH_D} fill="#ffffff" opacity="0.16" filter="url(#ss-glow)" />
        <path d={TURKEY_PATH_D} fill="#ffffff" opacity="0.92" />
      </svg>

      {/* 4+5) Ortada logo (40.yıl amblemi, şeffaf PNG — kart/beyaz zemin yok,
          doğrudan Silk arka plan üzerine oturur), altında efektli çağrı metni +
          dokunma ikonu. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
        <motion.img
          src={logoUrl}
          alt="Eksim Holding"
          draggable={false}
          className="h-40 w-auto select-none "
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        />

        <motion.div
          className="flex flex-col items-center gap-1"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <ShinyText
            text="Başlamak için ekrana dokunun"
            speed={3}
            spread={90}
            color="#191F6B"
            shineColor="#ffffff"
            className="text-2xl font-bold uppercase tracking-[0.35em]"
          />
          <TouchIcon />
        </motion.div>
      </div>
    </motion.div>
  )
}

/** Yumuşak nabız atan dokunma/el işareti (SVG). */
function TouchIcon(): React.JSX.Element {
  return (
    <motion.svg
      width="46"
      height="46"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#191F6B"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="opacity-90"
      initial={{ scale: 1, opacity: 0.6 }}
      animate={{ scale: [1, 1.16, 1], opacity: [0.05, 1, 0.05] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* İşaret parmağıyla dokunma jesti. */}
      <path d="M8 11V6.5a1.5 1.5 0 0 1 3 0V10" />
      <path d="M11 10V4.8a1.5 1.5 0 0 1 3 0V10" />
      <path d="M14 10V4.8a1.5 1.5 0 0 1 3 0V11.5" />
      <path d="M17 10.2V6.3a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.5 15c-.7-.9-.5-2 .5-2.6.8-.5 1.8-.3 2.4.4L8 14" />
    </motion.svg>
  )
}
