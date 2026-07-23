import React, { useState } from 'react'
import type { EksimLocation, FacilityKind, Point } from '@shared/types'
import type { MarkerVisualState } from './markerState'
import { SectorIcon } from './SectorGraphics'
import windSprite from '../../assets/wind-sprite.png'
import solarSprite from '../../assets/solar-sprite.png'
import hydroSprite from '../../assets/hydro-sprite.png'
import windAndPanelSprite from '../../assets/wind-and-panel-sprite.png'

interface LocationMarkerProps {
  location: EksimLocation
  /** viewBox koordinatı. */
  point: Point
  color: string
  /** Görsel durum — bkz. markerState.ts (idle/preview/countdown/active/suppressed). */
  state: MarkerVisualState
  /** Hover-dwell etkileşimi açık mı (figureTouch=false iken true). */
  interactive: boolean
  /** İmleç gir/çıkışını ebeveyne bildirir (dwell/geri sayım MapScreen'de yönetilir). */
  onHoverChange?: (hovering: boolean, location: EksimLocation) => void
  /**
   * Baloncuk çapı (viewBox birimi). Varsayılan ana harita ölçeğine (BUBBLE)
   * göredir; bölge penceresi gibi FARKLI viewBox ölçeğinde çizildiğinde ekran
   * boyutunu "standart" tutmak için buradan küçültülür (bkz. RegionDetailOverlay).
   */
  bubble?: number
}

/** Baloncuk çapı (viewBox birimi) — "ne büyük ne küçük", orta boy. */
const BUBBLE = 38

/**
 * PERF (kritik — 17 eşzamanlı GIF decode'unu ortadan kaldırır): Her tür için
 * animasyonlu GIF yerine tek yatay **sprite-sheet PNG** kullanılır (ffmpeg ile
 * GIF karelerinden üretildi; her hücre 75×75). Aynı türdeki tüm pinler AYNI
 * sprite URL'ini paylaşır → görsel yalnız BİR KEZ decode edilir; animasyon CSS
 * `steps()` + `transform: translateX` (compositor-only) ile döner. Eski davranış
 * 17 canlı GIF decoder'ı (~8 MB frame buffer) aynı anda çalıştırıyordu — zayıf
 * kiosk PC'sindeki asıl CPU/RAM yüküydü. Görünüm birebir korunur.
 *
 * Kare hızı **30fps** hedeflenerek üretildi (uygulamanın geri kalanındaki
 * ambient efekt bütçesiyle aynı — bkz. shared/perf.ts, LightRays/GSAP 30fps).
 * İlk sürümde stride-3 örnekleme (~17fps) belirgin şekilde kesikli/takılmalı
 * görünüyordu (özellikle rüzgar türbini pervanesinin dönüşünde); 30fps'e
 * çıkarmak akıcılığı orijinal GIF'e (50fps) çok yaklaştırırken, tek satırlık
 * sprite genişliğini GPU doku boyutu güvenli sınırının (D3D10 sınıfı donanımda
 * garanti 8192px) altında tutuyor (en geniş sprite 8100px). Hücre boyutu 96'dan
 * 75'e küçültüldü ki daha çok kare bu bütçeye sığsın — basit çizgi ikonlarda
 * gözle fark edilmez.
 *
 * `frames`/`duration`, sprite'lar üretilirken ÖLÇÜLEN değerlerdir (ffprobe);
 * sprite'lar yenilenirse burası da güncellenmeli.
 */
interface SpriteInfo {
  url: string
  frames: number
  /** Tam tur süresi (sn) — orijinal GIF hızını korur. */
  duration: number
}
const WIND_SPRITE: SpriteInfo = { url: windSprite, frames: 91, duration: 91 / 30 }
const SOLAR_SPRITE: SpriteInfo = { url: solarSprite, frames: 108, duration: 108 / 30 }
const HYDRO_SPRITE: SpriteInfo = { url: hydroSprite, frames: 108, duration: 108 / 30 }
const WIND_SOLAR_SPRITE: SpriteInfo = {
  url: windAndPanelSprite,
  frames: 108,
  duration: 108 / 30
}

/**
 * Santral türlerine göre baloncuk sprite'ı:
 * yalnız rüzgar → wind; yalnız güneş → solar; yalnız hidro → hydro;
 * rüzgar+güneş hibrit → wind-and-panel. Gıda/dağıtım (Dicle) türleri için
 * animasyonlu sprite YOK (henüz üretilmedi) → `null` döner, çağıran taraf
 * statik `SectorIcon` amblemine düşer (bkz. aşağıdaki render).
 */
function bubbleSprite(kinds: FacilityKind[]): SpriteInfo | null {
  if (kinds.includes('wind') && kinds.includes('solar')) return WIND_SOLAR_SPRITE
  if (kinds.includes('solar')) return SOLAR_SPRITE
  if (kinds.includes('hydro')) return HYDRO_SPRITE
  if (kinds.includes('wind')) return WIND_SPRITE
  return null
}

