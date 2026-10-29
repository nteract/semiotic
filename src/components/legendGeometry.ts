import type { LegendLayout } from "./types/legendTypes"

// Renderer-neutral legend geometry shared by margin reservation
// (`legendLayout.ts`), the interactive <Legend>, and static SVG legends:
// metrics, label text estimates, and the vertical/side-legend layouts.

export const DEFAULT_LEGEND_SWATCH_SIZE = 16
export const DEFAULT_LEGEND_LABEL_GAP = 6
export const DEFAULT_LEGEND_ITEM_GAP = 10
export const DEFAULT_LEGEND_ROW_HEIGHT = 22
export const DEFAULT_SIDE_LEGEND_WIDTH = 100

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
        : (layout?.align ?? "start"),
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

const LEGEND_CHAR_WIDTH = 7

/**
 * SVG text has no useful intrinsic width until after it is mounted. Keep the
 * estimate shared by margin calculation and rendering so side legends never
 * reserve one width and draw into another.
 */
export function estimateLegendTextWidth(label: string): number {
  return Math.ceil(label.length * LEGEND_CHAR_WIDTH)
}

/**
 * When a left/right legend's margin is measured, it may claim at most this
 * share of the chart width (never less than the 100px minimum box), so long
 * labels truncate instead of squeezing the plot. `legendLayout.maxWidth`
 * replaces this cap for side legends.
 */
export const MAX_SIDE_LEGEND_WIDTH_RATIO = 0.3
/**
 * A top/bottom legend's measured rows may claim at most this share of the
 * chart height (never less than one row); further rows collapse into
 * "+N more". Looser than the side cap because rows hide whole categories
 * where a narrower side legend only truncates labels.
 */
export const MAX_HORIZONTAL_LEGEND_HEIGHT_RATIO = 0.4
/** Shortest label (in characters) a wrapped side-legend column keeps before
 * the layout stops adding columns and summarizes the rest as "+N more". */
export const MIN_SIDE_LEGEND_LABEL_CHARS = 6
/** Visible text for a category whose label is empty or whitespace. */
export const EMPTY_LEGEND_LABEL = "(empty)"
/** Hidden categories named in the "+N more" row's hover text. */
const MORE_LEGEND_TITLE_LIMIT = 20

/** The text a legend draws for a category label. */
export function legendDisplayLabel(label: unknown): string {
  const text = label == null ? "" : String(label)
  return text.trim() === "" ? EMPTY_LEGEND_LABEL : text
}

/** Shorten a label with an ellipsis so its estimated width fits `maxWidth`. */
export function truncateLegendLabel(
  label: string,
  maxWidth: number,
  charWidth = LEGEND_CHAR_WIDTH,
): string {
  if (Math.ceil(label.length * charWidth) <= maxWidth) return label
  const keep = Math.max(1, Math.floor(maxWidth / charWidth) - 1)
  return `${Array.from(label).slice(0, keep).join("").trimEnd()}…`
}

/** Text of the row that stands in for categories a side legend cannot fit. */
export function legendMoreLabel(hiddenCount: number): string {
  return `+${hiddenCount} more`
}

/** Hover text naming the categories summarized by the "+N more" row. */
export function legendMoreTitle(
  items: ReadonlyArray<{ label: string } | undefined>,
  visibleCount: number,
): string {
  const names = items
    .slice(visibleCount, visibleCount + MORE_LEGEND_TITLE_LIMIT)
    .map((item) => legendDisplayLabel(item?.label))
  if (items.length - visibleCount > MORE_LEGEND_TITLE_LIMIT) names.push("…")
  return names.join(", ")
}

/** Rows a top/bottom legend can draw in `height`, never fewer than one.
 * Multi-group legends lose 16px to their separator overshoot. */
export function legendRowsFor(height: number, rowHeight: number, groupCount: number): number {
  return Math.max(1, Math.floor((height - (groupCount > 1 ? 16 : 0)) / rowHeight))
}

export interface LegendRow {
  start: number
  end: number
  width: number
}

export interface LegendRowsFit {
  rows: LegendRow[]
  /** Item widths, capped at the row width so over-wide labels truncate. */
  widths: number[]
  visibleCount: number
  hiddenCount: number
  /** Offset of the "+N more" slot on the last row; -1 when nothing is hidden. */
  moreX: number
  width: number
}

