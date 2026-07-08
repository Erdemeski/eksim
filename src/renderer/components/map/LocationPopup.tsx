import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import type { EksimLocation, FacilityKind, Point } from '@shared/types'
import { FACILITY_COLOR, FACILITY_LABEL, SectorIcon } from './SectorGraphics'

export type PopupMode = 'preview' | 'countdown' | 'active'

interface LocationPopupProps {
  /** Konteyner-göreli pin ekran konumu (px). */
  pos: Point
  /** Kart pinin üstünde mi altında mı dursun (ekran kenarına göre). */
  placement: 'top' | 'bottom'
  mode: PopupMode
  location: EksimLocation
  /** Sahadaki türler (hibrit sahada birden fazla — hepsi kapsül olarak gösterilir). */
  kinds: FacilityKind[]
  /** Birincil accent renk (hibritte mor; tekil türde kendi rengi). */
  color: string
  /** countdown modunda kalan saniye (3→1). */
  countdown?: number
  /** countdown modunda sürekli ilerleme (0→1) — pürüzsüz çubuk. */
  progress?: number
}

/** MW değerini Türkçe biçimde formatlar — tam sayıysa ondalıksız. */
function fmtMw(n: number): string {
  const decimals = n % 1 !== 0 ? 1 : 0
  return n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/**
 * GSAP proxy-tween ile 0'dan hedef değere sayan premium "kurulu güç" sayacı
 * (kiosk'ta zaten kullanılan geri sayım proxy deseniyle tutarlı). Popup her
 * yeni konum için yeniden monte edildiğinden (key=location.id) sayaç her
 * gösterimde baştan oynar.
 */
function AnimatedNumber({ value }: { value: number }): React.JSX.Element {
  const [display, setDisplay] = useState(0)
  const decimals = value % 1 !== 0 ? 1 : 0

  useEffect(() => {
    const proxy = { v: 0 }
    const tween = gsap.to(proxy, {
      v: value,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => setDisplay(proxy.v)
    })
    return () => {
      tween.kill()
    }
  }, [value])

  return (
    <>{display.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>
  )
}

/** Pinden karta olan dikey boşluk (px) — kuyruk pini işaret eder. */
const GAP = 34

/** Kuyruk/kart cam zemini (tail düz renk ister; karttaki camla aynı aile). */
const GLASS_BG = 'rgba(10, 16, 32, 0.58)'
const GLASS_TAIL = 'rgba(13, 20, 38, 0.88)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.13)'

/**
 * Pin üzerinde konumlanan premium bilgi baloncuğu — KOYU CAM tasarım
 * (mockup'a göre): dikey tür kapsülleri (tür başına MW), beyaz başlık,
 * "yatırım aşamasında" rozeti, büyük parlayan toplam MW sayacı.
 *
 * Cam yüzey, reactbits GlassSurface'in DARK-MODE FALLBACK stilidir
 * (blur+saturate backdrop + inset ışık vurguları) — tam sürümdeki
 * `backdrop-filter: url(#svg-displacement)` BİLEREK kullanılmaz: SVG
 * displacement backdrop'u her kare yeniden rasterize eder ve bu projede
 * tek tek söktüğümüz takılma deseninin ta kendisidir. Küçük popup alanında
 * düz blur'un maliyeti ihmal edilebilir.
 *
 * Üç modda tek yapı: preview (kapsüller + başlık + toplam MW), countdown
 * (+ ilerleme çubuğu), active (+ rozet, açıklama, subproject çipleri;
 * framer `layout` ile yumuşak büyür). Giriş/çıkış AnimatePresence.
 */
export function LocationPopup({
  pos,
  placement,
  mode,
  location,
  kinds,
  color,
  progress = 0
}: LocationPopupProps): React.JSX.Element {
  const offsetY = placement === 'top' ? `calc(-100% - ${GAP}px)` : `${GAP}px`
  const tail =
    placement === 'top'
      ? { bottom: -9, borderWidth: '10px 9px 0 9px', borderColor: `${GLASS_TAIL} transparent transparent transparent` }
      : { top: -9, borderWidth: '0 9px 10px 9px', borderColor: `transparent transparent ${GLASS_TAIL} transparent` }

  const activeCapacities = location.capacities?.filter((c) => c.mw > 0) ?? []
  // Kapasite kırılımı yoksa (ör. tümü yatırım aşamasında) kapsüller ikon-only düşer.
  const pills =
    activeCapacities.length > 0
      ? activeCapacities
      : kinds.map((k) => ({ kind: k, mw: 0 }))
  const hasSubprojects = (location.subprojects?.length ?? 0) > 0
  const isActive = mode === 'active'

  return (
    // Statik konum çıpası — burada transform ANİMASYONU YOK. Kritik: giriş
    // scale animasyonu bir ATA'da olursa, alt cam kartın backdrop-filter'ı
    // "backdrop root" izolasyonuna girer ve scale sürerken blur görünmez
    // (Chromium davranışı). Bu yüzden animasyon aşağıda, backdrop-filter
    // taşıyan öğenin KENDİSİNDE.
    <div className="absolute" style={{ left: pos.x, top: pos.y }}>
      <div className="relative" style={{ transform: `translate(-50%, ${offsetY})` }}>
        <motion.div
          layout
          className="relative flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: isActive ? 368 : 272,
            borderRadius: 24,
            background: GLASS_BG,
            backdropFilter: 'blur(16px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.5)',
            border: `1px solid ${GLASS_BORDER}`,
            boxShadow: `0 0 2px 1px rgba(255,255,255,0.10) inset,
              0 0 12px 4px rgba(255,255,255,0.04) inset,
              0 18px 48px -16px rgba(2,6,16,0.8),
              0 10px 34px -18px ${color}66`
          }}
        >
          {/* Üst inset ışık vurgusu (cam kenarı hissi). */}
          <div
            className="pointer-events-none absolute inset-x-4 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
          />

          <div className="flex gap-3.5 px-4 pb-2 pt-4">
            {/* Dikey tür kapsülleri — tür başına büyütülmüş ikon + altında
                iki satırlı MW (büyük/bold sayı, altında küçük "MW" birimi,
                ortalanmış). */}
            <div className="flex shrink-0 gap-2 max-h-24">
              {pills.map((p) => {
                const kc = FACILITY_COLOR[p.kind]
                return (
                  <div
                    key={p.kind}
                    className="flex w-14 flex-col items-center gap-2 rounded-full px-1 py-2"
                    style={{
                      background: `linear-gradient(180deg, ${kc}3d, ${kc}14)`,
                      boxShadow: `inset 0 0 0 1px ${kc}55, inset 0 1px 6px ${kc}22`
                    }}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ background: `${kc}2b`, color: kc, boxShadow: `inset 0 0 0 1px ${kc}66` }}
                    >
                      <SectorIcon kind={p.kind} className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col items-center leading-none">
                      <span className="text-[16px] font-extrabold tabular-nums text-white">
                        {p.mw > 0 ? fmtMw(p.mw) : '—'}
                      </span>
                      {p.mw > 0 && (
                        <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/55">
                          MW
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sağ blok: etiket + başlık + (aktifte) rozet ve çipler. */}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
                {kinds.map((k) => FACILITY_LABEL[k]).join(' & ')}
              </p>
              <h3 className="mt-1 text-[20px] font-bold leading-tight tracking-tight text-white">
                {location.name}
              </h3>

              {isActive && (location.additionalMw ?? 0) > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.12 }}
                  className="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold text-white/85"
                  style={{ background: 'rgba(255,255,255,0.08)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)' }}
                >
                  +{fmtMw(location.additionalMw ?? 0)} MW yatırım aşamasında
                </motion.span>
              )}

              {isActive && hasSubprojects && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.18 }}
                  className="mt-2 flex flex-wrap gap-1.5"
                >
                  {location.subprojects?.map((s) => (
                    <span
                      key={s.name}
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ background: `${color}1f`, color: '#ffffff', boxShadow: `inset 0 0 0 1px ${color}44` }}
                    >
                      {s.name} · {fmtMw(s.mw)} MW
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* countdown: accent ilerleme çubuğu. */}
          {mode === 'countdown' && (
            <div className="mx-4 mb-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, background: color }}
              />
            </div>
          )}

          {/* Alt satır: büyük parlayan toplam MW + (aktifte) açıklama. */}
          <div className="flex items-end gap-4 px-4 pb-4 pt-2">
            <div className="shrink-0">
              <p
                className="text-[30px] font-extrabold leading-none tabular-nums text-white"
                style={{ textShadow: `0 0 16px ${color}b3, 0 0 40px ${color}59` }}
              >
                <AnimatedNumber value={location.totalMw} />
                <span className="ml-1.5 text-[17px] font-bold text-white/90">MW</span>
              </p>
              <p className="mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.24em] text-white/50">
                Kurulu Güç
              </p>
            </div>

            {isActive && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-slate-300/80"
              >
                {location.description}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Pine bakan cam kuyruk (kart dışında — overflow-hidden kırpmaz). */}
        <div
          className="absolute left-1/2 h-0 w-0 -translate-x-1/2"
          style={{
            borderStyle: 'solid',
            borderWidth: tail.borderWidth,
            borderColor: tail.borderColor,
            ...(placement === 'top' ? { bottom: tail.bottom } : { top: tail.top }),
            filter: 'drop-shadow(0 2px 4px rgba(2,6,16,0.5))'
          }}
        />
      </div>
    </div>
  )
}
