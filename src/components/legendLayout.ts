import type { LegendLayout, LegendValue } from "./types/legendTypes"
import { isGradientLegendConfig, isLegendConfig } from "./types/legendTypes"

export const DEFAULT_LEGEND_SWATCH_SIZE = 16
export const DEFAULT_LEGEND_LABEL_GAP = 6
export const DEFAULT_LEGEND_ITEM_GAP = 10
export const DEFAULT_LEGEND_ROW_HEIGHT = 22
export const DEFAULT_SIDE_LEGEND_WIDTH = 100
export const DEFAULT_LEGEND_DISTANCE = 10
// Legend focus rings are drawn at x/y=-2 with a 2px stroke. Three pixels keep
// the outer stroke inside the SVG when a side legend is placed at an edge.
export const DEFAULT_LEGEND_EDGE_GUTTER = 3

/** Keep a chart's data area meaningful when chart-owned chrome (currently a
 * legend) is measured in a compact frame. This intentionally does not shrink
 * caller/default margins: it caps only the reservation that was added for the
 * requested legend side. */
export function clampLegendReservation(
  margin: { top: number; right: number; bottom: number; left: number },
  baseline: { top: number; right: number; bottom: number; left: number },
  size: [number, number],
  position: "right" | "left" | "top" | "bottom",
  minPlotSize = 8
): void {
  const horizontal = position === "left" || position === "right"
  const side = position
  const opposite = position === "left" ? "right"
    : position === "right" ? "left"
      : position === "top" ? "bottom"
        : "top"
  const available = Math.max(0, (horizontal ? size[0] : size[1]) - minPlotSize)
  const maximumSide = Math.max(baseline[side], available - margin[opposite])
  if (margin[side] > maximumSide) margin[side] = maximumSide
}

/**
 * Labeled gradient legends use one shared, non-negative vertical layout in
 * both the browser and static SVG renderers. Legend placement treats its
 * transform as the top of the content box, so drawing the label at a negative
 * y (the old geometry) could clip side/top legends at the SVG edge and let a
 * bottom label intrude into the plot gap.
 */
export const GRADIENT_LEGEND_LABEL_BASELINE = 12
export const GRADIENT_LEGEND_LABELED_BAR_Y = 18
export const GRADIENT_LEGEND_HORIZONTAL_HEIGHT = 46
export const GRADIENT_LEGEND_HORIZONTAL_HEIGHT_UNLABELED = 26

/**
 * SVG text has no useful intrinsic width until after it is mounted. Keep the
 * estimate shared by margin calculation and rendering so side legends never
 * reserve one width and draw into another.
 */
export function estimateLegendTextWidth(label: string): number {
  return Math.ceil(label.length * 7)
}

/** Resolve the layout box needed by a left/right legend. */
export function resolveSideLegendWidth(
  legend: LegendValue | null | undefined,
  layout?: LegendLayout,
): number {
  if (isLegendConfig(legend)) {
    const metrics = resolveLegendMetrics(layout)
    const widths = legend.legendGroups.flatMap((group) => [
      group.label ? estimateLegendTextWidth(group.label) : 0,
      ...group.items.map((item) =>
        metrics.swatchSize + metrics.labelGap + estimateLegendTextWidth(item.label)
      ),
    ])
    return Math.max(DEFAULT_SIDE_LEGEND_WIDTH, ...widths)
  }

  if (isGradientLegendConfig(legend)) {
    const { gradient } = legend
    const format = gradient.format || ((value: number) => String(Math.round(value * 100) / 100))
    const endpointWidth = Math.max(
      estimateLegendTextWidth(format(gradient.domain[0])),
      estimateLegendTextWidth(format(gradient.domain[1])),
    )
    const labelWidth = gradient.label ? estimateLegendTextWidth(gradient.label) : 0
    return Math.max(DEFAULT_SIDE_LEGEND_WIDTH, 19 + endpointWidth, labelWidth)
  }

  // Custom React nodes cannot be measured before render. Preserve the
  // long-standing box as a predictable fallback.
  return DEFAULT_SIDE_LEGEND_WIDTH
}

