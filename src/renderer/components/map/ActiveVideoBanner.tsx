import React from 'react'
import { motion } from 'framer-motion'
import Strands from './Strands'
import ShinyText from './ShinyText'

interface ActiveVideoBannerProps {
  /** Bir pin aktif mi (videosu Monitör 2'de oynuyor mu). */
  active: boolean
}

/**
 * Harita penceresi üst-ortasında, bir pin aktifken "video karşı ekranda
 * oynuyor" bildirimi + altında reactbits Strands (WebGL/ogl) şeridi.
 *
 * STABİLİTE: TEK `motion.div` — AnimatePresence/unmount YOK. Strands'ın WebGL
 * bağlamı, bu oturumda öğrenilen derse göre (bkz. MagicRings/SilkBackground)
 * KALICI kalır; yalnız opacity + Strands'ın kendi `paused` prop'u ile
 * gösterilir/gizlenir — tekrar tekrar context yaratıp yok etmenin çökme
 * riskine bir daha girilmez. `active` false→true/true→false geçişinde 0.5s
 * yumuşak opacity+y geçişi.
 *
 * KONUMLAMA: Yatay ortalama (`left-1/2 -translate-x-1/2`) STATİK bir dış
 * `<div>`'de — framer-motion'ın `animate={{y}}` özelliği elementin `transform`'unu
 * satır-içi stille TAMAMEN EZER (Tailwind'in `-translate-x-1/2` sınıfının
 * ortalama çevirisini siler) → banner merkezden sağa kaymış görünürdü. Bu
 * yüzden dikey giriş/çıkış animasyonu AYRI bir iç `motion.div`'de.
 */
export function ActiveVideoBanner({ active }: ActiveVideoBannerProps): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute left-1/2 top-8 z-[18] -translate-x-1/2">
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: active ? 1 : 0, y: active ? 0 : -10 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <ShinyText
          text="Tanıtım videosu karşınızdaki ekranda oynamaktadır"
          speed={2.5}
          spread={100}
          color="#c3d3f0"
          shineColor="#ffffff"
          className="text-base uppercase font-bold tracking-[0.1em] [text-shadow:0_2px_16px_rgba(0,0,0,0.85)]"
        />
        {/* Kutu genişliği/oranı: shader'ın taper/zarf fonksiyonu (cos tabanlı)
            çok geniş oranlarda `scale` düşükken birden fazla kez pozitif/negatif
            döngüye girip YAN LOBLAR (birden fazla ayrı parlama) üretebiliyordu;
            `scale` bunu tek loba sıkıştırır. Yükseklik: Strands canvas'ı bu
            div'in piksel boyutuna (offsetHeight) birebir kurulur — düşük
            yükseklikte ışımanın üst/altı canvas sınırında GERÇEKTEN kırpılıyordu
            (CSS overflow değil, WebGL tuvalinin kendisi küçüktü). Yükseklik
            artırıldı ki glow tam sığsın. */}
        <div className="h-44 w-80 -mt-14">
          <Strands
            colors={['#2EA6FF', '#34D399', '#7DD3FC']}
            count={3}
            speed={0.3}
            amplitude={0.3}
            waviness={0.6}
            thickness={0.4}
            glow={0.8}
            taper={2}
            spread={3}
            intensity={0.8}
            saturation={1}
            opacity={1}
            scale={2}
            glass={false}
            paused={!active}
          />
        </div>
      </motion.div>
    </div>
  )
}
