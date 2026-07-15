import { useMemo, useCallback, useState, useId, useEffect, useRef } from "react"
import { useCategoryColors } from "../../CategoryColors"
import { useLinkedChartCategories, useLinkedChartCategoryRegistryActive, useLinkedLegendSuppression } from "../../LinkedCharts"
import { createColorScale, getColor, COLOR_SCHEMES, resolveExplicitColor } from "./colorUtils"
import { createLegend } from "./legendUtils"
import { normalizeLinkedHover } from "./selectionUtils"
import type { SelectionHookResult } from "./selectionUtils"
import { useSelection, useLinkedHover } from "../../store/useSelection"
import { setCrosshairPosition, clearCrosshairPosition, toggleCrosshairLock, unlockCrosshair } from "../../store/LinkedCrosshairStore"
import { useObservationSelector } from "../../store/ObservationStore"
import type { OnObservationCallback, ChartObservation } from "../../store/ObservationStore"
import type {
  Accessor,
  SelectionConfig,
  LinkedHoverProp,
  ChartMode,
  HoverHighlightMode,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
} from "./types"
import type { MarginType, PartialMargin } from "../../types/marginType"
import type { TransitionConfig } from "../../stream/types"
import { useTheme } from "../../ThemeProvider"
import type { Datum } from "./datumTypes"
import type { MobileVisualizationContract } from "./auditMobileVisualization"
import { resolveResponsiveRules } from "./responsiveRules"
import type { ResponsiveRule } from "./responsiveRules"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior,
  SemanticInteractionContext
} from "./semanticInteractions"
import {
  emitClickObservations,
  emitHoverObservations
} from "./semanticInteractions"
import {
  hasOwnEnumerableKey,
  observationDatum,
  resolveHoverXPosition
} from "./chartSelectionUtils"

/**
 * Default fill color used when no colorBy is specified
 */
export const DEFAULT_COLOR = "#007bff"
const EMPTY_FIELDS: string[] = []

export const MOBILE_INTERACTION_TARGET_SIZE = 44
export const MOBILE_INTERACTION_MIN_HIT_RADIUS = 24

export const MOBILE_INTERACTION_DEFAULTS: ResolvedMobileInteractionConfig = {
  enabled: true,
  tapToSelect: true,
  tapToLockTooltip: true,
  clearSelection: "backgroundTap",
  targetSize: MOBILE_INTERACTION_TARGET_SIZE,
  snap: "nearestDatum",
  brushHandleSize: MOBILE_INTERACTION_TARGET_SIZE,
  standardControls: false,
}

export const DISABLED_MOBILE_INTERACTION: ResolvedMobileInteractionConfig = {
  ...MOBILE_INTERACTION_DEFAULTS,
  enabled: false,
  tapToSelect: false,
  tapToLockTooltip: false,
}

export function resolveMobileInteraction(
  input: MobileInteractionProp | undefined,
  context: {
    mode?: ChartMode
    width?: number
    mobileSemantics?: MobileVisualizationContract
  } = {}
): ResolvedMobileInteractionConfig {
  const semanticInteraction = context.mobileSemantics?.interaction
  const semanticTarget =
    typeof semanticInteraction?.targetSize === "number"
      ? semanticInteraction.targetSize
      : typeof context.mobileSemantics?.minimumHitTarget === "number"
        ? context.mobileSemantics.minimumHitTarget
        : undefined
  const inferredMobile = context.mode === "mobile" || (typeof context.width === "number" && context.width <= 480)
  const hasSemanticInteraction = !!semanticInteraction || semanticTarget !== undefined
  const config = input && typeof input === "object" ? input : undefined
  const enabled =
    input !== false &&
    config?.enabled !== false &&
    (input !== undefined || inferredMobile || hasSemanticInteraction)

  if (!enabled) return DISABLED_MOBILE_INTERACTION

  const mobileConfig = config ?? {}
  return {
    enabled: true,
    tapToSelect: mobileConfig.tapToSelect ?? true,
    tapToLockTooltip: mobileConfig.tapToLockTooltip ?? true,
    clearSelection: mobileConfig.clearSelection ?? "backgroundTap",
    targetSize: mobileConfig.targetSize ?? semanticTarget ?? MOBILE_INTERACTION_TARGET_SIZE,
    snap: mobileConfig.snap ?? "nearestDatum",
    brushHandleSize: mobileConfig.brushHandleSize ?? MOBILE_INTERACTION_TARGET_SIZE,
    standardControls: mobileConfig.standardControls ?? false,
  }
}

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
 * Return the ambient theme's sequential scheme name (e.g. "blues", "viridis")
 * for magnitude encodings. Safe to call outside a ThemeProvider (returns undefined).
 */
