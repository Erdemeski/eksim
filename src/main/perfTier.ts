import { app } from 'electron'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  DEFAULT_PERF_TIER,
  isPerfTierSetting,
  type PerfTier,
  type PerfTierSetting
} from '../shared/perf'

/**
 * Kalite katmanının ana süreçte çözülmesi (açılışta bir kez).
 *
 * Öncelik:
 *  1) `EKSIM_PERF_TIER` ortam değişkeni (auto | high | low),
 *  2) `kiosk-config.json` → `{ "perfTier": "..." }` (exe klasörü → userData → cwd),
 *  3) hiçbiri yoksa `auto`.
 * `auto` ise GPU yeteneğinden tahmin edilir (software/disabled → low).
 *
 * Operatör, `scripts/Kalite-Ayarla.bat` ile config'i yazarak exe'yi yeniden
 * derlemeden kaliteyi değiştirebilir.
 */

const CONFIG_FILE = 'kiosk-config.json'

/** Config dosyasının aranacağı yerler (öncelik sırasıyla). */
function configCandidates(): string[] {
  const list: string[] = []
  // Portable .exe: electron-builder gerçek exe klasörünü bu env ile verir
  // (app.getPath('exe') geçici çıkarım klasörünü gösterir). Operatörün
  // Kalite-Ayarla.bat ile yazdığı kiosk-config.json BURADA aranır — en yüksek öncelik.
  const portableDir = process.env['PORTABLE_EXECUTABLE_DIR']
  if (portableDir) list.push(join(portableDir, CONFIG_FILE))
  try {
    list.push(join(dirname(app.getPath('exe')), CONFIG_FILE))
  } catch {
    /* exe yolu yoksa atla */
  }
  try {
    list.push(join(app.getPath('userData'), CONFIG_FILE))
  } catch {
    /* userData yoksa atla */
  }
  list.push(join(process.cwd(), CONFIG_FILE))
  return list
}

/** Operatör ayarını (env > config dosyaları) çözer; yoksa 'auto'. */
function resolveSetting(): { setting: PerfTierSetting; source: string } {
  const env = process.env['EKSIM_PERF_TIER']
  if (isPerfTierSetting(env)) return { setting: env, source: 'env' }

  for (const path of configCandidates()) {
    try {
      const parsed = JSON.parse(readFileSync(path, 'utf8')) as { perfTier?: unknown }
      if (isPerfTierSetting(parsed.perfTier)) return { setting: parsed.perfTier, source: path }
    } catch {
      /* dosya yok / bozuk JSON → sıradaki aday */
    }
  }
  return { setting: 'auto', source: 'default' }
}

/**
 * GPU yeteneğinden otomatik tier tahmini. `getGPUFeatureStatus()` SENKRONDUR
 * (getGPUInfo('complete') aksine askıya almaz); gl/webgl 'software'/'disabled'
 * ise donanım hızlandırma yok demektir → tam ekran shader'lar kapatılır (low).
 */
function autoDetectTier(): PerfTier {
  try {
    const status = app.getGPUFeatureStatus() as unknown as Record<string, string>
    const gl = `${status.gl ?? ''} ${status.webgl ?? ''} ${status.webgl2 ?? ''}`.toLowerCase()
    if (gl.includes('software') || gl.includes('disabled') || gl.includes('unavailable')) {
      return 'low'
    }
  } catch {
    /* tespit başarısız → varsayılan */
  }
  return DEFAULT_PERF_TIER
}

/** Çözülmüş çalışma zamanı tier'ı (app hazır olduktan sonra çağrılmalı). */
export function resolvePerfTier(): PerfTier {
  const { setting, source } = resolveSetting()
  const tier: PerfTier = setting === 'auto' ? autoDetectTier() : setting
  // eslint-disable-next-line no-console
  console.log(`[PERF] setting=${setting} (${source}) -> tier=${tier}`)
  return tier
}
