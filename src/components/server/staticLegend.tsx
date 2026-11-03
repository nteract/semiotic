/**
 * Static legend rendering for server-side SVG.
 *
 * Builds legend SVG elements from data + colorScheme without React hooks.
 * Used by renderToStaticSVG when showLegend is true.
 */

import * as React from "react"
import { numericTickFormatter } from "../charts/shared/numericTickFormatter"
import { scaleOrdinal } from "d3-scale"
import { schemeCategory10 } from "../charts/shared/colorPalettes"
import { resolveExplicitColor } from "../charts/shared/colorUtils"
import type { SemioticTheme } from "../store/themeCore"
export { distinctCategories as extractCategories } from "../charts/shared/legendUtils"
import type { CategoricalLegendConfig, GradientLegendConfig, LegendGroup, LegendLayout } from "../types/legendTypes"
import {
  legendCharWidth,
  legendFontFamily,
  legendFontSize,
  legendFontWeight,
  renderStaticMoreRow,
  staticLegendLabelText,
} from "./staticLegendText"
import {
  GRADIENT_LEGEND_HORIZONTAL_HEIGHT,
  GRADIENT_LEGEND_HORIZONTAL_HEIGHT_UNLABELED,
  GRADIENT_LEGEND_LABEL_BASELINE,
  GRADIENT_LEGEND_LABELED_BAR_Y,
  fitSideLegend,
  layoutVerticalLegendGroups,
  legendDisplayLabel,
  legendMoreTitle,
  resolveLegendMetrics,
  fitLegendRows,
  resolveHorizontalLegendMaxRows,
  resolveLegendPlacement,
  resolveLegendRenderBounds,
  resolveSideLegendWidth,
  sideLegendSlotOffset,
  type AxisChromeInput,
  type LegendPlacementInput,
  type SideLegendFit,
} from "../legendLayout"

/**
 * Fit a side legend with the same columns, truncation and "+N more" summary
 * as the interactive <Legend>, so SSR output matches the hydrated chart.
 */
function fitStaticSideLegend(
  legend: CategoricalLegendConfig,
  input: LegendPlacementInput,
  reservedWidth: number | undefined,
): SideLegendFit {
  const bounds = resolveLegendRenderBounds(legend, input)
  return fitSideLegend(
    legend.legendGroups,
    input.legendLayout,
    reservedWidth != null ? { ...bounds, maxWidth: reservedWidth } : bounds,
  )
}

interface LegendItemLayout {
  category: string
  width: number
  x: number
  y: number
}

interface StaticLegendMetrics {
  items: LegendItemLayout[]
  /** Origin of a horizontal "+N more" slot when rows were capped. */
  more?: { x: number; y: number }
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
  more?: { x: number; y: number }
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
  /**
   * Axis chrome on the legend's side, so a top/bottom legend clears the tick
   * labels instead of drawing on them. Mirrors `renderLegendFromConfig`.
   */
  axisChrome?: AxisChromeInput
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

function itemWidth(category: string, swatchSize: number, labelGap: number, theme: SemioticTheme): number {
  return swatchSize + labelGap + Math.ceil(legendDisplayLabel(category).length * legendCharWidth(theme))
}

function computeStaticLegendLayout(
  config: StaticLegendConfig,
  maxRows = Number.POSITIVE_INFINITY,
): StaticLegendMetrics {
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
    const fit = fitLegendRows(widths, {
      itemGap,
      labelOffset,
      maxWidth,
      maxRows,
      charWidth: legendCharWidth(theme),
    })

    const align = normalizedAlign(legendLayout?.align)
    const items: LegendItemLayout[] = []
    let more: StaticLegendMetrics["more"]
    fit.rows.forEach((row, rowIndex) => {
      const rowOffset =
        align === "center"
          ? Math.max(0, (maxWidth - row.width) / 2)
          : align === "end"
            ? Math.max(0, maxWidth - row.width)
            : 0
      let x = rowOffset
      for (let i = row.start; i < row.end; i++) {
        items.push({ category: categories[i], width: fit.widths[i], x, y: rowIndex * rowHeight })
        x += fit.widths[i] + itemGap
      }
      if (fit.hiddenCount > 0 && rowIndex === fit.rows.length - 1) {
        more = { x: rowOffset + fit.moreX, y: rowIndex * rowHeight }
      }
    })

    return {
      items,
      more,
      width: fit.width,
      height: fit.rows.length * rowHeight,
      swatchSize,
      labelOffset,
      swatchRadius,
    }
  }

