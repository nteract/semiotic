import { resolveXYAxes } from "./stream/resolveXYAxes"
import type { LegendLayout, LegendValue } from "./types/legendTypes"
import { numericTickFormatter } from "./charts/shared/numericTickFormatter"
import { isGradientLegendConfig, isLegendConfig } from "./types/legendTypes"
import {
  MIN_TITLE_TOP_LEGEND_MARGIN,
  MIN_TOP_LEGEND_MARGIN,
} from "./stream/titleLayout"
import {
  DEFAULT_SIDE_LEGEND_WIDTH,
  MAX_HORIZONTAL_LEGEND_HEIGHT_RATIO,
  MAX_SIDE_LEGEND_WIDTH_RATIO,
  estimateLegendTextWidth,
  fitLegendRows,
  fitSideLegend,
  legendDisplayLabel,
  legendRowsFor,
  resolveLegendMetrics,
  type LegendBounds,
} from "./legendGeometry"

// Geometry primitives live in `legendGeometry.ts`; re-exported so existing
// imports from this module keep working.
export {
  DEFAULT_LEGEND_ITEM_GAP,
  DEFAULT_LEGEND_LABEL_GAP,
  DEFAULT_LEGEND_ROW_HEIGHT,
  DEFAULT_LEGEND_SWATCH_SIZE,
  DEFAULT_SIDE_LEGEND_WIDTH,
  EMPTY_LEGEND_LABEL,
  MAX_HORIZONTAL_LEGEND_HEIGHT_RATIO,
  MAX_SIDE_LEGEND_WIDTH_RATIO,
  MIN_SIDE_LEGEND_LABEL_CHARS,
  estimateLegendTextWidth,
  fitLegendRows,
  fitSideLegend,
  layoutVerticalLegendGroups,
  legendDisplayLabel,
  legendMoreLabel,
  legendMoreTitle,
  legendRowsFor,
  resolveLegendMetrics,
  sideLegendSlotOffset,
  truncateLegendLabel,
} from "./legendGeometry"
export type {
  LegendMetrics,
  LegendRow,
  LegendRowsFit,
  LegendBounds,
  SideLegendFit,
  SideLegendGroupFit,
  VerticalLegendGroupInput,
  VerticalLegendGroupLayout,
} from "./legendGeometry"

export const DEFAULT_LEGEND_DISTANCE = 10
// Legend focus rings are drawn at x/y=-2 with a 2px stroke. Three pixels keep
// the outer stroke inside the SVG when a side legend is placed at an edge.
export const DEFAULT_LEGEND_EDGE_GUTTER = 3

/** Keep a chart's data area meaningful when chart-owned chrome (currently a
 * legend) is measured in a compact frame. This does not shrink
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

/** Widest box a measured left/right legend may reserve in a chart. */
export function resolveSideLegendMaxWidth(
  chartWidth: number,
  layout?: LegendLayout,
): number {
  if (layout?.maxWidth != null) return Math.max(1, layout.maxWidth)
  return Math.max(
    DEFAULT_SIDE_LEGEND_WIDTH,
    Math.floor(chartWidth * MAX_SIDE_LEGEND_WIDTH_RATIO),
  )
}

/**
 * Space a legend may draw into once margins are known, shared by the live and
 * static renderers. A left/right legend gets the side margin left after its
 * gutters (never below the 100px minimum box, which compact frames already
 * let overlap the plot) and the height from the plot top to the chart bottom.
 * A top/bottom legend (which wraps to the plot width) gets the height of the
 * band left in its margin after axis chrome, the plot gap and (above a top
 * legend) the title.
 */
