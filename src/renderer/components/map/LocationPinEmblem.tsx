import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import type { FacilityKind, Point } from '@shared/types'
import { FACILITY_COLOR } from './SectorGraphics'

interface LocationPinEmblemProps {
  /** Pin viewBox konumu. */
  point: Point
  /** Sahadaki tüm türler (hibrit sahalarda birden fazla — her biri yan yana çizilir). */
  kinds: FacilityKind[]
  /** Bu pin aktif/geri sayımda mı — öyleyse amblem zarifçe soluklaşır. */
  dimmed?: boolean
}

/** Amblemin pine göre ofseti (sağ-üst, viewBox birimi) — büyütülmüş boyuta göre. */
const OFFSET: Point = { x: 17, y: -13 }
/** Amblem ölçeği — okunabilirlik için büyütüldü. */
const SCALE = 1.8
/** Birden fazla tür varsa (hibrit saha) amblemler arası yatay boşluk (hub uzayında). */
const CLUSTER_GAP = 15

/**
 * Pin yanındaki premium 2.5D santral amblemi/amblemleri (SVG, WebGL yok).
 * Hibrit sahalarda (ör. RES+GES) `kinds` birden fazla eleman içerir; her biri
 * kendi hub'ında yan yana çizilir. Türe göre:
 *  - wind : kule + hub + GSAP ile yavaş dönen 3 kanat (YERİNDE, hub etrafında).
 *  - solar: eğik panel + üzerinden kayan ışık parıltısı.
 *  - hydro: damla + salınan dalga çizgileri.
 *  - food : hafifçe sallanan yaprak.
 *
 * Konum SVG `transform` ATTRIBUTE'üyle verilir (CSS transform kullanılmaz — CSS
 * attribute'ü ezip amblemi orijine kaydırırdı). Dönüş, dönen grubun getBBox
 * merkezini hub'a sabitleyen görünmez simetrik çıpayla `transformOrigin:'center'`
 * kullanır → svgOrigin'in iç içe transform belirsizliğinden kaçınılır.
 * `dimmed` yalnızca opacity ile (transform'a dokunmaz).
 *
 * PERF: rüzgar kanadı dönüşü (`.emb-blades`) ve yaprak sallanması (`.emb-leaf`)
 * artık GSAP DEĞİL, CSS `@keyframes` ile çalışır (bkz. index.css) — çok
 * sayıda pinde (14+) sürekli JS-tetiklemeli dönüş yerine tarayıcının
 * compositor thread'ine bırakılır, görünüm birebir aynı kalır. Güneş parıltısı
 * ve hidro dalgası (`attr:{x}` animasyonu) CSS-uyumlu olmadığından GSAP'te
 * kaldı — pin sayısı azdır (≤6), etkisi ihmal edilebilir.
 *
 * Renk: her amblem KENDİ teknoloji rengini kullanır (rüzgar hep mavi, güneş
 * hep amber, hidro hep camgöbeği) — site accent'i (pin/hale, hibritte mor)
 * değil. Böylece hibrit bir pindeki iki amblem birbirinden ayırt edilir.
 */
