import { useMemo, useCallback, useState } from "react"
import { useCategoryColors } from "../../CategoryColors"
import { useLinkedLegendSuppression } from "../../LinkedCharts"
import { createColorScale, getColor } from "./colorUtils"
import { createLegend } from "./legendUtils"
import { normalizeLinkedHover } from "./selectionUtils"
import type { SelectionHookResult } from "./selectionUtils"
import { useSelection, useLinkedHover } from "../../store/useSelection"
import { useObservationSelector } from "../../store/ObservationStore"
import type { OnObservationCallback, ChartObservation } from "../../store/ObservationStore"
import type { Accessor, SelectionConfig, LinkedHoverProp, ChartMode } from "./types"
import type { MarginType } from "../../types/generalTypes"
import type { TransitionConfig } from "../../stream/types"

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
  colorBy: string | ((d: any, i?: number) => any) | undefined,
  colorScheme: string | string[] = "category10"
): ((v: string) => string) | undefined {
  const categoryColors = useCategoryColors()
  return useMemo(() => {
    if (!colorBy) return undefined
    // When colorBy is a function, derive categories from data and build an ordinal scale
    if (typeof colorBy === "function") {
      const categories = Array.from(new Set(data.map(d => String(colorBy(d)))))
      if (categoryColors && Object.keys(categoryColors).length > 0) {
        return (v: string) => categoryColors[v] || "#999"
      }
      // Build a synthetic data array so createColorScale can derive unique values
      const syntheticData = categories.map(c => ({ _cat: c }))
      return createColorScale(syntheticData, "_cat", colorScheme)
    }
    // If a CategoryColorProvider is present, use its color map as the scale
    if (categoryColors && Object.keys(categoryColors).length > 0) {
      const fallbackScale = createColorScale(data, colorBy as string, colorScheme)
      return (v: string) => categoryColors[v] || fallbackScale(v)
    }
    return createColorScale(data, colorBy as string, colorScheme)
  }, [data, colorBy, colorScheme, categoryColors])
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
 * @param unwrapData - Deprecated / no-op. Hover data is always unwrapped
 *   (stream frames wrap the raw datum in { data, time, value, x, y }).
 */
export function useChartSelection({
  selection,
  linkedHover,
  fallbackFields = [],
  unwrapData = false,
  onObservation,
  chartType,
  chartId,
}: {
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  fallbackFields?: string[]
  unwrapData?: boolean
  onObservation?: OnObservationCallback
  chartType?: string
  chartId?: string
}): {
  activeSelectionHook: SelectionHookResult | null
  customHoverBehavior: (d: Record<string, any> | null) => void
  customClickBehavior: (d: Record<string, any> | null) => void
} {
  const hoverConfig = normalizeLinkedHover(linkedHover, fallbackFields)

  // Selection fields: use the same fields as the hover config so that
  // the predicate checks the right datum fields for cross-filtering
  const selectionFields = hoverConfig?.fields || fallbackFields || []

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: selectionFields
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || fallbackFields || []
  })

  const pushObservation = useObservationSelector(
    (state: any) => state.pushObservation
  ) as ((obs: ChartObservation) => void) | undefined

  const activeSelectionHook: SelectionHookResult | null = selection
    ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate }
    : null


  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      // Linked hover: produce selection on hover, clear on hover-end
      if (linkedHover) {
        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]
          linkedHoverHook.onHover(datum)
        } else {
          linkedHoverHook.onHover(null)
        }
      }

      // Emit observation events
      if (onObservation || pushObservation) {
        const now = Date.now()
        const base = { timestamp: now, chartType: chartType || "unknown", chartId }

        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]
          const obs: ChartObservation = {
            ...base,
            type: "hover",
            datum: datum || {},
            x: d.x ?? 0,
            y: d.y ?? 0,
          }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        } else {
          const obs: ChartObservation = { ...base, type: "hover-end" }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        }
      }
    },
    [linkedHover, linkedHoverHook, onObservation, chartType, chartId, pushObservation]
  )

  const customClickBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (onObservation || pushObservation) {
        const now = Date.now()
        const base = { timestamp: now, chartType: chartType || "unknown", chartId }

        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]
          const obs: ChartObservation = {
            ...base,
            type: "click",
            datum: datum || {},
            x: d.x ?? 0,
            y: d.y ?? 0,
          }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        } else {
          const obs: ChartObservation = { ...base, type: "click-end" }
          if (onObservation) onObservation(obs)
          if (pushObservation) pushObservation(obs)
        }
      }
    },
    [onObservation, pushObservation, chartType, chartId]
  )

  return { activeSelectionHook, customHoverBehavior, customClickBehavior }
}