export function useThemeSequential(): string | undefined {
  const theme = useTheme()
  return theme?.colors?.sequential || undefined
}

/**
 * Return the ambient theme's diverging scheme name (e.g. "RdBu", "PiYG")
 * for midpoint encodings (likert, ±deviation). Safe to call outside a
 * ThemeProvider (returns undefined).
 */
export function useThemeDiverging(): string | undefined {
  const theme = useTheme()
  return theme?.colors?.diverging || undefined
}

/**
 * Resolve the effective color for a data element when no colorBy is specified.
 * Priority: color prop > theme categorical > colorScheme > DEFAULT_COLOR.
 * When a palette is available, cycles through colors by category name.
 */
export function resolveDefaultFill(
  color: string | undefined,
  themeCategorical: string[] | undefined,
  colorScheme: string | string[] | Record<string, string> | undefined,
  category: string | undefined,
  categoryIndexMap: Map<string, number>
): string {
  // Uniform color prop takes highest priority
  if (color) return color

  // An explicit { category: color } map wins for a mapped category.
  if (colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)) {
    const mapped = resolveExplicitColor(colorScheme as Record<string, unknown>, category)
    if (mapped) return mapped
  }

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
export function resolveAccessor<T = string | number | boolean | Date | Datum | null | undefined>(
  accessor: string | ((d: Datum, i?: number) => T)
): (d: Datum) => T {
  return typeof accessor === "function"
    ? accessor
    : (d: Datum) => d[accessor]
}

/**
 * Hook to create a color scale from data and colorBy configuration.
 * Returns undefined when colorBy is absent or data is empty (push API mode).
 * Supports both string and function accessors for colorBy.
 */
export function useColorScale(
  data: Array<Datum>,
  colorBy: string | ((d: Datum, i?: number) => string | number) | undefined,
  colorScheme?: string | string[] | Record<string, string>
): ((v: string) => string) | undefined {
  const categoryColors = useCategoryColors()
  const themeCategorical = useThemeCategorical()
  return useMemo(() => {
    if (!colorBy) return undefined
    const providerColors = categoryColors ?? undefined
    // Resolve effective scheme: explicit prop > theme categorical > "category10"
    const effectiveScheme: string | string[] | Record<string, string> = colorScheme
      ?? (themeCategorical && themeCategorical.length > 0 ? themeCategorical : undefined)
      ?? "category10"
    // When data is empty (push API mode), return undefined so the pipeline's
    // STREAMING_PALETTE fallback handles coloring. Building a scale from empty
    // data creates an ordinal scale with an implicit domain that can intercept
    // the pipeline's color assignment.
    if (data.length === 0) {
      // Still use CategoryColorProvider if available — it has stable colors
      if (providerColors && hasOwnEnumerableKey(providerColors)) {
        // Use effectiveScheme as fallback for categories not in the provider
        const fallbackScale = createColorScale([{ _: "a" }], "_", effectiveScheme)
        return (v: string) => providerColors[v] || fallbackScale(v)
      }
      return undefined
    }
    // When colorBy is a function, derive categories from data and build an ordinal scale
    if (typeof colorBy === "function") {
      const categories = Array.from(new Set(data.map(d => String(colorBy(d)))))
      if (providerColors && hasOwnEnumerableKey(providerColors)) {
        // Use CategoryColorProvider colors, with effectiveScheme as fallback for unknown categories
        const syntheticData = categories.map(c => ({ _cat: c }))
        const fallbackScale = createColorScale(syntheticData, "_cat", effectiveScheme)
        return (v: string) => providerColors[v] || fallbackScale(v)
      }
      // Build a synthetic data array so createColorScale can derive unique values
      const syntheticData = categories.map(c => ({ _cat: c }))
      return createColorScale(syntheticData, "_cat", effectiveScheme)
    }
    // If a CategoryColorProvider is present, use its color map as the scale
    if (providerColors && hasOwnEnumerableKey(providerColors)) {
      const fallbackScale = createColorScale(data, colorBy as string, effectiveScheme)
      return (v: string) => providerColors[v] || fallbackScale(v)
    }
    return createColorScale(data, colorBy as string, effectiveScheme)
  }, [data, colorBy, colorScheme, categoryColors, themeCategorical])
}