export function LocationPinEmblem({
  point,
  kinds,
  dimmed = false
}: LocationPinEmblemProps): React.JSX.Element {
  const ref = useRef<SVGGElement>(null)
  const kindsKey = kinds.join(',')

  useEffect(() => {
    // wind (.emb-blades) ve food (.emb-leaf) artık CSS @keyframes ile döner/
    // sallanır (bkz. index.css) — burada GSAP'e gerek yok. Yalnızca CSS'e
    // uygun olmayan (attr:{x} gerektiren) solar/hydro burada kalır.
    const ctx = gsap.context(() => {
      if (kinds.includes('solar')) {
        gsap.fromTo(
          '.emb-glint',
          { attr: { x: -3 }, opacity: 0 },
          {
            attr: { x: 6 },
            opacity: 0.9,
            duration: 2.4,
            ease: 'sine.inOut',
            repeat: -1,
            repeatDelay: 1.4,
            yoyo: true
          }
        )
      }
      if (kinds.includes('hydro')) {
        gsap.to('.emb-wave', {
          x: 1.2,
          duration: 1.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: 0.3
        })
      }
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindsKey])

  return (
    <g ref={ref} pointerEvents="none" style={{ opacity: dimmed ? 0 : 0.9, transition: 'opacity 0.5s ease' }}>
      {kinds.map((kind, i) => {
        const hub: Point = { x: point.x + OFFSET.x + i * CLUSTER_GAP, y: point.y + OFFSET.y }
        return (
          // NOT: scale, translate ile AYNI SVG transform attribute'ünde birleşik —
          // CSS transform kullanılmıyor (önceki hatanın tekrarı: CSS attribute'ü
          // ezip amblemi orijine kaydırıyordu). İç `.emb-*` grubu kendi CSS
          // rotasyonunu bağımsız taşır (getBBox yerel uzayda, bu scale'den etkilenmez).
          <g key={kind} transform={`translate(${hub.x}, ${hub.y}) scale(${SCALE})`}>
            {kind === 'wind' && <WindEmblem color={FACILITY_COLOR.wind} />}
            {kind === 'solar' && <SolarEmblem color={FACILITY_COLOR.solar} />}
            {kind === 'hydro' && <HydroEmblem color={FACILITY_COLOR.hydro} />}
            {kind === 'food' && <FoodEmblem color={FACILITY_COLOR.food} />}
          </g>
        )
      })}
    </g>
  )
}

/** Kanatlar hub'da (0,0), kule aşağı iner. Simetrik çıpa → dönüş merkezi = hub. */
function WindEmblem({ color }: { color: string }): React.JSX.Element {
  const blade = 'M0 0 L0.7 -0.5 L0 -7 L-0.7 -0.5 Z'
  return (
    <g>
      <line x1={0} y1={0} x2={0} y2={9} stroke={color} strokeWidth={0.9} strokeLinecap="round" />
      <g className="emb-blades" fill={color} opacity={0.95}>
        {/* Görünmez simetrik bbox çıpası → getBBox merkezi tam (0,0)=hub. */}
        <rect x={-7} y={-7} width={14} height={14} fill="none" />
        <path d={blade} />
        <path d={blade} transform="rotate(120)" />
        <path d={blade} transform="rotate(240)" />
      </g>
      <circle r={1} fill="#ffffff" stroke={color} strokeWidth={0.5} />
    </g>
  )
}

/** Eğik panel + kayan glint. */
function SolarEmblem({ color }: { color: string }): React.JSX.Element {
  return (
    <g>
      <line x1={0} y1={2} x2={0} y2={9} stroke={color} strokeWidth={0.8} strokeLinecap="round" />
      <g transform="translate(-6,-2) skewX(-18)">
        <rect x={0} y={0} width={12} height={6} rx={0.6} fill={color} opacity={0.35} stroke={color} strokeWidth={0.5} />
        <path d="M4 0 3.2 6M8 0 7.2 6M0 3h12" stroke={color} strokeWidth={0.4} opacity={0.7} />
        <rect className="emb-glint" x={-3} y={0} width={2.4} height={6} fill="#ffffff" opacity={0} />
      </g>
    </g>
  )
}

/** Damla + salınan dalga çizgileri. */
function HydroEmblem({ color }: { color: string }): React.JSX.Element {
  return (
    <g>
      <path
        d="M0 -8c2.4 2.7 3.6 4.4 3.6 6.2A3.6 3.6 0 0 1 0 1.8 3.6 3.6 0 0 1-3.6-1.8C-3.6-3.6-2.4-5.3 0-8Z"
        fill={color}
        opacity={0.45}
        stroke={color}
        strokeWidth={0.5}
      />
      <path className="emb-wave" d="M-3 4 Q-1 3 0 4 T3 4" fill="none" stroke={color} strokeWidth={0.7} strokeLinecap="round" />
      <path className="emb-wave" d="M-3 6 Q-1 5 0 6 T3 6" fill="none" stroke={color} strokeWidth={0.6} strokeLinecap="round" opacity={0.7} />
    </g>
  )
}

/** Sallanan yaprak. */
function FoodEmblem({ color }: { color: string }): React.JSX.Element {
  return (
    <g className="emb-leaf">
      <line x1={0} y1={2} x2={0} y2={9} stroke={color} strokeWidth={0.8} strokeLinecap="round" />
      <path d="M0 2C-4 0-4-5 0-8 4-5 4 0 0 2Z" fill={color} opacity={0.5} stroke={color} strokeWidth={0.5} />
      <path d="M0 -7 0 1" stroke={color} strokeWidth={0.4} opacity={0.8} />
    </g>
  )
}