/**
 * Hook to create a legend and compute margins with legend-aware adjustment.
 * Consolidates the shouldShowLegend / createLegend / margin merge / right-margin
 * expansion pattern that every chart with color encoding repeats.
 */
export type LegendPosition = "right" | "left" | "top" | "bottom"

export function useChartLegendAndMargin({
  data,
  colorBy,
  colorScale,
  showLegend,
  legendPosition = "right",
  userMargin,
  defaults = { top: 50, bottom: 60, left: 70, right: 40 },
}: {
  data: Array<Record<string, any>>
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  showLegend: boolean | undefined
  legendPosition?: LegendPosition
  userMargin: MarginType | undefined
  defaults?: { top: number; bottom: number; left: number; right: number }
}): {
  legend: ReturnType<typeof createLegend> | undefined
  margin: { top: number; bottom: number; left: number; right: number }
  legendPosition: LegendPosition
} {
  const linkedLegendActive = useLinkedLegendSuppression()
  // Suppress child legend when LinkedCharts is handling it, unless explicitly overridden
  const shouldShowLegend = showLegend !== undefined
    ? showLegend
    : linkedLegendActive ? false : !!colorBy

  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    return createLegend({ data, colorBy, colorScale, getColor })
  }, [shouldShowLegend, colorBy, data, colorScale])

  const margin = useMemo(() => {
    const finalMargin = { ...defaults, ...userMargin }
    if (legend) {
      if (legendPosition === "right" && finalMargin.right < 110) finalMargin.right = 110
      else if (legendPosition === "left" && finalMargin.left < 110) finalMargin.left = 110
      else if (legendPosition === "top" && finalMargin.top < 50) finalMargin.top = 50
      else if (legendPosition === "bottom" && finalMargin.bottom < 80) finalMargin.bottom = 80
    }
    return finalMargin
  }, [defaults, userMargin, legend, legendPosition])

  return { legend, margin, legendPosition }
}

// ── Legend interaction ──────────────────────────────────────────────────

export type LegendInteractionMode = "highlight" | "isolate" | "none"

export interface LegendInteractionState {
  highlightedCategory: string | null
  isolatedCategories: Set<string>
  onLegendHover: (item: { label: string } | null) => void
  onLegendClick: (item: { label: string }) => void
  /** Selection predicate that dims non-matching data — use with wrapStyleWithSelection */
  legendSelectionHook: { isActive: boolean; predicate: (d: Record<string, any>) => boolean } | null
}

/**
 * Hook managing legend highlight/isolate interaction.
 * - "highlight": hover over legend item dims everything else to 30% opacity
 * - "isolate": click toggles category visibility; click all to reset
 */
export function useLegendInteraction(
  mode: LegendInteractionMode | undefined,
  colorBy: string | ((d: any) => string) | undefined,
  allCategories: string[]
): LegendInteractionState {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)
  const [isolatedCategories, setIsolatedCategories] = useState<Set<string>>(new Set())

  const onLegendHover = useCallback(
    (item: { label: string } | null) => {
      if (mode !== "highlight") return
      setHighlightedCategory(item ? item.label : null)
    },
    [mode]
  )

  const onLegendClick = useCallback(
    (item: { label: string }) => {
      if (mode !== "isolate") return
      setIsolatedCategories(prev => {
        const next = new Set(prev)
        if (next.has(item.label)) {
          next.delete(item.label)
        } else {
          next.add(item.label)
        }
        // If all categories selected, reset to show all (Carbon behavior)
        if (next.size === allCategories.length) {
          return new Set()
        }
        return next
      })
    },
    [mode, allCategories.length]
  )

  const legendSelectionHook = useMemo(() => {
    if (!mode || mode === "none" || !colorBy) return null

    const colorField = typeof colorBy === "string" ? colorBy : null

    if (mode === "highlight" && highlightedCategory != null) {
      return {
        isActive: true,
        predicate: (d: Record<string, any>) => {
          const val = colorField ? d[colorField] : typeof colorBy === "function" ? colorBy(d) : null
          return val === highlightedCategory
        }
      }
    }

    if (mode === "isolate" && isolatedCategories.size > 0) {
      return {
        isActive: true,
        predicate: (d: Record<string, any>) => {
          const val = colorField ? d[colorField] : typeof colorBy === "function" ? colorBy(d) : null
          return isolatedCategories.has(val)
        }
      }
    }

    return null
  }, [mode, colorBy, highlightedCategory, isolatedCategories])

  return {
    highlightedCategory: mode === "highlight" ? highlightedCategory : null,
    isolatedCategories: mode === "isolate" ? isolatedCategories : new Set(),
    onLegendHover,
    onLegendClick,
    legendSelectionHook
  }
}

