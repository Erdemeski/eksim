/**
 * Eksim Holding grup (sektör) meta verisi — yan bar butonları, marker/ızgara
 * renkleri ve bağlantı animasyonu türü buradan tek noktadan beslenir.
 */
import type { Sector } from './types'

/** Yan bar seçimi: tek bir grup ya da hepsi birden. */
export type SectorSelection = Sector | 'all'

/** Yan barda gösterilecek grup sırası (yukarıdan aşağı). */
export const SECTOR_ORDER: Sector[] = ['dicle', 'energy', 'food']

/** Bağlantı animasyonu ailesi — bkz. ConnectionGrid.tsx. */
export type ConnectionVariant = 'electric' | 'conveyor'

export interface SectorMeta {
  /** Yan bar ve video ekranı için tam etiket. */
  label: string
  /** Kısa etiket (buton/rozet). */
  short: string
  /** Vurgu rengi — ızgara/ikon/aktif buton çerçevesi. */
  color: string
  /** Pinler arası bağlantı animasyonunun türü. */
  connection: ConnectionVariant
}

export const SECTOR_META: Record<Sector, SectorMeta> = {
  dicle: { label: 'Dicle Grubu', short: 'Dicle', color: '#F59E0B', connection: 'electric' },
  energy: { label: 'Enerji Grubu', short: 'Enerji', color: '#2EA6FF', connection: 'electric' },
  food: { label: 'Gıda Grubu', short: 'Gıda', color: '#34D399', connection: 'conveyor' }
}

/** Yan barın "Tümü" butonu için nötr etiket/renk. */
export const ALL_SECTOR_META = { label: 'Tümü', short: 'Tümü', color: '#94A3B8' } as const
