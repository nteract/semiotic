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
import type { GradientLegendConfig, LegendGroup, LegendItem, LegendLayout } from "../types/legendTypes"

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

interface StaticLegendGroupLayout {
  group: LegendGroup
  x: number
  y: number
  itemOffsetX: number
  itemOffsetY: number
  width: number
  height: number
  items: LegendItemLayout[]
}

interface StaticLegendGroupMetrics extends Omit<StaticLegendMetrics, "items"> {
  groups: StaticLegendGroupLayout[]
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
  /** Optional id namespace used for generated SVG ids */
  idPrefix?: string
}

export interface StaticLegendGroupsConfig extends Omit<StaticLegendConfig, "categories" | "colorScheme"> {
  legendGroups: LegendGroup[]
}

export interface StaticGradientLegendConfig extends Omit<StaticLegendConfig, "categories" | "colorScheme"> {
  gradient: GradientLegendConfig
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

function legendFontSize(theme: SemioticTheme): number {
  return Number(theme.typography.legendSize ?? theme.typography.labelSize ?? theme.typography.tickSize) || 11
}

function itemWidth(category: string, swatchSize: number, labelGap: number, theme: SemioticTheme): number {
  const size = legendFontSize(theme)
  return swatchSize + labelGap + Math.ceil(category.length * size * 0.58)
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
      width: Math.max(0, ...rows.map((row) => row.width)),
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

function computeStaticLegendGroupsLayout(config: StaticLegendGroupsConfig): StaticLegendGroupMetrics {
  const { legendGroups, theme, position = "right", totalWidth, totalHeight, margin, legendLayout } = config
  const swatchSize = Math.max(1, legendLayout?.swatchSize ?? SWATCH)
  const labelGap = Math.max(0, legendLayout?.labelGap ?? LABEL_GAP)
  const itemGap = Math.max(0, legendLayout?.itemGap ?? ITEM_GAP)
  const rowHeight = Math.max(swatchSize, legendLayout?.rowHeight ?? ROW_HEIGHT)
  const labelOffset = swatchSize + labelGap
  const swatchRadius = Math.min(2, swatchSize / 2)
  const groupLabelSize = Math.max(12, legendFontSize(theme))
  const labelPadding = 8
  const separatorGap = 12
  const isHorizontal = position === "top" || position === "bottom"
  const plotWidth = Math.max(swatchSize, totalWidth - margin.left - margin.right)
  const plotHeight = Math.max(rowHeight, totalHeight - margin.top - margin.bottom)

  if (isHorizontal) {
    const maxWidth = Math.max(swatchSize, legendLayout?.maxWidth ?? plotWidth)
    const align = normalizedAlign(legendLayout?.align)
    let x = 0
    let height = 0
    const groups: StaticLegendGroupLayout[] = []

    for (const group of legendGroups) {
      const groupLabels = group.items.map((item) => item.label)
      const itemMetrics = computeStaticLegendLayout({
        ...config,
        categories: groupLabels,
        legendLayout: { ...legendLayout, maxWidth: Math.max(swatchSize, maxWidth - groupLabelSize - labelPadding), align: "start" },
      })
      const labelWidth = group.label ? groupLabelSize : 0
      const rotatedLabelHeight = group.label ? itemWidth(group.label, 0, 0, theme) : 0
      const itemOffsetX = labelWidth > 0 ? labelWidth + labelPadding : 0
      const groupWidth = itemOffsetX + itemMetrics.width
      const groupHeight = Math.max(itemMetrics.height, rotatedLabelHeight)
      groups.push({
        group,
        x,
        y: 0,
        itemOffsetX,
        itemOffsetY: 0,
        width: groupWidth,
        height: groupHeight,
        items: itemMetrics.items,
      })
      x += groupWidth + separatorGap
      height = Math.max(height, groupHeight)
    }

    const totalGroupWidth = groups.length > 0 ? x - separatorGap : 0
    const startOffset =
      totalGroupWidth > maxWidth
        ? 0
        : align === "center"
          ? Math.max(0, (maxWidth - totalGroupWidth) / 2)
          : align === "end"
            ? Math.max(0, maxWidth - totalGroupWidth)
            : 0

    return {
      groups: groups.map((group) => ({ ...group, x: group.x + startOffset })),
      width: totalGroupWidth,
      height,
      swatchSize,
      labelOffset,
      swatchRadius,
    }
  }

  let y = 0
  let width = 0
  const groups: StaticLegendGroupLayout[] = []

  for (const group of legendGroups) {
    const groupLabels = group.items.map((item) => item.label)
    const itemWidths = groupLabels.map((label) => itemWidth(label, swatchSize, labelGap, theme))
    const columnWidth = Math.max(0, ...itemWidths)
    const availableRows = Math.max(1, Math.floor(Math.max(rowHeight, plotHeight - y) / rowHeight))
    const rowsPerColumn = Math.max(1, Math.min(group.items.length || 1, availableRows))
    const columns = Math.max(1, Math.ceil(group.items.length / rowsPerColumn))
    const items = group.items.map((item, i) => {
      const column = Math.floor(i / rowsPerColumn)
      const row = i % rowsPerColumn
      return {
        category: item.label,
        width: itemWidths[i],
        x: column * (columnWidth + itemGap),
        y: row * rowHeight,
      }
    })
    const itemBlockWidth = columns * columnWidth + Math.max(0, columns - 1) * itemGap
    const itemBlockHeight = Math.min(group.items.length, rowsPerColumn) * rowHeight
    const groupLabelWidth = group.label ? itemWidth(group.label, 0, 0, theme) : 0
    const itemOffsetY = group.label ? groupLabelSize + labelPadding : 0
    const groupHeight = itemOffsetY + itemBlockHeight + separatorGap
    const groupWidth = Math.max(itemBlockWidth, groupLabelWidth)
    groups.push({
      group,
      x: 0,
      y,
      itemOffsetX: 0,
      itemOffsetY,
      width: groupWidth,
      height: groupHeight,
      items,
    })
    width = Math.max(width, groupWidth)
    y += groupHeight
  }

  return {
    groups,
    width,
    height: Math.max(0, y),
    swatchSize,
    labelOffset,
    swatchRadius,
  }
}

function flattenLegendGroups(legendGroups: LegendGroup[]): Array<{
  group: LegendGroup
  item: LegendItem
  itemIndex: number
  label: string
}> {
  return legendGroups.flatMap((group) =>
    group.items.map((item, itemIndex) => ({
      group,
      item,
      itemIndex,
      label: item.label,
    }))
  )
}

export function measureStaticLegendGroups(config: StaticLegendGroupsConfig): Omit<StaticLegendMetrics, "items" | "labelOffset" | "swatchRadius"> {
  const { width, height, swatchSize } = computeStaticLegendGroupsLayout(config)
  return { width, height, swatchSize }
}

export function measureStaticGradientLegend(config: StaticGradientLegendConfig): { width: number; height: number; swatchSize: number } {
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const plotWidth = Math.max(1, config.totalWidth - config.margin.left - config.margin.right)
  if (isHorizontal) {
    return {
      width: Math.min(config.legendLayout?.maxWidth ?? plotWidth, 200),
      height: config.gradient.label ? 34 : 26,
      swatchSize: 12,
    }
  }
  return {
    width: config.gradient.label ? 86 : 72,
    height: config.gradient.label ? 124 : 108,
    swatchSize: 14,
  }
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
          fontSize={legendFontSize(theme)}
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
        fontSize={legendFontSize(theme)}
        fill={theme.colors.text}
        fontFamily={theme.typography.fontFamily}
      >
        {item.category}
      </text>
    </g>
  ))

