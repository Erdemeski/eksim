import React, { useEffect, useRef } from 'react'

interface ParticleFieldProps {
  className?: string
}

const COLORS = ['#2EA6FF', '#34D399', '#7DD3FC']
const LINK_DIST = 110
/** Arka plan efekti için kare sınırı — yavaş parçacıklarda fark edilmez, CPU ~½. */
const FPS_CAP = 30

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  color: string
}

/**
 * Hafif canvas parçacık alanı (reactbits "Particles" ruhunda). WebGL/bağımlılık
 * yok; ebeveyn boyutuna ResizeObserver ile uyar, devicePixelRatio'ya duyarlı.
 * Yakın parçacıklar ince çizgilerle bağlanır (takımyıldız etkisi).
 */
export function ParticleField({ className }: ParticleFieldProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    const ctx = canvas?.getContext('2d')
    if (!canvas || !parent || !ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    // Erişilebilirlik + düşük güç: hareket azaltılmışsa tek statik kare çiz.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let particles: Particle[] = []
    let raf = 0
    let running = false
    let last = 0

    const resize = (): void => {
      w = parent.clientWidth
      h = parent.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.round(Math.min(60, (w * h) / 16000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.6 + 0.6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      }))
      if (reduce) step() // hareket kapalıyken yeniden boyutta tek kare tazele
    }

    /** Bir kareyi ilerlet + çiz (RAF döngüsünden bağımsız, tek çağrılabilir). */
    const step = (): void => {
      ctx.clearRect(0, 0, w, h)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.globalAlpha = 0.5
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DIST) {
            ctx.globalAlpha = (1 - dist / LINK_DIST) * 0.12
            ctx.strokeStyle = '#7DD3FC'
            ctx.lineWidth = 0.6
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
    }

    const frameInterval = 1000 / FPS_CAP
    const loop = (now: number): void => {
      raf = requestAnimationFrame(loop)
      if (now - last < frameInterval) return // FPS sınırı: pahalı O(n²) işi atla
      last = now
      step()
    }

    const start = (): void => {
      if (running || reduce) return
      running = true
      last = 0
      raf = requestAnimationFrame(loop)
    }

    const stop = (): void => {
      running = false
      cancelAnimationFrame(raf)
    }

    // Pencere/sekme gizliyken (diğer monitör önde vb.) döngüyü tamamen durdur.
    const onVisibility = (): void => {
      if (document.hidden) stop()
      else start()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()
    if (reduce) step()
    else start()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} />
}
