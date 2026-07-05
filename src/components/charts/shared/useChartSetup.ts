/**
 * useChartSetup — shared setup pipeline for all HOC charts.
 *
 * Consolidates: color scale creation, category extraction, legend interaction,
 * selection merging (linkedHover + selection), margin computation (with legend
 * space), loading/empty guards, and observation wiring.
 *
 * Every HOC calls this after useChartMode and before chart-specific logic.
 * Returns earlyReturn (loading/empty state) or the full setup result.
 *
 * Dependencies:
 *   hooks.ts          — useColorScale, useChartSelection, useChartLegendAndMargin
 *   selectionUtils.ts — SelectionHookResult type
 *   withChartWrapper   — renderEmptyState, renderLoadingState
 *
 * Consumed by: all HOC charts (BarChart, LineChart, Scatterplot, etc.)
 */
"use client"
import type { Datum } from "./datumTypes"

import { useCallback, useMemo, useState } from "react"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useLegendInteraction, useThemeCategorical, DEFAULT_COLOR, getCrosshairProps, resolveMobileInteraction } from "./hooks"
import type { LegendInteractionMode, LegendPosition } from "./hooks"
import { useCategoryColors } from "../../CategoryColors"
import { createColorScale, STREAMING_PALETTE } from "./colorUtils"
import type {
  Accessor,
  SelectionConfig,
  LinkedHoverProp,
  HoverHighlightMode,
  MobileInteractionProp,
  ResolvedMobileInteractionConfig,
} from "./types"
import type { MobileVisualizationContract } from "./auditMobileVisualization"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { PartialMargin } from "../../types/marginType"
import type { SelectionHookResult } from "./selectionUtils"
import { useResolvedSelection } from "./useResolvedSelection"
import { renderEmptyState, renderLoadingState } from "./withChartWrapper"
import { filterSparseArray } from "./sparseArray"
import type { ReactElement, ReactNode } from "react"

/**
 * Input parameters for useChartSetup.
 *
 * This hook consolidates the color scale, category extraction, legend interaction,
 * effective selection merge, legend + margin computation, loading/empty guards,
 * and legend behavior props that every HOC chart repeats.
 */
export interface ChartSetupInput {
  /** The data array used for color scale and category extraction */
  data: Array<Datum>
  /** The original data prop (may be undefined) — used for empty-state check */
  rawData: unknown[] | undefined
  /** The color-by accessor (may be an "actual" colorBy derived from stackBy/groupBy/categoryAccessor) */
  colorBy: Accessor<string> | undefined
  /** Color scheme name or custom array — undefined lets useColorScale consult the theme */
  colorScheme: string | string[] | Record<string, string> | undefined
  /** Legend interaction mode */
  legendInteraction: LegendInteractionMode | undefined
  /** Legend position override */
  legendPosition?: LegendPosition
  /** Selection config from the HOC */
  selection: SelectionConfig | undefined
  /** Linked hover config from the HOC */
  linkedHover: LinkedHoverProp | undefined
  /** Fallback fields for selection/hover — typically derived from colorBy or categoryAccessor */
  fallbackFields: string[]
  /** Whether to unwrap data in hover callback (ordinal/network = true, XY = false) */
  unwrapData?: boolean
  /** onObservation callback */
  onObservation: OnObservationCallback | undefined
  /** Chart type name (e.g. "BarChart") */
  chartType: string
  /** Chart ID for observation events */
  chartId: string | undefined
  /** Show legend override */
  showLegend: boolean | undefined
  /** User-provided margin */
  userMargin: PartialMargin | undefined
  /** Mode-resolved margin defaults */
  marginDefaults: { top: number; bottom: number; left: number; right: number }
  /** onClick callback */
  onClick?: (datum: any, event: { x: number; y: number }) => void
  /** Dim non-hovered series on data mark hover */
  hoverHighlight?: HoverHighlightMode
  /** Touch-first interaction policy for phone-sized chart slots */
  mobileInteraction?: MobileInteractionProp
  /** Mobile semantic contract for generated/audited/mobile-aware chart behavior */
  mobileSemantics?: MobileVisualizationContract
  /** Loading state */
  loading: boolean | undefined
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: ReactNode | false
  /** Empty content override */
  emptyContent?: ReactNode | false
  /** Resolved width from useChartMode */
  width: number
  /** Resolved height from useChartMode */
  height: number
}

/**
 * Output from useChartSetup.
 */
