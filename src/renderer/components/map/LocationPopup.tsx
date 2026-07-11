import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import type { EksimLocation, FacilityKind, Point } from '@shared/types'
import { FACILITY_COLOR, FACILITY_LABEL } from './SectorGraphics'
import windIconPng from '../../assets/wind-power.png'
import solarIconPng from '../../assets/solar-panel.png'
import hydroIconPng from '../../assets/hydro-power.png'

export type PopupMode = 'preview' | 'countdown' | 'active'

interface LocationPopupProps {
  /** Kartın konteyner-göreli EKRAN çıpası (kartın ÜST-ORTA noktası). */
  pos: Point
  /**
   * Gerçek render yüksekliği ölçülünce PopupLayer'a bildirir (id ile
   * etiketli). ÖNEMLİ: PopupLayer'la PAYLAŞILAN bir ref DEĞİL — AnimatePresence
   * çıkış/giriş geçişinde eski ve yeni kart aynı anda DOM'da olabildiğinden,
   * paylaşılan tek bir ref'in hangi karta bağlı kalacağı belirsizleşir (yarış
   * durumu). Bunun yerine her kart KENDİ iç ref'ini ölçer, id'siyle bildirir —
   * PopupLayer yalnız GÜNCEL hedefin ölçümünü uygular, bayat/çıkan kartınkini yok sayar.
   */
  onMeasure?: (locationId: string, height: number) => void
  mode: PopupMode
  location: EksimLocation
  /** Sahadaki türler (hibrit sahada birden fazla). */
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

/** Kullanıcının eklediği PNG ikonlar (siyah silüet, şeffaf zemin) — yalnız
    enerji türleri için; 'food' bu pinlerde hiç oluşmaz. */
const KIND_ICON_PNG: Partial<Record<FacilityKind, string>> = {
  wind: windIconPng,
  solar: solarIconPng,
  hydro: hydroIconPng
}

/**
 * Proje satırı ikonu: PNG siluet, CSS `mask-image` ile türün rengine boyanır
 * (PNG'nin alfa kanalı şekli verir, dolgu rengi `backgroundColor`'dan gelir —
 * orijinal PNG rengi ne olursa olsun türe göre doğru renkte çıkar).
 */
function KindIcon({ kind, color }: { kind: FacilityKind; color: string }): React.JSX.Element {
  const icon = KIND_ICON_PNG[kind]
  if (!icon) return <span className="block h-5 w-5" style={{ background: color, borderRadius: 4 }} />
  return (
    <span
      className="block h-5 w-5"
      style={{
        backgroundColor: color,
        WebkitMaskImage: `url(${icon})`,
        maskImage: `url(${icon})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center'
      }}
    />
  )
}

/** Kart cam zemini. */
const GLASS_BG = 'rgba(10, 16, 32, 0.58)'
const GLASS_BORDER = 'rgba(255, 255, 255, 0.13)'

/** Popup'ta ayrı bölüm olarak listelenen tek bir proje satırı. */
interface ProjectSection {
  key: string
  kind: FacilityKind
  name: string
  mw: number
}

/**
 * Pinin kapsadığı projeleri ayrı bölümlere çözer (kullanıcı isteği: birden
 * fazla proje tek projeymiş gibi değil, ayraçla alt alta gösterilsin):
 *  1. Birleşik pinler (`subprojects`) → alt proje başına bölüm (ad + MW; ikon
 *     pinin birincil türü — birleşik pinler tek türlüdür).
 *  2. Hibrit sahalar (birden çok tür) → tür başına bölüm (`capacities` MW'ı).
 *  3. Tek proje → tek bölüm (tür etiketi + mevcut MW).
 */
function projectSections(location: EksimLocation): ProjectSection[] {
  const primary = location.kinds[0]
  if (location.subprojects && location.subprojects.length > 0) {
    return location.subprojects.map((s) => ({ key: s.name, kind: primary, name: s.name, mw: s.mw }))
  }
  const caps = location.capacities ?? []
  if (location.kinds.length > 1) {
    return location.kinds.map((k) => ({
      key: k,
      kind: k,
      name: FACILITY_LABEL[k],
      mw: caps.find((c) => c.kind === k)?.mw ?? 0
    }))
  }
  return [{ key: primary, kind: primary, name: FACILITY_LABEL[primary], mw: caps[0]?.mw ?? 0 }]
}

/**
 * İlin sınırlarının ALTINA hizalanan premium bilgi kartı — KOYU CAM tasarım:
 * beyaz başlık, proje bölümleri (ayraç çizgili alt alta liste), "yatırım
 * aşamasında" rozeti, büyük parlayan toplam MW sayacı. Belirli bir pini
 * işaret eden çentik/kuyruk YOK (kart artık pine değil, ile bağlı — bkz.
 * PopupLayer'daki il-bbox tabanlı konumlama).
 *
 * Cam yüzey, reactbits GlassSurface'in DARK-MODE FALLBACK stilidir
 * (blur+saturate backdrop + inset ışık vurguları) — tam sürümdeki
 * `backdrop-filter: url(#svg-displacement)` BİLEREK kullanılmaz: SVG
 * displacement backdrop'u her kare yeniden rasterize eder ve bu projede
 * tek tek söktüğümüz takılma deseninin ta kendisidir.
 *
 * Üç modda tek yapı: preview (başlık + bölümler + toplam MW), countdown
 * (+ ilerleme çubuğu), active (+ rozet, açıklama; framer `layout` ile yumuşak
 * büyür). Giriş/çıkış AnimatePresence.
 */
export function LocationPopup({
  pos,
  onMeasure,
  mode,
  location,
  kinds,
  color,
  progress = 0
}: LocationPopupProps): React.JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null)
  const sections = projectSections(location)
  const isActive = mode === 'active'

  // Her kart KENDİ ref'ini ölçer (bkz. onMeasure prop açıklaması) — layout
  // yüksekliği (offsetHeight) transform/scale animasyonundan etkilenmez,
  // bu yüzden giriş animasyonu sürerken bile doğru değer okunur.
  useLayoutEffect(() => {
    if (cardRef.current) onMeasure?.(location.id, cardRef.current.offsetHeight)
  })

  return (
    // Statik konum çıpası — burada transform ANİMASYONU YOK. Kritik: giriş
    // scale animasyonu bir ATA'da olursa, alt cam kartın backdrop-filter'ı
    // "backdrop root" izolasyonuna girer ve scale sürerken blur görünmez
    // (Chromium davranışı). Bu yüzden animasyon aşağıda, backdrop-filter
    // taşıyan öğenin KENDİSİNDE.
    <div className="absolute" style={{ left: pos.x, top: pos.y }}>
      <div ref={cardRef} className="relative" style={{ transform: 'translateX(-50%)' }}>
        <motion.div
          layout
          className="relative flex flex-col overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: isActive ? 368 : 296,
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

          {/* Başlık bloğu: tür etiketi + saha adı + (aktifte) rozet. */}
          <div className="px-4 pb-1 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
              {kinds.map((k) => FACILITY_LABEL[k]).join(' & ')}
            </p>
            <h3 className="mt-1 text-[19px] font-bold leading-tight tracking-tight text-white">
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
          </div>

          {/* Proje bölümleri — her proje ayrı satır, aralarında ayraç çizgisi. */}
          <div className="mt-1.5 flex flex-col px-4">
            {sections.map((s, i) => {
              const kc = FACILITY_COLOR[s.kind]
              return (
                <React.Fragment key={s.key}>
                  {i > 0 && (
                    <div
                      className="h-px w-full"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)'
                      }}
                    />
                  )}
                  <div className="flex items-center gap-3 py-2">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: `linear-gradient(180deg, ${kc}3d, ${kc}14)`,
                        boxShadow: `inset 0 0 0 1px ${kc}55`
                      }}
                    >
                      <KindIcon kind={s.kind} color={kc} />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-white/90">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-white">
                      {s.mw > 0 ? (
                        <>
                          {fmtMw(s.mw)}
                          <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-white/55">
                            MW
                          </span>
                        </>
                      ) : (
                        <span className="text-white/45">—</span>
                      )}
                    </span>
                  </div>
                </React.Fragment>
              )
            })}
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
          <div className="flex items-end gap-4 px-4 pb-4 pt-1.5">
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
      </div>
    </div>
  )
}
