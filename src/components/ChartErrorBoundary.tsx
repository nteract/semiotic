"use client"
import * as React from "react"
import ChartError from "./charts/shared/ChartError"

export interface ChartErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback to show on error. Can be a ReactNode or render function. */
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode)
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
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
export class ChartErrorBoundary extends React.Component<
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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.props.onError?.(error, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      const { fallback } = this.props
      const error = this.state.error

      if (typeof fallback === "function") {
        return fallback(error)
      }
      if (fallback !== undefined) {
        return fallback
      }

      // Default fallback using ChartError
      return (
        <ChartError
          componentName="ChartErrorBoundary"
          message={error.message || "An unexpected error occurred while rendering this chart."}
          width={600}
          height={400}
        />
      )
    }

    return this.props.children
  }
}
