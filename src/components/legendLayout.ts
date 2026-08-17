import type { LegendLayout, LegendValue } from "./types/legendTypes"
import { isGradientLegendConfig, isLegendConfig } from "./types/legendTypes"
import {
  MIN_TITLE_TOP_LEGEND_MARGIN,
  MIN_TOP_LEGEND_MARGIN,
} from "./stream/titleLayout"

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
  axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean }>
  rotatedTicks?: boolean
}): AxisChromeInput {
  const bottomAxis = input.axes?.find(axis => axis.orient === "bottom")
  const topAxis = input.axes?.find(axis => axis.orient === "top")
  const leftAxis = input.axes?.find(axis => axis.orient === "left")
  const rightAxis = input.axes?.find(axis => axis.orient === "right")
  // No horizontal config means the frame renders its default bottom axis.
  // A top-only config instead moves that axis above the plot, so it should
  // not make a bottom legend reserve an imaginary lower gutter.
  const hasBottomAxis = !topAxis || !!bottomAxis
  const hasTopAxis = !!topAxis && !bottomAxis
  const hasLeftAxis = !rightAxis || !!leftAxis
  const hasRightAxis = !!rightAxis
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
    axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean }>
  },
  defaults: {
    showAxes?: boolean
    xLabel?: unknown
    yLabel?: unknown
    yLabelRight?: unknown
    axes?: ReadonlyArray<{ orient?: string; label?: unknown; autoRotate?: boolean }>
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
  axisChrome?: Omit<AxisChromeInput, "topAxis" | "leftAxis" | "rightAxis">,
): number {
  return (
    resolveSideLegendWidth(legend, layout) +
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
  const horizontalHeight = resolveHorizontalLegendHeight(
    legend,
    plotWidth,
    options.legendLayout,
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

  if (position === "right") {
    margin.right = Math.max(
      margin.right,
      minimum,
      resolveSideLegendMargin(legend, options.legendLayout, options.axisChrome?.rightAxis),
    )
  } else if (position === "left") {
    margin.left = Math.max(
      margin.left,
      minimum,
      resolveSideLegendMargin(legend, options.legendLayout, options.axisChrome?.leftAxis),
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
      ? input.legendLayout?.maxWidth ?? plotWidth
      : input.reservedWidth ?? resolveSideLegendWidth(legend, input.legendLayout),
  )
  const distance = resolveLegendDistance(legend)
  const sideGutter = resolveLegendSideGutter(
    input.legendLayout,
    position === "left" ? input.axisChrome?.leftAxis : input.axisChrome?.rightAxis,
  )
  const edgeGutter = resolveLegendEdgeGutter(input.legendLayout)
  const height = resolveHorizontalLegendHeight(legend, plotWidth, input.legendLayout)
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
