import { useMemo, useCallback, useState, useId } from "react"
import { useCategoryColors } from "../../CategoryColors"
import { useLinkedLegendSuppression } from "../../LinkedCharts"
import { createColorScale, getColor, COLOR_SCHEMES } from "./colorUtils"
import { createLegend } from "./legendUtils"
import { normalizeLinkedHover } from "./selectionUtils"
import type { SelectionHookResult } from "./selectionUtils"
import { useSelection, useLinkedHover } from "../../store/useSelection"
import { setCrosshairPosition, clearCrosshairPosition } from "../../store/LinkedCrosshairStore"
import { useObservationSelector } from "../../store/ObservationStore"
import type { OnObservationCallback, ChartObservation } from "../../store/ObservationStore"
import type { Accessor, SelectionConfig, LinkedHoverProp, ChartMode } from "./types"
import type { MarginType } from "../../types/generalTypes"
import type { TransitionConfig } from "../../stream/types"
import { useTheme } from "../../ThemeProvider"

/**
 * Default fill color used when no colorBy is specified
 */
export const DEFAULT_COLOR = "#007bff"

/**
 * Returns the theme's categorical palette, or undefined if no ThemeProvider or
 * the palette is empty. Safe to call outside a ThemeProvider (returns undefined).
 */
export function useThemeCategorical(): string[] | undefined {
  const theme = useTheme()
  const cat = theme?.colors?.categorical
  return cat && cat.length > 0 ? cat : undefined
}

/**
 * Resolve the effective color for a data element when no colorBy is specified.
 * Priority: color prop > theme categorical > colorScheme > DEFAULT_COLOR.
 * When a palette is available, cycles through colors by category name.
 */
export function resolveDefaultFill(
  color: string | undefined,
  themeCategorical: string[] | undefined,
  colorScheme: string | string[] | undefined,
  category: string | undefined,
  categoryIndexMap: Map<string, number>
): string {
  // Uniform color prop takes highest priority
  if (color) return color

  // Priority: color > explicit colorScheme array > theme categorical > named colorScheme > DEFAULT_COLOR
  // An explicit array colorScheme is a user override that takes precedence over the theme default.
  // A named string colorScheme (like "category10") defers to the theme since it's often a prop default.
  let palette: string[] | undefined
  if (Array.isArray(colorScheme)) {
    palette = colorScheme
  } else if (themeCategorical && themeCategorical.length > 0) {
    palette = themeCategorical
  } else if (typeof colorScheme === "string") {
    const resolved = COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]
    if (Array.isArray(resolved)) palette = resolved as string[]
  }

  if (!palette || palette.length === 0) return DEFAULT_COLOR

  // Cycle through palette by category
  if (category != null) {
    if (!categoryIndexMap.has(category)) {
      categoryIndexMap.set(category, categoryIndexMap.size)
    }
    return palette[categoryIndexMap.get(category)! % palette.length]
  }

  return palette[0]
}

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
  colorScheme: string | string[] | undefined
): ((v: string) => string) | undefined {
  const categoryColors = useCategoryColors()
  const themeCategorical = useThemeCategorical()
  return useMemo(() => {
    if (!colorBy) return undefined
    // Resolve effective scheme: explicit prop > theme categorical > "category10"
    const effectiveScheme: string | string[] = colorScheme
      ?? (themeCategorical && themeCategorical.length > 0 ? themeCategorical : undefined)
      ?? "category10"
    // When data is empty (push API mode), return undefined so the pipeline's
    // STREAMING_PALETTE fallback handles coloring. Building a scale from empty
    // data creates an ordinal scale with an implicit domain that can intercept
    // the pipeline's color assignment.
    if (data.length === 0) {
      // Still use CategoryColorProvider if available — it has stable colors
      if (categoryColors && Object.keys(categoryColors).length > 0) {
        return (v: string) => categoryColors[v] || "#999"
      }
      return undefined
    }
    // When colorBy is a function, derive categories from data and build an ordinal scale
    if (typeof colorBy === "function") {
      const categories = Array.from(new Set(data.map(d => String(colorBy(d)))))
      if (categoryColors && Object.keys(categoryColors).length > 0) {
        return (v: string) => categoryColors[v] || "#999"
      }
      // Build a synthetic data array so createColorScale can derive unique values
      const syntheticData = categories.map(c => ({ _cat: c }))
      return createColorScale(syntheticData, "_cat", effectiveScheme)
    }
    // If a CategoryColorProvider is present, use its color map as the scale
    if (categoryColors && Object.keys(categoryColors).length > 0) {
      const fallbackScale = createColorScale(data, colorBy as string, effectiveScheme)
      return (v: string) => categoryColors[v] || fallbackScale(v)
    }
    return createColorScale(data, colorBy as string, effectiveScheme)
  }, [data, colorBy, colorScheme, categoryColors, themeCategorical])
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
  onClick,
}: {
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  fallbackFields?: string[]
  unwrapData?: boolean
  onObservation?: OnObservationCallback
  chartType?: string
  chartId?: string
  onClick?: (datum: any, event: { x: number; y: number }) => void
}): {
  activeSelectionHook: SelectionHookResult | null
  customHoverBehavior: (d: Record<string, any> | null) => void
  customClickBehavior: (d: Record<string, any> | null) => void
  /** Stable ID for this chart instance, used to suppress linked crosshair on source chart */
  crosshairSourceId: string
} {
  const crosshairSourceId = useId()
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

          // x-position mode: broadcast X value to crosshair store
          if (hoverConfig?.mode === "x-position" && hoverConfig.xField) {
            const xVal = datum?.[hoverConfig.xField]
            if (xVal != null && Number.isFinite(Number(xVal))) {
              setCrosshairPosition(hoverConfig.name || "hover", Number(xVal), crosshairSourceId)
            }
          }

          // Field-based mode (default): produce selection
          if (hoverConfig?.mode !== "x-position") {
            linkedHoverHook.onHover(datum)
          }
        } else {
          // Clear on hover-end
          if (hoverConfig?.mode === "x-position") {
            clearCrosshairPosition(hoverConfig.name || "hover", crosshairSourceId)
          }
          if (hoverConfig?.mode !== "x-position") {
            linkedHoverHook.onHover(null)
          }
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
    [linkedHover, linkedHoverHook, hoverConfig, crosshairSourceId, onObservation, chartType, chartId, pushObservation]
  )

  const customClickBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (d && onClick) {
        let datum = d.data || d.datum || d
        if (Array.isArray(datum)) datum = datum[0]
        onClick(datum, { x: d.x ?? 0, y: d.y ?? 0 })
      }

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
    [onClick, onObservation, pushObservation, chartType, chartId]
  )

  return { activeSelectionHook, customHoverBehavior, customClickBehavior, crosshairSourceId }
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
  categories,
}: {
  data: Array<Record<string, any>>
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  showLegend: boolean | undefined
  legendPosition?: LegendPosition
  userMargin: MarginType | undefined
  defaults?: { top: number; bottom: number; left: number; right: number }
  categories?: string[]
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
    return createLegend({ data, colorBy, colorScale, getColor, categories })
  }, [shouldShowLegend, colorBy, data, colorScale, categories])

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

