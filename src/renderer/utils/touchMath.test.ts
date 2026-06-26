import { describe, it, expect } from 'vitest'
import {
  euclidean,
  triangleSides,
  matchesCalibration,
  centroid,
  rotationAngle,
  resolveFigure
} from './touchMath'
import type { Point, TouchConfig } from '@shared/types'

// Referans üçgen: A(0,0) B(60,0) C(0,80)
// Kenarlar: AB=60, AC=80, BC=100 → sıralı [60,80,100]
const A: Point = { x: 0, y: 0 }
const B: Point = { x: 60, y: 0 }
const C: Point = { x: 0, y: 80 }

function makeConfig(overrides: Partial<TouchConfig> = {}): TouchConfig {
  return {
    figureTouch: true,
    tolerance: 0.12,
    calibrations: [{ figureId: 'eksim-primary', sides: [60, 80, 100] }],
    ...overrides
  }
}

describe('euclidean', () => {
  it('3-4-5 üçgenini doğru ölçer', () => {
    expect(euclidean({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('aynı nokta için 0 döner', () => {
    expect(euclidean(A, A)).toBe(0)
  })
})

describe('triangleSides', () => {
  it('kenarları artan sırada döndürür', () => {
    expect(triangleSides(A, B, C)).toEqual([60, 80, 100])
  })
  it('nokta sırasından bağımsızdır', () => {
    expect(triangleSides(C, A, B)).toEqual([60, 80, 100])
  })
})

describe('matchesCalibration', () => {
  const cal = { figureId: 'x', sides: [60, 80, 100] as [number, number, number] }

  it('birebir eşleşmede true', () => {
    expect(matchesCalibration([60, 80, 100], cal, 0.12)).toBe(true)
  })
  it('tolerans içindeki sapmayı kabul eder (%12)', () => {
    // 100 * 1.1 = 110 → |110-100|/100 = 0.10 ≤ 0.12
    expect(matchesCalibration([60, 80, 110], cal, 0.12)).toBe(true)
  })
  it('tolerans dışındaki sapmayı reddeder', () => {
    // 100 * 1.2 = 120 → 0.20 > 0.12
    expect(matchesCalibration([60, 80, 120], cal, 0.12)).toBe(false)
  })
  it('tolerans sınırında (tam %12) kabul eder', () => {
    expect(matchesCalibration([60, 80, 112], cal, 0.12)).toBe(true)
  })
})

describe('centroid', () => {
  it('ağırlık merkezini hesaplar', () => {
    expect(centroid(A, B, C)).toEqual({ x: 20, y: 80 / 3 })
  })
})

describe('rotationAngle', () => {
  it('[0,360) aralığında kararlı bir açı döndürür', () => {
    // En uzun kenar BC (B(60,0)-C(0,80)), orta (30,40), apex A(0,0).
    // vektör apex-mid = (-30,-40) → atan2(-40,-30) ≈ 233.13°
    expect(rotationAngle(A, B, C)).toBeCloseTo(233.13, 1)
  })
  it('nokta sırasından bağımsız aynı sonucu verir', () => {
    expect(rotationAngle(C, A, B)).toBeCloseTo(rotationAngle(A, B, C), 5)
  })
})

describe('resolveFigure — pointer (figureTouch=false) bypass', () => {
  const cfg = makeConfig({ figureTouch: false })

  it('ilk dokunuş/fare koordinatını kabul eder', () => {
    const res = resolveFigure([{ x: 12, y: 34 }], cfg)
    expect(res).toEqual({ mode: 'pointer', centroid: { x: 12, y: 34 }, rotation: 0, figureId: null })
  })
  it('3 nokta olsa bile pointer modda ilkini alır (donanım bypass)', () => {
    const res = resolveFigure([A, B, C], cfg)
    expect(res?.mode).toBe('pointer')
    expect(res?.centroid).toEqual({ x: 0, y: 0 })
  })
  it('dokunuş yoksa null', () => {
    expect(resolveFigure([], cfg)).toBeNull()
  })
})

describe('resolveFigure — tangible (figureTouch=true)', () => {
  const cfg = makeConfig()

  it('temas sayısı 3 değilse reddeder (tekli dokunuş ignore)', () => {
    expect(resolveFigure([A], cfg)).toBeNull()
    expect(resolveFigure([A, B], cfg)).toBeNull()
    expect(resolveFigure([A, B, C, { x: 5, y: 5 }], cfg)).toBeNull()
  })

  it('kalibrasyona uyan 3 nokta için centroid + rotation + figureId döndürür', () => {
    const res = resolveFigure([A, B, C], cfg)
    expect(res).not.toBeNull()
    expect(res?.mode).toBe('tangible')
    expect(res?.figureId).toBe('eksim-primary')
    expect(res?.centroid).toEqual({ x: 20, y: 80 / 3 })
    expect(res?.rotation).toBeCloseTo(233.13, 1)
  })

  it('hiçbir kalibrasyon eşleşmezse null', () => {
    const wrong = makeConfig({ calibrations: [{ figureId: 'z', sides: [45, 65, 80] }] })
    expect(resolveFigure([A, B, C], wrong)).toBeNull()
  })

  it('birden çok profil arasında ilk eşleşeni seçer', () => {
    const multi = makeConfig({
      calibrations: [
        { figureId: 'no-match', sides: [10, 20, 30] },
        { figureId: 'match', sides: [60, 80, 100] }
      ]
    })
    expect(resolveFigure([A, B, C], multi)?.figureId).toBe('match')
  })
})