/**
 * Hook to sort data by a value accessor.
 * Used by BarChart and DotPlot.
 *
 * `"auto"` and function comparators are pass-through here. The frame-
 * level `resolveCategories` decides the visual category order:
 *   • `"auto"` → insertion order when streaming, value-desc when static.
 *   • function → runs as a category-key comparator on the axis list.
 * The HOC's row-level `data` order only seeds insertion order via the
 * store's category Set; rearranging rows with a category comparator
 * makes no sense (it would call the comparator with row objects instead
 * of strings), so we decline to sort in both cases.
 */
export function useSortedData(
  data: Array<Datum>,
  sort: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number),
  valueAccessor: Accessor<number>
): Array<Datum> {
  return useMemo(() => {
    if (!sort || sort === "auto" || typeof sort === "function") return data
    const copy = [...data]
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
  fallbackFields = EMPTY_FIELDS,
  unwrapData: _unwrapData = false,
  onObservation,
  chartType,
  chartId,
  onClick,
  hoverHighlight,
  colorByField,
  mobileInteraction,
}: {
  selection?: SelectionConfig
  linkedHover?: LinkedHoverProp
  fallbackFields?: string[]
  unwrapData?: boolean
  onObservation?: OnObservationCallback
  chartType?: string
  chartId?: string
  onClick?: (datum: Datum, event: { x: number; y: number }) => void
  hoverHighlight?: HoverHighlightMode
  colorByField?: string
  mobileInteraction?: ResolvedMobileInteractionConfig
}): {
  activeSelectionHook: SelectionHookResult | null
  hoverSelectionHook: SelectionHookResult | null
  customHoverBehavior: SemanticHoverBehavior
  customClickBehavior: SemanticClickBehavior
  /** Stable ID for this chart instance, used to suppress linked crosshair on source chart */
  crosshairSourceId: string
} {
  const crosshairSourceId = useId()
  const hoverConfig = useMemo(
    () => normalizeLinkedHover(linkedHover, fallbackFields),
    [linkedHover, fallbackFields]
  )

  // Linked fields drive both the cross-filter selection predicate and the
  // hover emitter. `mode: "series"` keys off the chart's series-identity field
  // (the colorBy/lineBy/… the HOC surfaces as colorByField/fallbackFields[0]),
  // so authors get bar↔series highlighting without hand-wiring `fields`; an
  // explicit `seriesField` overrides. Other modes keep the configured/fallback
  // fields. Using one `linkFields` for both keeps emit and consume symmetric.
  const linkFields = useMemo(
    () =>
      hoverConfig?.mode === "series"
        ? [hoverConfig.seriesField || colorByField || fallbackFields[0]].filter(
            (field): field is string => !!field
          )
        : hoverConfig?.fields || fallbackFields,
    [hoverConfig, colorByField, fallbackFields]
  )

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: linkFields
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: linkFields
  })

  const pushObservation = useObservationSelector(
    (state) => state.pushObservation
  ) as ((obs: ChartObservation) => void) | undefined
  const publishObservation = useCallback(
    (observation: ChartObservation) => {
      onObservation?.(observation)
      pushObservation?.(observation)
    },
    [onObservation, pushObservation]
  )

  const activeSelectionHook: SelectionHookResult | null = selection
    ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate }
    : null

  // ── Hover highlight: track hovered series key for sibling dimming ──────
  const [hoveredSeriesKey, setHoveredSeriesKey] = useState<string | null>(null)
  const mobileHoverLockRef = useRef(false)
  const seriesField = colorByField || fallbackFields[0]

  const hoverSelectionHook: SelectionHookResult | null = useMemo(() => {
    if (!hoverHighlight || hoveredSeriesKey == null || !seriesField) return null
    const key = hoveredSeriesKey
    const field = seriesField
    return {
      isActive: true,
      predicate: (d: Datum) => {
        const val = typeof d[field] === "string" ? d[field] : String(d[field] ?? "")
        return val === key
      }
    }
  }, [hoverHighlight, hoveredSeriesKey, seriesField])

  const customHoverBehavior = useCallback(
    (d: Datum | null, interaction?: SemanticInteractionContext) => {
      const preserveMobileLock =
        !d &&
        mobileHoverLockRef.current &&
        !!mobileInteraction?.enabled &&
        mobileInteraction.tapToLockTooltip

      // Linked hover: produce selection on hover, clear on hover-end
      if (linkedHover) {
        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]

          // x-position mode: broadcast X value to crosshair store
          if (hoverConfig?.mode === "x-position" && hoverConfig.xField) {
            const xVal = resolveHoverXPosition(d, datum, hoverConfig.xField)
            if (xVal != null) {
              setCrosshairPosition(hoverConfig.name || "hover", xVal, crosshairSourceId)
            }
          }

          // Field-based mode (default): produce selection
          if (hoverConfig?.mode !== "x-position") {
            linkedHoverHook.onHover(datum)
          }
        } else {
          // Clear on hover-end
          if (hoverConfig?.mode === "x-position" && !preserveMobileLock) {
            clearCrosshairPosition(hoverConfig.name || "hover", crosshairSourceId)
          }
          if (hoverConfig?.mode !== "x-position" && !preserveMobileLock) {
            linkedHoverHook.onHover(null)
          }
        }
      }

      // Hover highlight: track hovered series for sibling dimming
      if (hoverHighlight && seriesField) {
        if (d) {
          let datum = d.data || d.datum || d
          if (Array.isArray(datum)) datum = datum[0]
          const key = datum?.[seriesField]
          setHoveredSeriesKey(key != null ? String(key) : null)
        } else if (!preserveMobileLock) {
          setHoveredSeriesKey(null)
        }
      }

      // Emit observation events
      if (onObservation || pushObservation) {
        emitHoverObservations({
          onObservation: publishObservation,
          datum: d ? observationDatum(d) : null,
          x: d?.x,
          y: d?.y,
          chartType: chartType || "unknown",
          chartId,
          context: interaction
        })
      }
    },
    [linkedHover, linkedHoverHook, hoverConfig, crosshairSourceId, onObservation, chartType, chartId, pushObservation, publishObservation, hoverHighlight, seriesField, mobileInteraction]
  )

  const clearMobileLock = useCallback(
    (updateLocalState = true) => {
      mobileHoverLockRef.current = false
      if (linkedHover && hoverConfig?.mode !== "x-position") {
        linkedHoverHook.onHover(null)
      }
      if (selection && mobileInteraction?.tapToSelect) {
        selectionHook.clear()
      }
      if (updateLocalState && hoverHighlight) {
        setHoveredSeriesKey(null)
      }
      if (hoverConfig?.mode === "x-position") {
        unlockCrosshair(hoverConfig.name || "hover", crosshairSourceId)
        clearCrosshairPosition(hoverConfig.name || "hover", crosshairSourceId)
      }
    },
    [
      linkedHover,
      hoverConfig,
      linkedHoverHook,
      selection,
      mobileInteraction,
      selectionHook,
      hoverHighlight,
      crosshairSourceId,
    ]
  )

  const customClickBehavior = useCallback(
    (d: Datum | null, interaction?: SemanticInteractionContext) => {
      const tapLocksHover =
        !!mobileInteraction?.enabled &&
        (mobileInteraction.tapToLockTooltip || mobileInteraction.tapToSelect)
      const shouldClearOnBackground =
        !!mobileInteraction?.enabled &&
        mobileInteraction.clearSelection === "backgroundTap"

      // Click-to-lock crosshair (x-position mode)
      if (hoverConfig?.mode === "x-position" && hoverConfig.xField && d) {
        let datum = d.data || d.datum || d
        if (Array.isArray(datum)) datum = datum[0]
        const xVal = resolveHoverXPosition(d, datum, hoverConfig.xField)
        if (xVal != null) {
          toggleCrosshairLock(hoverConfig.name || "hover", xVal, crosshairSourceId)
        }
      }

      if (tapLocksHover) {
        if (d) {
          mobileHoverLockRef.current = true
          const datum = observationDatum(d)

          if (linkedHover && hoverConfig?.mode !== "x-position") {
            linkedHoverHook.onHover(datum)
          }

          if (selection && mobileInteraction?.tapToSelect && linkFields.length > 0) {
            const fieldValues: Record<string, unknown[]> = {}
            for (const field of linkFields) {
              const value = datum[field]
              if (value !== undefined) fieldValues[field] = [value]
            }
            if (hasOwnEnumerableKey(fieldValues)) {
              selectionHook.selectPoints(fieldValues)
            }
          }

          if (hoverHighlight && seriesField) {
            const key = datum?.[seriesField]
            setHoveredSeriesKey(key != null ? String(key) : null)
          }
        } else if (shouldClearOnBackground) {
          clearMobileLock()
        }
      }

      if (!d && !shouldClearOnBackground) return

      if (d && onClick) {
        let datum = d.data || d.datum || d
        if (Array.isArray(datum)) datum = datum[0]
        onClick(datum, { x: d.x ?? 0, y: d.y ?? 0 })
      }

      if (onObservation || pushObservation) {
        emitClickObservations({
          onObservation: publishObservation,
          datum: d ? observationDatum(d) : null,
          x: d?.x,
          y: d?.y,
          chartType: chartType || "unknown",
          chartId,
          context: interaction
        })
      }
    },
    [
      onClick,
      onObservation,
      pushObservation,
      publishObservation,
      chartType,
      chartId,
      hoverConfig,
      crosshairSourceId,
      mobileInteraction,
      linkedHover,
      linkedHoverHook,
      selection,
      selectionHook,
      linkFields,
      hoverHighlight,
      seriesField,
      clearMobileLock,
    ]
  )

  useEffect(() => {
    if (!mobileInteraction?.enabled || typeof document === "undefined") return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileHoverLockRef.current) {
        clearMobileLock()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [mobileInteraction?.enabled, clearMobileLock])

  useEffect(() => {
    return () => {
      if (mobileHoverLockRef.current) {
        clearMobileLock(false)
      }
    }
  }, [clearMobileLock])

  // Clean up crosshair on unmount or config change to prevent stale entries
  // when the source chart is conditionally rendered or navigated away from
  useEffect(() => {
    if (hoverConfig?.mode !== "x-position") return
    const name = hoverConfig.name || "hover"
    return () => {
      unlockCrosshair(name, crosshairSourceId)
      clearCrosshairPosition(name, crosshairSourceId)
    }
  }, [hoverConfig?.mode, hoverConfig?.name, crosshairSourceId])

  return { activeSelectionHook, hoverSelectionHook, customHoverBehavior, customClickBehavior, crosshairSourceId }
}