export interface ChartSetupResult {
  /**
   * The input `data` array with `null`/non-object entries removed. Use
   * this in place of the raw `data` prop when forwarding to the frame
   * or doing any per-row iteration in the HOC body — it is identity-
   * equal to the original prop when nothing was dropped, so consumer
   * memo cache hits are preserved in the common case.
   */
  data: Array<Datum>
  /** Color scale function, or undefined if no colorBy */
  colorScale: ((v: string) => string) | undefined
  /** All unique category values from colorBy */
  allCategories: string[]
  /** Legend interaction state (onLegendHover, onLegendClick, highlighted, isolated) */
  legendState: ReturnType<typeof useLegendInteraction>
  /** The effective selection hook — legend selection takes priority over cross-chart selection */
  effectiveSelectionHook: SelectionHookResult | null
  /** The active cross-chart selection hook (before legend merge) */
  activeSelectionHook: SelectionHookResult | null
  /** Custom hover behavior callback for the frame */
  customHoverBehavior: (d: Datum | null) => void
  /** Custom click behavior callback for the frame */
  customClickBehavior: (d: Datum | null) => void
  /** Resolved touch-first policy for chart wrappers and stream-prop helpers */
  mobileInteraction: ResolvedMobileInteractionConfig
  /** Legend config (or undefined if no legend) */
  legend: ReturnType<typeof useChartLegendAndMargin>["legend"]
  /** Computed margin with legend-aware adjustments */
  margin: { top: number; bottom: number; left: number; right: number }
  /** Resolved legend position */
  legendPosition: LegendPosition
  /** If non-null, the HOC should return this element (loading or empty state) */
  earlyReturn: ReactElement | null
  /** Props to spread into the stream frame for legend behavior */
  legendBehaviorProps: Datum
  /** Crosshair props to spread into StreamXYFrame when linkedHover mode is "x-position" */
  crosshairProps: { linkedCrosshairName: string; linkedCrosshairSourceId: string } | undefined
  /**
   * Selection config merged with theme-level defaults. HOCs should pass this
   * to `wrapStyleWithSelection` instead of the raw `selection` prop so that
   * the current theme's `colors.selectionOpacity` becomes the effective
   * unselected-opacity fallback. Per-chart `selection.unselectedOpacity`
   * still takes priority over the theme value.
   */
  resolvedSelection: SelectionConfig | undefined
}

/**
 * Hook that consolidates the shared boilerplate across all HOC charts:
 *
 * 1. Loading / empty state guards
 * 2. useChartSelection (selection + linked hover)
 * 3. useColorScale
 * 4. allCategories extraction via useMemo
 * 5. useLegendInteraction
 * 6. effectiveSelectionHook merge (legend selection > cross-chart selection)
 * 7. useChartLegendAndMargin
 * 8. legendBehaviorProps for the stream frame
 *
 * Hooks are always called (no conditional returns before hooks) to satisfy React's
 * rules of hooks. The `earlyReturn` field signals that the HOC should return early.
 */
