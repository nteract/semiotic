"use client"
import * as React from "react"
import type { BaseChartProps } from "./types"
import type { Datum, DatumValue } from "./datumTypes"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"

export interface ChartPlaceholderOptions {
  loadingLabel?: string
  responsiveWidth?: boolean
  responsiveHeight?: boolean
}

// CSS owns placeholder layout, so empty/loading content resizes without an
// extra ResizeObserver or a React measurement/render cycle.
function placeholderSize(
  width: number,
  height: number,
  layout?: ChartPlaceholderOptions
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
 * etc.), use `npx -p semiotic semiotic-ai --doctor` (CLI) or import `diagnoseConfig`
 * from `semiotic/utils`. We don't bundle the validation
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

const CENTERED: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  flexDirection: "column",
  textAlign: "center",
  justifyContent: "center",
  boxSizing: "border-box"
}

const EMPTY_STYLE: React.CSSProperties = {
  ...CENTERED,
  // Fallback matches LIGHT_THEME.textSecondary (#666 — 5.7:1 on white).
  // #999 was 2.8:1, a WCAG AA failure axe caught once color-contrast was
  // re-enabled in the integration scan.
  color: "var(--semiotic-text-secondary, #666)",
  fontSize: 13,
  fontFamily: "inherit",
  border: "1px dashed var(--semiotic-border, #ddd)",
  borderRadius: 4
}

/**
 * Renders a "No data available" placeholder when data is empty.
 * Returns null when data is present or emptyContent is `false`.
 */
export function renderEmptyState(
  data: ReadonlyArray<Datum | null | undefined> | undefined | null,
  width: number,
  height: number,
  emptyContent?: React.ReactNode | false,
  layout?: ChartPlaceholderOptions
): React.ReactElement | null {
  if (emptyContent === false || !Array.isArray(data)) return null
  if (data.some((row) => row != null && typeof row === "object")) return null

  return (
    <div role="status" style={{ ...EMPTY_STYLE, ...placeholderSize(width, height, layout) }}>
      {emptyContent ?? "No data available"}
    </div>
  )
}

function skeletonBars(height: number, responsive?: boolean) {
  // Default skeleton: a few horizontal bars at varying widths
  const barCount = Math.max(1, Math.min(5, Math.floor(height / 40)))
  const barHeight = Math.max(8, Math.floor(height / (barCount * 3)))
  const gap = Math.max(6, Math.floor(height / (barCount * 2.5)))
  const startY = Math.floor((height - (barCount * (barHeight + gap) - gap)) / 2)

  const vertical = (value: number) =>
    responsive ? `${(100 * value) / Math.max(1, height)}%` : value
  return Array.from({ length: barCount }, (_, i) => (
    <div
      key={i}
      className="semiotic-loading-bar"
      style={{
        background: "var(--semiotic-border, #e0e0e0)",
        borderRadius: 2,
        position: "absolute",
        top: vertical(startY + i * (barHeight + gap)),
        left: "10%",
        width: `${30 + ((i * 37 + 13) % 50)}%`,
        height: vertical(barHeight),
        opacity: 0.5 + (i % 2) * 0.2
      }}
    />
  ))
}

export function renderLoadingState(
  loading: boolean | undefined,
  width: number,
  height: number,
  loadingContent?: React.ReactNode | false,
  layout?: ChartPlaceholderOptions
): React.ReactElement | null {
  if (!loading || loadingContent === false) return null
  const skeleton = loadingContent == null
  return (
    <div
      role="status"
      aria-busy={skeleton || undefined}
      aria-label={skeleton ? (layout?.loadingLabel ?? "Loading chart") : undefined}
      style={{
        ...placeholderSize(width, height, layout),
        ...(skeleton ? {
          position: "relative", overflow: "hidden", boxSizing: "border-box",
          border: "1px solid var(--semiotic-border, #e0e0e0)", borderRadius: 4
        } : CENTERED)
      }}
    >
      {loadingContent ?? skeletonBars(height, layout?.responsiveHeight)}
    </div>
  )
}

export function renderChartPlaceholder(
  props: ChartPlaceholderOptions & Pick<BaseChartProps, "loading" | "loadingContent" | "emptyContent">,
  [width, height]: [number, number],
  data: readonly (Datum | null | undefined)[] | null | undefined
) {
  return renderLoadingState(props.loading, width, height, props.loadingContent, props) ??
    renderEmptyState(data, width, height, props.emptyContent, props)
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