/** Görsel durum → ölçek (baloncuk boyutu). preview/countdown'da küçülür ama kaybolmaz. */
function scaleFor(state: MarkerVisualState, hovering: boolean): number {
  switch (state) {
    case 'preview':
      return 0.68
    case 'active':
    case 'suppressed':
      return 0.4
    case 'countdown':
      // Geri sayım boyunca baloncuk %90 küçülür (kaybolmaz) — MagicRings öne çıkar.
      return 0.85
    default:
      return hovering ? 1.1 : 1
  }
}

/**
 * Haritadaki tek tesis pini — düz beyaz yuvarlak "GIF baloncuğu".
 *
 *  - idle: hafif yukarı-aşağı süzülen (CSS `eksim-bubble-float`, compositor-only)
 *    beyaz daire; içinde türe göre animasyonlu GIF ikon. GIF, SVG `<image>`
 *    Chromium'da animasyon oynatmadığı için `<foreignObject>` + `<img>` ile çizilir.
 *  - Hover: daire hafif büyür + parlar (davetkarlık).
 *  - countdown (dwell, 3 sn): baloncuk %90 küçülür (KAYBOLMAZ) — çevresinde
 *    MagicRings efekti MarkerRingsLayer tarafından ayrıca çizilir ve öne çıkar.
 *  - preview (idle 10 sn önizleme): baloncuk küçülür (KAYBOLMAZ) + MagicRings.
 *  - active (seçim tamamlandı): baloncuk tamamen kaybolur, il boyanır.
 *  - suppressed (yakın komşu pin bilerek gizlenmiş): tamamen kaybolur.
 *
 * Şeffaf hover hedefi DAİMA canlı kalır → imlecin ayrılması baloncuk
 * gizliyken de algılanır. GIF `<img>` DOM'da hep kalır (gizlenirken unmount
 * edilmez) — yeniden yükleme/başa sarma titremesi olmaz.
 */
export function LocationMarker({
  location,
  point,
  color,
  state,
  interactive,
  onHoverChange,
  bubble = BUBBLE
}: LocationMarkerProps): React.JSX.Element {
  const [hovering, setHovering] = useState(false)

  const handleEnter = (): void => {
    if (!interactive) return
    setHovering(true)
    onHoverChange?.(true, location)
  }

  const handleLeave = (): void => {
    if (!interactive) return
    setHovering(false)
    onHoverChange?.(false, location)
  }

  const hidden = state === 'active' || state === 'suppressed'
  const scale = scaleFor(state, hovering)
  // Pin sırasına bağlı sabit faz kayması → baloncuklar senkron zıplamaz.
  const floatDelay = -((point.x + point.y) % 3.6)
  const sprite = bubbleSprite(location.kinds)

  return (
    <g
      transform={`translate(${point.x}, ${point.y})`}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Geniş şeffaf hover hedefi. Aktif/gizliyken de canlı kalır ki imlecin
          konumdan AYRILMASI algılanabilsin (ayrılınca video durur). */}
      <circle r={bubble * 0.74} fill="transparent" pointerEvents={interactive ? 'all' : 'none'} />

      <foreignObject
        x={-bubble / 2}
        y={-bubble / 2}
        width={bubble}
        height={bubble}
        pointerEvents="none"
        style={{ overflow: 'visible' }}
      >
        {/* Dış katman: gizlenme/küçülme/hover ölçeği (transition). İç katman:
            süzülme animasyonu (ayrı öğe → transform'lar çakışmaz). */}
        <div
          style={{
            width: bubble,
            height: bubble,
            opacity: hidden ? 0 : 1,
            transform: `scale(${scale})`,
            transition: 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <div
            className="eksim-bubble-float"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              animationDelay: `${floatDelay}s`,
              boxShadow:
                hovering || state === 'countdown'
                  ? `0 0 0 2px ${color}cc, 0 0 14px 3px ${color}88, 0 3px 10px rgba(2,6,16,0.55)`
                  : `0 0 0 1px rgba(255,255,255,0.55), 0 0 10px 1px ${color}44, 0 3px 8px rgba(2,6,16,0.45)`,
              transition: 'box-shadow 0.3s ease'
            }}
          >
            {/* Sprite penceresi: 78% kare, tek hücre gösterir; iç şerit sprite'ın
                tamamıdır ve `steps()` translateX ile kare kare kayar (bkz. üstteki
                PERF notu + index.css `eksim-sprite`). Sprite'ı olmayan türlerde
                (ör. gıda/dağıtım) yerine statik, animasyonsuz `SectorIcon`
                amblemi çizilir — hafif, ekstra decode maliyeti yok. */}
            {sprite ? (
              <div
                style={{
                  width: '78%',
                  height: '78%',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  className="eksim-sprite-strip"
                  style={{
                    height: '100%',
                    width: `${sprite.frames * 100}%`,
                    backgroundImage: `url(${sprite.url})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                    animationDuration: `${sprite.duration}s`,
                    animationTimingFunction: `steps(${sprite.frames})`
                  }}
                />
              </div>
            ) : (
              <SectorIcon
                kind={location.kinds[0]}
                className="h-[60%] w-[60%]"
                style={{ color }}
              />
            )}
          </div>
        </div>
      </foreignObject>
    </g>
  )
}
