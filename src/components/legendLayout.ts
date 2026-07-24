import type { LegendLayout, LegendValue } from "./types/legendTypes"
import { isGradientLegendConfig, isLegendConfig } from "./types/legendTypes"

export const DEFAULT_LEGEND_SWATCH_SIZE = 16
export const DEFAULT_LEGEND_LABEL_GAP = 6
export const DEFAULT_LEGEND_ITEM_GAP = 10
export const DEFAULT_LEGEND_ROW_HEIGHT = 22
export const DEFAULT_SIDE_LEGEND_WIDTH = 100
export const DEFAULT_LEGEND_DISTANCE = 10

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

/** Estimate the layout-box height used to place a top/bottom legend. */
export function resolveHorizontalLegendHeight(
  legend: LegendValue | null | undefined,
  availableWidth: number,
  layout?: LegendLayout,
): number {
  if (isGradientLegendConfig(legend)) return legend.gradient.label ? 34 : 26
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
    resolveLegendSideGutter(layout)
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
