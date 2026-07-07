import React from 'react'
import type { FacilityKind } from '@shared/types'

/** Tür → kısa Türkçe etiket (popup ikon altyazısı). */
export const FACILITY_LABEL: Record<FacilityKind, string> = {
  wind: 'Rüzgâr Enerjisi',
  solar: 'Güneş Enerjisi',
  hydro: 'Hidroelektrik',
  food: 'Gıda'
}

/** Tür → vurgu rengi (enerji tonları mavi ailesi, gıda yeşil). */
export const FACILITY_COLOR: Record<FacilityKind, string> = {
  wind: '#2EA6FF',
  solar: '#FDB813',
  hydro: '#38BDF8',
  food: '#34D399'
}

/**
 * Birden fazla santral türü barındıran (hibrit) sahalar için AYIRT EDİCİ
 * vurgu rengi — dört tekil tür renginden (mavi/amber/camgöbeği/yeşil) farklı,
 * mor/menekşe. Pin, hale, dalga (ripple) ve popup çerçevesi bu rengi kullanır;
 * amblem ikonları yine kendi teknoloji rengini korur (rüzgar mavi, güneş amber)
 * — böylece "hangi sahalar birleşik" bir bakışta ayırt edilir.
 */
export const HYBRID_COLOR = '#8B5CF6'

/** Bir sahanın site-vurgu rengi: tekil türde kendi rengi, hibritte HYBRID_COLOR. */
export function accentColor(kinds: FacilityKind[]): string {
  return kinds.length > 1 ? HYBRID_COLOR : FACILITY_COLOR[kinds[0]]
}

interface SectorIconProps {
  kind: FacilityKind
  className?: string
}

/**
 * Popup içindeki küçük tür ikonu — ince çizgili (stroke=currentColor), premium
 * minimal. 24×24 viewBox; renk ebeveynden `color` ile gelir.
 */
export function SectorIcon({ kind, className = '' }: SectorIconProps): React.JSX.Element {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }

  switch (kind) {
    case 'wind':
      return (
        <svg {...common}>
          <path d="M12 13.5V21" />
          <path d="M10 21h4" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <path d="M12 10.6 12 4.2c1.7 0 2.6 1.4 2.1 2.9L12 10.6Z" />
          <path d="m13.2 12.9 5.6 3c.9-1.4.2-3-1.4-3.4l-4.2.4Z" />
          <path d="m10.8 12.9-5.6 3c-.9-1.4-.2-3 1.4-3.4l4.2.4Z" />
        </svg>
      )
    case 'solar':
      return (
        <svg {...common}>
          <rect x="3.5" y="8.5" width="17" height="9" rx="1" />
          <path d="M8.7 8.5 7.4 17.5M13.3 8.5 12.4 17.5M3.5 12h17" />
          <path d="M12 2.6V4.4M4.6 5.1l1.1 1.1M19.4 5.1l-1.1 1.1" />
        </svg>
      )
    case 'hydro':
      return (
        <svg {...common}>
          <path d="M12 3.2c3.2 3.6 5 6 5 8.6a5 5 0 0 1-10 0c0-2.6 1.8-5 5-8.6Z" />
          <path d="M9.4 12.2c.9.9 2.3.9 3.2 0" />
        </svg>
      )
    case 'food':
      return (
        <svg {...common}>
          <path d="M12 20c0-5 0-9 6-12-.3 6-2.4 9-6 10.5" />
          <path d="M12 20c0-4-1-7-5-9" />
          <path d="M12 20v-6" />
        </svg>
      )
  }
}
