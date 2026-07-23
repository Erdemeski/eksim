import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { AnimatePresence } from 'framer-motion'
import { TurkeyMap } from './TurkeyMap'
import { MapBackground } from './MapBackground'
import { LightRays } from './LightRays'
import { ConnectionGrid } from './ConnectionGrid'
import { CityLights } from './CityLights'
import { LocationMarker } from './LocationMarker'
import { MarkerRingsLayer } from './MarkerRingsLayer'
import { ProvinceHighlight } from './ProvinceHighlight'
import { PopupLayer, type DwellState } from './PopupLayer'
import { MapIdlePanel } from './MapIdlePanel'
import { ScreenSaver } from './ScreenSaver'
import { ActiveVideoBanner } from './ActiveVideoBanner'
import { SectorSidebar } from './SectorSidebar'
import { RegionCluster } from './RegionCluster'
import { RegionDetailOverlay } from './RegionDetailOverlay'
import { RegionPopup } from './RegionPopup'
import { partitionVisible, type RegionClusterData } from './regions'
import { NEIGHBOR_SUPPRESS, type MarkerVisualState } from './markerState'
import { accentColor } from './SectorGraphics'
import { ErrorBoundary } from '../ErrorBoundary'
import { BrandLogo } from '../brand/BrandLogo'
import { useFigureTouch } from '../../hooks/useFigureTouch'
import { useKioskStore } from '../../store/useKioskStore'
import { PERF_BUDGET } from '@shared/perf'
import { SECTOR_META } from '@shared/sectors'
import { ipcService } from '../../services/ipcService'
import { locationToViewBox, nearestLocation, screenToViewBox } from '../../services/svgMapService'
import { EKSIM_LOCATIONS } from '@shared/locations'
import type { EksimLocation, FigureEventPayload, FigureResult, Sector } from '@shared/types'

/** Tesis vurgu rengi — hibrit sahalarda ayırt edici mor, tekil türde kendi rengi. */
function colorOf(loc: EksimLocation): string {
  return accentColor(loc.kinds)
}

/**
 * Tangible (figür) modu için boşta güvenlik ağı: figür kaldırma sinyali
 * kaçarsa bu süre sonunda boşta moda dön. Pointer (imleç) modunda kullanılmaz —
 * orada deaktivasyon imlecin konumdan ayrılmasına bağlıdır.
 */
const IDLE_MS = 15000
/** Pointer modu: imleç aktif konumdan ayrıldıktan sonra videoyu durdurma payı. */
const LEAVE_GRACE_MS = 400
/** Pointer modu: bir pine imleç gelince aktivasyona kadar geri sayım (sn). */
const DWELL_SECONDS = 3
/** Boşta önizleme döngüsünde her pinin gösterim süresi (ms). */
const CYCLE_MS = 10000
/** Hiçbir kullanıcı etkinliği (imleç/dokunuş/figür/aktivasyon) olmadan bu süre
    geçince ekran koruyucu devreye girer. */
const SCREENSAVER_MS = 90000
/** Screen saver kapanışı / pin pasifleşmesi sonrası standby (10 sn'lik önizleme)
    döngüsünün "kaldığı yerden" devam etmeden önce beklediği sessiz süre. */
const STANDBY_RESUME_DELAY_MS = 3000

/**
 * Monitör 1 — Türkiye SVG haritası deneyimi.
 *
 *  - Açılışta ekran koruyucu (çekim ekranı); dokununca canlı haritaya geçer.
 *  - figureTouch=false: pine imleç → 3 sn dwell (geri sayım popup'ta) → seçim.
 *  - figureTouch=true: fiziksel figür (3 nokta) touchMath ile anında seçer.
 *  - Boşta: pinler arasında sırayla dönen tanıtım popup'ları (PopupLayer).
 *  - 90 sn hareketsizlik → tekrar ekran koruyucu.
 */