/**
 * Wrap a horizontal legend group into rows no wider than `maxWidth`. An item
 * wider than a row is capped to it (its label truncates, keeping at least one
 * character and the ellipsis), and rows past `maxRows` collapse into a
 * "+N more" slot at the end of the last kept row. Shared by margin
 * reservation and the live and static renderers; static SVG passes its
 * theme-derived `charWidth`.
 */
export function fitLegendRows(
  widths: readonly number[],
  options: {
    itemGap: number
    labelOffset: number
    maxWidth?: number
    maxRows?: number
    charWidth?: number
  },
): LegendRowsFit {
  const { itemGap, labelOffset, maxRows = Number.POSITIVE_INFINITY, charWidth = LEGEND_CHAR_WIDTH } = options
  const limit = options.maxWidth != null && options.maxWidth > 0
    ? options.maxWidth
    : Number.POSITIVE_INFINITY
  const itemLimit = Math.max(limit, labelOffset + Math.ceil(2 * charWidth))
  const capped = widths.map((width) => Math.min(width, itemLimit))
  const rows: LegendRow[] = []
  let start = 0
  let rowWidth = 0
  capped.forEach((width, i) => {
    const next = rowWidth === 0 ? width : rowWidth + itemGap + width
    if (rowWidth > 0 && next > limit) {
      rows.push({ start, end: i, width: rowWidth })
      start = i
      rowWidth = width
    } else {
      rowWidth = next
    }
  })
  if (capped.length > 0) rows.push({ start, end: capped.length, width: rowWidth })

  let moreX = -1
  if (rows.length > Math.max(1, maxRows)) {
    rows.length = Math.max(1, Math.floor(maxRows))
    const last = rows[rows.length - 1]
    // Hide trailing items until the summary fits; its label widens as the
    // hidden count gains digits, so re-measure on every step.
    for (;;) {
      moreX = last.end > last.start ? last.width + itemGap : 0
      const moreWidth = Math.ceil(legendMoreLabel(capped.length - last.end).length * charWidth)
      if (moreX + moreWidth <= limit || last.end === last.start) {
        last.width = moreX + moreWidth
        break
      }
      last.end -= 1
      last.width = last.end > last.start ? last.width - itemGap - capped[last.end] : 0
    }
  }
  const visibleCount = rows.length > 0 ? rows[rows.length - 1].end : 0
  return {
    rows,
    widths: capped,
    visibleCount,
    hiddenCount: capped.length - visibleCount,
    moreX,
    width: rows.reduce((max, row) => Math.max(max, row.width), 0),
  }
}

/** Space a legend may occupy, measured from its origin. */
export interface LegendBounds {
  maxWidth?: number
  maxHeight?: number
}

export interface SideLegendGroupFit extends VerticalLegendGroupLayout {
  /** Rows in each column of this group. */
  rows: number
  /** Leading items that are drawn. */
  visibleCount: number
  /** Trailing items summarized by a "+N more" row in the last slot. */
  hiddenCount: number
}

export interface SideLegendFit {
  width: number
  height: number
  columns: number
  /** Width of one column (swatch plus label). */
  columnWidth: number
  /** Distance between adjacent column origins. */
  columnStep: number
  /** Widest label text a column draws before truncating. */
  labelWidth: number
  rowHeight: number
  groups: SideLegendGroupFit[]
}

type SideLegendGroupInput = {
  label?: string
  items: ReadonlyArray<{ label: string } | undefined>
}

/**
 * Fit categorical groups into a left/right legend box. Unbounded, this is the
 * long-standing single column. With bounds, items flow into columns (top to
 * bottom, then left to right) when the column would run past `maxHeight`;
 * labels truncate to the column width; and when even the narrowest readable
 * columns cannot hold every item, the last slot of a group becomes "+N more".
 * Shared by margin reservation and the live and static renderers so their
 * geometry cannot drift.
 */
