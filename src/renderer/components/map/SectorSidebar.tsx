import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { FacilityKind, Sector } from '@shared/types'
import { ALL_SECTOR_META, SECTOR_META, SECTOR_ORDER, type SectorSelection } from '@shared/sectors'
import { SectorIcon } from './SectorGraphics'

interface SectorSidebarProps {
  selected: SectorSelection
  onSelect: (sector: SectorSelection) => void
}

/** Panel genişliği (px) — kapanış geçişinin kayma mesafesi de budur. */
const PANEL_W = 244
/** Her zaman görünen kulakçık sekmesinin genişliği (px). */
const TAB_W = 42

/** Yan bar butonunda gösterilecek temsili ikon türü (sektörün baskın teknolojisi). */
const SECTOR_ICON_KIND: Record<Sector, FacilityKind> = {
  dicle: 'grid',
  energy: 'wind',
  food: 'food'
}

/** "Tümü" seçeneği için üç örtüşen halka — tekil bir SectorIcon türüne karşılık gelmez. */
function AllSectorsIcon({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      className={className}
    >
      <circle cx="8.5" cy="9" r="4.2" />
      <circle cx="15.5" cy="9" r="4.2" />
      <circle cx="12" cy="15.5" r="4.2" />
    </svg>
  )
}

/** Açık buzlu cam yüzey reçetesi — panel + kulakçık ortak (light mode). */
const LIGHT_GLASS: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(16px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.4)'
}

/**
 * Harita ekranının sağ kenarında, kulakçık sekmesiyle açılıp kapanan grup
 * (sektör) seçici. "Tümü" + Dicle/Enerji/Gıda butonları `selectedSector`'ı
 * (bkz. useKioskStore) belirler; MapScreen bu seçime göre pinleri/bağlantı
 * ızgaralarını filtreler.
 *
 * Görünüm: açık ("light mode") buzlu cam — koyu haritanın üstünde ferah,
 * yüksek okunur bir panel. Kulakçık HER ZAMAN sağ kenarda görünür kalır:
 * panelle AYNI `motion.div` içinde, panelin SOL kenarına (-TAB_W)
 * tutturulmuştur. Panel kapanınca (x: PANEL_W'ye kayar) kulakçık da onunla
 * birlikte kayar ve tam ekran kenarına oturur; panel açılınca panelin sol
 * kenarına yapışık kalır — ayrı bir state dallanması gerekmez, salt geometrinin
 * doğal sonucu.
 */
export function SectorSidebar({ selected, onSelect }: SectorSidebarProps): React.JSX.Element {
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-40 flex items-center">
      <motion.div
        className="pointer-events-auto relative"
        style={{ width: PANEL_W }}
        animate={{ x: open ? 0 : PANEL_W }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Kulakçık sekmesi — panelin sol kenarına yapışık, her zaman tıklanabilir. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Sektör panelini kapat' : 'Sektör panelini aç'}
          className="absolute top-1/2 flex h-32 w-[42px] -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-black/[0.06] text-slate-700 transition-colors hover:text-slate-900"
          style={{ left: -TAB_W, ...LIGHT_GLASS }}
        >
          <motion.svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            animate={{ rotate: open ? 0 : 180 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <path d="M14 6l-6 6 6 6" />
          </motion.svg>
        </button>

        {/* Panel gövdesi — açık buzlu cam. */}
        <div
          className="flex flex-col gap-2.5 rounded-l-3xl border border-r-0 border-black/[0.06] p-5"
          style={{
            ...LIGHT_GLASS,
            boxShadow:
              '0 1px 0 0 rgba(255,255,255,0.7) inset, 0 24px 60px -20px rgba(2,6,16,0.55)'
          }}
        >
          <p className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Eksim Holding
          </p>

          <SectorButton
            active={selected === 'all'}
            color={ALL_SECTOR_META.color}
            label={ALL_SECTOR_META.label}
            icon={<AllSectorsIcon className="h-6 w-6" />}
            onClick={() => onSelect('all')}
          />

          {SECTOR_ORDER.map((sector) => {
            const meta = SECTOR_META[sector]
            return (
              <SectorButton
                key={sector}
                active={selected === sector}
                color={meta.color}
                label={meta.label}
                icon={<SectorIcon kind={SECTOR_ICON_KIND[sector]} className="h-6 w-6" />}
                onClick={() => onSelect(sector)}
              />
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

interface SectorButtonProps {
  active: boolean
  color: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

/** Tek bir grup butonu — seçiliyken accent renk çerçeve/hale, değilken nötr açık. */
function SectorButton({
  active,
  color,
  label,
  icon,
  onClick
}: SectorButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl px-3.5 py-4 text-left transition-all duration-300"
      style={{
        color: active ? color : '#334155',
        background: active ? `${color}22` : 'rgba(15,23,42,0.04)',
        boxShadow: active
          ? `inset 0 0 0 1px ${color}88, 0 0 18px 1px ${color}33`
          : 'inset 0 0 0 1px rgba(15,23,42,0.06)'
      }}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">{icon}</span>
      <span className="text-[13.5px] font-semibold leading-tight">{label}</span>
    </button>
  )
}