export function MapScreen(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const idleTimer = useRef<number | undefined>(undefined)
  const dwellTween = useRef<gsap.core.Tween | null>(null)

  const figureTouch = useKioskStore((s) => s.touchConfig.figureTouch)
  const perfTier = useKioskStore((s) => s.perfTier)
  const budget = PERF_BUDGET[perfTier]
  const activeLocation = useKioskStore((s) => s.activeLocation)
  const setActiveLocation = useKioskStore((s) => s.setActiveLocation)
  const setFigure = useKioskStore((s) => s.setFigure)
  const selectedSector = useKioskStore((s) => s.selectedSector)
  const setSelectedSector = useKioskStore((s) => s.setSelectedSector)

  // Yan barda seçili gruba göre görünür pin listesi ("Tümü" → hepsi).
  const visibleLocations = useMemo(
    () =>
      selectedSector === 'all'
        ? EKSIM_LOCATIONS
        : EKSIM_LOCATIONS.filter((loc) => loc.sector === selectedSector),
    [selectedSector]
  )
  // Sıkışık bölgeler (bkz. regions.ts) tek KÜMEYE indirgenir: üyeleri normal pin
  // akışından çıkarılır (loose), ana haritada küme olarak gösterilir; kümeye
  // dokununca büyütülmüş bölge penceresi açılır. Eşiği geçmeyen bölge üyeleri
  // loose'ta kalır (normal pin).
  const { clusters, loose } = useMemo(() => partitionVisible(visibleLocations), [visibleLocations])

  // Bağlantı ızgaraları grup başına ayrı çizilir (her grubun kendi rengi/
  // animasyon türü var — bkz. shared/sectors.ts) — "Tümü" modunda birden fazla
  // ızgara aynı anda döner. Kümelenmiş üyeler hariç (onların bağları bölge
  // penceresinde çizilir) → yalnız `loose` üzerinden gruplanır.
  const connectionGroups = useMemo(() => {
    const bySector = new Map<Sector, EksimLocation[]>()
    for (const loc of loose) {
      const group = bySector.get(loc.sector)
      if (group) group.push(loc)
      else bySector.set(loc.sector, [loc])
    }
    return Array.from(bySector.entries())
  }, [loose])

  // Açık bölge penceresi (kümeye dokununca). overlaySvgRef → figür isabet testi
  // pencere açıkken bu SVG'nin CTM'iyle yapılır.
  const overlaySvgRef = useRef<SVGSVGElement>(null)
  const [openRegionId, setOpenRegionId] = useState<string | null>(null)
  const openCluster: RegionClusterData | null = openRegionId
    ? (clusters.find((c) => c.region.id === openRegionId) ?? null)
    : null

  // Ekran koruyucu açılışta AÇIK (çekim ekranı); dokununca kapanır.
  const [screensaver, setScreensaver] = useState(true)
  const [dwell, setDwell] = useState<DwellState | null>(null)
  const [cycleIndex, setCycleIndex] = useState(0)
  /** Son kullanıcı etkinliği zamanı (ms) — ekran koruyucu geri sayımı bunu okur
      (her imleç hareketinde setState yapmamak için ref; render tetiklemez). */
  const lastActivityRef = useRef(Date.now())

  const deactivate = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    setFigure(null)
    setActiveLocation(null)
    ipcService.emitFigureLifted()
  }, [setFigure, setActiveLocation])

  const armIdleTimer = useCallback(() => {
    window.clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(deactivate, IDLE_MS)
  }, [deactivate])

  const activate = useCallback(
    (location: EksimLocation) => {
      window.clearTimeout(idleTimer.current) // bekleyen grace/idle iptal
      dwellTween.current?.kill()
      dwellTween.current = null
      setDwell(null)
      const result: FigureResult = {
        mode: figureTouch ? 'tangible' : 'pointer',
        centroid: location.svgPoint ?? { x: 0, y: 0 },
        rotation: 0,
        figureId: null
      }
      setFigure(result)
      setActiveLocation(location)
      const payload: FigureEventPayload = { result, location }
      ipcService.emitFigure(payload)
      // Pointer modu: imleç konumda kaldığı sürece video döner (loop) ve boşta
      // zamanlayıcı YOK — ayrılınca durur (bkz. handleMarkerHover). Tangible
      // modda ise figür kaldırma kaçarsa diye idle güvenlik ağı kurulur.
      if (figureTouch) armIdleTimer()
    },
    [figureTouch, setFigure, setActiveLocation, armIdleTimer]
  )

  const cancelDwell = useCallback(() => {
    dwellTween.current?.kill()
    dwellTween.current = null
    setDwell(null)
  }, [])

  // Pointer modu geri sayımı MapScreen'de (popup'ı besler). GSAP proxy tween:
  // secondsLeft (3→1) + pürüzsüz progress (0→1); tamamlanınca aktive eder.
  const startDwell = useCallback(
    (location: EksimLocation) => {
      dwellTween.current?.kill()
      setDwell({ location, secondsLeft: DWELL_SECONDS, progress: 0 })
      const proxy = { v: DWELL_SECONDS }
      dwellTween.current = gsap.to(proxy, {
        v: 0,
        duration: DWELL_SECONDS,
        ease: 'none',
        onUpdate: () =>
          setDwell({
            location,
            secondsLeft: Math.max(1, Math.ceil(proxy.v)),
            progress: 1 - proxy.v / DWELL_SECONDS
          }),
        onComplete: () => {
          dwellTween.current = null
          activate(location)
        }
      })
    },
    [activate]
  )

  // İmleç gir/çıkışı: aktif pin → grace (ayrılınca video durur); aktif olmayan
  // interaktif pin → dwell geri sayımı başlat/iptal (popup içinde görünür).
  const handleMarkerHover = useCallback(
    (loc: EksimLocation, hovering: boolean) => {
      const activeId = useKioskStore.getState().activeLocation?.id
      if (loc.id === activeId) {
        window.clearTimeout(idleTimer.current)
        if (!hovering) idleTimer.current = window.setTimeout(deactivate, LEAVE_GRACE_MS)
        return
      }
      if (hovering) startDwell(loc)
      else cancelDwell()
    },
    [deactivate, startDwell, cancelDwell]
  )

  // Tangible mod: 3 noktalı figür → en yakın tesis. Pointer sonuçları yok sayılır
  // (onları hover-dwell yapan LocationMarker/MapScreen yönetir).
  const handleFigure = useCallback(
    (result: FigureResult) => {
      if (result.mode !== 'tangible') return
      const container = containerRef.current
      if (!container) return
      // Bölge penceresi açıksa figür isabet testi pencere SVG'si + bölge üyeleri
      // üzerinden; değilse ana harita SVG'si + serbest (loose) pinler üzerinden.
      const svg = openCluster ? overlaySvgRef.current : svgRef.current
      const pool = openCluster ? openCluster.members : loose
      if (!svg) return
      const rect = container.getBoundingClientRect()
      const vb = screenToViewBox(svg, result.centroid.x + rect.left, result.centroid.y + rect.top)
      if (!vb) return
      const location = nearestLocation(vb, pool)
      if (location) activate(location)
      else deactivate()
    },
    [activate, deactivate, loose, openCluster]
  )

  // Kümeye dokununca bölge penceresini aç (bekleyen dwell'i iptal et).
  const handleOpenRegion = useCallback(
    (regionId: string) => {
      cancelDwell()
      setOpenRegionId(regionId)
    },
    [cancelDwell]
  )

  // Bölge penceresini kapat: aktif pin/video ve dwell temizlenir.
  const handleCloseRegion = useCallback(() => {
    deactivate()
    cancelDwell()
    setOpenRegionId(null)
  }, [deactivate, cancelDwell])

  useFigureTouch({ targetRef: containerRef, onFigure: handleFigure, onLift: deactivate })

  useEffect(
    () => ipcService.onFigureTouchChanged((v) => useKioskStore.getState().setFigureTouch(v)),
    []
  )
  useEffect(
    () => () => {
      window.clearTimeout(idleTimer.current)
      dwellTween.current?.kill()
    },
    []
  )

  // Sektör değişince (yan bar): önceki gruptan kalan aktif pin/video ve dwell
  // geri sayımı temizlenir, boşta önizleme döngüsü sıfırdan başlar. İlk
  // render'da (varsayılan sektörle mount olurken) gereksiz deactivate/IPC
  // çağrısı olmaması için bir "ilk çalıştırma" bayrağı kullanılır.
  const isFirstSectorRender = useRef(true)
  useEffect(() => {
    if (isFirstSectorRender.current) {
      isFirstSectorRender.current = false
      return
    }
    deactivate()
    cancelDwell()
    setOpenRegionId(null)
    setCycleIndex(0)
  }, [selectedSector, deactivate, cancelDwell])

  // Güvenlik ağı: açık bölge penceresi (filtre değişimi vb. nedeniyle) artık bir
  // kümeye karşılık gelmiyorsa kapat.
  useEffect(() => {
    if (openRegionId && !openCluster) setOpenRegionId(null)
  }, [openRegionId, openCluster])

  // Kullanıcı etkinliğini işaretle (ekran koruyucu geri sayımını sıfırlar).
  const noteActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Ham imleç/dokunuş etkinliği → lastActivity güncelle (setState YOK, ref).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('pointermove', noteActivity)
    el.addEventListener('pointerdown', noteActivity)
    el.addEventListener('touchstart', noteActivity)
    return () => {
      el.removeEventListener('pointermove', noteActivity)
      el.removeEventListener('pointerdown', noteActivity)
      el.removeEventListener('touchstart', noteActivity)
    }
  }, [noteActivity])

  // Aktivasyon/dwell/bölge-penceresi (figür modu dahil gerçek etkileşim) de
  // etkinlik sayılır. Değişimde HER ZAMAN güncellenir (aktifleşince VE
  // pasifleşince/kapanınca) → durum bırakılınca ekran koruyucu geri sayımı taze
  // baştan başlar.
  useEffect(() => {
    lastActivityRef.current = Date.now()
  }, [activeLocation, dwell, openRegionId])

  // Ekran koruyucu geri sayımı: harita canlıyken (screensaver=false) kendini
  // yeniden zamanlayarak son etkinlikten SCREENSAVER_MS geçtiğinde devreye
  // girer. lastActivity bir ref olduğundan imleç hareketi başına render yok.
  //
  // KRİTİK: bir pin AKTİF (üzerinde imleç/figür → video oynuyor), dwell geri
  // sayımında veya BÖLGE PENCERESİ açıkken zamanlayıcı HİÇ çalışmaz — imleç
  // kımıldamasa bile ekran koruyucu açılmaz. Durum bırakılınca (→ null) effect
  // yeniden kurulur ve (yukarıda tazelenen) lastActivity'den 90sn sayılır.
  useEffect(() => {
    if (screensaver || activeLocation || dwell || openRegionId) return
    let id: number
    const tick = (): void => {
      const idleFor = Date.now() - lastActivityRef.current
      if (idleFor >= SCREENSAVER_MS) {
        setScreensaver(true)
        return
      }
      id = window.setTimeout(tick, SCREENSAVER_MS - idleFor)
    }
    id = window.setTimeout(tick, SCREENSAVER_MS)
    return () => window.clearTimeout(id)
  }, [screensaver, activeLocation, dwell, openRegionId])

  const dismissScreensaver = useCallback(() => {
    lastActivityRef.current = Date.now()
    setScreensaver(false)
  }, [])

  // Boşta önizleme döngüsü (10 sn'de bir sıradaki öğe) — yalnız tamamen
  // boştayken döner. PopupLayer'a ve il boyama/baloncuk gizlemeye tek kaynak.
  // Bölge penceresi açıkken (openRegionId) döngü durur.
  const idle = !activeLocation && !dwell && !screensaver && !openRegionId

  // "idle" YENİ başladığında (screen saver kapandı, pin pasifleşti veya dwell
  // iptal oldu — hepsi aynı "boşta yeniden başlama" anı) standby döngüsü
  // ANINDA başlamaz: 3 sn sessiz bekleme sonrası `cycleIndex`'in KALDIĞI
  // YERDEN devam etmesi için hem görünürlük hem interval bu bayrakla kapılanır.
  const [standbyReady, setStandbyReady] = useState(false)
  useEffect(() => {
    if (!idle) {
      setStandbyReady(false)
      return
    }
    const id = window.setTimeout(() => setStandbyReady(true), STANDBY_RESUME_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [idle])

  // Standby önizleme öğeleri: serbest pinler + bölge KÜMELERİ (bölge tek birim
  // olarak sıraya girer — kullanıcı isteği). Döngü bunların arasında döner.
  type PreviewItem =
    | { kind: 'location'; location: EksimLocation }
    | { kind: 'region'; cluster: RegionClusterData }
  const previewItems = useMemo<PreviewItem[]>(() => {
    const items: PreviewItem[] = loose.map((location) => ({ kind: 'location', location }))
    for (const cluster of clusters) items.push({ kind: 'region', cluster })
    return items
  }, [loose, clusters])

  useEffect(() => {
    if (!idle || !standbyReady || previewItems.length === 0) return
    const id = window.setInterval(
      () => setCycleIndex((i) => (i + 1) % previewItems.length),
      CYCLE_MS
    )
    return () => window.clearInterval(id)
  }, [idle, standbyReady, previewItems])

  const previewItem =
    idle && standbyReady && previewItems.length > 0
      ? previewItems[cycleIndex % previewItems.length]
      : null
  const previewLocation = previewItem?.kind === 'location' ? previewItem.location : null
  const previewRegion = previewItem?.kind === 'region' ? previewItem.cluster : null

  // "Meşgul" pin: aktif > dwell(countdown) > idle-önizleme(preview). İlin
  // boyanmasına ve MagicRings'e tek kaynak.
  const engaged = activeLocation ?? dwell?.location ?? previewLocation
  const engagedMode: MarkerVisualState | null = activeLocation
    ? 'active'
    : dwell
      ? 'countdown'
      : previewLocation
        ? 'preview'
        : null

  // Birbirine çok yakın pin çiftleri: primary meşgulken (preview/countdown/
  // active FARK ETMEKSİZİN) komşusu tamamen gizlenir — üst üste binip
  // primary'nin baloncuğunu/il boyamasını engellemesin diye. active modda da
  // sürmesi kasıtlı: imleç primary pin üzerinde kaldığı sürece (aktivasyon
  // sonrası dahi) komşu geri gelmemeli; imleç ayrılıp `engaged` değişince
  // (veya null'a dönünce) bu değer de doğal olarak temizlenir.
  const suppressedId = engaged ? (NEIGHBOR_SUPPRESS[engaged.id] ?? null) : null

  const markerStateFor = useCallback(
    (loc: EksimLocation): MarkerVisualState => {
      if (activeLocation?.id === loc.id) return 'active'
      if (suppressedId === loc.id) return 'suppressed'
      if (dwell?.location.id === loc.id) return 'countdown'
      if (previewLocation?.id === loc.id) return 'preview'
      return 'idle'
    },
    [activeLocation, suppressedId, dwell, previewLocation]
  )

  // MagicRings yalnız countdown/preview'da gösterilir (active'de baloncukla
  // birlikte tamamen kaybolur).
  const ringsLocation = engagedMode === 'countdown' || engagedMode === 'preview' ? engaged : null

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden bg-eksim-ink ${figureTouch ? 'cursor-none' : ''}`}
    >
      <BrandLogo />

      <SectorSidebar selected={selectedSector} onSelect={setSelectedSector} />

      {/* PERF: ekran koruyucu z-60'ta tam opak kaplıyor; altındaki parçacık
          döngüsünü ve ConnectionGrid'leri o pencerede durdurmak görünürde
          hiçbir şeyi değiştirmez ama açılıştaki/boştaki en ağır CPU/GPU
          burst'ünü keser. */}
      <MapBackground
        paused={!!activeLocation || screensaver}
        particleScale={budget.particleScale}
      />

      <div className="absolute inset-0 z-10">
        <TurkeyMap svgRef={svgRef}>
          {/* Meşgul pinin ili — pin/bağların ALTINDA, uydu+neon sınırın üstünde. */}
          {!screensaver && (
            <ProvinceHighlight
              provinceId={engaged?.provinceId ?? null}
              color={engaged ? colorOf(engaged) : '#2EA6FF'}
            />
          )}

          {!screensaver && (
            <>
              <CityLights />
              {connectionGroups.map(([sector, locs]) => (
                <ConnectionGrid
                  key={sector}
                  locations={locs}
                  variant={SECTOR_META[sector].connection}
                  color={SECTOR_META[sector].color}
                />
              ))}
              {/* Sıkışık bölge kümeleri (il sınırları + mini özet). Dokununca
                  büyütülmüş bölge penceresi açılır. */}
              <AnimatePresence>
                {clusters.map((c) => (
                  <RegionCluster
                    key={c.region.id}
                    region={c.region}
                    members={c.members}
                    state={previewRegion?.region.id === c.region.id ? 'preview' : 'idle'}
                    onOpen={() => handleOpenRegion(c.region.id)}
                  />
                ))}
              </AnimatePresence>
            </>
          )}

          {/* Serbest (kümelenmemiş) pinler — kümeye ait olanlar bölge penceresinde. */}
          {loose.map((loc) => (
            <LocationMarker
              key={loc.id}
              location={loc}
              point={locationToViewBox(loc)}
              color={colorOf(loc)}
              state={markerStateFor(loc)}
              interactive={!figureTouch}
              onHoverChange={(hovering) => handleMarkerHover(loc, hovering)}
            />
          ))}
        </TurkeyMap>
      </div>

      {/* Dwell/idle-önizlemede pinin çevresinde MagicRings — ekran koruyucu
          kapanınca BİR KEZ mount edilir, bir daha unmount EDİLMEZ (WebGL kalıcı,
          görünürlük `location`/`paused` ile yönetilir — bkz. MarkerRingsLayer.tsx
          içindeki STABİLİTE notu). ErrorBoundary: WebGL tarafında beklenmedik
          bir hata olsa bile yalnız bu küçük katman düşer, tüm harita ekranı
          boşalmaz. */}
      {!screensaver && (
        <ErrorBoundary fallback={null}>
          <MarkerRingsLayer
            location={ringsLocation}
            color={ringsLocation ? colorOf(ringsLocation) : '#2EA6FF'}
            svgRef={svgRef}
            containerRef={containerRef}
          />
        </ErrorBoundary>
      )}

      {/* Üstten yayılan ışık hüzmeleri (gerçek WebGL/ogl, bkz. LightRays.tsx).
          z-15: harita katmanının (z-10) ÜSTÜNDE, idle panel/popup'ın (z-20/30)
          ALTINDA — pointer-events-none, etkileşimi etkilemez. Bir pin AKTİFKEN
          (video karşı ekranda oynarken) ActiveVideoBanner'a yer açmak için
          yumuşakça soluklaşır + duraklar (GPU işi durur); pasifleşince geri
          gelir. Sarmalayıcı ekran koruyucu kapanınca bir kez mount edilir, bir
          daha unmount EDİLMEZ (yalnız opacity/paused ile yönetilir).
          PERF: `budget.lightRays` low tier'da false → bu en ağır tam ekran shader
          zayıf/software GPU'da hiç oluşturulmaz (bkz. shared/perf.ts). */}
      {!screensaver && budget.lightRays && (
        <div
          className="pointer-events-none absolute inset-0 z-[15]"
          style={{ opacity: activeLocation ? 0 : 1, transition: 'opacity 0.5s ease' }}
        >
          <LightRays
            raysOrigin="top-center"
            raysColor="#ffffff"
            raysSpeed={0.3}
            lightSpread={0.5}
            rayLength={1}
            fadeDistance={1}
            saturation={1}
            pulsating
            followMouse
            mouseInfluence={0.08}
            noiseAmount={0}
            distortion={0}
            paused={screensaver || !!activeLocation}
            fps={budget.effectFps}
            maxDpr={budget.effectDpr}
          />
        </div>
      )}

      {/* Pin aktifken (video karşı ekranda oynarken) üst-ortada bildirim +
          Strands şeridi — LightRays ile karşılıklı yumuşak geçiş yapar (bkz.
          ActiveVideoBanner.tsx). Ekran koruyucu kapanınca bir kez mount edilir,
          bir daha unmount EDİLMEZ (WebGL kalıcı — bu turun kararlılık dersi). */}
      {!screensaver && (
        <ActiveVideoBanner active={!!activeLocation} glowScale={budget.strandsGlow} />
      )}

      {/* Pin popup katmanı (idle tanıtım + geri sayım + aktif detay). Bölge
          penceresi açıkken gizlenir (pencere kendi popup katmanını taşır). */}
      <PopupLayer
        activeLocation={activeLocation}
        dwell={dwell}
        previewLocation={previewLocation}
        hidden={screensaver || !!openRegionId}
        svgRef={svgRef}
        containerRef={containerRef}
      />

      {/* Standby'da sıra bölgeye gelince bölge özeti (pencere AÇILMADAN). */}
      <div className="pointer-events-none absolute inset-0 z-30">
        <AnimatePresence>
          {previewRegion && !screensaver && (
            <RegionPopup
              key={previewRegion.region.id}
              region={previewRegion.region}
              members={previewRegion.members}
              svgRef={svgRef}
              containerRef={containerRef}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        <MapIdlePanel show={!activeLocation && !screensaver} />
      </div>

      {/* Sıkışık bölgenin büyütülmüş penceresi (kümeye dokununca). Ana haritaya
          zoom EKLEMEDEN, bölgeyi ayrı SVG'de büyütür — koordinat sapması olmaz
          (bkz. RegionDetailOverlay). AnimatePresence ile açılış/kapanış geçişi. */}
      <AnimatePresence>
        {openCluster && (
          <RegionDetailOverlay
            key={openCluster.region.id}
            region={openCluster.region}
            members={openCluster.members}
            mainSvgRef={svgRef}
            svgRef={overlaySvgRef}
            figureTouch={figureTouch}
            activeLocation={activeLocation}
            dwell={dwell}
            markerStateFor={markerStateFor}
            onMarkerHover={handleMarkerHover}
            onClose={handleCloseRegion}
          />
        )}
      </AnimatePresence>

      {/* Ekran koruyucu (yalnız map penceresi) — açılışta + 90 sn hareketsizlikte.
          AnimatePresence ile giriş/çıkış animasyonlu; dokununca canlı haritaya. */}
      <AnimatePresence>
        {screensaver && (
          <ScreenSaver
            key="ss"
            onDismiss={dismissScreensaver}
            effectFps={budget.effectFps}
            effectDpr={budget.effectDpr}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