export function useChartSetup(input: ChartSetupInput): ChartSetupResult {
  const {
    data,
    rawData,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields,
    unwrapData = false,
    onObservation,
    chartType,
    chartId,
    showLegend,
    userMargin,
    marginDefaults,
    onClick,
    hoverHighlight,
    mobileInteraction,
    mobileSemantics,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
  } = input
  const isPushMode = rawData === undefined

  // Identity-preserving sparse-array filter. CSV-parsed and
  // lookup-failed inputs commonly hand us `[null, validRow, undefined]`
  // through public array props. Every iteration below — color extraction,
  // category discovery, legend domain, selection match, scene builder —
  // dereferences `d[field]` without null-checks. Filtering once at the
  // setup boundary so all downstream consumers see clean data is the
  // single load-bearing fix; HOCs forward `setup.data` (or, for shapes
  // not routed through setup, the equivalent helper directly) into the
  // StreamFrame so the frame side is also clean. `filterSparseArray`
  // returns the original reference when nothing is dropped, preserving
  // memo cache hits in the (overwhelmingly common) clean-input case.
  //
  // Pattern recommendation for HOCs: when the HOC has no logic that
  // touches `data` before `useChartSetup` runs (no early
  // `warnMissingField`, no statistical pre-processing, no extent scan
  // for chart-specific axes), pass the raw `data` prop in and read
  // `setup.data` for everything downstream. A redundant
  // `useMemo(() => filterSparseArray(data), [data])` in the HOC body
  // plus the filter inside this hook means two passes per data update
  // — both O(n) reads, no allocations in the clean case, but worth
  // skipping when the HOC doesn't need a pre-setup safe array.
  const safeData = useMemo(() => filterSparseArray(data), [data])
  const [frameCategories, setFrameCategories] = useState<string[]>([])

  const onCategoriesChange = useCallback((categories: string[]) => {
    setFrameCategories(prev => {
      if (prev.length === categories.length && prev.every((v, i) => v === categories[i])) return prev
      return categories
    })
  }, [])

  // ── Selection hooks (always called) ────────────────────────────────────
  const colorByField = typeof input.colorBy === "string" ? input.colorBy : undefined
  const resolvedMobileInteraction = useMemo(
    () => resolveMobileInteraction(mobileInteraction, { width, mobileSemantics }),
    [mobileInteraction, width, mobileSemantics],
  )
  const { activeSelectionHook, hoverSelectionHook, customHoverBehavior, customClickBehavior, crosshairSourceId } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields,
    unwrapData,
    onObservation,
    chartType,
    chartId,
    onClick,
    hoverHighlight,
    colorByField,
    mobileInteraction: resolvedMobileInteraction,
  })

  // ── Linked crosshair (x-position mode) ────────────────────────────────
  const crosshairProps = getCrosshairProps(linkedHover, crosshairSourceId)

  // ── Color scale ────────────────────────────────────────────────────────
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // ── Category extraction ────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of safeData as Datum[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeData, colorBy])

  const activeCategories = useMemo(() => {
    if (isPushMode && frameCategories.length > 0) return frameCategories
    return allCategories
  }, [isPushMode, frameCategories, allCategories])

  // ── Legend interaction ─────────────────────────────────────────────────
  const legendState = useLegendInteraction(legendInteraction, colorBy, activeCategories)

  // ── Merge hover highlight > legend selection > cross-chart selection ───
  const effectiveSelectionHook = useMemo(() => {
    if (hoverSelectionHook) return hoverSelectionHook
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [hoverSelectionHook, legendState.legendSelectionHook, activeSelectionHook])

  // ── Merge theme's selection opacity into the selection config ──────────
  // Per-chart `selection.unselectedOpacity` wins; theme supplies the default.
  const resolvedSelection = useResolvedSelection(selection)

  // ── Push-mode legend color synchronization ────────────────────────────
  // `useColorScale` returns `undefined` in push mode without a
  // CategoryColorProvider — `data` is empty so there's nothing to build
  // an ordinal scale over. `createLegend` then falls back to
  // `STREAMING_PALETTE` for swatches, which mismatches the frame's mark
  // colors when the consumer set an explicit `colorScheme` (or relies on
  // the theme categorical palette). Synthesize a legend-only scale from
  // the discovered categories using the same precedence as `useColorScale`
  // (provider → explicit scheme → theme → STREAMING_PALETTE) so legend
  // swatches and rendered marks agree even before any data is pushed.
  const themeCategorical = useThemeCategorical()
  const categoryColors = useCategoryColors()
  const legendColorScale = useMemo<((v: string) => string) | undefined>(() => {
    if (colorScale) return colorScale
    if (!colorBy || activeCategories.length === 0) return undefined
    const effectiveScheme: string | string[] = Array.isArray(colorScheme) && colorScheme.length > 0
      ? colorScheme
      : (typeof colorScheme === "string" && colorScheme.length > 0)
        ? colorScheme
        : (themeCategorical && themeCategorical.length > 0 ? themeCategorical : STREAMING_PALETTE)
    const syntheticField = "__streamCat"
    const syntheticData = activeCategories.map(cat => ({ [syntheticField]: cat }))
    const fallbackScale = createColorScale(syntheticData, syntheticField, effectiveScheme)
    return (v: string) => categoryColors?.[v] || fallbackScale(v) || "#999"
  }, [colorScale, colorBy, activeCategories, colorScheme, themeCategorical, categoryColors])

  // ── Legend & margin ────────────────────────────────────────────────────
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale: legendColorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: marginDefaults,
    categories: activeCategories,
  })

  // ── Legend behavior props (to spread into frame) ───────────────────────
  const legendBehaviorProps = useMemo(() => {
    const props: Record<string, unknown> = {}
    if (legend) {
      props.legend = legend
      props.legendPosition = legendPosition
    }
    if (legendInteraction && legendInteraction !== "none") {
      props.legendHoverBehavior = legendState.onLegendHover
      props.legendClickBehavior = legendState.onLegendClick
      props.legendHighlightedCategory = legendState.highlightedCategory
      props.legendIsolatedCategories = legendState.isolatedCategories
    }
    if (isPushMode && colorBy) {
      props.legendCategoryAccessor = colorBy
      props.onCategoriesChange = onCategoriesChange
    }
    return props
  }, [legend, legendPosition, legendInteraction, legendState.onLegendHover, legendState.onLegendClick, legendState.highlightedCategory, legendState.isolatedCategories, isPushMode, colorBy, onCategoriesChange])

  // ── Loading / empty state (computed after all hooks) ───────────────────
  // Empty-state UI is driven by `rawData` (the user's original prop) so
  // push mode (`rawData === undefined`) keeps its no-empty-state
  // semantics, and post-processing emptiness — e.g. LikertChart's
  // levels-driven aggregator producing zero output rows from real input
  // — defers to the chart's own validation/ChartError path. We still
  // need to catch sparse-but-nonempty input like `[null, undefined]`
  // that fails to render anything; filter `rawData` itself for the
  // emptiness check so the user's array is the source of truth.
  const emptyStateInput = Array.isArray(rawData) ? filterSparseArray(rawData) : rawData
  const loadingEl = renderLoadingState(loading, width, height, loadingContent)
  const emptyEl = loadingEl ? null : renderEmptyState(emptyStateInput, width, height, emptyContent)
  const earlyReturn = loadingEl || emptyEl || null

  return {
    data: safeData,
    colorScale,
    allCategories: activeCategories,
    legendState,
    effectiveSelectionHook,
    activeSelectionHook,
    customHoverBehavior,
    customClickBehavior,
    mobileInteraction: resolvedMobileInteraction,
    legend,
    margin,
    legendPosition,
    earlyReturn,
    legendBehaviorProps,
    crosshairProps,
    resolvedSelection,
  }
}

export { DEFAULT_COLOR }
