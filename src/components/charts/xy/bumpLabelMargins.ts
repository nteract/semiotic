import type { MarginType } from "../../types/marginType"
import type { CategoricalLegendConfig } from "../../types/legendTypes"
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

/**
 * Glyph advance widths (em) by class, at or just above a bold sans-serif
 * (Arial/Helvetica Bold, and SF's wider digits), which covers the 650-weight
 * highlighted labels. Wide scripts (CJK, fullwidth forms, emoji) take a full
 * em plus.
 */
const WIDE_SCRIPT_EM = 1.1
const GLYPH_CLASS_EM: ReadonlyArray<readonly [RegExp, number]> = [
  [/[mwMW@%…]/, 0.95],
  [/[ijlI'.,|\s]/, 0.28],
  [/[frt():;/[\]{}*`!\\-]/, 0.39],
]
const CAPITAL_EM = 0.75
const DEFAULT_EM = 0.62
/** Room for UI faces a little wider than Arial (SF, Inter, Segoe). */
const FACE_ALLOWANCE = 1.05

/**
 * Estimated rendered width of a BumpChart label, the same on the browser and
 * server paths. Per-glyph classes track the drawn text closely instead of a
 * flat per-character width: in Chromium, 12px "clickstream-enrichment"
 * renders 135px and estimates 153px (a flat 0.65em estimated 172px, which
 * truncated names that fit). Much wider faces, such as Verdana, can exceed
 * the estimate; pin the labeled margin for those.
 */
export function estimateBumpLabelWidth(text: string, fontSize: number): number {
  let em = 0
  for (const glyph of text) {
    em += (glyph.codePointAt(0) ?? 0) >= 0x2e80
      ? WIDE_SCRIPT_EM
      : GLYPH_CLASS_EM.find(([pattern]) => pattern.test(glyph))?.[1]
        ?? (glyph.toLowerCase() !== glyph ? CAPITAL_EM : DEFAULT_EM)
  }
  return em * fontSize * FACE_ALLOWANCE
}

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
  const labelWidth = input.labels.reduce(
    (max, label) => Math.max(max, estimateBumpLabelWidth(label, fontSize)),
    0
  )
  const cap = Math.round(input.width * (input.maxSideFraction ?? 0.38))
  const tickWidth = estimateBumpLabelWidth(String(Math.max(1, input.rankCount)), fontSize)
  const startLabelOffset = input.showAxes ? LABEL_GAP + tickWidth + TICK_GAP : LABEL_GAP
  const titleBand = input.showAxes && input.yLabel ? TITLE_BAND : 0
  const chrome = { start: startLabelOffset + LABEL_PAD + titleBand, end: LABEL_GAP + LABEL_PAD }
  const legendNeed = input.legendSide
    ? resolveSideLegendMargin(
        { legendGroups: [{ label: "", styleFn: () => ({}), items: input.labels.map((label) => ({ label })) }] } satisfies CategoricalLegendConfig,
        { sideGutter: 0 }
      )
    : 0
  const minText = estimateBumpLabelWidth("MMM", fontSize)
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
  if (estimateBumpLabelWidth(text, fontSize) <= budget) return { text, truncated: false }
  const glyphs = Array.from(text)
  let keep = glyphs.length - 1
  while (keep > 0 && estimateBumpLabelWidth(`${glyphs.slice(0, keep).join("")}…`, fontSize) > budget) keep--
  return { text: `${glyphs.slice(0, keep).join("").trimEnd()}…`, truncated: true }
}
