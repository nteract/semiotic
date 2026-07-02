import * as React from "react"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { packIntervals } from "./intervals"
import { bandLabel, linearAxis } from "./recipeChrome"

/**
 * `intervalLanesLayout` — a Gantt / swimlane timeline as an `OrdinalCustomChart`
 * layout. Each ordinal **lane** holds events that occupy a `[start, end]` span on
 * a shared time axis; concurrent events within a lane are packed into stacked
 * sub-tracks ({@link packIntervals}). The recipe emits one real, hit-tested,
 * theme-colored rect per event (so every bar inherits keyboard nav, tooltips,
 * selection, and transitions) and draws lane labels, optional period bands, and
 * a time axis in `overlays`.
 *
 * Sibling to `flextreeLayout` / `dagreLayout`. The complement to a
 * concurrency line — see {@link activeCountOverDomain}.
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { intervalLanesLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={wars}
 *   layout={intervalLanesLayout}
 *   categoryAccessor="sphere"
 *   valueAccessor="startYear"
 *   oExtent={SPHERES}
 *   layoutConfig={{
 *     laneAccessor: "sphere", startAccessor: "startYear", endAccessor: "endYear",
 *     domain: [1775, 2015], unit: 1, color: (d, lane) => COLORS[lane],
 *     axisTicks: [1800, 1850, 1900, 1950, 2000],
 *   }}
 *   width={900} height={620}
 * />
 * ```
 */
export interface IntervalLanesConfig<T = Datum> {
  /** Which lane each record belongs to. */
  laneAccessor: string | ((d: T) => string)
  /** Interval start, in the same units as `domain`. */
  startAccessor: string | ((d: T) => number)
  /** Interval end, in the same units as `domain`. */
  endAccessor: string | ((d: T) => number)
  /** `[min, max]` of the time axis. */
  domain: [number, number]
  /** Lane order. @default the chart's `o` scale domain (its `oExtent`), else the
   *  distinct lane values in first-seen order. */
  lanes?: string[]
  /** Per-record fill. @default `ctx.resolveColor(lane)`. */
  color?: (d: T, lane: string) => string
  /** Stable id per record → bar transition identity. @default none */
  idAccessor?: string | ((d: T) => string)
  /** Extend each bar this many domain units past `end`, so inclusive whole-unit
   *  intervals (e.g. years) fill their final unit. @default 0 */
  unit?: number
  /** Vertical gap between stacked sub-tracks, px. @default 1.5 */
  barGap?: number
  /** Minimum rendered interval width, px. Keeps zero- and short-duration
   *  events visible and hoverable on long domains. @default 2 */
  minBarWidth?: number
  /** @default 3.5 */
  minBarHeight?: number
  /** @default 10 */
  maxBarHeight?: number
  /** Vertical padding inside each lane, px. @default 7 */
  lanePadding?: number
  /** Bar corner radius, px. @default 2 */
  cornerRadius?: number
  /** Reserve this many px at the bottom (for a caller-drawn strip, e.g. a
   *  concurrency line). Lanes fill the remaining height. @default 0 */
  bottomInset?: number
  /** Draw a label to the left of each lane. @default true */
  showLaneLabels?: boolean
  /** Gap between the plot's left edge and lane labels, px. @default 12 */
  laneLabelGap?: number
  /** Alternating background period bands across the full plot height. */
  periods?: Array<{ start: number; end: number; name?: string }>
  /** Draw a top time axis with gridlines. @default true */
  showAxis?: boolean
  /** Explicit axis tick values. @default ~7 evenly-spaced across `domain`. */
  axisTicks?: number[]
  /** Format axis tick labels. @default `String` */
  tickFormat?: (v: number) => string
}

function fn<T>(a: string | ((d: T) => unknown)): (d: T) => unknown {
  return typeof a === "function" ? a : (d: T) => (d as Record<string, unknown>)[a]
}

/** Horizontal gap (px) inserted between adjacent bars on the same sub-track so
 *  back-to-back intervals read as two rects, not one. */
const BAR_HGAP = 1

