import { useMemo, useCallback, useEffect, useState } from "react"
import {
  useLinkedChartCategories,
  useLinkedChartCategoryRegistryActive,
  useLinkedLegendSuppression
} from "../../LinkedCharts"
import { getColor } from "./colorUtils"
import { createLegend } from "./legendUtils"
import type { Accessor } from "./types"
import type { MarginType, PartialMargin } from "../../types/marginType"
import type {
  LegendItem,
  LegendLayout,
  LegendValue
} from "../../types/legendTypes"
import { composeLegendConfigs } from "../../types/legendTypes"
import {
  resolveAxisChromeGutter,
  resolveHorizontalLegendHeight,
  resolveLegendDistance,
  resolveSideLegendMargin,
  type AxisChromeInput
} from "../../legendLayout"
import type { Datum } from "./datumTypes"

/**
 * Distinct string-coerced `colorBy` values across `data`, in first-seen order.
 * Shared by chart setup hooks that need the category list for a color scale
 * or legend before any scale/legend object is built.
 */
export function distinctCategories(
  data: readonly Datum[],
  colorBy: Accessor<string | number> | undefined
): string[] {
  if (!colorBy) return []
  const vals = new Set<string>()
  for (const d of data) {
    const v = typeof colorBy === "function" ? colorBy(d) : d[colorBy]
    vals.add(String(v))
  }
  return Array.from(vals)
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
  additionalLegend,
  chartWidth,
  legendLayout,
  hasTitle = false,
  axisChrome
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
  /**
   * Axis chrome on the legend's side. A top/bottom legend is placed outside
   * this band, so the reserved margin has to include it or the legend lands
   * past the canvas edge.
   */
  axisChrome?: AxisChromeInput
}): {
  legend: LegendValue | undefined
  margin: MarginType
  legendPosition: LegendPosition
  hasAutomaticLegend: boolean
} {
  const linkedLegendActive = useLinkedLegendSuppression()
  const linkedCategoryRegistryActive = useLinkedChartCategoryRegistryActive()
  // Suppress child legend when LinkedCharts is handling it, unless explicitly overridden
  const shouldShowLegend =
    showLegend !== undefined
      ? showLegend
      : linkedLegendActive
        ? false
        : !!colorBy
  const shouldResolveCategories =
    !!colorBy && (shouldShowLegend || linkedCategoryRegistryActive)

  const legendCategories = useMemo(() => {
    if (!shouldResolveCategories) return []
    if (categories !== undefined) return categories
    return distinctCategories(data, colorBy)
  }, [categories, colorBy, data, shouldResolveCategories])
  useLinkedChartCategories(
    linkedCategoryRegistryActive && colorBy ? legendCategories : []
  )

  const automaticLegend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined
    const built = createLegend({
      data,
      colorBy,
      colorScale,
      getColor,
      categories: legendCategories
    })
    // Suppress empty legends — when a chart using the push API mounts with no
    // `data` yet and no explicit `categories`, createLegend returns a shell
    // with zero items. Returning it would reserve margin for a legend that
    // renders only a title bar ("neatline"), which is what a user sees as
    // empty reserved space. Treat zero-item legends as absent.
    const totalItems = built.legendGroups.reduce(
      (sum, g) => sum + g.items.length,
      0
    )
    if (totalItems === 0) return undefined
    return built
  }, [shouldShowLegend, colorBy, data, colorScale, legendCategories])

  const legend = useMemo(
    () => composeLegendConfigs(automaticLegend, additionalLegend),
    [automaticLegend, additionalLegend]
  )

  // Depend on the fields, not the object: callers pass an inline literal, so
  // keying the memo on its identity would recompute the margin every render.
  const { hasAxis, hasAxisLabel, rotatedTicks } = axisChrome ?? {}

  const margin = useMemo<MarginType>(() => {
    const userSides =
      typeof userMargin === "number"
        ? {
            top: userMargin,
            bottom: userMargin,
            left: userMargin,
            right: userMargin
          }
        : (userMargin ?? {})
    const resolveSide = (side: keyof MarginType): number => {
      const value = userSides[side]
      return typeof value === "number" ? value : defaults[side]
    }
    const finalMargin: MarginType = {
      top: resolveSide("top"),
      right: resolveSide("right"),
      bottom: resolveSide("bottom"),
      left: resolveSide("left")
    }
    // Caller-supplied numeric sides are minimum plot gutters. Legend
    // reservation composes with that baseline on every side instead of making
    // callers choose between their own padding and Semiotic's measured legend
    // requirement. `"auto"`, null, and omitted sides still begin at the
    // chart-mode default.
    if (legend) {
      const sideLegendMargin = resolveSideLegendMargin(legend, legendLayout)
      const plotWidth = Math.max(
        1,
        (chartWidth ?? 600) - finalMargin.left - finalMargin.right
      )
      // The axis gutter is part of the reservation, not just the placement:
      // the legend now sits below the tick labels, so the band has to hold
      // both or the legend is pushed off the canvas.
      //
      // `axisChrome` describes the *bottom* axis, so only a bottom legend
      // reserves the measured band. A top axis is opt-in, so a top legend
      // shifts only for an explicit `legendLayout.axisGutter` — passing
      // `undefined` here keeps that override while dropping the measurement,
      // exactly matching the placement split in `renderLegendFromConfig` and
      // the server's `bottomRequirement`. Reserving it for both would push the
      // plot down by 22–46px that nothing draws into.
      //
      // When the caller did not describe its axis, assume the widest ordinary
      // band rather than none. Placement always knows the real chrome (the SVG
      // overlay measures it), so an under-reservation does not shrink the
      // gutter — it makes the renderer clamp the legend back *up* into the
      // axis labels, which is the exact overlap this gutter exists to prevent.
      // The 80px bottom-legend floor already absorbs this whenever the legend
      // plus its distance stays under it — the common single-row case — so
      // those charts keep their current margins. Only a legend that already
      // exceeds the floor (wrapped onto extra rows, or a large
      // `legendDistance`) grows, and there an axis-less chart such as
      // pie/donut over-reserves slightly rather than colliding. Charts that
      // pass `axisChrome` are exact either way.
      const bottomAxisChrome: AxisChromeInput =
        hasAxis === undefined
          ? { hasAxis: true, hasAxisLabel: true }
          : { hasAxis, hasAxisLabel, rotatedTicks }
      const horizontalLegendMargin =
        resolveHorizontalLegendHeight(legend, plotWidth, legendLayout) +
        resolveLegendDistance(legend) +
        resolveAxisChromeGutter(
          legendPosition === "bottom" ? bottomAxisChrome : undefined,
          legendLayout
        ) +
        (legendPosition === "top" && hasTitle ? 24 : 0)
      if (legendPosition === "right" && finalMargin.right < sideLegendMargin)
        finalMargin.right = sideLegendMargin
      else if (legendPosition === "left" && finalMargin.left < sideLegendMargin)
        finalMargin.left = sideLegendMargin
      else if (legendPosition === "top")
        finalMargin.top = Math.max(finalMargin.top, 50, horizontalLegendMargin)
      else if (legendPosition === "bottom")
        finalMargin.bottom = Math.max(
          finalMargin.bottom,
          80,
          horizontalLegendMargin
        )
    }
    return finalMargin
  }, [
    defaults,
    userMargin,
    legend,
    legendPosition,
    chartWidth,
    legendLayout,
    hasTitle,
    hasAxis,
    hasAxisLabel,
    rotatedTicks
  ])

  return {
    legend,
    margin,
    legendPosition,
    hasAutomaticLegend: automaticLegend !== undefined
  }
}