  const columnWidth = widths.reduce((max, width) => Math.max(max, width), 0)
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

function computeHorizontalLegendGroupsLayout(
  config: StaticLegendGroupsConfig,
  maxRows = Number.POSITIVE_INFINITY,
): StaticLegendGroupMetrics {
  const { legendGroups, theme, totalWidth, margin, legendLayout } = config
  const { swatchSize, labelGap } = resolveLegendMetrics(legendLayout)
  const labelOffset = swatchSize + labelGap
  const swatchRadius = 0
  const groupLabelSize = Math.max(12, legendFontSize(theme))
  const labelPadding = 8
  const separatorGap = 12
  const plotWidth = Math.max(swatchSize, totalWidth - margin.left - margin.right)

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
    }, maxRows)
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
      more: itemMetrics.more,
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

export function measureStaticLegendGroups(config: StaticLegendGroupsConfig): Omit<StaticLegendMetrics, "items" | "labelOffset" | "swatchRadius"> {
  if (config.position === "top" || config.position === "bottom") {
    const { width, height, swatchSize } = computeHorizontalLegendGroupsLayout(config)
    return { width, height, swatchSize }
  }
  const { legendGroups, theme, legendLayout } = config
  const { swatchSize, labelGap, rowHeight } = resolveLegendMetrics(legendLayout)
  const verticalLayouts = layoutVerticalLegendGroups(
    legendGroups.map((group) => ({
      hasLabel: Boolean(group.label),
      itemCount: group.items.length,
    })),
    rowHeight
  )
  // Unbounded measurement is separate from rendering. Side legends render
  // the fitted columns/rows from fitStaticSideLegend, so measuring every label
  // again would discard this width and height before painting.
  const width = legendGroups.reduce((max, group) => group.items.reduce(
    (itemMax, item) => Math.max(itemMax, itemWidth(item.label, swatchSize, labelGap, theme)),
    Math.max(max, group.label ? itemWidth(group.label, 0, 0, theme) : 0)
  ), 0)

  return {
    width,
    height: verticalLayouts.at(-1)?.endY ?? 0,
    swatchSize,
  }
}

