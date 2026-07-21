/**
 * Adaptif kalite katmanı — düşük donanımlı kiosk PC'lerinde kasma/donma olmadan
 * çalışabilmek için efekt bütçesini tek kaynaktan yönetir.
 *
 * Akış: main süreç açılışta tier'ı çözer (operatör ayarı > otomatik GPU tespiti),
 * pencere `additionalArguments` ile preload'a geçer, preload `getPerfTier()` ile
 * renderer'a açar; bileşenler `PERF_BUDGET[tier]`'dan efekt parametrelerini okur.
 *
 * Operatör override: exe klasöründeki `kiosk-config.json` → `{ "perfTier": "..." }`
 * (auto | high | low). `scripts/Kalite-Ayarla.bat` bu dosyayı yazar → yeniden
 * derleme gerekmez.
 */

/** Çalışma zamanı kalite katmanı (çözülmüş — auto burada yok). */
export type PerfTier = 'high' | 'low'

/** Operatörün seçebileceği ayar (auto: otomatik tespit et). */
export type PerfTierSetting = 'auto' | 'high' | 'low'

/** Bir tier için efekt bütçesi. Bileşenler yalnız buradan okur. */
export interface EffectBudget {
  /** Ambient WebGL efekt döngülerinin (LightRays/MagicRings/Silk/Strands) hedef fps'i. */
  effectFps: number
  /** Tam ekran shader'ların (LightRays, Silk) render DPR tavanı. */
  effectDpr: number
  /** Tam ekran LightRays çizilsin mi (low'da kapalı — en ağır tekil GPU yükü). */
  lightRays: boolean
  /** ParticleField parçacık sayısı çarpanı (0..1). */
  particleScale: number
  /** Strands ışıma (glow) çarpanı — low'da hafifletilir. */
  strandsGlow: number
}

/**
 * Tier → bütçe. `high` bugünkü tam kaliteyi korur (yalnız ambient efektler 30fps'e
 * ve DPR 1.5'e sınırlanır — görsel olarak fark edilmez, GPU yükü düşer). `low`
 * zayıf/software GPU için: tam ekran shader kapalı, parçacık yarıya, DPR 1.0.
 */
export const PERF_BUDGET: Record<PerfTier, EffectBudget> = {
  high: {
    effectFps: 30,
    effectDpr: 1.5,
    lightRays: true,
    particleScale: 1,
    strandsGlow: 1
  },
  low: {
    effectFps: 24,
    effectDpr: 1,
    lightRays: false,
    particleScale: 0.5,
    strandsGlow: 0.6
  }
}

/** Cold start / tespit başarısız varsayılanı. */
export const DEFAULT_PERF_TIER: PerfTier = 'high'

/**
 * main, çözülmüş tier'ı pencere `additionalArguments`'ına bu önekle koyar
 * (WINDOW_ROLE_ARG ile aynı desen) — renderer, dosya adından değil ana süreçten
 * otoriter olarak alır.
 */
export const PERF_TIER_ARG = '--eksim-perf='

/** Bir değerin geçerli PerfTierSetting olup olmadığını daraltır. */
export function isPerfTierSetting(value: unknown): value is PerfTierSetting {
  return value === 'auto' || value === 'high' || value === 'low'
}
