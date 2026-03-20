"use client"

import { useMemo } from "react"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useLegendInteraction, DEFAULT_COLOR } from "./hooks"
import type { LegendInteractionMode, LegendPosition } from "./hooks"
import type { Accessor, SelectionConfig, LinkedHoverProp } from "./types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import type { MarginType } from "../../types/generalTypes"
import type { SelectionHookResult } from "./selectionUtils"
import { renderEmptyState, renderLoadingState } from "./withChartWrapper"
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
  data: Array<Record<string, any>>
  /** The original data prop (may be undefined) — used for empty-state check */
  rawData: unknown[] | undefined
  /** The color-by accessor (may be an "actual" colorBy derived from stackBy/groupBy/categoryAccessor) */
  colorBy: Accessor<string> | undefined
  /** Color scheme name or custom array */
  colorScheme: string | string[]
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
  userMargin: MarginType | undefined
  /** Mode-resolved margin defaults */
  marginDefaults: { top: number; bottom: number; left: number; right: number }
  /** Loading state */
  loading: boolean | undefined
  /** Empty content override */
  emptyContent?: ReactNode
  /** Resolved width from useChartMode */
  width: number
  /** Resolved height from useChartMode */
  height: number
}

/**
 * Output from useChartSetup.
 */
export interface ChartSetupResult {
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
  customHoverBehavior: (d: Record<string, any> | null) => void
  /** Custom click behavior callback for the frame */
  customClickBehavior: (d: Record<string, any> | null) => void
  /** Legend config (or undefined if no legend) */
  legend: ReturnType<typeof useChartLegendAndMargin>["legend"]
  /** Computed margin with legend-aware adjustments */
  margin: { top: number; bottom: number; left: number; right: number }
  /** Resolved legend position */
  legendPosition: LegendPosition
  /** If non-null, the HOC should return this element (loading or empty state) */
  earlyReturn: ReactElement | null
  /** Props to spread into the stream frame for legend behavior */
  legendBehaviorProps: Record<string, any>
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
    loading,
    emptyContent,
    width,
    height,
  } = input

  // ── Selection hooks (always called) ────────────────────────────────────
  const { activeSelectionHook, customHoverBehavior, customClickBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields,
    unwrapData,
    onObservation,
    chartType,
    chartId,
  })

  // ── Color scale ────────────────────────────────────────────────────────
  const colorScale = useColorScale(data, colorBy, colorScheme)

  // ── Category extraction ────────────────────────────────────────────────
  const allCategories = useMemo(() => {
    if (!colorBy) return []
    const vals = new Set<string>()
    for (const d of data as Record<string, any>[]) {
      const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [data, colorBy])

  // ── Legend interaction ─────────────────────────────────────────────────
  const legendState = useLegendInteraction(legendInteraction, colorBy, allCategories)

  // ── Merge legend selection with cross-chart selection ──────────────────
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  // ── Legend & margin ────────────────────────────────────────────────────
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data,
    colorBy,
    colorScale,
    showLegend,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: marginDefaults,
  })

  // ── Legend behavior props (to spread into frame) ───────────────────────
  const legendBehaviorProps = useMemo(() => {
    const props: Record<string, any> = {}
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
    return props
  }, [legend, legendPosition, legendInteraction, legendState.onLegendHover, legendState.onLegendClick, legendState.highlightedCategory, legendState.isolatedCategories])

  // ── Loading / empty state (computed after all hooks) ───────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = loadingEl ? null : renderEmptyState(rawData, width, height, emptyContent)
  const earlyReturn = loadingEl || emptyEl || null

  return {
    colorScale,
    allCategories,
    legendState,
    effectiveSelectionHook,
    activeSelectionHook,
    customHoverBehavior,
    customClickBehavior,
    legend,
    margin,
    legendPosition,
    earlyReturn,
    legendBehaviorProps,
  }
}

export { DEFAULT_COLOR }