/**
 * Compute crosshair props for StreamXYFrame from linkedHover config.
 * Returns undefined when linkedHover is not in x-position mode.
 */
export function getCrosshairProps(
  linkedHover: unknown,
  crosshairSourceId: string
): { linkedCrosshairName: string; linkedCrosshairSourceId: string } | undefined {
  const config = (typeof linkedHover === "object" && linkedHover !== null)
    ? linkedHover as { name?: string; mode?: string }
    : undefined
  if (config?.mode !== "x-position") return undefined
  return {
    linkedCrosshairName: config.name || "hover",
    linkedCrosshairSourceId: crosshairSourceId,
  }
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
  data: Array<Datum>
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  showLegend: boolean | undefined
  legendPosition?: LegendPosition
  userMargin: PartialMargin | undefined
  defaults?: MarginType
  categories?: string[]
}): {
  legend: ReturnType<typeof createLegend> | undefined
  margin: MarginType
  legendPosition: LegendPosition
} {
  const linkedLegendActive = useLinkedLegendSuppression()
  const linkedCategoryRegistryActive = useLinkedChartCategoryRegistryActive()
  // Suppress child legend when LinkedCharts is handling it, unless explicitly overridden
  const shouldShowLegend = showLegend !== undefined
    ? showLegend
    : linkedLegendActive ? false : !!colorBy
  const shouldResolveCategories = !!colorBy && (shouldShowLegend || linkedCategoryRegistryActive)

  const legendCategories = useMemo(() => {
    if (!shouldResolveCategories) return []
    if (categories !== undefined) return categories
    const vals = new Set<string>()
    for (const d of data) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [categories, colorBy, data, shouldResolveCategories])
  useLinkedChartCategories(linkedCategoryRegistryActive && colorBy ? legendCategories : [])

  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    const built = createLegend({ data, colorBy, colorScale, getColor, categories: legendCategories })
    // Suppress empty legends — when a chart using the push API mounts with no
    // `data` yet and no explicit `categories`, createLegend returns a shell
    // with zero items. Returning it would reserve margin for a legend that
    // renders only a title bar ("neatline"), which is what a user sees as
    // empty reserved space. Treat zero-item legends as absent.
    const totalItems = built.legendGroups.reduce((sum, g) => sum + g.items.length, 0)
    if (totalItems === 0) return undefined
    return built
  }, [shouldShowLegend, colorBy, data, colorScale, legendCategories])

  const margin = useMemo<MarginType>(() => {
    const userSides = typeof userMargin === "number"
      ? { top: userMargin, bottom: userMargin, left: userMargin, right: userMargin }
      : (userMargin ?? {})
    const resolveSide = (side: keyof MarginType): number => {
      const value = userSides[side]
      return typeof value === "number" ? value : defaults[side]
    }
    const finalMargin: MarginType = {
      top: resolveSide("top"),
      right: resolveSide("right"),
      bottom: resolveSide("bottom"),
      left: resolveSide("left"),
    }
    // Auto-reserve margin for the legend ONLY on sides the user
    // didn't set explicitly. A caller passing `margin={{ right: 30 }}`
    // (e.g. positioning their own external legend) shouldn't get
    // 110 px reserved out from under them. Sides the user left at
    // the default still get the legend's standard reservation.
    const sideSet = (side: keyof MarginType): boolean => typeof userSides[side] === "number"
    if (legend) {
      if (legendPosition === "right" && !sideSet("right") && finalMargin.right < 110) finalMargin.right = 110
      else if (legendPosition === "left" && !sideSet("left") && finalMargin.left < 110) finalMargin.left = 110
      else if (legendPosition === "top" && !sideSet("top") && finalMargin.top < 50) finalMargin.top = 50
      else if (legendPosition === "bottom" && !sideSet("bottom") && finalMargin.bottom < 80) finalMargin.bottom = 80
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
  legendSelectionHook: { isActive: boolean; predicate: (d: Datum) => boolean } | null
}

/**
 * Hook managing legend highlight/isolate interaction.
 * - "highlight": hover over a legend item produces a selection hook that
 *   `wrapStyleWithSelection` uses to dim non-matching data. The actual
 *   dim opacity resolves in this order: per-chart
 *   `selection.unselectedOpacity` → `theme.colors.selectionOpacity` →
 *   `DEFAULT_SELECTION_OPACITY` fallback.
 * - "isolate": click toggles category visibility; click all to reset
 */
export function useLegendInteraction(
  mode: LegendInteractionMode | undefined,
  colorBy: string | ((d: Datum) => string) | undefined,
  allCategories: string[]
): LegendInteractionState {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null)
  const [isolatedCategories, setIsolatedCategories] = useState<Set<string>>(new Set())
  const emptyIsolatedCategories = useMemo(() => new Set<string>(), [])

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
        predicate: (d: Datum) => {
          const val = colorField ? d[colorField] : typeof colorBy === "function" ? colorBy(d) : null
          return val === highlightedCategory
        }
      }
    }

    if (mode === "isolate" && isolatedCategories.size > 0) {
      return {
        isActive: true,
        predicate: (d: Datum) => {
          const val = colorField ? d[colorField] : typeof colorBy === "function" ? colorBy(d) : null
          return isolatedCategories.has(val)
        }
      }
    }

    return null
  }, [mode, colorBy, highlightedCategory, isolatedCategories])

  return {
    highlightedCategory: mode === "highlight" ? highlightedCategory : null,
    isolatedCategories: mode === "isolate" ? isolatedCategories : emptyIsolatedCategories,
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
  mobile: {
    width: 390, height: 300,
    showAxes: true, showGrid: false, enableHover: true,
    showLegend: false as boolean | undefined,
    showLabels: true as boolean | undefined,
    marginDefaults: { top: 28, bottom: 42, left: 44, right: 16 },
  },
}

