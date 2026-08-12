"use client"
import type { Datum } from "./datumTypes"

import { useState, useCallback, useMemo } from "react"
import { createLegend } from "./legendUtils"
import {
  createColorScale,
  getColor,
  resolveExplicitColor,
  STREAMING_PALETTE
} from "./colorUtils"
import type { Accessor } from "./types"
import { useThemeCategorical, type LegendPosition } from "./hooks"
import {
  useLinkedChartCategories,
  useLinkedChartCategoryRegistryActive
} from "../../LinkedCharts"
import { useCategoryColors } from "../../CategoryColors"

const FUNCTION_COLOR_BY_DOMAIN = Symbol("streaming-function-color-domain")

/**
 * Low-level push-API category-discovery wrapper.
 *
 * Most HOCs do NOT need this hook anymore. `useChartSetup` already
 * synthesizes a push-mode legend from categories the StreamFrame emits
 * via `onCategoriesChange`, applies the same provider/scheme/theme/
 * STREAMING_PALETTE precedence the marks resolve through, and registers
 * those categories with the parent `LinkedCharts` via
 * `useChartLegendAndMargin` → `useLinkedChartCategories`. For HOCs that
 * just want a working push-mode legend, that is enough.
 *
 * This hook is kept as the escape hatch for HOCs that must intercept
 * the push call BEFORE the frame ingests it — typically aggregator HOCs
 * like `LikertChart` that re-aggregate streamed rows into a different
 * shape (level × count) before the frame sees them. `wrapPush` /
 * `wrapPushMany` give those charts a place to run their accumulator
 * code; the wrapped function then forwards to the original push.
 *
 * Returned `streamingLegend` and `streamingMarginAdjust` are vestigial
 * for these consumers — they're produced for backward compatibility,
 * but new code should rely on `setup.legend` / `setup.margin` from
 * `useChartSetup` instead.
 */
