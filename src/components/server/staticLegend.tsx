/**
 * Static legend rendering for server-side SVG.
 *
 * Builds legend SVG elements from data + colorScheme without React hooks.
 * Used by renderToStaticSVG when showLegend is true.
 */

import * as React from "react"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "d3-scale-chromatic"
import type { SemioticTheme } from "../store/ThemeStore"

const SWATCH = 14
const ROW_HEIGHT = 20
const LABEL_OFFSET = SWATCH + 6

export interface StaticLegendConfig {
  /** Category labels to show in legend */
  categories: string[]
  /** Color scheme — array of colors or d3-scale-chromatic name */
  colorScheme?: string | string[]
  /** Theme for text/font colors */
  theme: SemioticTheme
  /** Legend position */
  position?: "right" | "left" | "top" | "bottom"
  /** Chart dimensions for positioning */
  totalWidth: number
  totalHeight: number
  /** Chart margins */
  margin: { top: number; right: number; bottom: number; left: number }
  /** Title presence (affects top-position offset) */
  hasTitle?: boolean
}

/**
 * Build a categorical color scale from categories and colorScheme.
 */
function buildColorScale(categories: string[], colorScheme: string | string[] | undefined, theme: SemioticTheme): (category: string) => string {
  let colors: string[]
  if (Array.isArray(colorScheme)) {
    colors = colorScheme
  } else if (colorScheme) {
    // Named scheme — try theme categorical, fall back to category10
    colors = theme.colors.categorical.length > 0 ? theme.colors.categorical : schemeCategory10 as unknown as string[]
  } else {
    colors = theme.colors.categorical.length > 0 ? theme.colors.categorical : schemeCategory10 as unknown as string[]
  }
  const scale = scaleOrdinal<string, string>().domain(categories).range(colors)
  return scale
}

/**
 * Render a static legend as SVG elements.
 * Returns null if no categories to show.
 */
export function renderStaticLegend(config: StaticLegendConfig): React.ReactNode {
  const {
    categories,
    colorScheme,
    theme,
    position = "right",
    totalWidth,
    totalHeight,
    margin,
    hasTitle = false,
  } = config

  if (!categories || categories.length === 0) return null

  const colorScale = buildColorScale(categories, colorScheme, theme)
  const isHorizontal = position === "top" || position === "bottom"

  // Compute position
  let tx: number, ty: number
  if (position === "left") {
    tx = 4; ty = margin.top
  } else if (position === "top") {
    tx = margin.left; ty = hasTitle ? 32 : 8
  } else if (position === "bottom") {
    tx = margin.left; ty = totalHeight - margin.bottom + 40
  } else {
    // right (default)
    tx = totalWidth - margin.right + 10; ty = margin.top
  }

  if (isHorizontal) {
    // Horizontal layout
    let offset = 0
    const items = categories.map((cat, i) => {
      const itemWidth = SWATCH + 8 + cat.length * 6.5
      const x = offset
      offset += itemWidth + 8
      return (
        <g key={`legend-${i}`} transform={`translate(${x},0)`}>
          <rect width={SWATCH} height={SWATCH} fill={colorScale(cat)} rx={2} />
          <text
            x={LABEL_OFFSET}
            y={SWATCH / 2}
            dominantBaseline="central"
            fontSize={theme.typography.tickSize}
            fill={theme.colors.text}
            fontFamily={theme.typography.fontFamily}
          >
            {cat}
          </text>
        </g>
      )
    })
    return <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>{items}</g>
  }

  // Vertical layout
  const items = categories.map((cat, i) => (
    <g key={`legend-${i}`} transform={`translate(0,${i * ROW_HEIGHT})`}>
      <rect width={SWATCH} height={SWATCH} fill={colorScale(cat)} rx={2} />
      <text
        x={LABEL_OFFSET}
        y={SWATCH / 2}
        dominantBaseline="central"
        fontSize={theme.typography.tickSize}
        fill={theme.colors.text}
        fontFamily={theme.typography.fontFamily}
      >
        {cat}
      </text>
    </g>
  ))

  return <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>{items}</g>
}

/**
 * Extract unique categories from data using an accessor.
 */
export function extractCategories(
  data: any[],
  accessor: string | ((d: any) => string) | undefined
): string[] {
  if (!accessor || !data || data.length === 0) return []
  const fn = typeof accessor === "function" ? accessor : (d: any) => d[accessor]
  const seen = new Set<string>()
  for (const d of data) {
    const val = fn(d)
    if (val != null) seen.add(String(val))
  }
  return Array.from(seen)
}
