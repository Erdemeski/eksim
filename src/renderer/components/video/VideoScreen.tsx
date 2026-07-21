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

/**
 * Reveal hedef durumları — SALT opacity (clip-path/scale KASITLI OLARAK YOK).
 * Önceki sürüm bir clipPath "wipe" ile açılıyordu; animasyonlu clip-path,
 * Chromium'un video elemanına verdiği donanım overlay'ini (Windows
 * DirectComposition) geçiş süresince devre dışı bırakıp GPU doku
 * compositing'ine düşürüyordu — hem videonun kendisinde kare düşüşüne
 * (takılma) hem de ÜSTÜNDEKİ gradient scrim'in overlay↔normal compositing
 * arası geçiş anında bir-iki kare "bozulmasına" yol açıyordu (ikisi de aynı
 * kök neden). Salt opacity crossfade, overlay'i bozmadan salt alfa blend ile
 * çalışır — en ucuz ve en kararlı geçiş.
 */
const CLOSED = { opacity: 0 }
const OPEN = { opacity: 1 }
const REVEAL_TRANSITION = { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
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
 *   2) Hazır olunca salt-opacity crossfade oynatılır (bkz. CLOSED/OPEN
 *      tanımındaki not — clip-path/scale KASITLI kullanılmaz); biterken eski
 *      slot duraklatılır (çift-decode penceresi kısalır).
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

    // İlk atama: ön slotu (slot 0) doğrudan hazırla. Slot 0 `initial={OPEN}`
    // ile başladığından kaynak atanır atanmaz görünür olur — controls.set'in
    // async flush zamanlamasına bağlı DEĞİL. frontRef zaten 0.
    if (slotSrc.current[0] === '' && slotSrc.current[1] === '') {
      const v = getVideo(0)
      if (!v) return
      v.src = target
      slotSrc.current[0] = target
      v.load()
      void v.play().catch(() => {})
      // Slot 1'i gizli tut (initial opacity:0 yeterli, ama açıkça belirtelim).
      controls1.set({ opacity: 0, zIndex: 1 })
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
      const frontVideo = getVideo(front)

      // Gelen slot görünmez ve ÜSTTE; eski slot altta tam opak kalır — yalnız
      // gelen slotun opacity'si 0→1 artarken üzerine karışır (salt alfa blend,
      // donanım overlay'i bozmaz).
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
      bc.set({ opacity: 1, zIndex: 2 })
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
      {/* Slot 0: ilk video — OPEN ile başlar (opacity:1, clip temiz). İlk atama
          anında kaynak yüklenir yüklenmez görünür olur; controls.set flush
          zamanlamasına bağımlılık yok. */}
      <motion.div
        className="absolute inset-0"
        initial={OPEN}
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
          köşede ekstra karartma (metin oraya yaslı).
          TEK KARARTMA KATMANI (kasıtlı): okunabilirlik SADECE bu statik, hiç
          unmount olmayan div'den gelir. Önceki sürümde her iki metin
          motion.div'i (aşağıda) KENDİ `text-shadow`'unu taşıyordu; konum
          geçişinde (dwell tamamlanınca) AnimatePresence senkron modda eski ve
          yeni metni video crossfade'iyle aynı 0.5s'te BİLEREK üst üste
          bindirdiğinden (bkz. aşağıdaki not), iki farklı metin bloğunun iki
          ayrı gölgesi o kısa pencerede üst üste binip "çift karartma" gibi
          görünüyordu — geçiş bitip tek metin kalınca normale dönüyordu. Metin
          gölgesi kaldırıldı, bu scrim'in radial bileşeni (tam metnin oturduğu
          sağ-alt köşe) hafifçe güçlendirildi ki okunabilirlik en az öncekiyle
          eşdeğer kalsın — video crossfade'in kendisine (controls0/controls1,
          zamanlama) DOKUNULMADI. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: 3,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 20%, transparent 46%), radial-gradient(95% 65% at 100% 100%, rgba(0,0,0,0.72), transparent 60%)'
        }}
      />

      {/* Tesis bilgisi overlay'i — sağ-alta hizalı. PERF: her iki varyant da
          MUTLAK konumlanır (aynı sağ-alt çıpa, `flex justify-end` akış
          düzeni DEĞİL) — `mode="wait"` de KALDIRILDI, exit/enter video
          crossfade'iyle (0.5s) SENKRON ve ÜST ÜSTE biner. Bunlar olmadan
          (flex normal-akış çocukları + sıralı exit-sonra-enter) tam video
          geçişi anında ek bir flex reflow + 2× uzun animasyon penceresi
          oluşuyordu — takılmaya katkısı olan ikinci kaynaktı. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 4 }}>
        <AnimatePresence>
          {activeLocation ? (
            <motion.div
              key={activeLocation.id}
              // PERF: `filter: blur()` animasyonu KALDIRILDI (video geçişiyle aynı
              // anda her kare yeniden rasterize ediyordu). y+opacity compositor-only.
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-10 right-10 max-w-xl text-right md:bottom-14 md:right-14"
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
              transition={{ duration: 0.5 }}
              className="absolute bottom-10 right-10 max-w-xl text-right md:bottom-14 md:right-14"
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