/** Resolve the requested gap between the legend edge and plot edge. */
export function resolveLegendDistance(legend: LegendValue | null | undefined): number {
  if (
    (isLegendConfig(legend) || isGradientLegendConfig(legend)) &&
    Number.isFinite(legend.legendDistance)
  ) {
    return Math.max(0, legend.legendDistance as number)
  }
  return DEFAULT_LEGEND_DISTANCE
}

/** Resolve plot-adjacent chrome reserved before a left/right legend. */
export function resolveLegendSideGutter(layout?: LegendLayout): number {
  return Math.max(0, layout?.sideGutter ?? 0)
}

/** Resolve the outer edge clearance for a left/right legend. */
export function resolveLegendEdgeGutter(layout?: LegendLayout): number {
  return Math.max(0, layout?.edgeGutter ?? DEFAULT_LEGEND_EDGE_GUTTER)
}

/**
 * Height of the chrome a horizontal axis draws *outside* the plot rect, which
 * a top/bottom legend has to clear.
 *
 * The axis renderers place tick labels on a baseline 18px past the axis line
 * and an axis title at 40px (58px when ticks are rotated); each needs a few
 * more pixels for descenders. A bottom legend anchored at `plotBottom +
 * legendDistance` lands in exactly that band, so without this reservation the
 * legend and the tick labels draw at the same y.
 */
export const AXIS_TICK_CHROME = 22
export const AXIS_TITLE_CHROME = 46
export const ROTATED_AXIS_TITLE_CHROME = 64

export interface AxisChromeInput {
  /** A horizontal axis renders on this side of the plot. */
  hasAxis?: boolean
  /** An axis title (`xLabel` / `valueLabel` / `categoryLabel`) is present. */
  hasAxisLabel?: boolean
  /** Tick labels are rotated, which pushes the axis title further out. */
  rotatedTicks?: boolean
}

/**
 * Space to reserve between the plot edge and a top/bottom legend.
 *
 * `legendLayout.axisGutter` is the explicit override (including `0` to opt out
 * and restore pre-3.8.7 placement); otherwise the band is derived from the
 * axis chrome actually being drawn, and is 0 when there is no axis on that
 * side — so pie/donut and axes-off charts are unaffected.
 */
export function resolveAxisChromeGutter(
  input?: AxisChromeInput,
  layout?: LegendLayout,
): number {
  if (layout?.axisGutter != null) return Math.max(0, layout.axisGutter)
  if (!input?.hasAxis) return 0
  if (!input.hasAxisLabel) return AXIS_TICK_CHROME
  return input.rotatedTicks ? ROTATED_AXIS_TITLE_CHROME : AXIS_TITLE_CHROME
}

/**
 * Resolve `axisChrome` for an XY chart HOC's `useChartLegendAndMargin` call.
 * Mirrors `server/staticXY.tsx`'s `renderStreamXYFrame` (`hasAxis:
 * showAxes !== false`, `hasAxisLabel: !!xLabel`) so a bottom-legend chart
 * reserves the same margin on the client as `renderChart` does on the
 * server — leaving either side to guess (the pre-3.8.8 default) makes the
 * client over- or under-reserve relative to the SSR output whenever a
 * wrapped legend pushes the reservation past the 80px floor.
 */
export function resolveXYAxisChrome(input: {
  showAxes?: boolean
  xLabel?: unknown
}): AxisChromeInput {
  return { hasAxis: input.showAxes !== false, hasAxisLabel: !!input.xLabel }
}

/**
 * Resolve `axisChrome` for an ordinal chart HOC's `useChartLegendAndMargin`
 * call. Mirrors `server/staticOrdinal.tsx`'s `renderOrdinalFrame`: the
 * bottom axis is the value axis for `"horizontal"` projection, the category
 * axis otherwise, and radial projections draw no axis at all. See
 * `resolveXYAxisChrome` for why this must track the server computation.
 */
export function resolveOrdinalAxisChrome(input: {
  showAxes?: boolean
  projection?: "horizontal" | "vertical" | "radial"
  hasCategoryLabel: boolean
  hasValueLabel: boolean
}): AxisChromeInput {
  const projection = input.projection ?? "vertical"
  return {
    hasAxis: input.showAxes !== false && projection !== "radial",
    hasAxisLabel: projection === "horizontal" ? input.hasValueLabel : input.hasCategoryLabel,
  }
}