// ── Legend interaction ──────────────────────────────────────────────────

export type LegendInteractionMode = "highlight" | "isolate" | "none"

export interface LegendInteractionState {
  highlightedCategory: string | null
  isolatedCategories: Set<string>
  onLegendHover: (item: LegendItem | null) => void
  onLegendClick: (item: LegendItem) => void
  /** Selection predicate that dims non-matching data — use with wrapStyleWithSelection */
  legendSelectionHook: {
    isActive: boolean
    predicate: (d: Datum) => boolean
  } | null
}

function legendItemRange(item: LegendItem): [number, number] | null {
  const range = item.valueRange
  return Array.isArray(range) &&
    range.length === 2 &&
    typeof range[0] === "number" &&
    typeof range[1] === "number"
    ? [range[0], range[1]]
    : null
}

function legendItemKey(item: LegendItem, range: [number, number]): string {
  return typeof item.interactionKey === "string"
    ? item.interactionKey
    : `${range[0]}:${range[1]}`
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
  allCategories: string[],
  enabled = true,
  requireInferredItem = false
): LegendInteractionState {
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(
    null
  )
  const [isolatedCategories, setIsolatedCategories] = useState<Set<string>>(
    new Set()
  )
  const emptyIsolatedCategories = useMemo(() => new Set<string>(), [])
  const categorySet = useMemo(() => new Set(allCategories), [allCategories])
  const reconciledHighlightedCategory =
    highlightedCategory != null && categorySet.has(highlightedCategory)
      ? highlightedCategory
      : null
  const reconciledIsolatedCategories = useMemo(() => {
    if (isolatedCategories.size === 0) return isolatedCategories
    const next = new Set(
      Array.from(isolatedCategories).filter((category) =>
        categorySet.has(category)
      )
    )
    if (next.size === 0 || next.size === categorySet.size)
      return emptyIsolatedCategories
    return next.size === isolatedCategories.size ? isolatedCategories : next
  }, [categorySet, emptyIsolatedCategories, isolatedCategories])

  useEffect(() => {
    if (!enabled || !colorBy || !mode || mode === "none") {
      setHighlightedCategory(null)
      setIsolatedCategories((current) =>
        current.size === 0 ? current : new Set()
      )
    }
  }, [colorBy, enabled, mode])

  useEffect(() => {
    setHighlightedCategory((current) =>
      current != null && !categorySet.has(current) ? null : current
    )
    setIsolatedCategories((current) => {
      if (current.size === 0) return current
      const next = new Set(
        Array.from(current).filter((category) => categorySet.has(category))
      )
      if (next.size === 0 || next.size === categorySet.size) return new Set()
      return next.size === current.size ? current : next
    })
  }, [categorySet])

  const onLegendHover = useCallback(
    (item: LegendItem | null) => {
      if (!enabled || mode !== "highlight") return
      setHighlightedCategory(
        item &&
          categorySet.has(item.label) &&
          (!requireInferredItem || item.__semioticCategory === true)
          ? item.label
          : null
      )
    },
    [categorySet, enabled, mode, requireInferredItem]
  )

  const onLegendClick = useCallback(
    (item: LegendItem) => {
      if (
        !enabled ||
        mode !== "isolate" ||
        !categorySet.has(item.label) ||
        (requireInferredItem && item.__semioticCategory !== true)
      )
        return
      setIsolatedCategories((prev) => {
        const next = new Set(
          Array.from(prev).filter((category) => categorySet.has(category))
        )
        if (next.has(item.label)) {
          next.delete(item.label)
        } else {
          next.add(item.label)
        }
        // If all categories selected, reset to show all (Carbon behavior)
        if (next.size === categorySet.size) {
          return new Set()
        }
        return next
      })
    },
    [categorySet, enabled, mode, requireInferredItem]
  )

  const legendSelectionHook = useMemo(() => {
    if (!enabled || !mode || mode === "none" || !colorBy) return null

    const category = (d: Datum): string => {
      const raw = typeof colorBy === "function" ? colorBy(d) : d[colorBy]
      return typeof raw === "string" ? raw : String(raw)
    }

    if (mode === "highlight" && reconciledHighlightedCategory != null) {
      return {
        isActive: true,
        // Legend labels are String(v)-coerced, so numeric and boolean category
        // fields must follow the same path when interaction predicates run.
        predicate: (d: Datum) => category(d) === reconciledHighlightedCategory
      }
    }

    if (mode === "isolate" && reconciledIsolatedCategories.size > 0) {
      return {
        isActive: true,
        predicate: (d: Datum) => reconciledIsolatedCategories.has(category(d))
      }
    }

    return null
  }, [
    colorBy,
    enabled,
    mode,
    reconciledHighlightedCategory,
    reconciledIsolatedCategories
  ])

  return {
    highlightedCategory:
      enabled && mode === "highlight" ? reconciledHighlightedCategory : null,
    isolatedCategories:
      enabled && mode === "isolate"
        ? reconciledIsolatedCategories
        : emptyIsolatedCategories,
    onLegendHover,
    onLegendClick,
    legendSelectionHook
  }
}