  return <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>{items}</g>
}

export function renderStaticLegendGroups(config: StaticLegendGroupsConfig): React.ReactNode {
  if (flattenLegendGroups(config.legendGroups).length === 0) return null

  const metrics = computeStaticLegendGroupsLayout(config)
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const separatorStroke = config.theme.colors.grid || config.theme.colors.textSecondary
  let tx: number, ty: number
  if (config.position === "left") {
    tx = Math.max(4, config.margin.left - metrics.width - 10); ty = config.margin.top
  } else if (config.position === "top") {
    tx = config.margin.left; ty = config.hasTitle ? 32 : 8
  } else if (config.position === "bottom") {
    tx = config.margin.left; ty = Math.min(config.totalHeight - config.margin.bottom + 38, config.totalHeight - metrics.height - 2)
  } else {
    tx = Math.min(config.totalWidth - metrics.width - 4, config.totalWidth - config.margin.right + 10); ty = config.margin.top
  }

  const items = metrics.groups.flatMap((groupLayout, groupIndex) => {
    const { group } = groupLayout
    const type = group.type ?? "fill"
    const groupNodes: React.ReactNode[] = []

    if (group.label) {
      groupNodes.push(isHorizontal
        ? (
          <text
            key={`legend-group-label-${groupIndex}`}
            transform={`translate(${groupLayout.x},${groupLayout.y}) rotate(90)`}
            textAnchor="start"
            fontSize={legendFontSize(config.theme)}
            fill={config.theme.colors.text}
            fontFamily={config.theme.typography.fontFamily}
          >
            {group.label}
          </text>
        )
        : (
          <text
            key={`legend-group-label-${groupIndex}`}
            x={groupLayout.x}
            y={groupLayout.y + legendFontSize(config.theme)}
            fontSize={legendFontSize(config.theme)}
            fill={config.theme.colors.text}
            fontFamily={config.theme.typography.fontFamily}
          >
            {group.label}
          </text>
        ))
    }

    groupNodes.push(...groupLayout.items.map((layout, itemIndex) => {
      const item = group.items[itemIndex]
      const style = group.styleFn(item, itemIndex)
      const glyph = typeof type === "function"
        ? type(item)
        : type === "line"
          ? <line x1={0} y1={0} x2={metrics.swatchSize} y2={metrics.swatchSize} style={style} />
          : <rect width={metrics.swatchSize} height={metrics.swatchSize} rx={metrics.swatchRadius} style={style} />

      return (
        <g
          key={`legend-${groupIndex}-${itemIndex}`}
          transform={`translate(${groupLayout.x + groupLayout.itemOffsetX + layout.x},${groupLayout.y + groupLayout.itemOffsetY + layout.y})`}
        >
          {glyph}
          <text
            x={metrics.labelOffset}
            y={metrics.swatchSize / 2}
            dominantBaseline="central"
            fontSize={legendFontSize(config.theme)}
            fill={config.theme.colors.text}
            fontFamily={config.theme.typography.fontFamily}
          >
            {layout.category}
          </text>
        </g>
      )
    }))

    if (!isHorizontal && groupIndex < metrics.groups.length - 1) {
      groupNodes.push(
        <line
          key={`legend-group-separator-${groupIndex}`}
          x1={0}
          y1={groupLayout.y + groupLayout.height - 6}
          x2={metrics.width}
          y2={groupLayout.y + groupLayout.height - 6}
          stroke={separatorStroke}
        />
      )
    } else if (isHorizontal && groupIndex < metrics.groups.length - 1) {
      const x = groupLayout.x + groupLayout.width + 6
      groupNodes.push(
        <line
          key={`legend-group-separator-${groupIndex}`}
          x1={x}
          y1={0}
          x2={x}
          y2={metrics.height}
          stroke={separatorStroke}
        />
      )
    }

    return groupNodes
  })

  return <g className="semiotic-legend" transform={`translate(${tx},${ty})`} data-orientation={isHorizontal ? "horizontal" : "vertical"}>{items}</g>
}