export function resolveLegendRenderBounds(
  legend: LegendValue | null | undefined,
  input: LegendPlacementInput,
): LegendBounds {
  const position = input.position ?? "right"
  if (position === "top" || position === "bottom") {
    const band = position === "top"
      ? input.margin.top -
        resolveAxisChromeGutter(input.axisChrome?.topAxis, input.legendLayout) -
        (input.hasTitle ? 24 : 0)
      : input.margin.bottom - resolveAxisChromeGutter(input.axisChrome, input.legendLayout)
    return { maxHeight: Math.max(0, band - resolveLegendDistance(legend)) }
  }
  const left = position === "left"
  const reserved =
    input.margin[left ? "left" : "right"] -
    resolveLegendSideGutter(
      input.legendLayout,
      left ? input.axisChrome?.leftAxis : input.axisChrome?.rightAxis,
    ) -
    resolveLegendDistance(legend) -
    resolveLegendEdgeGutter(input.legendLayout)
  const space = Math.max(DEFAULT_SIDE_LEGEND_WIDTH, reserved)
  return {
    maxWidth: input.legendLayout?.maxWidth != null
      ? Math.min(space, Math.max(1, input.legendLayout.maxWidth))
      : space,
    maxHeight: Math.max(0, input.totalHeight - input.margin.top),
  }
}

/** Rows a top/bottom legend may draw in the band reserved for it. */
export function resolveHorizontalLegendMaxRows(
  legend: LegendValue | null | undefined,
  input: LegendPlacementInput,
): number {
  return legendRowsFor(
    resolveLegendRenderBounds(legend, input).maxHeight ?? 0,
    resolveLegendMetrics(input.legendLayout).rowHeight,
    isLegendConfig(legend) ? legend.legendGroups.length : 1,
  )
}

