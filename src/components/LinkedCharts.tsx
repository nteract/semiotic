"use client"
import * as React from "react"
import { useEffect } from "react"
import { SelectionProvider, useSelectionSelector } from "./store/SelectionStore"
import type { ResolutionMode } from "./store/SelectionStore"
import { ObservationProvider } from "./store/ObservationStore"

// Re-export hooks for convenience
export { useSelection, useLinkedHover, useBrushSelection, useFilteredData } from "./store/useSelection"
export type {
  UseSelectionOptions,
  UseSelectionResult,
  UseLinkedHoverOptions,
  UseLinkedHoverResult,
  UseBrushSelectionOptions,
  UseBrushSelectionResult
} from "./store/useSelection"

// Re-export observation hook
export { useChartObserver } from "./store/useObservation"
export type { UseChartObserverOptions, UseChartObserverResult } from "./store/useObservation"

// ── Props ──────────────────────────────────────────────────────────────────

export interface LinkedChartsProps {
  children: React.ReactNode
  /** Pre-configure selections with resolution modes */
  selections?: Record<string, { resolution?: ResolutionMode }>
}

// ── Resolution initializer ─────────────────────────────────────────────────

function ResolutionInit({ selections }: { selections: Record<string, { resolution?: ResolutionMode }> }) {
  const setResolution = useSelectionSelector((state: any) => state.setResolution)

  useEffect(() => {
    for (const [name, config] of Object.entries(selections)) {
      if (config.resolution) {
        setResolution(name, config.resolution)
      }
    }
  }, []) // Run once on mount

  return null
}

// ── LinkedCharts component ─────────────────────────────────────────────────

/**
 * LinkedCharts — context provider for coordinated chart views.
 *
 * Wraps any number of chart components (at any depth) and enables
 * cross-highlighting, brushing-and-linking, and cross-filtering via
 * the `selection`, `linkedHover`, and `linkedBrush` props on each chart.
 *
 * @example
 * ```tsx
 * <LinkedCharts>
 *   <Scatterplot data={d} xAccessor="x" yAccessor="y" colorBy="cat"
 *     linkedHover={{ name: "hl", fields: ["cat"] }}
 *     selection={{ name: "hl" }} />
 *   <BarChart data={agg} categoryAccessor="cat" valueAccessor="total"
 *     selection={{ name: "hl" }} />
 * </LinkedCharts>
 * ```
 *
 * @example
 * ```tsx
 * // Cross-filtering (each chart's own brush is excluded from its filter)
 * <LinkedCharts selections={{ dash: { resolution: "crossfilter" } }}>
 *   <Scatterplot data={d} xAccessor="age" yAccessor="income"
 *     linkedBrush={{ name: "dash", xField: "age", yField: "income" }}
 *     selection={{ name: "dash" }} />
 *   <BarChart data={d} categoryAccessor="region" valueAccessor="count"
 *     selection={{ name: "dash" }} />
 * </LinkedCharts>
 * ```
 */
export function LinkedCharts({ children, selections }: LinkedChartsProps) {
  return (
    <SelectionProvider>
      <ObservationProvider>
        {selections && <ResolutionInit selections={selections} />}
        {children}
      </ObservationProvider>
    </SelectionProvider>
  )
}
