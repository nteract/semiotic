/**
 * Static legend rendering for server-side SVG.
 *
 * Builds legend SVG elements from data + colorScheme without React hooks.
 * Used by renderToStaticSVG when showLegend is true.
 */

import * as React from "react"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "../charts/shared/colorPalettes"
import type { SemioticTheme } from "../store/ThemeStore"
import type { Datum } from "../charts/shared/datumTypes"
import type { LegendLayout } from "../types/legendTypes"

const SWATCH = 14
const ROW_HEIGHT = 20
const LABEL_GAP = 6
const ITEM_GAP = 8

interface LegendItemLayout {
  category: string
  width: number
  x: number
  y: number
}

interface StaticLegendMetrics {
  items: LegendItemLayout[]
  width: number
  height: number
  swatchSize: number
  labelOffset: number
  swatchRadius: number
}

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
  /** SSR legend layout controls */
  legendLayout?: LegendLayout
}

/**
 * Build a categorical color scale from categories and colorScheme.
 */
function buildColorScale(categories: string[], colorScheme: string | string[] | undefined, theme: SemioticTheme): (category: string) => string {
  const colors = Array.isArray(colorScheme)
    ? colorScheme
    : theme.colors.categorical.length > 0
    ? theme.colors.categorical
    : schemeCategory10 as unknown as string[]
  return scaleOrdinal<string, string>().domain(categories).range(colors)
}

function normalizedAlign(align: LegendLayout["align"]): "start" | "center" | "end" {
  if (align === "left") return "start"
  if (align === "right") return "end"
  return align ?? "start"
}

function itemWidth(category: string, swatchSize: number, labelGap: number, theme: SemioticTheme): number {
  const tickSize = Number(theme.typography.tickSize) || 11
  return swatchSize + labelGap + Math.ceil(category.length * tickSize * 0.58)
}

function computeStaticLegendLayout(config: StaticLegendConfig): StaticLegendMetrics {
  const {
    categories,
    theme,
    position = "right",
    totalWidth,
    totalHeight,
    margin,
    legendLayout,
  } = config
  const swatchSize = Math.max(1, legendLayout?.swatchSize ?? SWATCH)
  const labelGap = Math.max(0, legendLayout?.labelGap ?? LABEL_GAP)
  const itemGap = Math.max(0, legendLayout?.itemGap ?? ITEM_GAP)
  const rowHeight = Math.max(swatchSize, legendLayout?.rowHeight ?? ROW_HEIGHT)
  const labelOffset = swatchSize + labelGap
  const swatchRadius = Math.min(2, swatchSize / 2)
  const isHorizontal = position === "top" || position === "bottom"
  const plotWidth = Math.max(swatchSize, totalWidth - margin.left - margin.right)
  const plotHeight = Math.max(rowHeight, totalHeight - margin.top - margin.bottom)
  const widths = categories.map((category) => itemWidth(category, swatchSize, labelGap, theme))

  if (isHorizontal) {
    const maxWidth = Math.max(swatchSize, legendLayout?.maxWidth ?? plotWidth)
    const rows: Array<{ start: number; end: number; width: number }> = []
    let rowStart = 0
    let rowWidth = 0
    widths.forEach((width, i) => {
      const nextWidth = rowWidth === 0 ? width : rowWidth + itemGap + width
      if (rowWidth > 0 && nextWidth > maxWidth) {
        rows.push({ start: rowStart, end: i, width: rowWidth })
        rowStart = i
        rowWidth = width
      } else {
        rowWidth = nextWidth
      }
    })
    if (categories.length > 0) rows.push({ start: rowStart, end: categories.length, width: rowWidth })

    const align = normalizedAlign(legendLayout?.align)
    const items: LegendItemLayout[] = []
    rows.forEach((row, rowIndex) => {
      const rowOffset =
        align === "center"
          ? Math.max(0, (maxWidth - row.width) / 2)
          : align === "end"
            ? Math.max(0, maxWidth - row.width)
            : 0
      let x = rowOffset
      for (let i = row.start; i < row.end; i++) {
        items.push({ category: categories[i], width: widths[i], x, y: rowIndex * rowHeight })
        x += widths[i] + itemGap
      }
    })

    return {
      items,
      width: Math.min(maxWidth, Math.max(0, ...rows.map((row) => row.width))),
      height: rows.length * rowHeight,
      swatchSize,
      labelOffset,
      swatchRadius,
    }
  }

  const columnWidth = Math.max(0, ...widths)
  const rowsPerColumn = Math.max(1, Math.floor(plotHeight / rowHeight))
  const columns = Math.max(1, Math.ceil(categories.length / rowsPerColumn))
  const items = categories.map((category, i) => {
    const column = Math.floor(i / rowsPerColumn)
    const row = i % rowsPerColumn
    return {
      category,
      width: widths[i],
      x: column * (columnWidth + itemGap),
      y: row * rowHeight,
    }
  })

  return {
    items,
    width: columns * columnWidth + Math.max(0, columns - 1) * itemGap,
    height: Math.min(categories.length, rowsPerColumn) * rowHeight,
    swatchSize,
    labelOffset,
    swatchRadius,
  }
}