export function renderStaticGradientLegend(config: StaticGradientLegendConfig): React.ReactNode {
  const metrics = measureStaticGradientLegend(config)
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const id = `${config.idPrefix ? `${config.idPrefix}-` : ""}semiotic-static-gradient-legend`
  const fmt = config.gradient.format || ((v: number) => String(Math.round(v * 100) / 100))
  let tx: number, ty: number
  if (config.position === "left") {
    tx = Math.max(4, config.margin.left - metrics.width - 10); ty = config.margin.top
  } else if (config.position === "top") {
    tx = config.margin.left; ty = config.hasTitle ? 32 : 8
  } else if (config.position === "bottom") {
    tx = config.margin.left; ty = Math.min(config.totalHeight - config.margin.bottom + 38, config.totalHeight - metrics.height - 2)
  } else {
    tx = Math.min(config.totalWidth - metrics.width - 4, config.totalWidth - config.margin.right + 10); ty = config.margin.top
  }

  const stops = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16
    const value = isHorizontal
      ? config.gradient.domain[0] + t * (config.gradient.domain[1] - config.gradient.domain[0])
      : config.gradient.domain[1] - t * (config.gradient.domain[1] - config.gradient.domain[0])
    return <stop key={i} offset={`${t * 100}%`} stopColor={config.gradient.colorFn(value)} />
  })

  if (isHorizontal) {
    const barHeight = 12
    const labelY = config.gradient.label ? 0 : undefined
    const barY = config.gradient.label ? 8 : 0
    return (
      <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>
        <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">{stops}</linearGradient></defs>
        {config.gradient.label && <text x={metrics.width / 2} y={labelY} textAnchor="middle" fontSize={config.theme.typography.tickSize} fill={config.theme.colors.text} fontFamily={config.theme.typography.fontFamily}>{config.gradient.label}</text>}
        <rect x={0} y={barY} width={metrics.width} height={barHeight} fill={`url(#${id})`} rx={2} />
        <text x={0} y={barY + barHeight + 12} textAnchor="start" fontSize={config.theme.typography.tickSize} fill={config.theme.colors.textSecondary} fontFamily={config.theme.typography.fontFamily}>{fmt(config.gradient.domain[0])}</text>
        <text x={metrics.width} y={barY + barHeight + 12} textAnchor="end" fontSize={config.theme.typography.tickSize} fill={config.theme.colors.textSecondary} fontFamily={config.theme.typography.fontFamily}>{fmt(config.gradient.domain[1])}</text>
      </g>
    )
  }

  const barWidth = 14
  const barHeight = 100
  const labelY = config.gradient.label ? -6 : undefined
  return (
    <g className="semiotic-legend" transform={`translate(${tx},${ty + (config.gradient.label ? 12 : 0)})`}>
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">{stops}</linearGradient></defs>
      {config.gradient.label && <text x={barWidth / 2} y={labelY} textAnchor="middle" fontSize={config.theme.typography.tickSize} fill={config.theme.colors.text} fontFamily={config.theme.typography.fontFamily}>{config.gradient.label}</text>}
      <rect x={0} y={0} width={barWidth} height={barHeight} fill={`url(#${id})`} rx={2} />
      <text x={barWidth + 5} y={10} fontSize={config.theme.typography.tickSize} fill={config.theme.colors.textSecondary} fontFamily={config.theme.typography.fontFamily}>{fmt(config.gradient.domain[1])}</text>
      <text x={barWidth + 5} y={barHeight} fontSize={config.theme.typography.tickSize} fill={config.theme.colors.textSecondary} fontFamily={config.theme.typography.fontFamily}>{fmt(config.gradient.domain[0])}</text>
    </g>
  )
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
