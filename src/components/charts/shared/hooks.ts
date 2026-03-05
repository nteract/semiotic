import { useMemo, useCallback } from "react"
import { createColorScale, getColor } from "./colorUtils"
import { createLegend } from "./legendUtils"
import { normalizeLinkedHover } from "./selectionUtils"
import type { SelectionHookResult } from "./selectionUtils"
import { useSelection, useLinkedHover } from "../../store/useSelection"
import type { Accessor, SelectionConfig, LinkedHoverProp } from "./types"
import type { MarginType } from "../../types/generalTypes"

/**
 * Default fill color used when no colorBy is specified
 */
export const DEFAULT_COLOR = "#007bff"

/**
 * Resolve an accessor (string key or function) into a function.
 * Used across chart components to normalize `valueAccessor`, `categoryAccessor`, etc.
 */
export function resolveAccessor<T = any>(
  accessor: string | ((d: Record<string, any>, i?: number) => T)
): (d: Record<string, any>) => T {
  return typeof accessor === "function"
    ? accessor
    : (d: Record<string, any>) => d[accessor]
}

/**
 * Hook to create a color scale from data and colorBy configuration.
 * Returns undefined when colorBy is absent or is a function accessor.
 */
export function useColorScale(
  data: Array<Record<string, any>>,
  colorBy: Accessor<string> | undefined,
  colorScheme: string | string[] = "category10"
): ((v: string) => string) | undefined {
  return useMemo(() => {
    if (!colorBy || typeof colorBy === "function") return undefined
    return createColorScale(data, colorBy as string, colorScheme)
  }, [data, colorBy, colorScheme])
}

/**
 * Hook to sort data by a value accessor.
 * Used by BarChart and DotPlot.
 */
export function useSortedData(
  data: Array<Record<string, any>>,
  sort: boolean | "asc" | "desc" | ((a: Record<string, any>, b: Record<string, any>) => number),
  valueAccessor: Accessor<number>
): Array<Record<string, any>> {
  return useMemo(() => {
    if (!sort) return data
    const copy = [...data]
    if (typeof sort === "function") return copy.sort(sort)
    const getValue = resolveAccessor<number>(valueAccessor)
    return sort === "asc"
      ? copy.sort((a, b) => getValue(a) - getValue(b))
      : copy.sort((a, b) => getValue(b) - getValue(a))
  }, [data, sort, valueAccessor])
}

/**
 * Hook to set up selection and linked hover for a chart component.
 * Consolidates normalizeLinkedHover, useSelection, useLinkedHover,
 * and the customHoverBehavior callback that every HOC chart repeats.
 *
 * @param unwrapData - If true, passes `d.data || d` to the hover hook
 *   (needed for ordinal charts where the frame wraps data).
 */
export function useChartSelection({
  selection,
  linkedHover,
  fallbackFields = [],
  unwrapData = false,
}: {
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  fallbackFields?: string[]
  unwrapData?: boolean
}): {
  activeSelectionHook: SelectionHookResult | null
  customHoverBehavior: (d: Record<string, any> | null) => void
} {
  const hoverConfig = normalizeLinkedHover(linkedHover, fallbackFields)

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const activeSelectionHook = selection
    ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate }
    : null

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        const datum = d && unwrapData ? (d.data || d.datum || d) : d
        linkedHoverHook.onHover(datum)
      }
    },
    [linkedHover, linkedHoverHook, unwrapData]
  )

  return { activeSelectionHook, customHoverBehavior }
}

/**
 * Hook to create a legend and compute margins with legend-aware adjustment.
 * Consolidates the shouldShowLegend / createLegend / margin merge / right-margin
 * expansion pattern that every chart with color encoding repeats.
 */
export function useChartLegendAndMargin({
  data,
  colorBy,
  colorScale,
  showLegend,
  userMargin,
  defaults = { top: 50, bottom: 60, left: 70, right: 40 },
}: {
  data: Array<Record<string, any>>
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  showLegend: boolean | undefined
  userMargin: MarginType | undefined
  defaults?: { top: number; bottom: number; left: number; right: number }
}): {
  legend: ReturnType<typeof createLegend> | undefined
  margin: { top: number; bottom: number; left: number; right: number }
} {
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    return createLegend({ data, colorBy, colorScale, getColor })
  }, [shouldShowLegend, colorBy, data, colorScale])

  const margin = useMemo(() => {
    const finalMargin = { ...defaults, ...userMargin }
    if (legend && finalMargin.right < 120) finalMargin.right = 120
    return finalMargin
  }, [defaults, userMargin, legend])

  return { legend, margin }
}
