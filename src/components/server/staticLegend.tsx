/**
 * Static legend rendering for server-side SVG.
 *
 * Builds legend SVG elements from data + colorScheme without React hooks.
 * Used by renderToStaticSVG when showLegend is true.
 */

import * as React from "react"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "../charts/shared/colorPalettes"
import { resolveExplicitColor } from "../charts/shared/colorUtils"
import type { SemioticTheme } from "../store/ThemeStore"
import type { Datum } from "../charts/shared/datumTypes"
import type { CategoricalLegendConfig, GradientLegendConfig, LegendGroup, LegendItem, LegendLayout } from "../types/legendTypes"
import {
  DEFAULT_LEGEND_ROW_HEIGHT,
  layoutVerticalLegendGroups,
  resolveLegendDistance,
  resolveLegendMetrics,
  resolveLegendSideGutter,
  resolveSideLegendWidth,
} from "../legendLayout"

// Keep static SVG legends on the same metric grid as the interactive
// <Legend> component used by Stream frames.
const ROW_HEIGHT = DEFAULT_LEGEND_ROW_HEIGHT

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
  colorScheme?: string | string[] | Record<string, string>
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
  /** Gap in pixels between the legend and the plot/side gutter. Default: 10. */
  legendDistance?: number
  /** Optional vertical placement-box override. Defaults to measured content. */
  reservedWidth?: number
  /** Optional id namespace used for generated SVG ids */
  idPrefix?: string
}

export interface StaticLegendGroupsConfig extends Omit<StaticLegendConfig, "categories" | "colorScheme"> {
  legendGroups: LegendGroup[]
  /** Optional vertical placement-box override. Defaults to measured content. */
  reservedWidth?: number
}

export interface StaticGradientLegendConfig extends Omit<StaticLegendConfig, "categories" | "colorScheme"> {
  gradient: GradientLegendConfig
}

/**
 * Build a categorical color scale from categories and colorScheme.
 */
function buildColorScale(categories: string[], colorScheme: string | string[] | Record<string, string> | undefined, theme: SemioticTheme): (category: string) => string {
  // Explicit { category: color } map → look up directly (mirrors createColorScale).
  if (colorScheme && typeof colorScheme === "object" && !Array.isArray(colorScheme)) {
    const map = colorScheme as Record<string, unknown>
    return (category: string) => resolveExplicitColor(map, category) ?? "#999"
  }
  const colors = Array.isArray(colorScheme)
    ? colorScheme
    : theme.colors.categorical.length > 0
    ? theme.colors.categorical
    : schemeCategory10 as unknown as string[]
  return scaleOrdinal<string, string>().domain(categories).range(colors)
}