export function measureStaticGradientLegend(config: StaticGradientLegendConfig): { width: number; height: number; swatchSize: number } {
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const plotWidth = Math.max(1, config.totalWidth - config.margin.left - config.margin.right)
  if (isHorizontal) {
    return {
      width: Math.min(config.legendLayout?.maxWidth ?? plotWidth, 200),
      height: config.gradient.label
        ? GRADIENT_LEGEND_HORIZONTAL_HEIGHT
        : GRADIENT_LEGEND_HORIZONTAL_HEIGHT_UNLABELED,
      swatchSize: 12,
    }
  }
  return {
    width: config.gradient.label ? 86 : 72,
    height: config.gradient.label
      ? GRADIENT_LEGEND_LABELED_BAR_Y + 108
      : 108,
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

  // `StaticLegendConfig.legendDistance` predates the structured categorical
  // config. Carry it into the shared placement input so an explicit caller
  // gap is not silently replaced by the default while the grouped and
  // gradient paths retain theirs.
  const categoricalLegend = {
    ...buildStaticCategoricalLegendConfig(categories, colorScheme, theme)!,
    legendDistance: config.legendDistance,
  }
  const placementInput = {
    totalWidth,
    totalHeight,
    margin,
    position,
    legendLayout: config.legendLayout,
    axisChrome: config.axisChrome,
    hasTitle: config.hasTitle,
  }
  const metrics = computeStaticLegendLayout(
    config,
    isHorizontal ? resolveHorizontalLegendMaxRows(categoricalLegend, placementInput) : undefined,
  )
  const fit = isHorizontal
    ? undefined
    : fitStaticSideLegend(categoricalLegend, placementInput, config.reservedWidth)
  const sideLegendWidth = config.reservedWidth ?? fit?.width ?? resolveSideLegendWidth(categoricalLegend, config.legendLayout)
  const { x: tx, y: ty } = resolveLegendPlacement(categoricalLegend, {
    ...placementInput,
    reservedWidth: sideLegendWidth,
  })

  // Both orientations paint identical swatches and labels; vertical legends
  // additionally reserve the shared header and neatline above their items,
  // and wrap into columns or a "+N more" row instead of leaving the chart.
  const verticalLayout = fit?.groups[0]
  const visibleItems = verticalLayout
    ? metrics.items.slice(0, verticalLayout.visibleCount)
    : metrics.items
  const items = visibleItems.map((item, i) => {
    const offset = fit && verticalLayout
      ? sideLegendSlotOffset(fit, verticalLayout, i)
      : item
    return (
      <g key={`legend-${i}`} transform={`translate(${offset.x},${offset.y + (verticalLayout?.itemsY ?? 0)})`}>
        <rect width={metrics.swatchSize} height={metrics.swatchSize} fill={colorScale(item.category)} rx={metrics.swatchRadius} />
        <text
          x={metrics.labelOffset}
          y={metrics.swatchSize / 2}
          dominantBaseline="central"
          fontSize={legendFontSize(theme)}
          fill={theme.colors.text}
          fontFamily={legendFontFamily(theme)}
        >
          {fit
            ? staticLegendLabelText(item.category, fit.labelWidth)
            : staticLegendLabelText(item.category, item.width - metrics.labelOffset, legendCharWidth(theme))}
        </text>
      </g>
    )
  })
  if (metrics.more && !fit) {
    items.push(renderStaticMoreRow(
      "legend-more",
      metrics.more,
      metrics.swatchSize,
      categories.length - metrics.items.length,
      legendMoreTitle(categoricalLegend.legendGroups[0].items, metrics.items.length),
      theme,
    ))
  }
  if (fit && verticalLayout && verticalLayout.hiddenCount > 0) {
    const offset = sideLegendSlotOffset(fit, verticalLayout, verticalLayout.visibleCount)
    items.push(renderStaticMoreRow(
      "legend-more",
      { x: offset.x, y: offset.y + verticalLayout.itemsY },
      metrics.swatchSize,
      verticalLayout.hiddenCount,
      legendMoreTitle(categoricalLegend.legendGroups[0].items, verticalLayout.visibleCount),
      theme,
    ))
  }

  return (
    <g className="semiotic-legend" transform={`translate(${tx},${ty})`} fontWeight={legendFontWeight(theme)}>
      {verticalLayout && <line x1={0} y1={verticalLayout.lineY} x2={sideLegendWidth} y2={verticalLayout.lineY} stroke="gray" />}
      {items}
    </g>
  )
}

export function renderStaticLegendGroups(config: StaticLegendGroupsConfig): React.ReactNode {
  if (!config.legendGroups.some(group => group.items.some(() => true))) return null

  const isHorizontal = config.position === "top" || config.position === "bottom"
  const legendConfig = { legendGroups: config.legendGroups, legendDistance: config.legendDistance }
  const separatorStroke = config.theme.colors.grid || config.theme.colors.textSecondary
  const placementInput = {
    totalWidth: config.totalWidth,
    totalHeight: config.totalHeight,
    margin: config.margin,
    position: config.position,
    legendLayout: config.legendLayout,
    axisChrome: config.axisChrome,
    hasTitle: config.hasTitle,
  }
  const fit = isHorizontal
    ? undefined
    : fitStaticSideLegend(legendConfig, placementInput, config.reservedWidth)
  const sideLegendWidth = config.reservedWidth ?? fit?.width ?? resolveSideLegendWidth(legendConfig, config.legendLayout)
  const { x: tx, y: ty } = resolveLegendPlacement(legendConfig, {
    ...placementInput,
    reservedWidth: sideLegendWidth,
  })

  if (fit) {
    const { swatchSize, labelGap } = resolveLegendMetrics(config.legendLayout)
    const labelOffset = swatchSize + labelGap
    const groups = config.legendGroups.flatMap((group, groupIndex) => {
      const layout = fit.groups[groupIndex]
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
            fontFamily={legendFontFamily(config.theme)}
          >
            {staticLegendLabelText(group.label, sideLegendWidth)}
          </text>
        )
      }

      const itemNodes = group.items.slice(0, layout.visibleCount).map((item, itemIndex) => {
        const style = group.styleFn(item, itemIndex)
        const typeNode = typeof type === "function"
          ? type(item)
          : type === "line"
            ? <line x1={0} y1={0} x2={swatchSize} y2={swatchSize} style={style} />
            : <rect width={swatchSize} height={swatchSize} rx={0} style={style} />
        const offset = sideLegendSlotOffset(fit, layout, itemIndex)

        return (
          <g key={`legend-${groupIndex}-${itemIndex}`} transform={`translate(${offset.x},${offset.y})`}>
            {typeNode}
            <text
              x={labelOffset}
              y={swatchSize / 2}
              dominantBaseline="central"
              fontSize={legendFontSize(config.theme)}
              fill={config.theme.colors.text}
              fontFamily={legendFontFamily(config.theme)}
            >
              {staticLegendLabelText(item.label, fit.labelWidth)}
            </text>
          </g>
        )
      })
      if (layout.hiddenCount > 0) {
        itemNodes.push(renderStaticMoreRow(
          `legend-more-${groupIndex}`,
          sideLegendSlotOffset(fit, layout, layout.visibleCount),
          swatchSize,
          layout.hiddenCount,
          legendMoreTitle(group.items, layout.visibleCount),
          config.theme,
        ))
      }

      nodes.push(
        <g key={`legend-group-${groupIndex}`} transform={`translate(0,${layout.itemsY})`}>
          {itemNodes}
        </g>
      )

      return nodes
    })

    return (
      <g className="semiotic-legend" transform={`translate(${tx},${ty})`} data-orientation="vertical" fontWeight={legendFontWeight(config.theme)}>
        {groups}
      </g>
    )
  }

  const metrics = computeHorizontalLegendGroupsLayout(
    config,
    resolveHorizontalLegendMaxRows(legendConfig, placementInput),
  )
  const items = metrics.groups.flatMap((groupLayout, groupIndex) => {
    const { group } = groupLayout
    const type = group.type ?? "fill"
    const groupNodes: React.ReactNode[] = []

    if (group.label) {
      groupNodes.push(
        <text
          key={`legend-group-label-${groupIndex}`}
          transform={`translate(${groupLayout.x},${groupLayout.y}) rotate(90)`}
          textAnchor="start"
          fontSize={legendFontSize(config.theme)}
          fill={config.theme.colors.text}
          fontFamily={legendFontFamily(config.theme)}
        >
          {group.label}
        </text>
      )
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
            fontFamily={legendFontFamily(config.theme)}
          >
            {staticLegendLabelText(layout.category, layout.width - metrics.labelOffset, legendCharWidth(config.theme))}
          </text>
        </g>
      )
    }))
    if (groupLayout.more) {
      groupNodes.push(renderStaticMoreRow(
        `legend-more-${groupIndex}`,
        {
          x: groupLayout.x + groupLayout.itemOffsetX + groupLayout.more.x,
          y: groupLayout.y + groupLayout.itemOffsetY + groupLayout.more.y,
        },
        metrics.swatchSize,
        group.items.length - groupLayout.items.length,
        legendMoreTitle(group.items, groupLayout.items.length),
        config.theme,
      ))
    }

    if (groupIndex < metrics.groups.length - 1) {
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
    <g className="semiotic-legend" transform={`translate(${tx},${ty})`} data-orientation="horizontal" fontWeight={legendFontWeight(config.theme)}>
      {items}
    </g>
  )
}

