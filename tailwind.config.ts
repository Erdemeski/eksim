import type { Config } from 'tailwindcss'

/**
 * Eksim Holding kurumsal kimliği: koyu lacivert/antrasit zemin,
 * parlak mavi (enerji) ve yeşil (gıda) vurgular.
 */
export default {
  content: ['./src/renderer/**/*.{html,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        eksim: {
          ink: '#0A1020',       // antrasit/lacivert zemin
          surface: '#121A2E',   // panel yüzeyi
          line: '#1F2C49',      // çizgi/kenarlık
          energy: '#2EA6FF',    // parlak mavi (enerji)
          dicle: '#F59E0B',     // amber (Dicle / elektrik dağıtım)
          food: '#34D399',      // yeşil (gıda)
          glow: '#7DD3FC'       // hale/aydınlatma
        }
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
} satisfies Config
