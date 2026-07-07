import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { TURKEY_PATH_D, MAP_VIEWBOX, MAP_RECT } from './turkeyGeometry'
import satelliteUrl from '../../assets/turkey-satellite.jpg'

interface TurkeyMapProps {
  /** SVG referansı — ekran↔viewBox dönüşümü ve olay bağlama için. */
  svgRef: React.Ref<SVGSVGElement>
  /** viewBox uzayında çizilecek katman (enerji ağı, marker'lar, dalgalar). */
  children?: React.ReactNode
}

/**
 * Türkiye haritası — gerçek uydu görüntülü, canlı katmanlar.
 *
 * Görsel: NASA Blue Marble (Web Mercator, viewBox ile hizalı). turkey.svg
 * silüeti hem parlak Türkiye'yi kırpan maske (clip) hem de mevcut SİYASİ dış
 * hattı korur. Türkiye dışı coğrafya, kenarlara doğru uzaya solan KOYU bir
 * uydu silüeti olur. Kıyı, GSAP ile akan/parlayan canlı bir enerji hattıdır;
 * kara hafifçe "nefes alır" (yavaş drift). Sabit değil — modern ve canlı.
 */
export function TurkeyMap({ svgRef, children }: TurkeyMapProps): React.JSX.Element {
  const rootRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // NOT: Uydu görseli STATİK — siyasi sınırla birebir hizalı kalsın diye
      // ölçekleme/drift yok. Canlılık kıyı akışı, enerji ağı, şehir ışıkları ve
      // parçacıklardan gelir.
      // Kıyı boyunca akan enerji ışığı.
      gsap.fromTo(
        '.tr-coast-flow',
        { strokeDashoffset: 0 },
        { strokeDashoffset: -180, duration: 5, ease: 'none', repeat: -1 }
      )
      // Kıyı parlamasının yumuşak nabzı.
      gsap.to('.tr-coast', { opacity: 0.95, duration: 2.6, ease: 'sine.inOut', repeat: -1, yoyo: true })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <svg
      ref={svgRef}
      viewBox={MAP_VIEWBOX}
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full touch-none select-none"
    >
      <defs>
        <clipPath id="tr-clip">
          <path d={TURKEY_PATH_D} />
        </clipPath>
        {/* Türkiye dışını belirgin karartıp hafif lacivere çeken matris. */}
        <filter id="tr-dark" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            type="matrix"
            values="0.16 0 0 0 0  0 0.18 0 0 0  0 0 0.27 0 0.012  0 0 0 1 0"
          />
        </filter>
        <filter id="tr-coast-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Kenarlara doğru uzaya solma (köşelerde arka plan/parçacıklar görünür). */}
        <radialGradient id="tr-fade" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="84%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <mask id="tr-outside-mask">
          <rect
            x={MAP_RECT.x}
            y={MAP_RECT.y}
            width={MAP_RECT.width}
            height={MAP_RECT.height}
            fill="url(#tr-fade)"
          />
        </mask>
      </defs>

      <g ref={rootRef}>
        {/* 1) Türkiye dışı: koyu uydu silüeti, kenarda uzaya solar. */}
        <g mask="url(#tr-outside-mask)">
          <image
            href={satelliteUrl}
            x={MAP_RECT.x}
            y={MAP_RECT.y}
            width={MAP_RECT.width}
            height={MAP_RECT.height}
            preserveAspectRatio="none"
            filter="url(#tr-dark)"
          />
        </g>

        {/* 1b) Dış bölgeyi daha da derinleştiren karartma perdesi. */}
        <rect
          x={MAP_RECT.x}
          y={MAP_RECT.y}
          width={MAP_RECT.width}
          height={MAP_RECT.height}
          fill="#02060d"
          opacity="0.38"
        />

        {/* 2) Türkiye: parlak uydu, silüete kırpılı (STATİK — sınırla birebir hizalı). */}
        <g clipPath="url(#tr-clip)">
          <image
            href={satelliteUrl}
            x={MAP_RECT.x}
            y={MAP_RECT.y}
            width={MAP_RECT.width}
            height={MAP_RECT.height}
            preserveAspectRatio="none"
          />
          {/* İç kenar gölgesi → kıyıda derinlik. */}
          <path d={TURKEY_PATH_D} fill="none" stroke="#02080f" strokeWidth="5" opacity="0.55" />
        </g>

        {/* 3) Parlayan kıyı + akan enerji hattı. */}
        <path
          className="tr-coast"
          d={TURKEY_PATH_D}
          fill="none"
          stroke="#5fd0ff"
          strokeWidth="0.9"
          filter="url(#tr-coast-glow)"
          opacity="0.6"
        />
        <path d={TURKEY_PATH_D} fill="none" stroke="#d8f6ff" strokeWidth="0.35" opacity="0.9" />
        {/* PERF: Bu çizgi strokeDashoffset ile sürekli animasyonlu. SVG glow
            filtresi (feGaussianBlur) animasyonlu öğede her kare yeniden
            rasterize edilir → pahalı. Glow zaten üstteki STATİK `.tr-coast`
            katmanında var; akan çizgi filtresiz de aynı görünür. */}
        <path
          className="tr-coast-flow"
          d={TURKEY_PATH_D}
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeDasharray="6 170"
        />

        {children}
      </g>
    </svg>
  )
}