export function renderStaticGradientLegend(
  config: StaticGradientLegendConfig
): React.ReactNode {
  const metrics = measureStaticGradientLegend(config)
  const isHorizontal = config.position === "top" || config.position === "bottom"
  const legendConfig = {
    gradient: config.gradient,
    legendDistance: config.legendDistance
  }
  const sideLegendWidth = resolveSideLegendWidth(legendConfig)
  const id = `${config.idPrefix ? `${config.idPrefix}-` : ""}semiotic-static-gradient-legend`
  const fmt =
    config.gradient.format || numericTickFormatter(config.gradient.domain)
  const { x: tx, y: ty } = resolveLegendPlacement(legendConfig, {
    totalWidth: config.totalWidth,
    totalHeight: config.totalHeight,
    margin: config.margin,
    position: config.position,
    legendLayout: config.legendLayout,
    axisChrome: config.axisChrome,
    reservedWidth: sideLegendWidth
  })

  const stops = Array.from({ length: 17 }, (_, i) => {
    const t = i / 16
    const value = isHorizontal
      ? config.gradient.domain[0] +
        t * (config.gradient.domain[1] - config.gradient.domain[0])
      : config.gradient.domain[1] -
        t * (config.gradient.domain[1] - config.gradient.domain[0])
    return (
      <stop key={i} offset={t} stopColor={config.gradient.colorFn(value)} />
    )
  })

  const barWidth = isHorizontal ? metrics.width : 14
  const barHeight = isHorizontal ? 12 : 100
  const labelY = config.gradient.label
    ? GRADIENT_LEGEND_LABEL_BASELINE
    : undefined
  const barY = config.gradient.label ? GRADIENT_LEGEND_LABELED_BAR_Y : 0
  return (
    <g
      className="semiotic-legend"
      transform={`translate(${tx},${ty})`}
      fontWeight={legendFontWeight(config.theme)}
    >
      <defs>
        <linearGradient
          id={id}
          x1="0%"
          y1="0%"
          x2={isHorizontal ? "100%" : "0%"}
          y2={isHorizontal ? "0%" : "100%"}
        >
          {stops}
        </linearGradient>
      </defs>
      {config.gradient.label && (
        <text
          x={isHorizontal ? barWidth / 2 : 0}
          y={labelY}
          textAnchor={isHorizontal ? "middle" : "start"}
          fontSize={config.theme.typography.tickSize}
          fill={config.theme.colors.text}
          fontFamily={legendFontFamily(config.theme)}
        >
          {config.gradient.label}
        </text>
      )}
      <rect
        x={0}
        y={barY}
        width={barWidth}
        height={barHeight}
        fill={`url(#${id})`}
        rx={2}
      />
      <text
        x={isHorizontal ? 0 : barWidth + 5}
        y={barY + (isHorizontal ? barHeight + 12 : 10)}
        textAnchor={isHorizontal ? "start" : undefined}
        fontSize={config.theme.typography.tickSize}
        fill={config.theme.colors.textSecondary}
        fontFamily={legendFontFamily(config.theme)}
      >
        {fmt(config.gradient.domain[isHorizontal ? 0 : 1])}
      </text>
      <text
        x={isHorizontal ? barWidth : barWidth + 5}
        y={barY + barHeight + (isHorizontal ? 12 : 0)}
        textAnchor={isHorizontal ? "end" : undefined}
        fontSize={config.theme.typography.tickSize}
        fill={config.theme.colors.textSecondary}
        fontFamily={legendFontFamily(config.theme)}
      >
        {fmt(config.gradient.domain[isHorizontal ? 1 : 0])}
      </text>
    </g>
  )
}