export function fitSideLegend(
  groups: ReadonlyArray<SideLegendGroupInput>,
  layout?: LegendLayout,
  bounds?: LegendBounds,
): SideLegendFit {
  const { swatchSize, labelGap, itemGap, rowHeight } = resolveLegendMetrics(layout)
  const labelOffset = swatchSize + labelGap
  let natural = 0
  let totalItems = 0
  let maxItems = 0
  for (const group of groups) {
    if (group.label) natural = Math.max(natural, estimateLegendTextWidth(group.label))
    totalItems += group.items.length
    maxItems = Math.max(maxItems, group.items.length)
    for (const item of group.items) {
      natural = Math.max(
        natural,
        labelOffset + estimateLegendTextWidth(legendDisplayLabel(item?.label)),
      )
    }
  }
  const maxWidth = Math.max(
    labelOffset + 2 * LEGEND_CHAR_WIDTH,
    bounds?.maxWidth ?? Number.POSITIVE_INFINITY,
  )
  const maxHeight = bounds?.maxHeight ?? Number.POSITIVE_INFINITY
  const layoutRows = (rows: number[]) => layoutVerticalLegendGroups(
    groups.map((group, i) => ({ hasLabel: Boolean(group.label), itemCount: rows[i] })),
    rowHeight,
  )
  const heightOf = (rows: number[]) => layoutRows(rows).at(-1)?.endY ?? 0
  const rowsFor = (columns: number) =>
    groups.map((group) => Math.ceil(group.items.length / columns))
  const fits = (columns: number) => heightOf(rowsFor(columns)) <= maxHeight

  const attempt = (columnNatural: number): SideLegendFit => {
    const readable = Math.min(
      columnNatural,
      labelOffset + MIN_SIDE_LEGEND_LABEL_CHARS * LEGEND_CHAR_WIDTH,
    )
    const columnWidthFor = (columns: number) => Math.min(
      columnNatural,
      Math.floor((maxWidth - (columns - 1) * itemGap) / columns),
    )
    let maxColumns = Math.max(1, Math.min(
      maxItems,
      Math.floor((maxWidth + itemGap) / (readable + itemGap)),
    ))
    while (maxColumns > 1 && columnWidthFor(maxColumns) < readable) maxColumns -= 1

    // Height only shrinks as columns are added, so search for the fewest.
    let columns = 1
    if (!fits(1)) {
      if (!fits(maxColumns)) {
        columns = maxColumns
      } else {
        let low = 1
        let high = maxColumns
        while (high - low > 1) {
          const middle = Math.floor((low + high) / 2)
          if (fits(middle)) high = middle
          else low = middle
        }
        columns = high
      }
    }

    let rows = rowsFor(columns)
    if (heightOf(rows) > maxHeight) {
      let budget = Math.max(
        0,
        Math.floor((maxHeight - heightOf(groups.map(() => 0))) / rowHeight),
      )
      rows = groups.map((group) => {
        if (group.items.length === 0) return 0
        const groupRows = Math.max(1, Math.min(Math.ceil(group.items.length / columns), budget))
        budget = Math.max(0, budget - groupRows)
        return groupRows
      })
    }

    let usedColumns = 1
    const counts = groups.map((group, i) => {
      const slots = rows[i] * columns
      const total = group.items.length
      const visibleCount = total > slots ? Math.max(0, slots - 1) : total
      const hiddenCount = total - visibleCount
      const usedSlots = visibleCount + (hiddenCount > 0 ? 1 : 0)
      if (rows[i] > 0) usedColumns = Math.max(usedColumns, Math.ceil(usedSlots / rows[i]))
      return { visibleCount, hiddenCount }
    })

    const columnWidth = usedColumns === 1
      ? Math.min(maxWidth, Math.max(DEFAULT_SIDE_LEGEND_WIDTH, columnNatural))
      : columnWidthFor(usedColumns)
    const width = usedColumns === 1
      ? columnWidth
      : Math.min(
          maxWidth,
          Math.max(DEFAULT_SIDE_LEGEND_WIDTH, usedColumns * columnWidth + (usedColumns - 1) * itemGap),
        )
    const layouts = layoutRows(rows)
    return {
      width,
      height: layouts.at(-1)?.endY ?? 0,
      columns: usedColumns,
      columnWidth,
      columnStep: columnWidth + itemGap,
      labelWidth: Math.max(0, columnWidth - labelOffset),
      rowHeight,
      groups: layouts.map((groupLayout, i) => ({ ...groupLayout, rows: rows[i], ...counts[i] })),
    }
  }

  const fit = attempt(natural)
  if (!fit.groups.some((group) => group.hiddenCount > 0)) return fit
  // Leave room for the summary row itself; fewer, wider columns cannot fit
  // more items, so this second pass is still truncated.
  return attempt(Math.max(natural, estimateLegendTextWidth(legendMoreLabel(totalItems))))
}

/** Origin of a slot (item or "+N more" row) inside its group's item box. */
export function sideLegendSlotOffset(
  fit: SideLegendFit,
  group: SideLegendGroupFit,
  slot: number,
): { x: number; y: number } {
  const rows = Math.max(1, group.rows)
  return {
    x: Math.floor(slot / rows) * fit.columnStep,
    y: (slot % rows) * fit.rowHeight,
  }
}