/** Resolve the layout box needed by a left/right legend. */
export function resolveSideLegendWidth(
  legend: LegendValue | null | undefined,
  layout?: LegendLayout,
  bounds?: LegendBounds,
): number {
  if (isLegendConfig(legend)) {
    return fitSideLegend(legend.legendGroups, layout, bounds).width
  }

  if (isGradientLegendConfig(legend)) {
    const { gradient } = legend
    const format = gradient.format || numericTickFormatter(gradient.domain)
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
export function resolveLegendSideGutter(
  layout?: LegendLayout,
  axisChrome?: Omit<AxisChromeInput, "topAxis" | "leftAxis" | "rightAxis">,
): number {
  if (layout?.sideGutter != null) return Math.max(0, layout.sideGutter)
  if (!axisChrome?.hasAxis) return 0
  return axisChrome.hasAxisLabel ? SIDE_AXIS_TITLE_CHROME : SIDE_AXIS_TICK_CHROME
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
/** Width needed between a side legend and a vertical axis's tick labels. */
export const SIDE_AXIS_TICK_CHROME = 34
/** Width needed between a side legend and a vertical axis title/ticks. */
export const SIDE_AXIS_TITLE_CHROME = 70

export interface AxisChromeInput {
  /** A horizontal axis renders on this side of the plot. */
  hasAxis?: boolean
  /** An axis title (`xLabel` / `valueLabel` / `categoryLabel`) is present. */
  hasAxisLabel?: boolean
  /** Tick labels are rotated, which pushes the axis title further out. */
  rotatedTicks?: boolean
  /**
   * Chrome drawn above the plot. `axisChrome` itself describes the bottom
   * side for backwards compatibility; a top legend uses this companion when
   * a caller has explicitly configured a top x axis.
   */
  topAxis?: Omit<AxisChromeInput, "topAxis">
  /** Chrome drawn to the left of the plot, used by a left legend. */
  leftAxis?: Omit<AxisChromeInput, "topAxis" | "leftAxis" | "rightAxis">
  /** Chrome drawn to the right of the plot, used by a right legend. */
  rightAxis?: Omit<AxisChromeInput, "topAxis" | "leftAxis" | "rightAxis">
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
  yLabel?: unknown
  yLabelRight?: unknown
  axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean; visible?: boolean }>
  rotatedTicks?: boolean
}): AxisChromeInput {
  const { bottomAxis, topAxis, leftAxis, rightAxis } = resolveXYAxes(input.axes)
  // No horizontal config means the frame renders its default bottom axis.
  // A top-only config instead moves that axis above the plot, so it should
  // not make a bottom legend reserve an imaginary lower gutter.
  const hasBottomAxis = (!topAxis || !!bottomAxis) && bottomAxis?.visible !== false
  const hasTopAxis = !!topAxis && !bottomAxis && topAxis.visible !== false
  const hasLeftAxis = (!rightAxis || !!leftAxis) && leftAxis?.visible !== false
  const hasRightAxis = !!rightAxis && rightAxis.visible !== false
  const visible = input.showAxes !== false
  return {
    hasAxis: visible && hasBottomAxis,
    hasAxisLabel: visible && hasBottomAxis && !!(bottomAxis?.label ?? input.xLabel),
    // Margin resolution happens before the tick renderer can measure its
    // final collision result. Treat an enabled `autoRotate` as rotated here:
    // the small amount of extra gutter when labels ultimately fit is safe,
    // while reserving only the unrotated title band lets a bottom legend
    // paint through the rotated title in compact charts.
    rotatedTicks: visible && hasBottomAxis && (input.rotatedTicks ?? Boolean(bottomAxis?.autoRotate)),
    topAxis: hasTopAxis
      ? {
          hasAxis: visible,
          hasAxisLabel: visible && !!(topAxis?.label ?? input.xLabel),
          rotatedTicks: visible && (input.rotatedTicks ?? Boolean(topAxis?.autoRotate)),
        }
      : undefined,
    leftAxis: hasLeftAxis
      ? {
          hasAxis: visible,
          hasAxisLabel: visible && !!(leftAxis?.label ?? input.yLabel),
        }
      : undefined,
    rightAxis: hasRightAxis
      ? {
          hasAxis: visible,
          hasAxisLabel: visible && !!(rightAxis?.label ?? input.yLabelRight ?? input.yLabel),
        }
      : undefined,
  }
}

/**
 * Merge a high-level chart's defaults with optional `frameProps` before
 * measuring legend-adjacent axis chrome. The rendered frame receives the
 * same precedence, so centralizing it prevents every XY wrapper from
 * accidentally reserving a bottom-only/default axis for a supplied top or
 * side-axis configuration.
 */
export function resolveXYFramePropsAxisChrome(
  frameProps: {
    showAxes?: boolean
    xLabel?: unknown
    yLabel?: unknown
    yLabelRight?: unknown
    axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean; visible?: boolean }>
  },
  defaults: {
    showAxes?: boolean
    xLabel?: unknown
    yLabel?: unknown
    yLabelRight?: unknown
    axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean; visible?: boolean }>
  },
): AxisChromeInput {
  return resolveXYAxisChrome({
    showAxes: frameProps.showAxes ?? defaults.showAxes,
    xLabel: frameProps.xLabel ?? defaults.xLabel,
    yLabel: frameProps.yLabel ?? defaults.yLabel,
    yLabelRight: frameProps.yLabelRight ?? defaults.yLabelRight,
    axes: frameProps.axes ?? defaults.axes,
  })
}

/**
 * Resolve `axisChrome` for an ordinal chart HOC's `useChartLegendAndMargin`
 * call. Mirrors `server/staticOrdinal.tsx`'s `renderOrdinalFrame`: the
 * bottom axis is the value axis for `"horizontal"` projection, the category
 * axis otherwise. Its companion left axis is the remaining category/value
 * axis, which matters when a left legend must clear a vertical axis title.
 * Radial projections draw neither. See `resolveXYAxisChrome` for why this
 * must track the server computation.
 */
export function resolveOrdinalAxisChrome(input: {
  showAxes?: boolean
  projection?: "horizontal" | "vertical" | "radial"
  hasCategoryLabel: boolean
  hasValueLabel: boolean
}): AxisChromeInput {
  const projection = input.projection ?? "vertical"
  const visible = input.showAxes !== false && projection !== "radial"
  return {
    hasAxis: visible,
    hasAxisLabel: visible && (projection === "horizontal" ? input.hasValueLabel : input.hasCategoryLabel),
    leftAxis: {
      hasAxis: visible,
      hasAxisLabel: visible && (projection === "horizontal" ? input.hasCategoryLabel : input.hasValueLabel),
    },
  }
}

