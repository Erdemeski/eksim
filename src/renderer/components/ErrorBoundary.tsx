import React from 'react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Hata anında gösterilecek içerik (varsayılan: null — sessizce boş bırakır). */
  fallback?: React.ReactNode
  /** Bu süre sonra alt ağacı yeniden mount etmeyi dener (ms). Verilmezse tekrar denemez. */
  retryMs?: number
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Kiosk gözetimsiz çalıştığından, tek bir alt-ağaçtaki yakalanmamış bir hata
 * (ör. WebGL bağlamı ile ilgili beklenmedik bir DOM istisnası) React kökünü
 * tamamen boşaltıp pencereyi düz `body` arkaplanına (koyu lacivert) indirmemeli
 * — bu, mavi/boş ekran çökmesinin tam olarak gözlemlenen belirtisiydi (bkz.
 * MarkerRingsLayer.tsx STABİLİTE notu). Bu sınır, hatayı KENDİ alt ağacında
 * durdurur; `retryMs` verilirse belirtilen süre sonra alt ağacı sessizce
 * yeniden dener (gözetimsiz kiosk'ta insan müdahalesi beklemeden kendini
 * toparlama şansı verir).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimer: number | undefined

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary yakaladı:', error, info.componentStack)
    if (this.props.retryMs) {
      this.retryTimer = window.setTimeout(() => this.setState({ hasError: false }), this.props.retryMs)
    }
  }

  componentWillUnmount(): void {
    window.clearTimeout(this.retryTimer)
  }

  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback ?? null
    return this.props.children
  }
}
