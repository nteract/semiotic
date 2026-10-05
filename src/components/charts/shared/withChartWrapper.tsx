"use client"
import * as React from "react"
import type { Datum, DatumValue } from "./datumTypes"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"

export interface PlaceholderLayout {
  responsiveWidth?: boolean
  responsiveHeight?: boolean
}

// CSS owns placeholder layout, so empty/loading content resizes without an
// extra ResizeObserver or a React measurement/render cycle.
function placeholderSize(
  width: number,
  height: number,
  layout?: PlaceholderLayout
) {
  return {
    width: layout?.responsiveWidth ? "100%" : width,
    height: layout?.responsiveHeight ? "100%" : height
  }
}

interface SafeRenderProps {
  componentName: string
  width: number
  height: number
  children: React.ReactNode
}

/**
 * Wraps a chart's rendered output with an error boundary. If the chart
 * throws during render, displays the error message with the component
 * name.
 *
 * For richer prop diagnostics ("missing accessor", "wrong data shape",
 * etc.), use `npx semiotic-ai --doctor` (CLI) or import `diagnoseConfig`
 * from `semiotic/utils`. We intentionally don't bundle the validation
 * map into every subpath import — it would add ~7KB gz to xy/ordinal/
 * network just to power a fallback that only fires when render throws.
 */
export function SafeRender({
  componentName,
  width,
  height,
  children
}: SafeRenderProps) {
  return (
    <ChartErrorBoundary
      fallback={(error: Error) => (
        <ChartError
          componentName={componentName}
          message={error.message}
          width={width}
          height={height}
        />
      )}
    >
      {children}
    </ChartErrorBoundary>
  )
}

// ── Empty & loading state helpers ────────────────────────────────────────

const EMPTY_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  flexDirection: "column",
  textAlign: "center",
  justifyContent: "center",
  // Fallback matches LIGHT_THEME.textSecondary (#666 — 5.7:1 on white).
  // #999 was 2.8:1, a WCAG AA failure axe caught once color-contrast was
  // re-enabled in the integration scan.
  color: "var(--semiotic-text-secondary, #666)",
  fontSize: 13,
  fontFamily: "inherit",
  border: "1px dashed var(--semiotic-border, #ddd)",
  borderRadius: 4,
  boxSizing: "border-box" as const
}

const LOADING_BAR_STYLE: React.CSSProperties = {
  background: "var(--semiotic-border, #e0e0e0)",
  borderRadius: 2
}

/**
 * Renders a "No data available" placeholder when data is empty.
 * Returns null when data is present or emptyContent is `false`.
 */
export function renderEmptyState(
  data: Array<Datum | null | undefined> | undefined | null,
  width: number,
  height: number,
  emptyContent?: React.ReactNode | false,
  layout?: PlaceholderLayout
): React.ReactElement | null {
  if (emptyContent === false) return null
  if (data == null) return null // undefined/null = no data provided (e.g. push API)
  if (!Array.isArray(data)) return null // hierarchy data (object)
  if (data.some((row) => row != null && typeof row === "object")) return null

  return (
    <div style={{ ...EMPTY_STYLE, ...placeholderSize(width, height, layout) }}>
      {emptyContent || "No data available"}
    </div>
  )
}

/**
 * Renders a loading placeholder while `loading` is true.
 *
 * When `loadingContent` is provided, it replaces the default shimmer
 * skeleton — wrapped in the same sized container so the chart still
 * occupies the slot it would when rendered. Pass `false` to suppress
 * the skeleton entirely (the early-return becomes null and the chart's
 * own loading UI takes over).
 *
 * Returns null when `loading` is falsy.
 */
export function renderLoadingState(
  loading: boolean | undefined,
  width: number,
  height: number,
  loadingContent?: React.ReactNode | false,
  layout?: PlaceholderLayout
): React.ReactElement | null {
  if (!loading) return null
  if (loadingContent === false) return null

  // Custom loading content — wrap in the same sized container so the
  // chart still occupies the slot. Inline styles mirror the skeleton
  // container so consumers don't have to re-implement sizing.
  if (loadingContent != null) {
    return (
      <div
        style={{
          ...placeholderSize(width, height, layout),
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          textAlign: "center",
          justifyContent: "center",
          boxSizing: "border-box"
        }}
      >
        {loadingContent}
      </div>
    )
  }

  // Default skeleton: a few horizontal bars at varying widths
  const barCount = Math.max(1, Math.min(5, Math.floor(height / 40)))
  const barHeight = Math.max(8, Math.floor(height / (barCount * 3)))
  const gap = Math.max(6, Math.floor(height / (barCount * 2.5)))
  const startY = Math.floor((height - (barCount * (barHeight + gap) - gap)) / 2)

  const vertical = (value: number) =>
    layout?.responsiveHeight ? `${(100 * value) / Math.max(1, height)}%` : value
  const bars = Array.from({ length: barCount }, (_, i) => (
    <div
      key={i}
      className="semiotic-loading-bar"
      style={{
        ...LOADING_BAR_STYLE,
        position: "absolute",
        top: vertical(startY + i * (barHeight + gap)),
        left: "10%",
        width: `${30 + ((i * 37 + 13) % 50)}%`,
        height: vertical(barHeight),
        opacity: 0.5 + (i % 2) * 0.2
      }}
    />
  ))
  return (
    <div
      style={{
        ...placeholderSize(width, height, layout),
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--semiotic-border, #e0e0e0)",
        borderRadius: 4,
        boxSizing: "border-box"
      }}
    >
      {bars}
    </div>
  )
}

// ── Dev warning helpers ──────────────────────────────────────────────────

/** Warn if a string accessor isn't found in the first data element */
export function warnMissingField(
  componentName: string,
  data: Datum[] | undefined,
  accessorName: string,
  accessorValue: DatumValue
): void {
  // Plain `process.env.NODE_ENV` so consumer bundlers can strip dev-only code.
  if (process.env.NODE_ENV === "production") return
  if (!data || data.length === 0) return
  if (typeof accessorValue !== "string") return

  const sample = data[0]
  if (!sample || typeof sample !== "object") return
  if (accessorValue in sample) return

  const available = Object.keys(sample).join(", ")
  console.warn(
    `[semiotic] ${componentName}: ${accessorName} "${accessorValue}" not found in data. Available keys: ${available}`
  )
}