/** Estimate the layout-box height used to place a top/bottom legend. */
export function resolveHorizontalLegendHeight(
  legend: LegendValue | null | undefined,
  availableWidth: number,
  layout?: LegendLayout,
  maxRows?: number,
): number {
  if (isGradientLegendConfig(legend)) {
    return legend.gradient.label
      ? GRADIENT_LEGEND_HORIZONTAL_HEIGHT
      : GRADIENT_LEGEND_HORIZONTAL_HEIGHT_UNLABELED
  }
  if (!isLegendConfig(legend)) return 20

  const metrics = resolveLegendMetrics(layout)
  const maxWidth = Math.max(1, layout?.maxWidth ?? availableWidth)
  const labelOffset = metrics.swatchSize + metrics.labelGap
  let height = metrics.rowHeight

  for (const group of legend.legendGroups) {
    const { rows } = fitLegendRows(
      group.items.map((item) => labelOffset + estimateLegendTextWidth(legendDisplayLabel(item.label))),
      { itemGap: metrics.itemGap, labelOffset, maxWidth, maxRows },
    )
    height = Math.max(
      height,
      rows.length * metrics.rowHeight,
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
  axisChrome?: Omit<AxisChromeInput, "topAxis" | "leftAxis" | "rightAxis">,
  bounds?: LegendBounds,
): number {
  return (
    resolveSideLegendWidth(legend, layout, bounds) +
    resolveLegendDistance(legend) +
    resolveLegendSideGutter(layout, axisChrome) +
    resolveLegendEdgeGutter(layout)
  )
}

/**
 * Apply the shared legend reservation used by HOC layout, direct stream
 * frames, and static rendering. Keeping this here prevents direct SSR from
 * reserving a different fallback box for raw React legends than its live
 * hydration target.
 */
export function reserveLegendMargin(
  margin: { top: number; right: number; bottom: number; left: number },
  options: {
    legend: LegendValue | null | undefined
    position?: "right" | "left" | "top" | "bottom"
    size: [number, number]
    hasTitle?: boolean
    legendLayout?: LegendLayout
    minimumMargin?: number
    axisChrome?: AxisChromeInput
  },
): void {
  const { legend } = options
  if (!legend) return
  const position = options.position ?? "right"
  const plotWidth = Math.max(1, options.size[0] - margin.left - margin.right)
  // A top/bottom legend gets at most its share of the chart height; rows
  // beyond that collapse into "+N more" instead of squeezing the plot.
  const horizontalHeight = resolveHorizontalLegendHeight(
    legend,
    plotWidth,
    options.legendLayout,
    legendRowsFor(
      options.size[1] * MAX_HORIZONTAL_LEGEND_HEIGHT_RATIO,
      resolveLegendMetrics(options.legendLayout).rowHeight,
      isLegendConfig(legend) ? legend.legendGroups.length : 1,
    ),
  )
  const distance = resolveLegendDistance(legend)
  const axisChrome = position === "bottom"
    ? options.axisChrome
    : position === "top"
      ? options.axisChrome?.topAxis
      : undefined
  const horizontalRequirement =
    horizontalHeight +
    distance +
    resolveAxisChromeGutter(axisChrome, options.legendLayout) +
    (position === "top" && options.hasTitle ? 24 : 0)
  // Direct Stream frames already apply this floor through
  // `reserveFrameChromeMargin`; static and HOC callers arrive here directly.
  // Keep the minimum owned by the shared reservation so their top-legend
  // geometry cannot drift by a few pixels before the legend’s own height is
  // considered.
  const minimum = Math.max(
    options.minimumMargin ?? 0,
    position === "top"
      ? options.hasTitle ? MIN_TITLE_TOP_LEGEND_MARGIN : MIN_TOP_LEGEND_MARGIN
      : 0,
  )

  // A side legend wraps into columns rather than running below the chart,
  // and never claims more than its capped share of the chart width.
  const sideBounds: LegendBounds = {
    maxWidth: resolveSideLegendMaxWidth(options.size[0], options.legendLayout),
    maxHeight: Math.max(0, options.size[1] - margin.top),
  }

  if (position === "right") {
    margin.right = Math.max(
      margin.right,
      minimum,
      resolveSideLegendMargin(legend, options.legendLayout, options.axisChrome?.rightAxis, sideBounds),
    )
  } else if (position === "left") {
    margin.left = Math.max(
      margin.left,
      minimum,
      resolveSideLegendMargin(legend, options.legendLayout, options.axisChrome?.leftAxis, sideBounds),
    )
  } else if (position === "top") {
    margin.top = Math.max(margin.top, minimum, horizontalRequirement)
  } else {
    margin.bottom = Math.max(margin.bottom, minimum, horizontalRequirement)
  }
}

export interface LegendPlacementInput {
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  position?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  axisChrome?: AxisChromeInput
  /** Static renderers may reserve a measured side box wider than the default. */
  reservedWidth?: number
  /** A chart title sits above a top legend's band. */
  hasTitle?: boolean
}

/**
 * Resolve the origin and box used by both live and static legend renderers.
 * This includes the predictable fallback box for raw React nodes, whose
 * intrinsic SVG dimensions cannot be measured before rendering.
 */
export function resolveLegendPlacement(
  legend: LegendValue | null | undefined,
  input: LegendPlacementInput,
): { x: number; y: number; width: number; height: number } {
  const position = input.position ?? "right"
  const horizontal = position === "top" || position === "bottom"
  const plotWidth = Math.max(0, input.totalWidth - input.margin.left - input.margin.right)
  const width = Math.max(
    1,
    horizontal
      ? (input.legendLayout?.maxWidth ?? plotWidth)
      : (input.reservedWidth ?? resolveSideLegendWidth(
          legend,
          input.legendLayout,
          resolveLegendRenderBounds(legend, input),
        ))
  )
  const distance = resolveLegendDistance(legend)
  const sideGutter = resolveLegendSideGutter(
    input.legendLayout,
    position === "left" ? input.axisChrome?.leftAxis : input.axisChrome?.rightAxis,
  )
  const edgeGutter = resolveLegendEdgeGutter(input.legendLayout)
  const height = resolveHorizontalLegendHeight(
    legend,
    plotWidth,
    input.legendLayout,
    horizontal ? resolveHorizontalLegendMaxRows(legend, input) : undefined,
  )
  const bottomAxisGutter = resolveAxisChromeGutter(input.axisChrome, input.legendLayout)
  const topAxisGutter = resolveAxisChromeGutter(input.axisChrome?.topAxis, input.legendLayout)

  if (position === "left") {
    return {
      x: Math.max(edgeGutter, input.margin.left - sideGutter - width - distance),
      y: input.margin.top,
      width,
      height,
    }
  }
  if (position === "top") {
    return {
      x: input.margin.left,
      y: input.margin.top - topAxisGutter - distance - height,
      width,
      height,
    }
  }
  if (position === "bottom") {
    const plotBottom = input.totalHeight - input.margin.bottom
    return {
      x: input.margin.left,
      y: Math.max(
        plotBottom + distance,
        Math.min(
          plotBottom + bottomAxisGutter + distance,
          input.totalHeight - height,
        ),
      ),
      width,
      height,
    }
  }
  return {
    x: Math.min(
      input.totalWidth - width - edgeGutter,
      input.totalWidth - input.margin.right + sideGutter + distance,
    ),
    y: input.margin.top,
    width,
    height,
  }
}

/** Drop only default margins belonging to explicitly hidden XY axes. */
export function resolveHiddenAxisMargins(
  defaults: { top: number; right: number; bottom: number; left: number },
  axes:
    | ReadonlyArray<{ orient: "top" | "bottom" | "left" | "right"; visible?: boolean }> | undefined,
  hasTitle = false
) {
  const result = { ...defaults }
  for (const axis of axes ?? []) {
    if (axis.visible === false && !(axis.orient === "top" && hasTitle)) result[axis.orient] = 0
  }
  return result
}
