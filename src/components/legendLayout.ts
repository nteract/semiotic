import type { LegendLayout } from "./types/legendTypes"

export const DEFAULT_LEGEND_SWATCH_SIZE = 16
export const DEFAULT_LEGEND_LABEL_GAP = 6
export const DEFAULT_LEGEND_ITEM_GAP = 10
export const DEFAULT_LEGEND_ROW_HEIGHT = 22

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
