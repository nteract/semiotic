"use client"
import * as React from "react"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"
import { diagnoseConfig, type DiagnosisResult } from "./diagnoseConfig"

const IS_DEV = typeof process !== "undefined" && process.env?.NODE_ENV !== "production"

interface SafeRenderProps {
  componentName: string
  width: number
  height: number
  props?: Record<string, any>
  children: React.ReactNode
}

/**
 * Wraps a chart's rendered output with an error boundary.
 * If the chart throws during render, runs diagnoseConfig to produce
 * actionable fix suggestions alongside the error message.
 */
export function SafeRender({ componentName, width, height, props, children }: SafeRenderProps) {
  return (
    <ChartErrorBoundary
      fallback={(error: Error) => {
        let diagnosticHint = ""
        if (props) {
          try {
            const result: DiagnosisResult = diagnoseConfig(componentName, props)
            if (!result.ok) {
              diagnosticHint = result.diagnoses
                .map(d => `${d.severity === "error" ? "✗" : "⚠"} ${d.message}${d.fix ? ` — Fix: ${d.fix}` : ""}`)
                .join("\n")
            }
          } catch {
            // diagnoseConfig should never throw, but don't let diagnostics break the error boundary
          }
        }
        return (
          <ChartError
            componentName={componentName}
            message={error.message}
            diagnosticHint={diagnosticHint}
            width={width}
            height={height}
          />
        )
      }}
    >
      {children}
    </ChartErrorBoundary>
  )
}

// ── Empty & loading state helpers ────────────────────────────────────────

const EMPTY_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--semiotic-text-secondary, #999)",
  fontSize: 13,
  fontFamily: "inherit",
  border: "1px dashed var(--semiotic-border, #ddd)",
  borderRadius: 4,
  boxSizing: "border-box" as const,
}

const LOADING_BAR_STYLE: React.CSSProperties = {
  background: "var(--semiotic-border, #e0e0e0)",
  borderRadius: 2,
}

/**
 * Renders a "No data available" placeholder when data is empty.
 * Returns null when data is present or emptyContent is `false`.
 */
export function renderEmptyState(
  data: any[] | undefined | null,
  width: number,
  height: number,
  emptyContent?: React.ReactNode | false
): React.ReactElement | null {
  if (emptyContent === false) return null
  if (data == null) return null // undefined/null = no data provided (e.g. push API)
  if (Array.isArray(data) && data.length > 0) return null
  if (!Array.isArray(data)) return null // hierarchy data (object)

  return (
    <div style={{ ...EMPTY_STYLE, width, height }}>
      {emptyContent || "No data available"}
    </div>
  )
}

/**
 * Renders a shimmer/skeleton loading placeholder.
 * Returns null when loading is false.
 */
export function renderLoadingState(
  loading: boolean | undefined,
  width: number,
  height: number
): React.ReactElement | null {
  if (!loading) return null
  // Simple skeleton: a few horizontal bars at varying widths
  const barCount = Math.min(5, Math.floor(height / 40))
  const barHeight = Math.max(8, Math.floor(height / (barCount * 3)))
  const gap = Math.max(6, Math.floor(height / (barCount * 2.5)))
  const startY = Math.floor((height - (barCount * (barHeight + gap) - gap)) / 2)

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--semiotic-border, #e0e0e0)",
        borderRadius: 4,
        boxSizing: "border-box",
      }}
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="semiotic-loading-bar"
          style={{
            ...LOADING_BAR_STYLE,
            position: "absolute",
            top: startY + i * (barHeight + gap),
            left: Math.floor(width * 0.1),
            width: `${30 + ((i * 37 + 13) % 50)}%`,
            height: barHeight,
            opacity: 0.5 + (i % 2) * 0.2,
          }}
        />
      ))}
    </div>
  )
}

// ── Dev warning helpers ──────────────────────────────────────────────────

/** Warn if a string accessor isn't found in the first data element */
export function warnMissingField(
  componentName: string,
  data: any[] | undefined,
  accessorName: string,
  accessorValue: any
): void {
  if (!IS_DEV) return
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

/** Warn if data looks like the wrong shape for this chart type */
export function warnDataShape(
  componentName: string,
  data: any[] | undefined,
  expectedKeys: string[],
  hint: string
): void {
  if (!IS_DEV) return
  if (!data || data.length === 0) return

  const sample = data[0]
  if (!sample || typeof sample !== "object") return

  const keys = Object.keys(sample)
  const hasAny = expectedKeys.some(k => keys.includes(k))
  if (hasAny) return

  console.warn(
    `[semiotic] ${componentName}: data[0] has keys [${keys.join(", ")}] but none of the expected keys [${expectedKeys.join(", ")}]. ${hint}`
  )
}