export function measureStaticLegend(config: StaticLegendConfig): Omit<StaticLegendMetrics, "items" | "labelOffset" | "swatchRadius"> {
  const { width, height, swatchSize } = computeStaticLegendLayout(config)
  return { width, height, swatchSize }
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
  const metrics = computeStaticLegendLayout(config)

  // Compute position — keep legend within SVG bounds
  let tx: number, ty: number
  if (position === "left") {
    tx = Math.max(4, margin.left - metrics.width - 10); ty = margin.top
  } else if (position === "top") {
    tx = margin.left; ty = hasTitle ? 32 : 8
  } else if (position === "bottom") {
    // Place below the axes in the reserved bottom margin area.
    // Axes use ~35px; legend goes after that. Clamp to stay within SVG bounds.
    tx = margin.left; ty = Math.min(totalHeight - margin.bottom + 38, totalHeight - metrics.height - 2)
  } else {
    // right (default)
    tx = Math.min(totalWidth - metrics.width - 4, totalWidth - margin.right + 10); ty = margin.top
  }

  if (isHorizontal) {
    const items = metrics.items.map((item, i) => (
      <g key={`legend-${i}`} transform={`translate(${item.x},${item.y})`}>
        <rect width={metrics.swatchSize} height={metrics.swatchSize} fill={colorScale(item.category)} rx={metrics.swatchRadius} />
        <text
          x={metrics.labelOffset}
          y={metrics.swatchSize / 2}
          dominantBaseline="central"
          fontSize={theme.typography.tickSize}
          fill={theme.colors.text}
          fontFamily={theme.typography.fontFamily}
        >
          {item.category}
        </text>
      </g>
    ))
    return <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>{items}</g>
  }

  // Vertical layout
  const items = metrics.items.map((item, i) => (
    <g key={`legend-${i}`} transform={`translate(${item.x},${item.y})`}>
      <rect width={metrics.swatchSize} height={metrics.swatchSize} fill={colorScale(item.category)} rx={metrics.swatchRadius} />
      <text
        x={metrics.labelOffset}
        y={metrics.swatchSize / 2}
        dominantBaseline="central"
        fontSize={theme.typography.tickSize}
        fill={theme.colors.text}
        fontFamily={theme.typography.fontFamily}
      >
        {item.category}
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
  accessor: string | ((d: Datum) => string) | undefined
): string[] {
  if (!accessor || !data || data.length === 0) return []
  const fn = typeof accessor === "function" ? accessor : (d: Datum) => d[accessor]
  const seen = new Set<string>()
  for (const d of data) {
    const val = fn(d)
    if (val != null) seen.add(String(val))
  }
  return Array.from(seen)
}
