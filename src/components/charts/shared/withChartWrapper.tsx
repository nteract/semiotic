"use client"
import * as React from "react"
import { ChartErrorBoundary } from "../../ChartErrorBoundary"
import ChartError from "./ChartError"

const IS_DEV = typeof process !== "undefined" && process.env?.NODE_ENV !== "production"

interface SafeRenderProps {
  componentName: string
  width: number
  height: number
  children: React.ReactNode
}

/**
 * Wraps a chart's rendered output with an error boundary.
 * If the chart throws during render, shows a visible error box
 * with the component name and error message instead of crashing the page.
 */
export function SafeRender({ componentName, width, height, children }: SafeRenderProps) {
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
