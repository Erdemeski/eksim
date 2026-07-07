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
  /** Sahadaki türler (hibrit sahada birden fazla — hepsi ikon olarak gösterilir). */
  kinds: FacilityKind[]
  /** Birincil accent renk (kinds[0]). */
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

/**
 * Pin üzerinde konumlanan premium bilgi baloncuğu — BEYAZ arkaplan, koyu metin,
 * sektör rengi yalnızca accent. Üç modda tek yapı: preview (ad + ikon),
 * countdown (geri sayım), active (kısa detay). Kuyruk pini işaretler. Mod
 * geçişleri framer `layout` ile yumuşak büyür; giriş/çıkış AnimatePresence.
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
      ? { bottom: -8, borderWidth: '9px 8px 0 8px', borderColor: '#ffffff transparent transparent transparent' }
      : { top: -8, borderWidth: '0 8px 9px 8px', borderColor: 'transparent transparent #ffffff transparent' }
  const activeCapacities = location.capacities?.filter((c) => c.mw > 0) ?? []
  const hasSubprojects = (location.subprojects?.length ?? 0) > 0

  return (
    <motion.div
      className="absolute"
      style={{ left: pos.x, top: pos.y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative" style={{ transform: `translate(-50%, ${offsetY})` }}>
        <motion.div
          layout
          className="relative flex flex-col overflow-hidden rounded-2xl bg-white"
          style={{
            width: mode === 'active' ? 320 : 216,
            boxShadow: `0 14px 40px -14px rgba(2,6,16,0.55), 0 0 0 1px rgba(2,6,16,0.05), 0 10px 30px -16px ${color}88`
          }}
        >
          <div className="flex items-center gap-3 px-3.5 pb-2.5 pt-3">
            {/* İkon çip(ler)i — hibrit sahada birden fazla tür yan yana. */}
            <div className="flex shrink-0 -space-x-1.5">
              {kinds.map((k) => (
                <div
                  key={k}
                  className="flex h-9 w-9 items-center justify-center rounded-xl ring-2 ring-white"
                  style={{
                    background: `${FACILITY_COLOR[k]}1a`,
                    color: FACILITY_COLOR[k],
                    boxShadow: `inset 0 0 0 1px ${FACILITY_COLOR[k]}33`
                  }}
                >
                  <SectorIcon kind={k} className="h-6 w-6" />
                </div>
              ))}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color }}>
                {kinds.map((k) => FACILITY_LABEL[k]).join(' & ')}
              </p>
              <h3 className="mt-0.5 text-[16px] font-semibold leading-tight text-slate-900">
                {location.name}
              </h3>
            </div>
          </div>

          {/* Kurulu güç — her modda görünür, her gösterimde baştan sayan sayaç. */}
          <div className="flex items-baseline gap-1.5 px-3.5 pb-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Kurulu Güç
            </span>
            <span className="text-lg font-bold leading-none tabular-nums" style={{ color }}>
              <AnimatedNumber value={location.totalMw} />
              <span className="ml-1 text-xs font-semibold text-slate-500">MW</span>
            </span>
          </div>

          {/* countdown: pürüzsüz ilerleme çubuğu. */}
          {mode === 'countdown' && (
            <div className="mx-3.5 mb-3 h-1 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, background: color }}
              />
            </div>
          )}

          {/* active: tür kırılımı + ilave kapasite rozeti + kısa detay. */}
          {mode === 'active' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="px-3.5 pb-3.5"
            >
              {(hasSubprojects || activeCapacities.length > 0 || (location.additionalMw ?? 0) > 0) && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {hasSubprojects
                    ? // Birleştirilmiş pin: isim bazlı rozetler (aynı tür olduğu için
                      // tür rozeti yerine HANGİ sahaların birleştiği gösterilir).
                      location.subprojects?.map((s) => (
                        <span
                          key={s.name}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${color}14`, color }}
                        >
                          {s.name} · {fmtMw(s.mw)} MW
                        </span>
                      ))
                    : activeCapacities.map((c) => (
                        <span
                          key={c.kind}
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{ background: `${FACILITY_COLOR[c.kind]}14`, color: FACILITY_COLOR[c.kind] }}
                        >
                          <SectorIcon kind={c.kind} className="h-3 w-3" />
                          {FACILITY_LABEL[c.kind]} · {fmtMw(c.mw)} MW
                        </span>
                      ))}
                  {(location.additionalMw ?? 0) > 0 && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      +{fmtMw(location.additionalMw ?? 0)} MW yatırım aşamasında
                    </span>
                  )}
                </div>
              )}
              <p className="text-[12px] leading-relaxed text-slate-600">{location.description}</p>
            </motion.div>
          )}

          {/* Alt accent şerit. */}
          <div className="h-[10px] w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}22)` }} />
        </motion.div>

        {/* Pine bakan beyaz kuyruk (kart dışında — overflow-hidden kırpmaz). */}
        <div
          className="absolute left-1/2 h-0 w-0 -translate-x-1/2"
          style={{
            borderStyle: 'solid',
            borderWidth: tail.borderWidth,
            borderColor: tail.borderColor,
            ...(placement === 'top' ? { bottom: tail.bottom } : { top: tail.top }),
            filter: 'drop-shadow(0 4px 3px rgba(2,6,16,0.18))'
          }}
        />
      </div>
    </motion.div>
  )
}
