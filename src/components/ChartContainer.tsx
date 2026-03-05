"use client"
import * as React from "react"
import { exportChart } from "./export/exportChart"
import { copyConfig as copyConfigFn } from "./export/chartConfig"
import type { ChartConfig, CopyFormat } from "./export/chartConfig"
import { ChartErrorBoundary } from "./ChartErrorBoundary"

export interface ChartContainerProps {
  /** Chart title */
  title?: string
  /** Subtitle / description */
  subtitle?: string
  /** Chart children (any Semiotic chart component) */
  children: React.ReactNode

  /** Width — passed to child chart if not set on child. Default: "100%" */
  width?: number | string
  /** Height of the chart area (excluding header). Default: 400 */
  height?: number

  /** Built-in actions. Each can be true (default config), false (hidden), or config object */
  actions?: {
    export?:
      | boolean
      | { format?: "svg" | "png"; scale?: number; filename?: string }
    fullscreen?: boolean
    /** Enable "Copy Config" action button. Requires chartConfig prop. */
    copyConfig?: boolean | { format?: CopyFormat }
  }
  /** Chart configuration for serialization. Enables the "Copy Config" toolbar action. */
  chartConfig?: ChartConfig
  /** Additional controls rendered in the toolbar after built-in actions */
  controls?: React.ReactNode

  /** Loading state — shows skeleton placeholder */
  loading?: boolean
  /** Error state — shows error message (overrides children) */
  error?: string | React.ReactNode
  /** Wrap children in ChartErrorBoundary */
  errorBoundary?: boolean

  /** Status indicator (wired to streaming staleness) */
  status?: "live" | "stale" | "paused" | "error" | "static"

  /** Details panel rendered alongside the chart (e.g. DetailsPanel component) */
  detailsPanel?: React.ReactNode

  /** CSS class for the outer container */
  className?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

export interface ChartContainerHandle {
  /** Export chart to SVG or PNG */
  export: (options?: {
    format?: "svg" | "png"
    scale?: number
    filename?: string
  }) => Promise<void>
  /** Toggle fullscreen */
  toggleFullscreen: () => void
  /** Copy chart config to clipboard */
  copyConfig: (format?: CopyFormat) => Promise<void>
  /** The chart container DOM element */
  element: HTMLDivElement | null
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  live: { bg: "#22c55e", color: "#fff" },
  stale: { bg: "#ef4444", color: "#fff" },
  paused: { bg: "#eab308", color: "#000" },
  error: { bg: "#ef4444", color: "#fff" },
  static: { bg: "#6b7280", color: "#fff" },
}

function Skeleton({ height }: { height: number }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        background:
          "linear-gradient(90deg, var(--semiotic-border, #e0e0e0) 25%, var(--semiotic-bg, #f5f5f5) 50%, var(--semiotic-border, #e0e0e0) 75%)",
        backgroundSize: "200% 100%",
        animation: "semiotic-skeleton-pulse 1.5s ease-in-out infinite",
        borderRadius: 4,
      }}
    />
  )
}

function ErrorDisplay({ error }: { error: string | React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        minHeight: 120,
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 400,
          fontSize: 14,
          color: "var(--semiotic-text-secondary, #666)",
          lineHeight: 1.5,
        }}
      >
        {error}
      </div>
    </div>
  )
}

export const ChartContainer = React.forwardRef<
  ChartContainerHandle,
  ChartContainerProps
