"use client"

import * as React from "react"
import { defaultTooltipStyle } from "../../Tooltip/Tooltip"

interface SummaryStats {
  n?: number
  min?: number
  q1?: number
  median?: number
  q3?: number
  max?: number
  mean?: number
}

/**
 * Shared tooltip for distribution charts (BoxPlot, ViolinPlot, RidgelinePlot).
 *
 * Renders category name + summary statistics (n, min, Q1, median, Q3, max, mean).
 * Falls back to category-only display when stats are unavailable.
 */
export function buildStatsTooltip(options?: {
  /** If provided, computes fallback stats from raw data when d.stats is missing */
  valueAccessor?: string | ((d: any) => number)
}): (d: Record<string, any>) => React.ReactElement {
  return (d: Record<string, any>) => {
    const category = d.category || (d.data && d.data[0]?.category) || ""
    const stats: SummaryStats | undefined = d.stats || (d.data || d).stats

    if (stats && stats.median != null) {
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          {stats.n != null && <div>n = {stats.n}</div>}
          {stats.min != null && <div>Min: {stats.min.toLocaleString()}</div>}
          {stats.q1 != null && <div>Q1: {stats.q1.toLocaleString()}</div>}
          <div>Median: {stats.median.toLocaleString()}</div>
          {stats.q3 != null && <div>Q3: {stats.q3.toLocaleString()}</div>}
          {stats.max != null && <div>Max: {stats.max.toLocaleString()}</div>}
          {stats.mean != null && (
            <div style={{ opacity: 0.8 }}>
              Mean: {stats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )
    }

    // Fallback: compute basic stats from raw data if valueAccessor is provided
    if (options?.valueAccessor) {
      const pieces = Array.isArray(d.data) ? d.data : []
      const va = options.valueAccessor
      const values = pieces
        .map((p: any) => Number(typeof va === "function" ? va(p) : p[va]))
        .filter((v: number) => Number.isFinite(v))
        .sort((a: number, b: number) => a - b)
      const n = values.length
      const median = n > 0
        ? n % 2 !== 0
          ? values[Math.floor(n / 2)]
          : (values[n / 2 - 1] + values[n / 2]) / 2
        : null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          {n > 0 && <div>n = {n}</div>}
          {median != null && <div>Median: {median.toLocaleString()}</div>}
        </div>
      )
    }

    return (
      <div className="semiotic-tooltip" style={defaultTooltipStyle}>
        <div style={{ fontWeight: "bold" }}>{String(category)}</div>
      </div>
    )
  }
}
