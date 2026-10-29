"use client"
import { Component, type ReactNode, type ErrorInfo } from "react"
import ChartError from "./charts/shared/ChartError"

export interface ChartErrorBoundaryProps {
  children: ReactNode
  /** Custom fallback to show on error. Can be a ReactNode or render function. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Retry after an error when a key changes (Object.is). When omitted, retries when children change. */
  resetKeys?: readonly unknown[]
}

interface ChartErrorBoundaryState {
  error: Error | null
}

/**
 * Error boundary for Semiotic charts.
 * Catches render errors and shows a friendly fallback instead of crashing the app.
 *
 * @example
 * ```tsx
 * <ChartErrorBoundary>
 *   <LineChart data={data} xAccessor="x" yAccessor="y" />
 * </ChartErrorBoundary>
 *
 * // With custom fallback:
 * <ChartErrorBoundary fallback={<div>Chart failed to render</div>}>
 *   <BarChart data={data} categoryAccessor="cat" valueAccessor="val" />
 * </ChartErrorBoundary>
 *
 * // With error callback:
 * <ChartErrorBoundary onError={(err) => logError(err)}>
 *   <Scatterplot data={data} xAccessor="x" yAccessor="y" />
 * </ChartErrorBoundary>
 * ```
 */
export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  componentDidUpdate(
    prevProps: ChartErrorBoundaryProps,
    prevState: ChartErrorBoundaryState
  ): void {
    // Only retry an existing failure. The update that first catches an error
    // must not immediately retry the same failing child.
    if (!this.state.error || !prevState.error) return
    const previous = prevProps.resetKeys ?? [prevProps.children]
    const current = this.props.resetKeys ?? [this.props.children]
    const changed =
      previous.length !== current.length ||
      current.some((key, index) => !Object.is(key, previous[index]))
    if (changed) this.reset()
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  render(): ReactNode {
    if (this.state.error) {
      const { fallback } = this.props
      const error = this.state.error

      if (typeof fallback === "function") {
        return fallback(error, this.reset)
      }
      if (fallback !== undefined) {
        return fallback
      }

      // Default fallback using ChartError
      return (
        <ChartError
          componentName="ChartErrorBoundary"
          message={
            error.message ||
            "An unexpected error occurred while rendering this chart."
          }
          width="100%"
          height="100%"
        />
      )
    }

    return this.props.children
  }
}