// ── Push API category tracking ────────────────────────────────────────

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
  showCategoryTicks?: boolean
  /** "vertical" | "horizontal" — used to shrink the category-axis margin when showCategoryTicks is false */
  orientation?: string
  title?: string
  description?: string
  summary?: string
  accessibleTable?: boolean
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
  description: string | undefined
  summary: string | undefined
  accessibleTable: boolean | undefined
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
    description: userProps.description,
    summary: userProps.summary,
    accessibleTable: userProps.accessibleTable,
    xLabel: suppressLabels ? undefined : userProps.xLabel,
    yLabel: suppressLabels ? undefined : userProps.yLabel,
    categoryLabel: suppressLabels ? undefined : userProps.categoryLabel,
    valueLabel: suppressLabels ? undefined : userProps.valueLabel,
    marginDefaults: adjustMarginsForCategoryTicks(m.marginDefaults, userProps.showCategoryTicks, userProps.orientation),
  }
}

/**
 * When showCategoryTicks is false, shrink the margin on the category axis side
 * since tick labels no longer need space. Keep a small margin (15px) for the
 * axis baseline and optional axis title.
 */
function adjustMarginsForCategoryTicks(
  defaults: { top: number; bottom: number; left: number; right: number },
  showCategoryTicks: boolean | undefined,
  orientation: string | undefined
): { top: number; bottom: number; left: number; right: number } {
  if (showCategoryTicks !== false) return defaults
  const adjusted = { ...defaults }
  if (orientation === "horizontal") {
    // Horizontal: categories on left axis
    adjusted.left = Math.min(adjusted.left, 15)
  } else {
    // Vertical (default): categories on bottom axis
    adjusted.bottom = Math.min(adjusted.bottom, 15)
  }
  return adjusted
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
