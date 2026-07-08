import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
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

/** Reveal (clipPath maske) hedef durumları — mevcut premium geçişle birebir. */
const CLOSED = { clipPath: 'inset(100% 0% 0% 0%)', opacity: 0.4, scale: 1.05 }
const OPEN = { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, scale: 1 }
const REVEAL_TRANSITION = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
/** loadeddata gelmezse (ör. hata) reveal'ı tetikleyen güvenlik süresi (ms). */
const LOAD_SAFETY_MS = 1200

/**
 * Monitör 2 — dikey video ekranı.
 *
 * KRİTİK PERF (video geçiş takılması): Video, HER kaynak değişiminde YENİDEN
 * monte edilen tek bir <video> yerine, DAİMA monte KALAN İKİ <video> elemanlı
 * bir "crossfade havuzu" ile oynatılır. Yeni kaynağa geçerken:
 *   1) Arka (görünmez) slota kaynak atanır, `load()` çağrılır ve ilk kare
 *      hazır olana kadar (`loadeddata`) BEKLENİR — böylece reveal, DECODE
 *      gecikmesiyle çakışmaz (eski davranışta videonun ilk ~1 sn'si donuyordu).
 *   2) Hazır olunca premium clipPath reveal oynatılır; biterken eski slot
 *      duraklatılır (çift-decode penceresi kısalır).
 * Eleman create/destroy churn'ü ve fallback'e dönüşteki yeniden-yükleme böylece
 * ortadan kalkar. Aynı kaynağa "geçiş" no-op'tur.
 */
export function VideoScreen(): React.JSX.Element {
  const source = useMemo(() => new LocalMp4Source(), [])
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const [failed, setFailed] = useState(false)
  const [intro, setIntro] = useState(true)

  // İki kalıcı video slotu + reveal kontrolleri.
  const video0Ref = useRef<HTMLVideoElement>(null)
  const video1Ref = useRef<HTMLVideoElement>(null)
  const controls0 = useAnimationControls()
  const controls1 = useAnimationControls()
  /** Görünür (ön) slot indeksi. */
  const frontRef = useRef<0 | 1>(0)
  /** Her slotun o an yüklü kaynağı. */
  const slotSrc = useRef<[string, string]>(['', ''])
  /** Bayat (iptal edilmiş) geçişleri elemek için jeton. */
  const tokenRef = useRef(0)

  const getVideo = (i: 0 | 1): HTMLVideoElement | null =>
    i === 0 ? video0Ref.current : video1Ref.current
  const getControls = (i: 0 | 1): ReturnType<typeof useAnimationControls> =>
    i === 0 ? controls0 : controls1

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

  const resolved: ResolvedVideo = useMemo(
    () => (failed ? source.resolveFallback() : source.resolve(activeLocation)),
    [failed, activeLocation, source]
  )

  const handleError = useCallback((): void => {
    // Lokal/çevrimiçi kaynak yüklenemediyse fallback'e düş (zincir bir kez).
    if (resolved.kind !== 'fallback') setFailed(true)
  }, [resolved.kind])

  // Kaynak değişince crossfade havuzunu sür.
  useEffect(() => {
    const target = resolved.src
    const front = frontRef.current

    // Aynı kaynak zaten önde → hiçbir şey yapma (fallback aynı kaldığında takılma yok).
    if (slotSrc.current[front] === target) return

    // İlk atama: ön slotu (slot 0) doğrudan hazırla. Görünürlük `initial` ile
    // sağlanır (slot 0 zaten OPEN başlar) → controls.set flush zamanlamasına
    // bağlı DEĞİL; sadece kaynağı yükle ve oynat.
    if (slotSrc.current[0] === '' && slotSrc.current[1] === '') {
      const v = getVideo(0)
      if (!v) return
      v.src = target
      slotSrc.current[0] = target
      v.load()
      void v.play().catch(() => {})
      return
    }

    const token = ++tokenRef.current
    const back: 0 | 1 = front === 0 ? 1 : 0
    const backVideo = getVideo(back)
    if (!backVideo) return

    const runReveal = async (): Promise<void> => {
      if (token !== tokenRef.current) return
      const bc = getControls(back)
      const fc = getControls(front)
      const backLayer = backVideo.parentElement as HTMLElement | null
      const frontVideo = getVideo(front)

      // Gelen slot kapalı ve ÜSTTE; eski slot altta görünür kalır (üzerine wipe).
      bc.set({ ...CLOSED, zIndex: 2 })
      fc.set({ zIndex: 1 })
      try {
        await backVideo.play()
      } catch {
        /* muted autoplay engellenmez; yine de güvenli */
      }
      if (token !== tokenRef.current) return

      await bc.start({ ...OPEN, transition: REVEAL_TRANSITION })
      if (token !== tokenRef.current) return

      // Commit: ön slot artık `back`. Eski slotu duraklat + gizle.
      frontRef.current = back
      if (frontVideo) frontVideo.pause()
      fc.set({ opacity: 0, zIndex: 1 })
      // Donanım overlay temizliği: sürekli oynatımda clip/transform artığı kalmasın.
      if (backLayer) {
        backLayer.style.clipPath = 'none'
        backLayer.style.transform = 'none'
        backLayer.style.willChange = 'auto'
      }
    }

    // Arka slotta hedef zaten yüklüyse (ör. remote→fallback dönüşü) tekrar yükleme.
    if (slotSrc.current[back] === target && backVideo.readyState >= 2) {
      void runReveal()
      return
    }

    backVideo.src = target
    slotSrc.current[back] = target
    backVideo.load()

    let fired = false
    const onReady = (): void => {
      if (fired) return
      fired = true
      backVideo.removeEventListener('loadeddata', onReady)
      window.clearTimeout(timer)
      void runReveal()
    }
    backVideo.addEventListener('loadeddata', onReady)
    const timer = window.setTimeout(onReady, LOAD_SAFETY_MS)

    return () => {
      backVideo.removeEventListener('loadeddata', onReady)
      window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.src])

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

      {/* Kalıcı iki video slotu (crossfade havuzu). src imperatif atanır. */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, clipPath: 'inset(100% 0% 0% 0%)' }}
        animate={controls0}
        style={{ zIndex: 1 }}
      >
        <video
          ref={video0Ref}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onError={handleError}
        />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={controls1}
        style={{ zIndex: 1 }}
      >
        <video
          ref={video1Ref}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          disableRemotePlayback
          onError={handleError}
        />
      </motion.div>

      <BrandLogo />

      {/* Güçlü scrim — parlak videolarda bile metin okunur. Alt band + sağ-alt
          köşede ekstra karartma (metin oraya yaslı). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 20%, transparent 46%), radial-gradient(95% 65% at 100% 100%, rgba(0,0,0,0.6), transparent 60%)'
        }}
      />

      {/* Tesis bilgisi overlay'i — sağ-alta hizalı (Framer Motion ile girer/çıkar). */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-10 md:p-14"
        style={{ zIndex: 4 }}
      >
        <AnimatePresence mode="wait">
          {activeLocation ? (
            <motion.div
              key={activeLocation.id}
              // PERF: `filter: blur()` animasyonu KALDIRILDI (video geçişiyle aynı
              // anda her kare yeniden rasterize ediyordu). y+opacity compositor-only.
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
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