export const intervalLanesLayout: OrdinalCustomLayout<IntervalLanesConfig> = (ctx) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0 || ctx.data.length === 0 || !cfg?.domain) {
    return { nodes: [] }
  }

  const getLane = fn(cfg.laneAccessor) as (d: Datum) => string
  const getStart = fn(cfg.startAccessor) as (d: Datum) => number
  const getEnd = fn(cfg.endAccessor) as (d: Datum) => number
  const getId = cfg.idAccessor ? (fn(cfg.idAccessor) as (d: Datum) => unknown) : null
  const unit = cfg.unit ?? 0
  const barGap = cfg.barGap ?? 1.5
  const minBarWidth = Math.max(0, cfg.minBarWidth ?? 2)
  const minBar = cfg.minBarHeight ?? 3.5
  const maxBar = cfg.maxBarHeight ?? 10
  const lanePad = cfg.lanePadding ?? 7
  const corner = cfg.cornerRadius ?? 2
  const bottomInset = cfg.bottomInset ?? 0
  const colorFor = cfg.color ?? ((_: Datum, lane: string) => ctx.resolveColor(lane))

  // Single linear time scale shared by bars + bands + axis (the example used two
  // mismatched scales; one scale keeps bars and ticks aligned).
  const [d0, d1] = cfg.domain
  const span = d1 - d0 || 1
  const xPx = (v: number) => plot.x + ((v - d0) / span) * plot.width

  const domainLanes = ctx.scales?.o?.domain?.() ?? []
  const lanes =
    cfg.lanes ??
    (domainLanes.length > 0 ? domainLanes : [...new Set(ctx.data.map(getLane))])

  const laneAreaH = Math.max(0, plot.height - bottomInset)
  const laneHeight = laneAreaH / Math.max(1, lanes.length)

  // ── Bars ───────────────────────────────────────────────────────────────────
  // Pack in *rendered-pixel* space, not raw domain units. A bar is drawn from
  // `xPx(start)` to `max(xPx(start) + minBarWidth, xPx(end + unit))`, so both the
  // inclusive `end + unit` extension and the `minBarWidth` floor let a bar cover
  // pixels its raw `[start, end]` interval doesn't. Packing on raw start/end then
  // reuses a sub-track for a neighbour that starts under that overhang (e.g. a
  // war ending the same year the next begins, or two short events a year apart),
  // and the two rendered rects overlap — visible as darker, doubled fills. Pack
  // on the drawn span instead, so the packer's "already ended" test lives in the
  // same space the bars do. Sub-tracks encode *concurrency*, so a bar that
  // starts exactly where its predecessor's drawing ends stays on the same
  // track — the predecessor's right edge is shaved by `BAR_HGAP` below so the
  // two rects read as a sequence, not one fused bar.
  const startPx = (d: Datum) => xPx(getStart(d))
  const drawEndPx = (d: Datum) => Math.max(startPx(d) + minBarWidth, xPx(getEnd(d) + unit))

  const nodes: RectSceneNode[] = []
  lanes.forEach((lane, laneIndex) => {
    const laneTop = plot.y + laneIndex * laneHeight
    const rows = ctx.data.filter((d) => getLane(d) === lane)
    if (rows.length === 0) return
    const { packed, trackCount } = packIntervals(rows, {
      start: startPx,
      end: drawEndPx,
    })
    // Where the next bar on the same sub-track abuts this one's drawn end,
    // shave this bar's right edge so back-to-back intervals keep a visible
    // seam. Only abutting bars change; everything else keeps its exact width.
    const nextStartOnTrack = new Map<Datum, number>()
    const trackItems = new Map<number, Datum[]>()
    for (const { item, track } of packed) {
      const items = trackItems.get(track)
      if (items) items.push(item)
      else trackItems.set(track, [item])
    }
    for (const items of trackItems.values()) {
      items.sort((a, b) => startPx(a) - startPx(b))
      for (let i = 0; i < items.length - 1; i++) {
        nextStartOnTrack.set(items[i], startPx(items[i + 1]))
      }
    }
    // Space sub-tracks by the exact slot height so bars can never overflow the
    // lane (and bleed into a neighbouring lane) even when the sub-track count is
    // high enough that the `minBarHeight` floor would otherwise force bars taller
    // than their slot. `barHeight` is clamped to the slot and capped at `maxBar`.
    const trackPitch = (laneHeight - 2 * lanePad) / trackCount
    const barHeight = Math.min(maxBar, Math.max(Math.min(minBar, trackPitch), trackPitch - barGap))
    for (const { item, track } of packed) {
      const x = startPx(item)
      const nextStart = nextStartOnTrack.get(item)
      const rawW = drawEndPx(item) - x
      const w =
        nextStart !== undefined && x + rawW > nextStart - BAR_HGAP
          ? Math.max(1, nextStart - BAR_HGAP - x)
          : rawW
      const y = laneTop + lanePad + track * trackPitch
      nodes.push({
        type: "rect",
        x,
        y,
        w,
        h: barHeight,
        cornerRadii: corner > 0 ? { tl: corner, tr: corner, br: corner, bl: corner } : undefined,
        style: { fill: colorFor(item, lane), stroke: "none" },
        datum: item,
        group: lane,
        _transitionKey: getId ? String(getId(item)) : undefined,
      })
    }
  })

  // ── Chrome overlays ──────────────────────────────────────────────────────────
  const labelColor = `var(--semiotic-text, ${ctx.theme.semantic.text ?? "#1a1a1a"})`
  const subtle = `var(--semiotic-text-secondary, ${ctx.theme.semantic.textSecondary ?? "#888"})`
  const bandColor = `var(--semiotic-border, ${ctx.theme.semantic.border ?? "#94a3b8"})`
  const children: React.ReactNode[] = []

  // Period bands (behind everything, full plot height).
  ;(cfg.periods ?? []).forEach((period, i) => {
    const bx = xPx(period.start)
    const bw = Math.max(1, xPx(period.end + unit) - bx)
    children.push(
      React.createElement("rect", {
        key: `period-${i}`,
        x: bx,
        y: plot.y,
        width: bw,
        height: plot.height,
        fill: bandColor,
        opacity: i % 2 === 0 ? 0.06 : 0.025,
        pointerEvents: "none",
      }),
    )
    if (period.name) {
      children.push(
        bandLabel({
          keyId: `period-label-${i}`,
          text: period.name,
          x: bx + 4,
          y: plot.y + 12,
          anchor: "start",
          baseline: "hanging",
          fontSize: 13,
          fontWeight: 700,
          color: subtle,
        }),
      )
    }
  })

  // Lane separators + labels.
  const showLaneLabels = cfg.showLaneLabels !== false
  const laneLabelGap = cfg.laneLabelGap ?? 12
  lanes.forEach((lane, laneIndex) => {
    const laneTop = plot.y + laneIndex * laneHeight
    children.push(
      React.createElement("line", {
        key: `lane-sep-${laneIndex}`,
        x1: plot.x,
        x2: plot.x + plot.width,
        y1: laneTop,
        y2: laneTop,
        stroke: bandColor,
        opacity: 0.45,
      }),
    )
    if (showLaneLabels) {
      children.push(
        bandLabel({
          keyId: `lane-label-${laneIndex}`,
          text: lane,
          x: plot.x - laneLabelGap,
          y: laneTop + laneHeight / 2,
          anchor: "end",
          baseline: "middle",
          fontSize: 12,
          fontWeight: 600,
          color: labelColor,
        }),
      )
    }
  })

  // Top time axis with gridlines spanning the full plot height.
  if (cfg.showAxis !== false) {
    const ticks =
      cfg.axisTicks ?? Array.from({ length: 8 }, (_, i) => Math.round(d0 + (i / 7) * span))
    children.push(
      linearAxis({
        keyId: "interval-axis",
        scale: xPx,
        ticks,
        orient: "top",
        offset: plot.y,
        tickLength: 0,
        gridLength: plot.height,
        gridDasharray: "3 5",
        edgeAnchor: true,
        format: cfg.tickFormat,
        color: subtle,
      }),
    )
  }

  return { nodes, overlays: React.createElement(React.Fragment, null, ...children) }
}
