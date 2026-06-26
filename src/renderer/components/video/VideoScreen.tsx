import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ipcService } from '../../services/ipcService'
import { useKioskStore } from '../../store/useKioskStore'
import { LocalMp4Source, type ResolvedVideo } from '../../video/IVideoSource'
import { FALLBACK_VIDEO_URL } from '@shared/locations'
import type { EksimLocation } from '@shared/types'

const SECTOR_LABEL: Record<EksimLocation['sector'], string> = {
  energy: 'Enerji',
  food: 'Gıda'
}
const SECTOR_ACCENT: Record<EksimLocation['sector'], string> = {
  energy: 'text-eksim-energy',
  food: 'text-eksim-food'
}

const FALLBACK_VIDEO: ResolvedVideo = { src: FALLBACK_VIDEO_URL, kind: 'fallback', loop: true }

/**
 * Monitör 2 — dikey video ekranı.
 *
 * IPC ile haritadan gelen aktif tesisi dinler; IVideoSource ile videoyu çözer
 * (lokal → çevrimiçi → fallback) ve Framer Motion ile maske (clip-path reveal) +
 * blur geçişiyle sahneye sokar. Video yüklenemezse otomatik fallback'e düşer.
 */
export function VideoScreen(): React.JSX.Element {
  const source = useMemo(() => new LocalMp4Source(), [])
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const [failed, setFailed] = useState(false)

  // Harita penceresinden gelen figür olaylarını dinle.
  useEffect(() => {
    const offFigure = ipcService.onFigure((payload) => {
      setFailed(false)
      setActiveLocation(payload.location)
    })
    const offLift = ipcService.onFigureLifted(() => {
      setFailed(false)
      setActiveLocation(null)
    })
    const offTouch = ipcService.onFigureTouchChanged((v) =>
      useKioskStore.getState().setFigureTouch(v)
    )
    return () => {
      offFigure()
      offLift()
      offTouch()
    }
  }, [setActiveLocation])

  const resolved: ResolvedVideo = failed ? FALLBACK_VIDEO : source.resolve(activeLocation)

  const handleError = (): void => {
    // Lokal/çevrimiçi kaynak yüklenemediyse fallback'e düş (zincir bir kez).
    if (resolved.kind !== 'fallback') setFailed(true)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={resolved.src}
          className="absolute inset-0"
          initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.4, filter: 'blur(16px)', scale: 1.05 }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, filter: 'blur(0px)', scale: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <video
            className="h-full w-full object-cover"
            src={resolved.src}
            autoPlay
            muted
            loop={resolved.loop}
            playsInline
            onError={handleError}
          />
        </motion.div>
      </AnimatePresence>

      {/* Alt degrade — metin okunabilirliği için. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/85 to-transparent" />

      {/* Tesis bilgisi overlay'i (Framer Motion ile girer/çıkar). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-10">
        <AnimatePresence mode="wait">
          {activeLocation ? (
            <motion.div
              key={activeLocation.id}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.4em] ${SECTOR_ACCENT[activeLocation.sector]}`}
              >
                {SECTOR_LABEL[activeLocation.sector]}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
                {activeLocation.name}
              </h1>
              <p className="mt-3 max-w-xl text-lg text-white/70">{activeLocation.description}</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-eksim-glow/70">
                Eksim Holding
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white/90">
                Enerji ve Gıdada Geleceği İnşa Ediyoruz
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
