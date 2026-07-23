import { useMemo, useCallback, useState } from "react"
import { useLinkedChartCategories, useLinkedChartCategoryRegistryActive, useLinkedLegendSuppression } from "../../LinkedCharts"
import { getColor } from "./colorUtils"
import { createLegend } from "./legendUtils"
import type { Accessor } from "./types"
import type { MarginType, PartialMargin } from "../../types/marginType"
import type { LegendLayout, LegendValue } from "../../types/legendTypes"
import { composeLegendConfigs } from "../../types/legendTypes"
import {
  resolveHorizontalLegendHeight,
  resolveLegendDistance,
  resolveSideLegendMargin,
} from "../../legendLayout"
import type { Datum } from "./datumTypes"

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
  additionalLegend,
  chartWidth,
  legendLayout,
  hasTitle = false,
}: {
  data: Array<Datum>
  colorBy: Accessor<string> | undefined
  colorScale: ((v: string) => string) | undefined
  showLegend: boolean | undefined
  legendPosition?: LegendPosition
  userMargin: PartialMargin | undefined
  defaults?: MarginType
  categories?: string[]
  /** Caller legend composed after the chart's inferred categorical groups. */
  additionalLegend?: LegendValue
  /** Total chart width, used to estimate wrapping for top/bottom legends. */
  chartWidth?: number
  /** Legend metrics shared with the renderer. */
  legendLayout?: LegendLayout
  /** Reserve the chart-title band above a top legend. */
  hasTitle?: boolean
}): {
  legend: LegendValue | undefined
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

  const automaticLegend = useMemo(() => {
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

  const legend = useMemo(
    () => composeLegendConfigs(automaticLegend, additionalLegend),
    [automaticLegend, additionalLegend],
  )

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
    // Numeric margin sides are authoritative in 3.x. Only omitted,
    // `"auto"`, null, or undefined sides participate in compatibility
    // auto-reservation, sized from the legend plus legendDistance.
    const sideSet = (side: keyof MarginType): boolean => typeof userSides[side] === "number"
    if (legend) {
      const sideLegendMargin = resolveSideLegendMargin(legend, legendLayout)
      const plotWidth = Math.max(
        1,
        (chartWidth ?? 600) - finalMargin.left - finalMargin.right,
      )
      const horizontalLegendMargin =
        resolveHorizontalLegendHeight(legend, plotWidth, legendLayout) +
        resolveLegendDistance(legend) +
        (legendPosition === "top" && hasTitle ? 24 : 0)
      if (legendPosition === "right" && !sideSet("right") && finalMargin.right < sideLegendMargin) finalMargin.right = sideLegendMargin
      else if (legendPosition === "left" && !sideSet("left") && finalMargin.left < sideLegendMargin) finalMargin.left = sideLegendMargin
      else if (legendPosition === "top" && !sideSet("top")) finalMargin.top = Math.max(finalMargin.top, 50, horizontalLegendMargin)
      else if (legendPosition === "bottom" && !sideSet("bottom")) finalMargin.bottom = Math.max(finalMargin.bottom, 80, horizontalLegendMargin)
    }
    return finalMargin
  }, [defaults, userMargin, legend, legendPosition, chartWidth, legendLayout, hasTitle])

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
