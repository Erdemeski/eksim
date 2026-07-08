import React from 'react'
import { TURKEY_PATH_D, MAP_VIEWBOX, MAP_RECT } from './turkeyGeometry'
import satelliteUrl from '../../assets/turkey-satellite.jpg'

interface TurkeyMapProps {
  /** SVG referansı — ekran↔viewBox dönüşümü ve olay bağlama için. */
  svgRef: React.Ref<SVGSVGElement>
  /** viewBox uzayında çizilecek katman (enerji ağı, marker'lar, dalgalar). */
  children?: React.ReactNode
}

/**
 * Türkiye haritası — gerçek uydu görüntülü, sakin premium katmanlar.
 *
 * Görsel: NASA Blue Marble (Web Mercator, viewBox ile hizalı). turkey.svg
 * silüeti hem Türkiye'yi kırpan maske (clip) hem de SİYASİ dış hattı korur.
 * Türkiye dışı coğrafya koyu lacivert silüete çekilir (`tr-dark`); Türkiye içi
 * uydu dokusu ink tonuyla soluklaştırılır ki pinler/amblemler öne çıksın.
 * Sınır, STATİK beyaz neon bulut parlamasıdır (`tr-neon`).
 *
 * PERF (kritik): Bu bileşende artık HİÇ JS animasyonu yok. Eski
 * `.tr-coast-flow` dash akımı, neredeyse tüm viewport'u kaplayan Türkiye
 * path'inin bbox'ını HER KARE yeniden boyatıyordu — haritadaki en büyük tekil
 * repaint kaynağıydı ve video penceresini aç bırakıyordu. Neon katmanlar
 * statik olduğundan blur filtresi BİR KEZ rasterize edilip cache'lenir;
 * canlılık, compositor-only CSS opacity nefesiyle (`eksim-neon-breathe`) verilir.
 */
export function TurkeyMap({ svgRef, children }: TurkeyMapProps): React.JSX.Element {
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
        {/* Türkiye dışını belirgin karartıp hafif lacivere çeken matris —
            Türkiye'nin kendisi en parlak/doygun alan olarak öne çıkar. */}
        <filter id="tr-dark" x="0" y="0" width="100%" height="100%">
          <feColorMatrix
            type="matrix"
            values="0.16 0 0 0 0  0 0.18 0 0 0  0 0 0.27 0 0.012  0 0 0 1 0"
          />
        </filter>
        {/* Neon bulut: geniş blur — STATİK path'lerde kullanılır, raster
            bir kez hesaplanıp cache'lenir (animasyonlu öğede olsaydı her kare
            yeniden rasterize olurdu — bilinen takılma deseni). */}
        <filter id="tr-neon" x="-15%" y="-25%" width="130%" height="150%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        {/* Sınır boyunca sade beyaz parlama (nötr, saf ışık hissi). */}
        <linearGradient id="tr-neon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#f8fbff" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
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

      <g>
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

        {/* 2) Türkiye: uydu görseli, silüete kırpılı (STATİK — sınırla birebir
            hizalı). Üstteki ink overlay arazi dokusunu geri çeker → pinler,
            amblemler ve enerji ağı önde okunur (statik rect = sıfır ek maliyet). */}
        <g clipPath="url(#tr-clip)">
          <image
            href={satelliteUrl}
            x={MAP_RECT.x}
            y={MAP_RECT.y}
            width={MAP_RECT.width}
            height={MAP_RECT.height}
            preserveAspectRatio="none"
          />
          <rect
            x={MAP_RECT.x}
            y={MAP_RECT.y}
            width={MAP_RECT.width}
            height={MAP_RECT.height}
            fill="#0A1020"
            opacity="0.25"
          />
          {/* İç kenar gölgesi → kıyıda derinlik. */}
          <path d={TURKEY_PATH_D} fill="none" stroke="#02080f" strokeWidth="5" opacity="0.55" />
        </g>

        {/* 3) Sınır: statik beyaz neon bulut parlaması. Dönen akım yerine
            sakin, göz yormayan bir hale — geniş yumuşak taban + dar parlak öz +
            tanım için soluk hairline. Canlılık `eksim-neon-breathe` (CSS,
            compositor-only, ~10s) ile; filtre rasteri statik kaldığı için
            cache'lenir, her kare yeniden hesaplanmaz. */}
        <g className="eksim-neon-border">
          <path
            d={TURKEY_PATH_D}
            fill="none"
            stroke="url(#tr-neon-grad)"
            strokeWidth="5"
            filter="url(#tr-neon)"
            opacity="0.2"
          />
          <path
            d={TURKEY_PATH_D}
            fill="none"
            stroke="url(#tr-neon-grad)"
            strokeWidth="1.6"
            filter="url(#tr-neon)"
            opacity="0.32"
          />
          <path d={TURKEY_PATH_D} fill="none" stroke="#ffffff" strokeWidth="0.3" opacity="0.3" />
        </g>

        {children}
      </g>
    </svg>
  )
}