interface ChartModeInput {
  width?: number
  height?: number
  showAxes?: boolean
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
  linkedHover?: LinkedHoverProp
  /** Optional mobile interaction policy surfaced through useChartMode for custom wrappers. */
  mobileInteraction?: MobileInteractionProp
  /** Optional mobile semantic contract surfaced through useChartMode for custom wrappers. */
  mobileSemantics?: MobileVisualizationContract
  /** Semantic responsive transformations resolved before mode defaults. */
  responsiveRules?: ResponsiveRule[]
}

/** Result of {@link useChartMode} — exported so declaration emit can name it. */
export interface ChartModeResult {
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
  /** True when mode is context or sparkline — the "hide interactive chrome" union. */
  compactMode: boolean
  /** Resolved touch-first behavior for mobile-capable wrappers. */
  mobileInteraction: ResolvedMobileInteractionConfig
  /** Mobile semantic contract after matching responsive rules are applied. */
  mobileSemantics: MobileVisualizationContract | undefined
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
  const baseMode = mode || "primary"
  const baseDefaults = MODE_DEFAULTS[baseMode]
  const baseWidth = (!mode || mode === "primary") && primaryDefaults?.width ? primaryDefaults.width : baseDefaults.width
  const baseHeight = (!mode || mode === "primary") && primaryDefaults?.height ? primaryDefaults.height : baseDefaults.height
  const responsiveBase = { ...userProps, mode } as ChartModeInput & Record<string, unknown>
  const responsiveProps = resolveResponsiveRules(responsiveBase, {
    width: userProps.width ?? baseWidth,
    height: userProps.height ?? baseHeight,
  }).props as ChartModeInput & { mode?: ChartMode }
  const resolvedMode = responsiveProps.mode || mode
  const m = MODE_DEFAULTS[resolvedMode || "primary"]
  const suppressLabels = resolvedMode === "context" || resolvedMode === "sparkline"
  const defaultWidth = (!resolvedMode || resolvedMode === "primary") && primaryDefaults?.width ? primaryDefaults.width : m.width
  const defaultHeight = (!resolvedMode || resolvedMode === "primary") && primaryDefaults?.height ? primaryDefaults.height : m.height
  return {
    width: responsiveProps.width ?? defaultWidth,
    height: responsiveProps.height ?? defaultHeight,
    showAxes: responsiveProps.showAxes ?? m.showAxes,
    showGrid: responsiveProps.showGrid ?? m.showGrid,
    enableHover: responsiveProps.enableHover ?? (responsiveProps.linkedHover ? true : m.enableHover),
    showLegend: responsiveProps.showLegend ?? m.showLegend,
    showLabels: responsiveProps.showLabels ?? m.showLabels,
    title: suppressLabels ? undefined : responsiveProps.title,
    description: responsiveProps.description,
    summary: responsiveProps.summary,
    accessibleTable: responsiveProps.accessibleTable,
    xLabel: suppressLabels ? undefined : responsiveProps.xLabel,
    yLabel: suppressLabels ? undefined : responsiveProps.yLabel,
    categoryLabel: suppressLabels ? undefined : responsiveProps.categoryLabel,
    valueLabel: suppressLabels ? undefined : responsiveProps.valueLabel,
    marginDefaults: adjustMarginsForCategoryTicks(m.marginDefaults, responsiveProps.showCategoryTicks, responsiveProps.orientation),
    compactMode: suppressLabels,
    mobileInteraction: resolveMobileInteraction(responsiveProps.mobileInteraction, {
      mode: resolvedMode,
      width: responsiveProps.width ?? defaultWidth,
      mobileSemantics: responsiveProps.mobileSemantics,
    }),
    mobileSemantics: responsiveProps.mobileSemantics,
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
