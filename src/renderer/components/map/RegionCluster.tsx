import React from 'react'
import { motion } from 'framer-motion'
import type { EksimLocation, FacilityKind } from '@shared/types'
import { SECTOR_META } from '@shared/sectors'
import { TR_PROVINCES } from './trProvinces'
import { FACILITY_COLOR, SectorIcon } from './SectorGraphics'
import { regionCenter, type MapRegion } from './regions'

interface RegionClusterProps {
  region: MapRegion
  /** Bölgedeki görünür pinler (sektör filtresi uygulanmış). */
  members: EksimLocation[]
  /** 'idle' normal; 'preview' standby döngüsünde sırası gelince belirginleşir. */
  state: 'idle' | 'preview'
  /** Kümeye dokununca (tap) — bölge penceresini açar. */
  onOpen: () => void
}

/** Üyelerin sektörü tekse o sektörün rengi, karışıksa nötr çok-sektör tonu. */
function clusterAccent(members: EksimLocation[]): string {
  const sectors = new Set(members.map((m) => m.sector))
  if (sectors.size === 1) return SECTOR_META[[...sectors][0]].color
  return '#9FB4CF'
}

/** Üyelerdeki farklı santral/tesis türleri (rozet mini ikonları için). */
function distinctKinds(members: EksimLocation[]): FacilityKind[] {
  return Array.from(new Set(members.flatMap((m) => m.kinds)))
}

/**
 * Ana haritada sıkışık bir detay bölgesini temsil eden KÜME: üye illerin siyasi
 * sınırı (accent dolgu + kontur, ProvinceHighlight dili) + bölge merkezinde
 * içeriğin mini ikon özeti (hangi türler + toplam pin sayısı). Kümeye dokununca
 * `onOpen` ile büyütülmüş bölge penceresi açılır (bkz. RegionDetailOverlay).
 *
 * TurkeyMap'in children'ı olarak SVG viewBox uzayında çizilir — il yolları
 * (trProvinces) ve pin projeksiyonu aynı uzayda olduğundan hizalama otomatik.
 *
 * Tap hedefi = üye il DOLGULARI (bbox dikdörtgeni değil) → yalnız bölgenin
 * gerçek şekli tıklanabilir; komşu illerdeki serbest pinlerin dokunuşunu çalmaz.
 * Hem `onPointerDown` (imleç modu) hem `onTouchStart` (figür modunda
 * konteynerin preventDefault'una takılmadan) bağlanır.
 */
export function RegionCluster({
  region,
  members,
  state,
  onOpen
}: RegionClusterProps): React.JSX.Element {
  const accent = clusterAccent(members)
  const kinds = distinctKinds(members)
  const center = regionCenter(region)
  const preview = state === 'preview'

  const open = (e: React.SyntheticEvent): void => {
    e.stopPropagation()
    onOpen()
  }

  // Rozet boyutu (viewBox birimi). İçerik pikselleri bu kutuyu kendi tuvali
  // kabul eder (foreignObject SVG ölçeğiyle ölçeklenir — LocationMarker deseni).
  const iconCount = Math.min(kinds.length, 3)
  const badgeW = 42 + iconCount * 22
  const badgeH = 30

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <g className="eksim-province-breathe">
        {/* Dolgu + tap hedefi (yalnız bölge şekli). */}
        {region.provinceIds.map((id) => {
          const province = TR_PROVINCES[id]
          if (!province) return null
          return (
            <path
              key={`fill-${id}`}
              d={province.d}
              fill={accent}
              opacity={preview ? 0.42 : 0.28}
              onPointerDown={open}
              onTouchStart={open}
              style={{ cursor: 'pointer' }}
            />
          )
        })}
        {/* Accent kontur + ince beyaz iç hairline (neon dili) — olay geçirmez. */}
        {region.provinceIds.map((id) => {
          const province = TR_PROVINCES[id]
          if (!province) return null
          return (
            <g key={`stroke-${id}`} pointerEvents="none">
              <path d={province.d} fill="none" stroke={accent} strokeWidth={preview ? 1.7 : 1.3} opacity={0.9} />
              <path d={province.d} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.45} />
            </g>
          )
        })}
      </g>

      {/* Merkez mini-özet rozeti: türler + toplam pin sayısı. Olay geçirmez;
          tıklama alttaki il dolgularına gider. */}
      <foreignObject
        x={center.x - badgeW / 2}
        y={center.y - badgeH / 2}
        width={badgeW}
        height={badgeH}
        pointerEvents="none"
        style={{ overflow: 'visible' }}
      >
        <div
          style={{
            width: badgeW,
            height: badgeH,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: badgeH * 0.16,
            padding: `0 ${badgeH * 0.28}px`,
            borderRadius: badgeH,
            background: 'rgba(10, 16, 32, 0.72)',
            border: `1px solid ${accent}66`,
            boxShadow: `0 0 12px 1px ${accent}44, 0 3px 10px rgba(2,6,16,0.5)`,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            color: '#fff'
          }}
        >
          {kinds.slice(0, 3).map((kind) => (
            <SectorIcon
              key={kind}
              kind={kind}
              style={{ color: FACILITY_COLOR[kind], width: badgeH * 0.62, height: badgeH * 0.62 }}
            />
          ))}
          <span
            style={{
              fontWeight: 800,
              fontSize: badgeH * 0.46,
              lineHeight: 1,
              paddingLeft: badgeH * 0.12,
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {members.length}
          </span>
        </div>
      </foreignObject>
    </motion.g>
  )
}