>(function ChartContainer(
  {
    title,
    subtitle,
    children,
    width = "100%",
    height = 400,
    actions,
    chartConfig,
    controls,
    loading = false,
    error,
    errorBoundary = false,
    status,
    detailsPanel,
    className,
    style,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const chartBodyRef = React.useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const showExport = actions?.export !== false && actions?.export !== undefined
  const showFullscreen =
    actions?.fullscreen !== false && actions?.fullscreen !== undefined
  const showCopyConfig =
    actions?.copyConfig !== false && actions?.copyConfig !== undefined && chartConfig

  const exportConfig =
    typeof actions?.export === "object" ? actions.export : {}
  const copyConfigFormat =
    typeof actions?.copyConfig === "object" ? actions.copyConfig.format : "json"

  const handleExport = React.useCallback(async (options?: {
    format?: "svg" | "png"
    scale?: number
    filename?: string
  }) => {
    if (!chartBodyRef.current) return
    await exportChart(chartBodyRef.current, {
      ...exportConfig,
      ...options,
    })
  }, [exportConfig])

  const toggleFullscreen = React.useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  const handleCopyConfig = React.useCallback(async (format?: CopyFormat) => {
    if (!chartConfig) return
    await copyConfigFn(chartConfig, format || copyConfigFormat || "json")
  }, [chartConfig, copyConfigFormat])

  React.useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleChange)
    return () => document.removeEventListener("fullscreenchange", handleChange)
  }, [])

  React.useImperativeHandle(
    ref,
    () => ({
      export: handleExport,
      toggleFullscreen,
      copyConfig: handleCopyConfig,
      element: containerRef.current,
    }),
    [handleExport, toggleFullscreen, handleCopyConfig]
  )

  const hasHeader = title || subtitle || controls || showExport || showFullscreen || showCopyConfig || status

  const chartContent = loading ? (
    <Skeleton height={height} />
  ) : error ? (
    <ErrorDisplay error={error} />
  ) : errorBoundary ? (
    <ChartErrorBoundary>{children}</ChartErrorBoundary>
  ) : (
    children
  )

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes semiotic-skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`,
        }}
      />
      <div
        ref={containerRef}
        className={
          "semiotic-chart-container" + (className ? ` ${className}` : "")
        }
        style={{
          width,
          border: "1px solid var(--semiotic-border, #e0e0e0)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--semiotic-bg, #fff)",
          position: "relative",
          ...(isFullscreen
            ? {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
              }
            : {}),
          ...style,
        }}
      >
        {hasHeader && (
          <div
            className="semiotic-chart-header"
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "1px solid var(--semiotic-border, #e0e0e0)",
            }}
          >
            <div className="semiotic-chart-title-area">
              {title && (
                <div
                  className="semiotic-chart-title"
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--semiotic-text, #333)",
                  }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div
                  className="semiotic-chart-subtitle"
                  style={{
                    fontSize: 12,
                    color: "var(--semiotic-text-secondary, #666)",
                    marginTop: title ? 2 : 0,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
            <div
              className="semiotic-chart-toolbar"
              style={{ display: "flex", alignItems: "center", gap: 4 }}
            >
              {controls}
              {showExport && (
                <button
                  className="semiotic-chart-action"
                  onClick={() => handleExport()}
                  title="Export chart"
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 2v8M3.5 7L7 10.5 10.5 7" />
                    <path d="M2 12h10" />
                  </svg>
                </button>
              )}
              {showFullscreen && (
                <button
                  className="semiotic-chart-action"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {isFullscreen ? (
                      <>
                        <path d="M9 1v4h4" />
                        <path d="M5 13V9H1" />
                        <path d="M13 5H9V1" />
                        <path d="M1 9h4v4" />
                      </>
                    ) : (
                      <>
                        <path d="M1 5V1h4" />
                        <path d="M13 9v4H9" />
                        <path d="M9 1h4v4" />
                        <path d="M5 13H1V9" />
                      </>
                    )}
                  </svg>
                </button>
              )}
              {showCopyConfig && (
                <button
                  className="semiotic-chart-action"
                  onClick={() => handleCopyConfig()}
                  title="Copy config"
                  style={actionButtonStyle}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5" y="5" width="8" height="8" rx="1" />
                    <path d="M9 5V2a1 1 0 00-1-1H2a1 1 0 00-1 1v6a1 1 0 001 1h3" />
                  </svg>
                </button>
              )}
              {status && (
                <div
                  className="semiotic-chart-status"
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    background: STATUS_COLORS[status].bg,
                    color: STATUS_COLORS[status].color,
                    lineHeight: "18px",
                  }}
                >
                  {status}
                </div>
              )}
            </div>
          </div>
        )}

        <div
          className="semiotic-chart-body"
          ref={chartBodyRef}
          style={{
            position: "relative",
            overflow: "hidden",
            ...(isFullscreen ? { flex: 1 } : { height }),
          }}
        >
          {chartContent}
          {detailsPanel}
        </div>

      </div>
    </>
  )
})

const actionButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 4,
  color: "var(--semiotic-text-secondary, #666)",
  padding: 0,
}