/**
 * Continuous counterpart to `useLegendInteraction`. Gradient legends expose a
 * small set of keyboard/pointer-addressable ranges; highlight and isolate then
 * apply those ranges to the chart's numeric value accessor.
 */
export function useGradientLegendInteraction(
  mode: LegendInteractionMode | undefined,
  valueAccessor: (d: Datum) => number,
  domain: [number, number],
  binCount = 5
): LegendInteractionState {
  const [domainStart, domainEnd] = domain
  const [highlighted, setHighlighted] = useState<{
    key: string
    range: [number, number]
  } | null>(null)
  const [isolatedRanges, setIsolatedRanges] = useState<
    Map<string, [number, number]>
  >(new Map())
  const emptyIsolatedCategories = useMemo(() => new Set<string>(), [])

  useEffect(() => {
    setHighlighted(null)
    setIsolatedRanges(new Map())
  }, [domainStart, domainEnd, binCount, mode])

  const onLegendHover = useCallback(
    (item: LegendItem | null) => {
      if (mode !== "highlight" || !item) {
        if (mode === "highlight") setHighlighted(null)
        return
      }
      const range = legendItemRange(item)
      if (range) setHighlighted({ key: legendItemKey(item, range), range })
    },
    [mode]
  )

  const onLegendClick = useCallback(
    (item: LegendItem) => {
      if (mode !== "isolate") return
      const range = legendItemRange(item)
      if (!range) return
      setIsolatedRanges((previous) => {
        const next = new Map(previous)
        const key = legendItemKey(item, range)
        if (next.has(key)) next.delete(key)
        else next.set(key, range)
        return next.size === binCount ? new Map() : next
      })
    },
    [binCount, mode]
  )

  const legendSelectionHook = useMemo(() => {
    const ranges =
      mode === "highlight" && highlighted
        ? [highlighted.range]
        : mode === "isolate"
          ? [...isolatedRanges.values()]
          : []
    if (ranges.length === 0) return null
    return {
      isActive: true,
      predicate: (datum: Datum) => {
        const value = valueAccessor(datum)
        return (
          Number.isFinite(value) &&
          ranges.some(
            ([start, end]) =>
              value >= Math.min(start, end) && value <= Math.max(start, end)
          )
        )
      }
    }
  }, [highlighted, isolatedRanges, mode, valueAccessor])

  return {
    highlightedCategory:
      mode === "highlight" ? (highlighted?.key ?? null) : null,
    isolatedCategories:
      mode === "isolate"
        ? new Set(isolatedRanges.keys())
        : emptyIsolatedCategories,
    onLegendHover,
    onLegendClick,
    legendSelectionHook
  }
}
