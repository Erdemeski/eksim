import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { TR_PROVINCES } from './trProvinces'

interface ProvinceHighlightProps {
  /** Boyanacak ilin simplemaps kodu (ör. "TR35") — null ise hiçbir il boyanmaz. */
  provinceId: string | null
  /** İl dolgu/kontur rengi (pinin accent rengi). */
  color: string
}

/**
 * Aktif/hover/idle-önizleme pininin bulunduğu ilin siyasi sınırını boyayan
 * SVG katmanı. TurkeyMap'in children alanında, ConnectionGrid ve marker'lardan
 * ÖNCE çizilir → uydu + neon sınırın üstünde, pin/bağların altında kalır.
 *
 * Geometri trProvinces.ts'ten gelir (tr-seperated.svg, turkey.svg ile aynı
 * simplemaps koordinat uzayı — birebir hizalı, dönüşüm yok).
 *
 * PERF: SVG filter/blur YOK (animasyonlu öğede her kare yeniden rasterize =
 * bu projede bilinen takılma deseni). Giriş/çıkış yalnız opacity crossfade
 * (AnimatePresence); canlılık compositor-only `eksim-province-breathe` CSS
 * nefesiyle verilir.
 */
export function ProvinceHighlight({
  provinceId,
  color
}: ProvinceHighlightProps): React.JSX.Element {
  const province = provinceId ? TR_PROVINCES[provinceId] : undefined

  return (
    <g pointerEvents="none">
      <AnimatePresence>
        {province && (
          <motion.g
            key={provinceId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <g className="eksim-province-breathe">
              {/* Dolgu: accent renk, uydu dokusu altından okunacak kadar şeffaf. */}
              <path d={province.d} fill={color} opacity={0.3} />
              {/* Parlak accent kontur + ince beyaz iç hairline (neon dili). */}
              <path d={province.d} fill="none" stroke={color} strokeWidth={1.4} opacity={0.85} />
              <path d={province.d} fill="none" stroke="#ffffff" strokeWidth={0.4} opacity={0.5} />
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </g>
  )
}
