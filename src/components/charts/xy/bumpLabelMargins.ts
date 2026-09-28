import type { MarginType } from "../../types/marginType"
import type { CategoricalLegendConfig } from "../../types/legendTypes"
import { estimateLabel } from "../../text/labelMeasurement"
import { resolveSideLegendMargin } from "../../legendLayout"

/**
 * BumpChart endpoint-label room, shared by the React chart and renderChart.
 * Labels draw 8px past the first/last column; start labels also clear the
 * rank ticks and the axis title. Widths are estimated from the label text.
 */

const BASE_MARGIN = { top: 20, bottom: 48, left: 48 }
/** bumpLayout draws labels this far past the line end. */
const LABEL_GAP = 8
const LABEL_PAD = 4
/** The rotated rank-axis title occupies this band at the left edge. */
const TITLE_BAND = 24
const TICK_GAP = 6

export interface BumpLabelLayoutInput {
  /** Series names, which the labels show. */
  labels: readonly string[]
  showLabels: boolean | "start" | "end" | "both" | "auto"
  /** Chart width; each labeled side is capped at `maxSideFraction` of it. */
  width: number
  /** Whether the rank axis (ticks and title) is drawn. */
  showAxes: boolean
  /** Number of ranks, which sets the rank tick label width. */
  rankCount: number
  /** Rank axis title; falsy when there is none. */
  yLabel?: string | false
  fontSize?: number
  /** @default 0.38 */
  maxSideFraction?: number
  /**
   * Side of a left/right legend. Its labels and the legend (which lists the
   * same series) then share that side's cap, leaving the labels at least a
   * few glyphs.
   */
  legendSide?: "left" | "right"
}

export interface BumpLabelLayout {
  /** Label-aware default margins; caller margins merge over these. */
  margin: MarginType
  /** Distance from the first column to the start labels' text anchor. */
  startLabelOffset: number
  /** Space each side needs beyond the label text itself. */
  chrome: { start: number; end: number }
  /** Room each labeled side reserves for its labels, chrome included. */
  room: { start: number; end: number }
  /** Estimated width of the widest label. */
  labelWidth: number
  fontSize: number
  hasStart: boolean
  hasEnd: boolean
}

export function resolveBumpLabelLayout(input: BumpLabelLayoutInput): BumpLabelLayout {
  const fontSize = input.fontSize ?? 12
  const mode = input.showLabels === true ? "end" : input.showLabels
  const hasEnd = mode === "end" || mode === "both" || mode === "auto"
  const hasStart = mode === "start" || mode === "both"
  const font = { family: "sans-serif", version: 0, size: fontSize, weight: 450 }
  const labelWidth = input.labels.reduce(
    (max, label) => Math.max(max, estimateLabel(label, font).width),
    0
  )
  const cap = Math.round(input.width * (input.maxSideFraction ?? 0.38))
  const tickWidth = estimateLabel(String(Math.max(1, input.rankCount)), font).width
  const startLabelOffset = input.showAxes ? LABEL_GAP + tickWidth + TICK_GAP : LABEL_GAP
  const titleBand = input.showAxes && input.yLabel ? TITLE_BAND : 0
  const chrome = { start: startLabelOffset + LABEL_PAD + titleBand, end: LABEL_GAP + LABEL_PAD }
  const legendNeed = input.legendSide
    ? resolveSideLegendMargin(
        { legendGroups: [{ label: "", styleFn: () => ({}), items: input.labels.map((label) => ({ label })) }] } satisfies CategoricalLegendConfig,
        { sideGutter: 0 }
      )
    : 0
  const minText = estimateLabel("MMM", font).width
  const roomFor = (side: "left" | "right", sideChrome: number) => Math.min(
    sideChrome + labelWidth,
    input.legendSide === side ? Math.max(sideChrome + minText, cap - legendNeed) : cap
  )
  const room = { start: hasStart ? roomFor("left", chrome.start) : 0, end: hasEnd ? roomFor("right", chrome.end) : 0 }
  // Today's margins are the floors, so short labels keep their layout.
  const rightFloor = input.showLabels === false ? 24 : 110
  return {
    margin: {
      ...BASE_MARGIN,
      right: Math.max(rightFloor, room.end),
      left: Math.max(BASE_MARGIN.left, room.start),
    },
    startLabelOffset,
    chrome,
    room,
    labelWidth,
    fontSize,
    hasStart,
    hasEnd,
  }
}

/**
 * Label text budgets inside the final margins (after caller overrides), and
 * the side-legend gutter that keeps a legend clear of the labels it shares a
 * margin with.
 */
export function resolveBumpLabelSpace(margin: MarginType, layout: BumpLabelLayout): {
  budget: { start: number; end: number }
  sideGutter: { left?: number; right?: number }
} {
  const budget = {
    start: layout.hasStart ? Math.max(0, Math.min(margin.left, layout.room.start) - layout.chrome.start) : 0,
    end: layout.hasEnd ? Math.max(0, Math.min(margin.right, layout.room.end) - layout.chrome.end) : 0,
  }
  return {
    budget,
    sideGutter: {
      ...(layout.hasStart && { left: layout.chrome.start + Math.min(budget.start, layout.labelWidth) }),
      ...(layout.hasEnd && { right: layout.chrome.end + Math.min(budget.end, layout.labelWidth) }),
    },
  }
}

/** Shorten a label with "…" to fit `budget` pixels; the chart keeps the full name in `<title>`. */
export function truncateBumpLabel(
  text: string,
  budget: number,
  fontSize: number
): { text: string; truncated: boolean } {
  const font = { family: "sans-serif", version: 0, size: fontSize, weight: 450 }
  if (estimateLabel(text, font).width <= budget) return { text, truncated: false }
  const glyphs = Array.from(text)
  let keep = glyphs.length - 1
  while (keep > 0 && estimateLabel(`${glyphs.slice(0, keep).join("")}…`, font).width > budget) keep--
  return { text: `${glyphs.slice(0, keep).join("").trimEnd()}…`, truncated: true }
}