// ── Mode defaults ──────────────────────────────────────────────────────

const MODE_DEFAULTS = {
  primary: {
    width: 600, height: 400,
    showAxes: true, showGrid: false, enableHover: true,
    showLegend: undefined as boolean | undefined,
    showLabels: undefined as boolean | undefined,
    marginDefaults: { top: 50, bottom: 60, left: 70, right: 40 },
  },
  context: {
    width: 400, height: 250,
    showAxes: false, showGrid: false, enableHover: false,
    showLegend: false as boolean | undefined,
    showLabels: false as boolean | undefined,
    marginDefaults: { top: 10, bottom: 10, left: 10, right: 10 },
  },
  sparkline: {
    width: 120, height: 24,
    showAxes: false, showGrid: false, enableHover: false,
    showLegend: false as boolean | undefined,
    showLabels: false as boolean | undefined,
    marginDefaults: { top: 2, bottom: 2, left: 0, right: 0 },
  },
}

interface ChartModeInput {
  width?: number
  height?: number
  showGrid?: boolean
  enableHover?: boolean
  showLegend?: boolean
  showLabels?: boolean
  title?: string
  xLabel?: string
  yLabel?: string
  categoryLabel?: string
  valueLabel?: string
  /** When truthy, enableHover is forced true regardless of mode (LinkedCharts needs hover) */
  linkedHover?: any
}

interface ChartModeResult {
  width: number
  height: number
  showAxes: boolean
  showGrid: boolean
  enableHover: boolean
  showLegend: boolean | undefined
  showLabels: boolean | undefined
  title: string | undefined
  xLabel: string | undefined
  yLabel: string | undefined
  categoryLabel: string | undefined
  valueLabel: string | undefined
  marginDefaults: { top: number; bottom: number; left: number; right: number }
}

/**
 * Resolve chart display mode into concrete prop defaults.
 * User-provided values always override mode defaults.
 */
export function useChartMode(
  mode: ChartMode | undefined,
  userProps: ChartModeInput,
  primaryDefaults?: { width?: number; height?: number }
): ChartModeResult {
  const m = MODE_DEFAULTS[mode || "primary"]
  const suppressLabels = mode === "context" || mode === "sparkline"
  const defaultWidth = (!mode || mode === "primary") && primaryDefaults?.width ? primaryDefaults.width : m.width
  const defaultHeight = (!mode || mode === "primary") && primaryDefaults?.height ? primaryDefaults.height : m.height
  return {
    width: userProps.width ?? defaultWidth,
    height: userProps.height ?? defaultHeight,
    showAxes: m.showAxes,
    showGrid: userProps.showGrid ?? m.showGrid,
    enableHover: userProps.enableHover ?? (userProps.linkedHover ? true : m.enableHover),
    showLegend: userProps.showLegend ?? m.showLegend,
    showLabels: userProps.showLabels ?? m.showLabels,
    title: suppressLabels ? undefined : userProps.title,
    xLabel: suppressLabels ? undefined : userProps.xLabel,
    yLabel: suppressLabels ? undefined : userProps.yLabel,
    categoryLabel: suppressLabels ? undefined : userProps.categoryLabel,
    valueLabel: suppressLabels ? undefined : userProps.valueLabel,
    marginDefaults: m.marginDefaults,
  }
}

// ── Animate prop → transition config ────────────────────────────────

/**
 * Resolve the `animate` prop into a `TransitionConfig` for Stream Frames.
 * Returns undefined when animate is falsy (no transition).
 */
export function resolveAnimateConfig(
  animate: boolean | { duration?: number; easing?: "linear" | "ease-out" } | undefined
): TransitionConfig | undefined {
  if (!animate) return undefined
  if (animate === true) return { duration: 300 }
  return {
    duration: animate.duration ?? 300,
    easing: animate.easing === "linear" ? "linear" : "ease-out"
  }
}
