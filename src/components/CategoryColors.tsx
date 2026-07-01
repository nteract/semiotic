"use client"
import * as React from "react"
import { createContext, useContext, useMemo } from "react"
import { COLOR_SCHEMES, DEFAULT_COLORS, resolveExplicitColor } from "./charts/shared/colorUtils"

/**
 * Category→color mapping. Maps category values (like "North", "error", "active")
 * to fixed color strings. Charts inside a CategoryColorProvider will use these
 * colors consistently regardless of what subset of categories each chart displays.
 */
export type CategoryColorMap = Record<string, string>

const CategoryColorContext = createContext<CategoryColorMap | null>(null)

export interface CategoryColorProviderProps {
  /** Explicit category→color mapping */
  colors?: CategoryColorMap
  /**
   * Category values to auto-assign colors from a scheme.
   * Use when you want consistent colors but don't need specific assignments.
   */
  categories?: string[]
  /** Color scheme to use for auto-assignment. Default: "category10" */
  colorScheme?: string | string[] | Record<string, string>
  children: React.ReactNode
}

/**
 * CategoryColorProvider — assigns stable colors to category values
 * shared across all Semiotic charts within its subtree.
 *
 * Two modes:
 * - **Explicit**: pass a `colors` map of category→color
 * - **Auto**: pass a `categories` array and optional `colorScheme`
 *
 * Charts with `colorBy` inside this provider will use the mapped colors
 * instead of computing their own color scale per-chart.
 *
 * ```tsx
 * <CategoryColorProvider colors={{ North: "#e41a1c", South: "#377eb8", East: "#4daf4a" }}>
 *   <ChartGrid columns={2}>
 *     <LineChart data={d1} colorBy="region" responsiveWidth />
 *     <BarChart data={d2} colorBy="region" responsiveWidth />
 *   </ChartGrid>
 * </CategoryColorProvider>
 * ```
 */
export function CategoryColorProvider({
  colors,
  categories,
  colorScheme = "category10",
  children,
}: CategoryColorProviderProps) {
  const colorMap = useMemo(() => {
    if (colors) return colors

    if (categories) {
      // Object-map `colorScheme` → look each category up directly for exact
      // per-category colors; categories absent from the map fall back to the
      // default palette so every category still gets a distinct color.
      if (colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)) {
        const explicit = colorScheme as Record<string, unknown>
        const map: CategoryColorMap = {}
        let fallbackIdx = 0
        for (const category of categories) {
          map[category] =
            resolveExplicitColor(explicit, category) ??
            DEFAULT_COLORS[fallbackIdx++ % DEFAULT_COLORS.length]
        }
        return map
      }

      const palette = Array.isArray(colorScheme)
        ? colorScheme
        : (COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES] as readonly string[]) || DEFAULT_COLORS
      const map: CategoryColorMap = {}
      for (let i = 0; i < categories.length; i++) {
        map[categories[i]] = palette[i % palette.length]
      }
      return map
    }

    return {}
  }, [colors, categories, colorScheme])

  return (
    <CategoryColorContext.Provider value={colorMap}>
      {children}
    </CategoryColorContext.Provider>
  )
}

CategoryColorProvider.displayName = "CategoryColorProvider"

/**
 * Hook to access the category color map from the nearest provider.
 * Returns null if no provider is present.
 */
export function useCategoryColors(): CategoryColorMap | null {
  return useContext(CategoryColorContext)
}