/** Build the same categorical config shape consumed by the live Legend. */
export function buildStaticCategoricalLegendConfig(
  categories: string[],
  colorScheme: string | string[] | Record<string, string> | undefined,
  theme: SemioticTheme,
): CategoricalLegendConfig | undefined {
  if (categories.length === 0) return undefined
  const colorScale = buildColorScale(categories, colorScheme, theme)
  return {
    legendGroups: [{
      label: "",
      type: "fill",
      items: categories.map(label => ({ label })),
      styleFn: item => ({ fill: colorScale(item.label) }),
    }],
  }
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
    margin,
    legendLayout,
  } = config
  const { swatchSize, labelGap, itemGap, rowHeight } = resolveLegendMetrics(legendLayout)
  const labelOffset = swatchSize + labelGap
  const swatchRadius = 0
  const isHorizontal = position === "top" || position === "bottom"
  const plotWidth = Math.max(swatchSize, totalWidth - margin.left - margin.right)
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
  const items = categories.map((category, i) => {
    return {
      category,
      width: widths[i],
      x: 0,
      y: i * rowHeight,
    }
  })

  return {
    items,
    width: columnWidth,
    height: categories.length * rowHeight,
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
  const { legendGroups, theme, position = "right", totalWidth, margin, legendLayout } = config
  const { swatchSize, labelGap, rowHeight } = resolveLegendMetrics(legendLayout)
  const labelOffset = swatchSize + labelGap
  const swatchRadius = 0
  const groupLabelSize = Math.max(12, legendFontSize(theme))
  const labelPadding = 8
  const separatorGap = 12
  const isHorizontal = position === "top" || position === "bottom"
  const plotWidth = Math.max(swatchSize, totalWidth - margin.left - margin.right)

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

  const verticalLayouts = layoutVerticalLegendGroups(
    legendGroups.map((group) => ({
      hasLabel: Boolean(group.label),
      itemCount: group.items.length,
    })),
    rowHeight
  )
  let width = 0
  const groups = legendGroups.map((group, groupIndex): StaticLegendGroupLayout => {
    const itemWidths = group.items.map((item) => itemWidth(item.label, swatchSize, labelGap, theme))
    const groupWidth = Math.max(
      0,
      ...itemWidths,
      group.label ? itemWidth(group.label, 0, 0, theme) : 0
    )
    width = Math.max(width, groupWidth)
    return {
      group,
      x: 0,
      y: verticalLayouts[groupIndex].itemsY,
      itemOffsetX: 0,
      itemOffsetY: 0,
      width: groupWidth,
      height: group.items.length * rowHeight,
      items: group.items.map((item, itemIndex) => ({
        category: item.label,
        width: itemWidths[itemIndex],
        x: 0,
        y: itemIndex * rowHeight,
      })),
    }
  })

  return {
    groups,
    width,
    height: verticalLayouts.at(-1)?.endY ?? 0,
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
  } = config

  if (!categories || categories.length === 0) return null

  const colorScale = buildColorScale(categories, colorScheme, theme)
  const isHorizontal = position === "top" || position === "bottom"
  const metrics = computeStaticLegendLayout(config)

  const categoricalLegend = buildStaticCategoricalLegendConfig(categories, colorScheme, theme)
  const sideLegendWidth = config.reservedWidth ?? resolveSideLegendWidth(categoricalLegend, config.legendLayout)
  const legendDistance = typeof config.legendDistance === "number"
    ? Math.max(0, config.legendDistance)
    : resolveLegendDistance(categoricalLegend)
  const sideGutter = resolveLegendSideGutter(config.legendLayout)

  // Match `renderLegendFromConfig`: positions are derived directly from the
  // resolved margin. In particular, do not clamp an explicit caller margin;
  // the client allows that layout for externally managed legends as well.
  let tx: number, ty: number
  if (position === "left") {
    tx = margin.left - sideGutter - sideLegendWidth - legendDistance; ty = margin.top
  } else if (position === "top") {
    tx = margin.left; ty = margin.top - legendDistance - metrics.height
  } else if (position === "bottom") {
    tx = margin.left; ty = totalHeight - margin.bottom + legendDistance
  } else {
    tx = totalWidth - margin.right + sideGutter + legendDistance; ty = margin.top
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
  const verticalLayout = layoutVerticalLegendGroups(
    [{ hasLabel: false, itemCount: categories.length }],
    Math.max(metrics.swatchSize, config.legendLayout?.rowHeight ?? ROW_HEIGHT)
  )[0]
  const items = metrics.items.map((item, i) => (
    <g key={`legend-${i}`} transform={`translate(${item.x},${item.y + verticalLayout.itemsY})`}>
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

  return (
    <g className="semiotic-legend" transform={`translate(${tx},${ty})`}>
      <line x1={0} y1={verticalLayout.lineY} x2={sideLegendWidth} y2={verticalLayout.lineY} stroke="gray" />
      {items}
    </g>
  )
}

export function renderStaticLegendGroups(config: StaticLegendGroupsConfig): React.ReactNode {
  if (flattenLegendGroups(config.legendGroups).length === 0) return null

  const metrics = computeStaticLegendGroupsLayout(config)
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const legendConfig = { legendGroups: config.legendGroups, legendDistance: config.legendDistance }
  const sideLegendWidth = config.reservedWidth ?? resolveSideLegendWidth(legendConfig, config.legendLayout)
  const legendDistance = resolveLegendDistance(legendConfig)
  const sideGutter = resolveLegendSideGutter(config.legendLayout)
  const separatorStroke = config.theme.colors.grid || config.theme.colors.textSecondary
  let tx: number, ty: number
  if (config.position === "left") {
    tx = config.margin.left - sideGutter - sideLegendWidth - legendDistance; ty = config.margin.top
  } else if (config.position === "top") {
    tx = config.margin.left; ty = config.margin.top - legendDistance - metrics.height
  } else if (config.position === "bottom") {
    tx = config.margin.left; ty = config.totalHeight - config.margin.bottom + legendDistance
  } else {
    tx = config.totalWidth - config.margin.right + sideGutter + legendDistance; ty = config.margin.top
  }

  if (!isHorizontal) {
    const groupLayouts = layoutVerticalLegendGroups(
      config.legendGroups.map((group) => ({
        hasLabel: Boolean(group.label),
        itemCount: group.items.length,
      })),
      Math.max(metrics.swatchSize, config.legendLayout?.rowHeight ?? ROW_HEIGHT)
    )

    const groups = config.legendGroups.flatMap((group, groupIndex) => {
      const layout = groupLayouts[groupIndex]
      const type = group.type ?? "fill"
      const nodes: React.ReactNode[] = [
        <line
          key={`legend-group-neatline-${groupIndex}`}
          x1={0}
          y1={layout.lineY}
          x2={sideLegendWidth}
          y2={layout.lineY}
          stroke="gray"
        />,
      ]

      if (group.label && layout.labelY != null) {
        nodes.push(
          <text
            key={`legend-group-label-${groupIndex}`}
            y={layout.labelY}
            fontSize={legendFontSize(config.theme)}
            fill={config.theme.colors.text}
            fontFamily={config.theme.typography.fontFamily}
          >
            {group.label}
          </text>
        )
      }

      nodes.push(
        <g key={`legend-group-${groupIndex}`} transform={`translate(0,${layout.itemsY})`}>
          {group.items.map((item, itemIndex) => {
            const style = group.styleFn(item, itemIndex)
            const typeNode = typeof type === "function"
              ? type(item)
              : type === "line"
                ? <line x1={0} y1={0} x2={metrics.swatchSize} y2={metrics.swatchSize} style={style} />
                : <rect width={metrics.swatchSize} height={metrics.swatchSize} rx={metrics.swatchRadius} style={style} />

            return (
              <g key={`legend-${groupIndex}-${itemIndex}`} transform={`translate(0,${itemIndex * Math.max(metrics.swatchSize, config.legendLayout?.rowHeight ?? ROW_HEIGHT)})`}>
                {typeNode}
                <text
                  x={metrics.labelOffset}
                  y={metrics.swatchSize / 2}
                  dominantBaseline="central"
                  fontSize={legendFontSize(config.theme)}
                  fill={config.theme.colors.text}
                  fontFamily={config.theme.typography.fontFamily}
                >
                  {item.label}
                </text>
              </g>
            )
          })}
        </g>
      )

      return nodes
    })

    return (
      <g className="semiotic-legend" transform={`translate(${tx},${ty})`} data-orientation="vertical">
        {groups}
      </g>
    )
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

    if (isHorizontal && groupIndex < metrics.groups.length - 1) {
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

  return (
    <g className="semiotic-legend" transform={`translate(${tx},${ty})`} data-orientation={isHorizontal ? "horizontal" : "vertical"}>
      {items}
    </g>
  )
}

export function renderStaticGradientLegend(config: StaticGradientLegendConfig): React.ReactNode {
  const metrics = measureStaticGradientLegend(config)
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const legendConfig = { gradient: config.gradient, legendDistance: config.legendDistance }
  const sideLegendWidth = resolveSideLegendWidth(legendConfig)
  const legendDistance = resolveLegendDistance(legendConfig)
  const sideGutter = resolveLegendSideGutter(config.legendLayout)
  const id = `${config.idPrefix ? `${config.idPrefix}-` : ""}semiotic-static-gradient-legend`
  const fmt = config.gradient.format || ((v: number) => String(Math.round(v * 100) / 100))
  let tx: number, ty: number
  if (config.position === "left") {
    tx = config.margin.left - sideGutter - sideLegendWidth - legendDistance; ty = config.margin.top
  } else if (config.position === "top") {
    tx = config.margin.left; ty = config.margin.top - legendDistance - metrics.height
  } else if (config.position === "bottom") {
    tx = config.margin.left; ty = config.totalHeight - config.margin.bottom + legendDistance
  } else {
    tx = config.totalWidth - config.margin.right + sideGutter + legendDistance; ty = config.margin.top
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
      {config.gradient.label && <text x={0} y={labelY} textAnchor="start" fontSize={config.theme.typography.tickSize} fill={config.theme.colors.text} fontFamily={config.theme.typography.fontFamily}>{config.gradient.label}</text>}
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
  data: Datum[],
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
