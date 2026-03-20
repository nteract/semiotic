"use client"

import { useRef, useState, useCallback, useMemo } from "react"
import { createLegend } from "./legendUtils"
import { getColor, STREAMING_PALETTE } from "./colorUtils"
import type { Accessor } from "./types"
import type { LegendPosition } from "./hooks"

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
  /** Color scheme name or custom array */
  colorScheme: string | string[]
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

  const extractCategory = useCallback(
    (datum: Record<string, any>): string | null => {
      if (!colorBy) return null
      const val = typeof colorBy === "function" ? colorBy(datum) : datum[colorBy as string]
      return val != null ? String(val) : null
    },
    [colorBy]
  )

  const processData = useCallback(
    (items: Record<string, any>[]) => {
      if (!isPushMode || !colorBy) return
      let changed = false
      for (const d of items) {
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

  /** Wrap push to intercept data for category discovery */
  const wrapPush = useCallback(
    (originalPush: (d: any) => void) => {
      return (datum: any) => {
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

  // Build legend from discovered categories
  const streamingLegend = useMemo(() => {
    if (!isPushMode || !colorBy || !showLegend) return undefined
    // Use version to trigger recompute (consumed by useMemo dep)
    void version
    const categories = orderedRef.current
    if (categories.length === 0) return undefined

    const palette = Array.isArray(colorScheme) ? colorScheme : STREAMING_PALETTE
    const colorMap = new Map<string, string>()
    for (let i = 0; i < categories.length; i++) {
      colorMap.set(categories[i], palette[i % palette.length])
    }

    // Build synthetic data so createLegend can extract categories
    const syntheticColorBy = typeof colorBy === "string" ? colorBy : "__streamCat"
    const syntheticData = categories.map(cat => ({ [syntheticColorBy]: cat }))
    const syntheticScale = (v: string) => colorMap.get(v) || "#999"

    return createLegend({
      data: syntheticData,
      colorBy: syntheticColorBy,
      colorScale: syntheticScale,
      getColor,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPushMode, colorBy, showLegend, colorScheme, version])

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
    streamingLegend,
    streamingMarginAdjust,
  }
}