export function useStreamingLegend({
  isPushMode,
  colorBy,
  colorScheme,
  showLegend,
  legendPosition = "right",
  trackCategoryDomain = true,
  registerLinkedCategories = true
}: {
  /** True when data prop is undefined (push API mode) */
  isPushMode: boolean
  /** The color-by accessor (may be derived from stackBy/groupBy/categoryAccessor) */
  colorBy: Accessor<string> | undefined
  /** Color scheme name or custom array — undefined lets useColorScale consult the theme */
  colorScheme: string | string[] | Record<string, string> | undefined
  /** Whether legend is requested */
  showLegend: boolean | undefined
  /** Legend position */
  legendPosition?: LegendPosition
  /** Install frame-domain discovery; disable when no legend/linked consumer needs it. */
  trackCategoryDomain?: boolean
  /** Disable when the caller already registers the same domain through chart setup. */
  registerLinkedCategories?: boolean
}) {
  // State version — incremented only when a NEW category is discovered
  const [version, setVersion] = useState(0)
  const categoryColors = useCategoryColors()
  const themeCategorical = useThemeCategorical()
  const linkedCategoryRegistryActive = useLinkedChartCategoryRegistryActive()
  const shouldTrackCategoryDomain =
    isPushMode &&
    !!colorBy &&
    (trackCategoryDomain || linkedCategoryRegistryActive)
  // Parent components commonly recreate inline accessors. Keep the last
  // emitted domain visible across those identity-only changes; the frame still
  // receives the latest function and authoritatively replaces this domain if
  // its actual category semantics changed.
  const colorByDomainKey =
    typeof colorBy === "function" ? FUNCTION_COLOR_BY_DOMAIN : colorBy
  const domain = useMemo(
    () => ({
      lifecycle: { colorByDomainKey, isPushMode, shouldTrackCategoryDomain },
      categories: new Set<string>(),
      ordered: [] as string[]
    }),
    [colorByDomainKey, isPushMode, shouldTrackCategoryDomain]
  )

  const extractCategory = useCallback(
    (datum: Datum): string | null => {
      if (!colorBy) return null
      const val =
        typeof colorBy === "function"
          ? colorBy(datum)
          : datum[colorBy as string]
      return String(val)
    },
    [colorBy]
  )

  const processData = useCallback(
    (items: Datum[]) => {
      if (!shouldTrackCategoryDomain) return
      let changed = false
      for (const d of items) {
        if (!d || typeof d !== "object") continue
        const cat = extractCategory(d)
        if (cat != null && !domain.categories.has(cat)) {
          domain.categories.add(cat)
          domain.ordered.push(cat)
          changed = true
        }
      }
      if (changed) {
        setVersion((v) => v + 1)
      }
    },
    [domain, extractCategory, shouldTrackCategoryDomain]
  )

  const setCategoryDomain = useCallback(
    (categories: string[]) => {
      if (!shouldTrackCategoryDomain) return
      const next = Array.from(new Set(categories.map(String)))
      const current = domain.ordered
      if (
        current.length === next.length &&
        current.every((v, i) => v === next[i])
      )
        return
      domain.categories = new Set(next)
      domain.ordered = next
      setVersion((v) => v + 1)
    },
    [domain, shouldTrackCategoryDomain]
  )

  /** Wrap push to intercept data for category discovery */
  const wrapPush = useCallback(
    (originalPush: (d: Datum) => void) => {
      return (datum: Datum) => {
        processData([datum])
        originalPush(datum)
      }
    },
    [processData]
  )

  /** Wrap pushMany to intercept data for category discovery */
  const wrapPushMany = useCallback(
    (originalPushMany: (data: Datum[]) => void) => {
      return (data: Datum[]) => {
        processData(data)
        originalPushMany(data)
      }
    },
    [processData]
  )

  /** Reset discovered categories (called on clear) */
  const resetCategories = useCallback(() => {
    domain.categories = new Set()
    domain.ordered = []
    setVersion((v) => v + 1)
  }, [domain])

  const categorySnapshot = useMemo(() => {
    void version
    return shouldTrackCategoryDomain ? [...domain.ordered] : []
  }, [domain, shouldTrackCategoryDomain, version])
  const linkedCategories =
    registerLinkedCategories && isPushMode && colorBy ? categorySnapshot : []
  useLinkedChartCategories(linkedCategories)

  // Build legend from discovered categories. Color resolution mirrors the
  // push-mode mark path: CategoryColorProvider/LinkedCharts colors win; if
  // there is no provider, the stream frame falls back to explicit palette,
  // then theme categorical, then STREAMING_PALETTE.
  const streamingLegend = useMemo(() => {
    if (!isPushMode || !colorBy || showLegend === false) return undefined
    // Use version to trigger recompute (consumed by useMemo dep)
    void version
    const categories = domain.ordered
    if (categories.length === 0) return undefined

    // Resolution order matches `useColorScale` so the legend swatch and the
    // mark always agree: explicit array `colorScheme` → string scheme name
    // (e.g. "category10") → theme categorical → STREAMING_PALETTE. The string
    // case was previously ignored — `createColorScale` resolves it via d3
    // `scaleOrdinal` which understands the named schemes.
    const effectiveScheme: string | string[] =
      Array.isArray(colorScheme) && colorScheme.length > 0
        ? colorScheme
        : typeof colorScheme === "string" && colorScheme.length > 0
          ? colorScheme
          : themeCategorical && themeCategorical.length > 0
            ? themeCategorical
            : STREAMING_PALETTE

    // Build synthetic data so createLegend can extract categories
    const syntheticColorBy =
      typeof colorBy === "string" ? colorBy : "__streamCat"
    const syntheticData = categories.map((cat) => ({ [syntheticColorBy]: cat }))
    const fallbackScale = createColorScale(
      syntheticData,
      syntheticColorBy,
      effectiveScheme
    )
    const explicitColorMap =
      colorScheme &&
      typeof colorScheme === "object" &&
      !Array.isArray(colorScheme)
        ? colorScheme
        : undefined
    const syntheticScale = (v: string) =>
      (categoryColors ? resolveExplicitColor(categoryColors, v) : undefined) ??
      (explicitColorMap
        ? resolveExplicitColor(explicitColorMap, v)
        : undefined) ??
      fallbackScale(v) ??
      "#999"

    return createLegend({
      data: syntheticData,
      colorBy: syntheticColorBy,
      colorScale: syntheticScale,
      getColor
    })
  }, [
    isPushMode,
    colorBy,
    showLegend,
    colorScheme,
    categoryColors,
    themeCategorical,
    version,
    domain
  ])

  /** Margin adjustment needed for streaming legend */
  const streamingMarginAdjust = useMemo(() => {
    if (!streamingLegend) return undefined
    if (legendPosition === "right") return { right: 110 }
    if (legendPosition === "left") return { left: 110 }
    if (legendPosition === "top") return { top: 50 }
    if (legendPosition === "bottom") return { bottom: 80 }
    return { right: 110 }
  }, [streamingLegend, legendPosition])

  return {
    wrapPush,
    wrapPushMany,
    resetCategories,
    categories: categorySnapshot,
    categoryDomainProps: shouldTrackCategoryDomain
      ? {
          legendCategoryAccessor: colorBy,
          onCategoriesChange: setCategoryDomain
        }
      : {},
    streamingLegend,
    streamingMarginAdjust
  }
}
