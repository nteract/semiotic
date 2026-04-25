"use client"
import type { Datum } from "./datumTypes"

import { useRef, useState, useCallback, useMemo } from "react"
import { createLegend } from "./legendUtils"
import { createColorScale, getColor, STREAMING_PALETTE } from "./colorUtils"
import type { Accessor } from "./types"
import { useThemeCategorical, type LegendPosition } from "./hooks"
import { useLinkedChartCategories } from "../../LinkedCharts"
import { useCategoryColors } from "../../CategoryColors"

/**
 * Hook that discovers categories from streamed (pushed) data and builds
 * a legend dynamically.
 *
 * When the `data` prop is provided (bounded mode), this hook is inert —
 * the legend is built by `useChartSetup` from the full dataset.
 *
 * When `data` is undefined (push API mode), this hook:
 * 1. Wraps push/pushMany to intercept incoming data
 * 2. Extracts category values via `colorBy`
 * 3. Builds a legend config when new categories are discovered
 *
 * Returns `wrapPush` / `wrapPushMany` callbacks to wrap the imperative handle,
 * plus a `streamingLegend` that should override the (empty) legend from useChartSetup.
 */
export function useStreamingLegend({
  isPushMode,
  colorBy,
  colorScheme,
  showLegend,
  legendPosition = "right",
}: {
  /** True when data prop is undefined (push API mode) */
  isPushMode: boolean
  /** The color-by accessor (may be derived from stackBy/groupBy/categoryAccessor) */
  colorBy: Accessor<string> | undefined
  /** Color scheme name or custom array — undefined lets useColorScale consult the theme */
  colorScheme: string | string[] | undefined
  /** Whether legend is requested */
  showLegend: boolean | undefined
  /** Legend position */
  legendPosition?: LegendPosition
}) {
  // Track discovered categories — ref to avoid re-render on every push
  const categoriesRef = useRef<Set<string>>(new Set())
  // Ordered list of categories (preserves discovery order for stable colors)
  const orderedRef = useRef<string[]>([])
  // State version — incremented only when a NEW category is discovered
  const [version, setVersion] = useState(0)
  const categoryColors = useCategoryColors()
  const themeCategorical = useThemeCategorical()

  const extractCategory = useCallback(
    (datum: Datum): string | null => {
      if (!colorBy) return null
      const val = typeof colorBy === "function" ? colorBy(datum) : datum[colorBy as string]
      return val != null ? String(val) : null
    },
    [colorBy]
  )

  const processData = useCallback(
    (items: Datum[]) => {
      if (!isPushMode || !colorBy) return
      let changed = false
      for (const d of items) {
        if (!d || typeof d !== "object") continue
        const cat = extractCategory(d)
        if (cat != null && !categoriesRef.current.has(cat)) {
          categoriesRef.current.add(cat)
          orderedRef.current.push(cat)
          changed = true
        }
      }
      if (changed) {
        setVersion(v => v + 1)
      }
    },
    [isPushMode, colorBy, extractCategory]
  )

  const setCategoryDomain = useCallback((categories: string[]) => {
    if (!isPushMode || !colorBy) return
    const next = Array.from(new Set(categories.map(String)))
    const current = orderedRef.current
    if (current.length === next.length && current.every((v, i) => v === next[i])) return
    categoriesRef.current = new Set(next)
    orderedRef.current = next
    setVersion(v => v + 1)
  }, [isPushMode, colorBy])

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
    (originalPushMany: (d: any[]) => void) => {
      return (data: any[]) => {
        processData(data)
        originalPushMany(data)
      }
    },
    [processData]
  )

  /** Reset discovered categories (called on clear) */
  const resetCategories = useCallback(() => {
    categoriesRef.current = new Set()
    orderedRef.current = []
    setVersion(v => v + 1)
  }, [])

  const linkedCategories = isPushMode && colorBy ? orderedRef.current : []
  useLinkedChartCategories(linkedCategories)

  // Build legend from discovered categories. Color resolution mirrors the
  // push-mode mark path: CategoryColorProvider/LinkedCharts colors win; if
  // there is no provider, the stream frame falls back to explicit palette,
  // then theme categorical, then STREAMING_PALETTE.
  const streamingLegend = useMemo(() => {
    if (!isPushMode || !colorBy || showLegend === false) return undefined
    // Use version to trigger recompute (consumed by useMemo dep)
    void version
    const categories = orderedRef.current
    if (categories.length === 0) return undefined

    // Resolution order matches `useColorScale` so the legend swatch and the
    // mark always agree: explicit array `colorScheme` → string scheme name
    // (e.g. "category10") → theme categorical → STREAMING_PALETTE. The string
    // case was previously ignored — `createColorScale` resolves it via d3
    // `scaleOrdinal` which understands the named schemes.
    const effectiveScheme: string | string[] = Array.isArray(colorScheme) && colorScheme.length > 0
      ? colorScheme
      : (typeof colorScheme === "string" && colorScheme.length > 0)
        ? colorScheme
        : (themeCategorical && themeCategorical.length > 0 ? themeCategorical : STREAMING_PALETTE)

    // Build synthetic data so createLegend can extract categories
    const syntheticColorBy = typeof colorBy === "string" ? colorBy : "__streamCat"
    const syntheticData = categories.map(cat => ({ [syntheticColorBy]: cat }))
    const fallbackScale = createColorScale(syntheticData, syntheticColorBy, effectiveScheme)
    const syntheticScale = (v: string) => categoryColors?.[v] || fallbackScale(v) || "#999"

    return createLegend({
      data: syntheticData,
      colorBy: syntheticColorBy,
      colorScale: syntheticScale,
      getColor,
    })
  }, [isPushMode, colorBy, showLegend, colorScheme, categoryColors, themeCategorical, version])

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
    categories: orderedRef.current,
    categoryDomainProps: isPushMode && colorBy
      ? {
        legendCategoryAccessor: colorBy,
        onCategoriesChange: setCategoryDomain,
      }
      : {},
    streamingLegend,
    streamingMarginAdjust,
  }
}