/** Estimate the layout-box height used to place a top/bottom legend. */
export function resolveHorizontalLegendHeight(
  legend: LegendValue | null | undefined,
  availableWidth: number,
  layout?: LegendLayout,
): number {
  if (isGradientLegendConfig(legend)) {
    return legend.gradient.label
      ? GRADIENT_LEGEND_HORIZONTAL_HEIGHT
      : GRADIENT_LEGEND_HORIZONTAL_HEIGHT_UNLABELED
  }
  if (!isLegendConfig(legend)) return 20

  const metrics = resolveLegendMetrics(layout)
  const maxWidth = Math.max(1, layout?.maxWidth ?? availableWidth)
  let height = metrics.rowHeight

  for (const group of legend.legendGroups) {
    let rows = 0
    let rowWidth = 0
    for (const item of group.items) {
      const itemWidth = metrics.swatchSize + metrics.labelGap + estimateLegendTextWidth(item.label)
      const nextWidth = rowWidth === 0 ? itemWidth : rowWidth + metrics.itemGap + itemWidth
      if (rowWidth > 0 && nextWidth > maxWidth) {
        rows += 1
        rowWidth = itemWidth
      } else {
        rowWidth = nextWidth
      }
    }
    if (group.items.length > 0) rows += 1
    height = Math.max(
      height,
      rows * metrics.rowHeight,
      group.label ? estimateLegendTextWidth(group.label) : 0,
    )
  }

  // Multi-group legends draw a vertical separator between groups that
  // overshoots the row content by 8px on each side (Legend.tsx draws it from
  // y=-8 to y=groupHeight+8), so reserve that overflow too.
  const separatorPad = legend.legendGroups.length > 1 ? 16 : 0
  return height + separatorPad
}

/** Margin required to fit a side legend and its plot-edge gap. */
export function resolveSideLegendMargin(
  legend: LegendValue | null | undefined,
  layout?: LegendLayout,
): number {
  return (
    resolveSideLegendWidth(legend, layout) +
    resolveLegendDistance(legend) +
    resolveLegendSideGutter(layout) +
    resolveLegendEdgeGutter(layout)
  )
}

export interface LegendMetrics {
  swatchSize: number
  labelGap: number
  itemGap: number
  rowHeight: number
  align: "start" | "center" | "end"
  maxWidth?: number
}

export interface VerticalLegendGroupInput {
  hasLabel: boolean
  itemCount: number
}

export interface VerticalLegendGroupLayout {
  lineY: number
  labelY?: number
  itemsY: number
  endY: number
}

/** Resolve the dimensions used by both the interactive and static legends. */
export function resolveLegendMetrics(layout?: LegendLayout): LegendMetrics {
  const swatchSize = Math.max(1, layout?.swatchSize ?? DEFAULT_LEGEND_SWATCH_SIZE)
  const rowHeight = Math.max(swatchSize, layout?.rowHeight ?? DEFAULT_LEGEND_ROW_HEIGHT)
  return {
    swatchSize,
    labelGap: Math.max(0, layout?.labelGap ?? DEFAULT_LEGEND_LABEL_GAP),
    itemGap: Math.max(0, layout?.itemGap ?? DEFAULT_LEGEND_ITEM_GAP),
    rowHeight,
    align: layout?.align === "left"
      ? "start"
      : layout?.align === "right"
        ? "end"
        : layout?.align ?? "start",
    maxWidth: layout?.maxWidth,
  }
}

/**
 * Lay out vertical legend groups using the long-standing Legend.tsx geometry.
 * Keeping this calculation renderer-neutral prevents SSR and CSR from drifting
 * when labels, multiple groups, or custom row heights are used.
 */
export function layoutVerticalLegendGroups(
  groups: VerticalLegendGroupInput[],
  rowHeight: number
): VerticalLegendGroupLayout[] {
  let offset = 24

  return groups.map(({ hasLabel, itemCount }) => {
    offset += 5
    const lineY = offset
    offset += 8

    let labelY: number | undefined
    if (hasLabel) {
      offset += 16
      labelY = offset
      offset += 8
    }

    const itemsY = offset
    offset += itemCount * rowHeight + 8

    return { lineY, labelY, itemsY, endY: offset }
  })
}
