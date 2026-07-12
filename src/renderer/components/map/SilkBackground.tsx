import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * reactbits "Silk" arka planı. Orijinal `@react-three/fiber` (Canvas/useFrame/
 * useThree) kullanır; o bağımlılık projede YOK ve eklenmez — GLSL vertex/
 * fragment shader'ı BİREBİR korunarak ham three.js'e portlandı (MagicRings.tsx
 * ile aynı kalıp: tek WebGLRenderer, ShaderMaterial, PlaneGeometry, RAF döngüsü,
 * ResizeObserver, `paused`/`document.hidden` guard, try/catch'li cleanup).
 *
 * Tam ekran kaplayan tek quad; orthographic kamera -0.5..0.5 görüşü PlaneGeometry(1,1)
 * ile tam doldurur (vUv 0..1 ekran boyunca) → orijinal R3F "viewport'a ölçekli
 * mesh" davranışıyla aynı desen.
 */

const vertexShader = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2  r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2  rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd        = noise(gl_FragCoord.xy);
  vec2  uv         = rotateUvs(vUv * uScale, uRotation);
  vec2  tex        = uv * uScale;
  float tOffset    = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`

function hexToNormalizedRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255
  ]
}

interface SilkBackgroundProps {
  speed?: number
  scale?: number
  color?: string
  noiseIntensity?: number
  rotation?: number
  /** true iken kare göndermez, WebGL bağlamı canlı kalır (screen saver gizliyken). */
  paused?: boolean
}

export function SilkBackground({
  speed = 5,
  scale = 1,
  color = '#7B7481',
  noiseIntensity = 1.5,
  rotation = 0,
  paused = false
}: SilkBackgroundProps): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef({ speed, scale, color, noiseIntensity, rotation })
  const pausedRef = useRef(paused)

  propsRef.current = { speed, scale, color, noiseIntensity, rotation }

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    } catch {
      return
    }
    if (!renderer.capabilities.isWebGL2) {
      renderer.dispose()
      return
    }

    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10)
    camera.position.z = 1

    const uniforms = {
      uSpeed: { value: speed },
      uScale: { value: scale },
      uNoiseIntensity: { value: noiseIntensity },
      uColor: { value: new THREE.Color(...hexToNormalizedRGB(color)) },
      uRotation: { value: rotation },
      uTime: { value: 0 }
    }

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material)
    scene.add(quad)

    const resize = (): void => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(w, h)
    }
    resize()
    window.addEventListener('resize', resize)
    const ro = new ResizeObserver(resize)
    ro.observe(mount)

    let frameId: number
    let last = performance.now()
    const animate = (t: number): void => {
      frameId = requestAnimationFrame(animate)
      const deltaSec = (t - last) / 1000
      last = t
      if (pausedRef.current || document.hidden) return

      const p = propsRef.current
      uniforms.uSpeed.value = p.speed
      uniforms.uScale.value = p.scale
      uniforms.uNoiseIntensity.value = p.noiseIntensity
      uniforms.uRotation.value = p.rotation
      uniforms.uColor.value.set(...hexToNormalizedRGB(p.color))
      // Orijinal useFrame: uTime += 0.1 * delta (delta saniye).
      uniforms.uTime.value += 0.1 * deltaSec

      try {
        renderer.render(scene, camera)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('SilkBackground WebGL render hatası:', error)
      }
    }
    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      ro.disconnect()
      try {
        if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
        renderer.dispose()
        material.dispose()
        quad.geometry.dispose()
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('SilkBackground WebGL temizleme hatası:', error)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mountRef} className="h-full w-full" />
}
