import { useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useCategoryColors } from "../../CategoryColors"
import { useLinkedChartsActive } from "../../LinkedCharts"
import {
  DEFAULT_COLORS,
  STREAMING_PALETTE,
  resolveExplicitColor
} from "../shared/colorUtils"
import { useThemeCategorical } from "../shared/hooks"
import { resolveBoundedCategoryIndex } from "../shared/boundedCategoryRegistry"

type CategoryOrder = "discovery" | "explicit-then-alpha"
const FUNCTION_CATEGORY_DOMAIN = Symbol("realtime-function-category-domain")
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

interface CategoryRegistry {
  domainKey: unknown
  indexes: Map<string, number>
}

interface RealtimeCategoryColorOptions {
  /** Whether the chart has an active category encoding. */
  enabled: boolean
  /** Current controlled or frame-discovered category domain. */
  categories: string[]
  /** Consumer-authored exact category colors. */
  colors?: Record<string, string>
  /** Consumer-authored fallback fill for categories absent from the map. */
  fallbackColor?: string
  /** Preserve histogram stack ordering without changing swarm discovery order. */
  order?: CategoryOrder
  /** Reset palette assignments when the category encoding itself changes. */
  domainKey?: unknown
}

/**
 * Resolve realtime category colors once for both retained marks and legends.
 *
 * Precedence matches the existing streaming-legend contract:
 * CategoryColorProvider → explicit category map → explicit fallback fill →
 * categorical theme → the streaming fallback palette. Partial
 * explicit/provider maps intentionally fall through instead of collapsing
 * every unmapped category unless the consumer deliberately supplied a
 * uniform fallback fill.
 */
export function useRealtimeCategoryColors({
  enabled,
  categories,
  colors,
  fallbackColor,
  order = "discovery",
  domainKey
}: RealtimeCategoryColorOptions): {
  colorScale: ((category: string) => string) | undefined
  colorMap: Record<string, string> | undefined
} {
  const providerColors = useCategoryColors()
  const linkedChartsActive = useLinkedChartsActive()
  const themeCategorical = useThemeCategorical()
  const stableDomainKey =
    typeof domainKey === "function" ? FUNCTION_CATEGORY_DOMAIN : domainKey
  const committedRegistryRef = useRef<CategoryRegistry | null>(null)
  // Render against a clone of the last committed registry. A suspended or
  // otherwise abandoned render may assign speculative categories, but those
  // indexes must not leak into the next committed palette. Once this render
  // commits, its resolver owns this exact map and can safely extend it lazily
  // for the first pushed scene before category-domain emission catches up.
  const renderRegistry = useMemo<CategoryRegistry>(() => {
    const committed = committedRegistryRef.current
    const indexes =
      committed && Object.is(committed.domainKey, stableDomainKey)
        ? new Map(committed.indexes)
        : new Map<string, number>()
    const activeCategories = new Set(categories)
    const categoriesToReserve =
      order === "explicit-then-alpha"
        ? [
            ...Object.keys(colors ?? {}).filter((category) =>
              activeCategories.has(category)
            ),
            ...categories
              .filter(
                (category) =>
                  !Object.prototype.hasOwnProperty.call(colors ?? {}, category)
              )
              .sort()
          ]
        : categories
    for (const category of categoriesToReserve) {
      resolveBoundedCategoryIndex(indexes, category)
    }
    return { domainKey: stableDomainKey, indexes }
  }, [categories, colors, order, stableDomainKey])
  useIsomorphicLayoutEffect(() => {
    committedRegistryRef.current = renderRegistry
  }, [renderRegistry])
  const categoryIndexes = renderRegistry.indexes

  const colorScale = useMemo<((category: string) => string) | undefined>(() => {
    if (!enabled) return undefined
    // LinkedCharts eventually owns every registered category with the ambient
    // theme palette (or category10 when the theme has none). Use that same
    // fallback before registration catches up so the first retained scene
    // does not flash a different color.
    const palette =
      themeCategorical && themeCategorical.length > 0
        ? themeCategorical
        : linkedChartsActive
          ? DEFAULT_COLORS
          : STREAMING_PALETTE
    return (category: string) => {
      const index = resolveBoundedCategoryIndex(categoryIndexes, category)

      const providerColor = providerColors
        ? resolveExplicitColor(providerColors, category)
        : undefined
      if (providerColor) return providerColor

      const explicitColor = colors
        ? resolveExplicitColor(colors, category)
        : undefined
      if (explicitColor) return explicitColor
      if (fallbackColor) return fallbackColor
      return palette[index % palette.length]
    }
  }, [
    categoryIndexes,
    colors,
    enabled,
    fallbackColor,
    linkedChartsActive,
    providerColors,
    themeCategorical
  ])

  const colorMap = useMemo(() => {
    if (!enabled || !colorScale) return colors
    const explicitOrder = Object.keys(colors ?? {})
    const explicitCategories = new Set(explicitOrder)
    const remainingCategories = categories.filter(
      (category) => !explicitCategories.has(category)
    )
    if (order === "explicit-then-alpha") remainingCategories.sort()
    const orderedCategories = [...explicitOrder, ...remainingCategories]
    if (orderedCategories.length === 0) return undefined

    const activeCategories = new Set(categories)
    const entries: Array<[string, string]> = []
    for (const category of orderedCategories) {
      if (activeCategories.has(category)) {
        entries.push([category, colorScale(category)])
        continue
      }
      // Histogram keeps inactive authored keys in barColors so they seed a
      // future stack position, but resolving them now would consume a palette
      // index before that category has ever appeared. Copy only the authored
      // value; once active, the normal resolver applies provider precedence.
      const explicitColor = colors
        ? resolveExplicitColor(colors, category)
        : undefined
      if (explicitColor) entries.push([category, explicitColor])
    }
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }, [categories, colorScale, colors, enabled, order])

  return { colorScale, colorMap }
}
