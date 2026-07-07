import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IntroScreen } from '../intro/IntroScreen'
import { ipcService } from '../../services/ipcService'
import { useKioskStore } from '../../store/useKioskStore'
import { LocalMp4Source, type ResolvedVideo } from '../../video/IVideoSource'
import { BrandLogo } from '../brand/BrandLogo'
import type { EksimLocation } from '@shared/types'

const SECTOR_LABEL: Record<EksimLocation['sector'], string> = {
  energy: 'Enerji',
  food: 'Gıda'
}
const SECTOR_ACCENT: Record<EksimLocation['sector'], string> = {
  energy: 'text-eksim-energy',
  food: 'text-eksim-food'
}

/**
 * Tek video katmanı — framer-motion reveal geçişi (clipPath + opacity + scale)
 * AYNEN korunur (premium his). Geçiş TAMAMLANINCA kabın clip-path/transform/
 * will-change artıkları temizlenir → sürekli oynatımda (senaryonun ~%99'u) video,
 * donanım video overlay'i olarak temiz kompozit edilir (Windows DirectComposition
 * zero-copy yolu); GPU/CPU boşalır, fan susar. React.memo + kararlı prop'lar:
 * aynı kaynakta yeniden render'da framer'ın stili geri yazmasını önler.
 */
const VideoLayer = React.memo(
  function VideoLayer({
    resolved,
    onError
  }: {
    resolved: ResolvedVideo
    onError: () => void
  }): React.JSX.Element {
    const ref = useRef<HTMLDivElement>(null)
    return (
      <motion.div
        ref={ref}
        className="absolute inset-0"
        initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.4, scale: 1.05 }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onAnimationComplete={(definition) => {
          // Yalnızca reveal (giriş, opacity=1) bitince temizle; exit'te node gider.
          if ((definition as { opacity?: number })?.opacity !== 1) return
          const el = ref.current
          if (!el) return
          el.style.clipPath = 'none'
          el.style.transform = 'none'
          el.style.willChange = 'auto'
        }}
      >
        <video
          className="h-full w-full object-cover"
          src={resolved.src}
          autoPlay
          muted
          loop={resolved.loop}
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onError={onError}
        />
      </motion.div>
    )
  },
  (a, b) => a.resolved.src === b.resolved.src && a.onError === b.onError
)

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
  const [intro, setIntro] = useState(true)

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

  // useMemo: kaynak değişmedikçe referans sabit kalsın (VideoLayer boş yere
  // yeniden render olmasın → framer'ın overlay temizliğini bozmasın).
  const resolved: ResolvedVideo = useMemo(
    () => (failed ? source.resolveFallback() : source.resolve(activeLocation)),
    [failed, activeLocation, source]
  )

  const handleError = useCallback((): void => {
    // Lokal/çevrimiçi kaynak yüklenemediyse fallback'e düş (zincir bir kez).
    if (resolved.kind !== 'fallback') setFailed(true)
  }, [resolved.kind])

  return (
    <div className="relative h-full w-full overflow-hidden bg-eksim-ink">
      {/* Çevrimdışı/yükleniyor nihai yedeği: video kare veremezse (ör. internet
          yokken uzak fallback) düz siyah yerine marka temalı zemin görünür. */}
      <div className="absolute inset-0 bg-eksim-ink">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(60% 50% at 50% 40%, rgba(46,166,255,0.18), transparent 70%)'
          }}
        />
      </div>

      <AnimatePresence>
        <VideoLayer key={resolved.src} resolved={resolved} onError={handleError} />
      </AnimatePresence>

      <BrandLogo />

      {/* Güçlü scrim — parlak videolarda bile metin okunur. Alt band + sağ-alt
          köşede ekstra karartma (metin oraya yaslı). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 20%, transparent 46%), radial-gradient(95% 65% at 100% 100%, rgba(0,0,0,0.6), transparent 60%)'
        }}
      />

      {/* Tesis bilgisi overlay'i — sağ-alta hizalı (Framer Motion ile girer/çıkar). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-10 md:p-14">
        <AnimatePresence mode="wait">
          {activeLocation ? (
            <motion.div
              key={activeLocation.id}
              initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="ml-auto max-w-xl text-right [text-shadow:0_2px_16px_rgba(0,0,0,0.85)]"
            >
              <p
                className={`text-sm font-semibold uppercase tracking-[0.4em] ${SECTOR_ACCENT[activeLocation.sector]}`}
              >
                {SECTOR_LABEL[activeLocation.sector]}
              </p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight text-white">
                {activeLocation.name}
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-white/90">
                {activeLocation.description}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="ml-auto max-w-xl text-right [text-shadow:0_2px_16px_rgba(0,0,0,0.85)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.5em] text-eksim-glow/80">
                Eksim Holding
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Enerji ve Gıdada Geleceği İnşa Ediyoruz
              </h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {intro && <IntroScreen onDone={() => setIntro(false)} />}
    </div>
  )
}
