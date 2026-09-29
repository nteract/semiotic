import { hashUnit } from "../utils/hash"
import * as React from "react"
import type {
  OrdinalLayoutContext,
  OrdinalLayoutResult
} from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import {
  resolveAccessor,
  createSafeDatum,
  clamp,
  LayoutCache,
  signatureKey
} from "./recipeUtils"
import {
  boxWidth,
  LINE_HEIGHT_RATIO,
  placeWords,
  rowsFingerprint,
  type WordTrailsGeometry
} from "./wordTrailsPlacement"
export {
  wordTrailsProgressiveReveal,
  type WordTrailsProgressiveRevealOptions
} from "./wordTrailsProgressiveReveal"

/**
 * Word Trails — a *quantitatively honest* word cloud.
 *
 * Where a classic word cloud (d3-cloud / amueller) packs words into free space
 * with only size encoding frequency and position meaning nothing, Word Trails
 * gives position meaning on both axes:
 *
 *   - **columns** (x) are a category — e.g. each speaker in a debate;
 *   - **the vertical axis** (y) is an ordered value — e.g. the debate segment
 *     where the word peaked, so a word's height reads as *when* it was said;
 *   - **font size** encodes frequency/weight: a word's area is proportional
 *     to its weight (`fontSize ∝ √weight`), so a word twice as frequent covers
 *     twice the area. Words whose proportional size would fall below
 *     `minFontSize` are drawn at that legibility floor and listed in the
 *     result's `sizeFloored`.
 *
 * Each column is laid out with greedy, largest-first placement: every word
 * searches outward from its segment anchor for the nearest free spot, so the
 * result is **overlap-free by construction** (rotated words collide by their
 * rotated bounds). A single global font scale (`scaleToFit`) shrinks every
 * word together until it all fits, preserving relative magnitude. A word that
 * still finds no room is left out rather than drawn over another, and listed
 * in the result's `unplaced`.
 *
 * The reading: scan a column top-to-bottom to follow one speaker through time;
 * scan across a row to compare what everyone emphasised at the same moment.
 *
 * Inspired by Elijah Meeks's 2016 "Word Trails" debate visualization. Because
 * placement is *box*-aware (not sprite/pixel), the layout needs no canvas text
 * measurement — it is pure and SSR-clean. Placement is cached by content, and
 * the layout supplies `restyle`, so selection changes and color/opacity-only
 * config changes don't re-run the search.
 *
 * @example
 * ```tsx
 * import { OrdinalCustomChart } from "semiotic/ordinal"
 * import { wordTrailsLayout } from "semiotic/recipes"
 *
 * <OrdinalCustomChart
 *   data={terms}                     // [{ word, weight, speaker, segment }]
 *   layout={wordTrailsLayout}
 *   layoutConfig={{
 *     textAccessor: "word",
 *     weightAccessor: "weight",
 *     columnAccessor: "speaker",
 *     segmentAccessor: "segment",
 *   }}
 *   width={860}
 *   height={520}
 * />
 * ```
 */
export interface WordTrailsWordInfo {
  /** Rendered word text. */
  word: string
  /** Column containing this word. */
  column: string
  /** Quantitative weight used to size this word. */
  weight: number
  /** Ordered segment/time value anchoring this word vertically. */
  segment: number
  /** Exact source row supplied to the chart. */
  datum: Datum
  /** Index of `datum` in the chart's input data. */
  dataIndex: number
  /** Index of the word's column in the final rendered column order. */
  columnIndex: number
  /** Column color after `columnColor` / the chart theme has been resolved. */
  resolvedColumnColor: string
}

export interface WordTrailsConfig {
  /** Field (or fn) giving the word text. */
  textAccessor: string | ((d: Datum) => string)
  /** Field (or fn) giving the word weight (→ font size). */
  weightAccessor: string | ((d: Datum) => number)
  /** Field (or fn) giving the column category (→ x band). */
  columnAccessor: string | ((d: Datum) => string)
  /** Field (or fn) giving the ordered segment/time value (→ pinned y). */
  segmentAccessor: string | ((d: Datum) => number)
  /** `[min, max]` of the segment axis. Derived from data when omitted. */
  segmentDomain?: [number, number]
  /** Explicit column order. Data insertion order when omitted. */
  columnOrder?: string[]
  /**
   * Legibility floor, px. Font size is area-proportional to weight
   * (`maxFontSize · √(weight / maxWeight)`); a word that would be smaller is
   * drawn at this size instead, which overstates it, so it is listed in the
   * layout result's `sizeFloored`. @default 11
   */
  minFontSize?: number
  /** Font size of the heaviest word, px, before `scaleToFit`. @default 42 */
  maxFontSize?: number
  /** Gap between columns, px. @default 18 */
  columnGutter?: number
  /**
   * Gap kept between word boxes, px — the density knob. `0` packs words as
   * tightly as their glyph boxes allow (crowded, still overlap-free); larger
   * values open the cloud up. @default 2
   */
  collisionPadding?: number
  /**
   * Per-word fill override. Return a color for a word (e.g. from a
   * distinctiveness / sentiment model) or `undefined` to fall back to the
   * column color. Same word ⇒ same color across columns if you key on the text.
   */
  wordColor?: (info: WordTrailsWordInfo) => string | undefined | null
  /**
   * Per-word reveal opacity. Return a value in `[0, 1]`; values are clamped,
   * and non-finite values resolve to `0`. Every row still participates in
   * scale-to-fit and collision placement, so changing opacity cannot move the
   * remaining words. A resolved `0` emits neither a glyph nor an interactive
   * hit target. By default a nonzero value multiplies the built-in weight
   * opacity; set `weightOpacity` to `false` when this callback should be the
   * exact rendered opacity.
   * @default () => 1
   */
  wordOpacity?: (info: WordTrailsWordInfo) => number
  /**
   * Fade lower-weight words from `0.5` to `1` opacity in addition to encoding
   * weight with font size. Disable this when opacity carries an independent
   * variable such as recency; `wordOpacity` then controls rendered opacity
   * exactly. @default true
   */
  weightOpacity?: boolean
  /** Per-column label color override. Falls back to the categorical palette. */
  columnColor?: (column: string) => string | undefined | null
  /** Draw the speaker/column labels along the top. @default true */
  showColumnLabels?: boolean
  /** Draw the segment/time value axis on the left. @default true */
  showSegmentAxis?: boolean
  /** Approx. number of ticks on the segment axis. @default 6 */
  segmentTickCount?: number
  /** Formats a segment value for the axis + tooltip. @default String */
  segmentTickFormat?: (v: number) => string
  /** Title shown above the segment axis (e.g. "Debate segment"). */
  segmentAxisLabel?: string
  /**
   * Max rotation magnitude, degrees. Each word gets a deterministic angle in
   * `[-rotate, +rotate]`. `0` keeps every word horizontal (most legible).
   * @default 0
   */
  rotate?: number
  /**
   * Allow the same word to appear more than once in a column. When `false`
   * (default), duplicate `(column, word)` rows are merged to a single entry at
   * the row with the greatest weight (its peak) — the classic word-cloud
   * reading. When `true`, every row is kept, so a word can trail down its
   * column once per segment it appeared in. @default false
   */
  repeatWords?: boolean
  /**
   * Uniformly shrink every word by one global factor until every word finds
   * room. Relative magnitude is preserved (a word twice as frequent stays
   * twice the area) — only the absolute scale drops as words are added. Turn
   * it off to keep exact `minFontSize`/`maxFontSize` sizing; words that then
   * find no room are left out and listed in the result's `unplaced`.
   * @default true
   */
  scaleToFit?: boolean
  /**
   * Target fraction of each column's area filled by word boxes before the
   * global scale is reduced. Lower packs looser (more whitespace); higher
   * starts larger and lets the greedy placer crowd words in. @default 0.6
   */
  packingDensity?: number
}

/**
 * Layout result of {@link wordTrailsLayout}: the scene and overlays, plus the
 * words the encoding could not show faithfully. Wrap the layout to read them,
 * e.g. `layout={(ctx) => { const r = wordTrailsLayout(ctx); report(r.unplaced); return r }}`.
 */
export interface WordTrailsLayoutResult extends OrdinalLayoutResult {
  /** Words left out because no free spot fit them, even at the smallest scale. */
  unplaced: WordTrailsWordInfo[]
  /**
   * Drawn words raised to a legibility floor (`minFontSize`, or 5px after
   * `scaleToFit`), so their area overstates their weight.
   */
  sizeFloored: WordTrailsWordInfo[]
}

// Placement keyed by a content signature of the layout-affecting inputs, so a
// color/opacity change (wordOpacity, progressive reveal) or a re-run with the
// same rows reuses it. See LayoutCache for why the key is content, not identity.
const GEOMETRY_CACHE = new LayoutCache<WordTrailsGeometry>(12)

export function wordTrailsLayout(
  ctx: OrdinalLayoutContext<WordTrailsConfig>
): WordTrailsLayoutResult {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  const empty: WordTrailsLayoutResult = { nodes: [], unplaced: [], sizeFloored: [] }
  if (plot.width <= 0 || plot.height <= 0 || ctx.data.length === 0) return empty

  const getText = resolveAccessor(cfg.textAccessor) as (d: Datum) => string
  const getWeight = (d: Datum) => {
    const n = Number(
      (resolveAccessor(cfg.weightAccessor) as (d: Datum) => unknown)(d)
    )
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const getColumn = resolveAccessor(cfg.columnAccessor) as (d: Datum) => string
  const getSegment = (d: Datum) =>
    Number((resolveAccessor(cfg.segmentAccessor) as (d: Datum) => unknown)(d))

  const minFont = cfg.minFontSize ?? 11
  const maxFont = cfg.maxFontSize ?? 42
  const gutter = cfg.columnGutter ?? 18
  const collisionPadding = cfg.collisionPadding ?? 2
  const showColumnLabels = cfg.showColumnLabels !== false
  const showSegmentAxis = cfg.showSegmentAxis !== false
  const tickCount = cfg.segmentTickCount ?? 6
  const tickFormat =
    cfg.segmentTickFormat ?? ((v: number) => String(Math.round(v)))
  const rotate = cfg.rotate ?? 0
  const repeatWords = cfg.repeatWords === true
  const scaleToFit = cfg.scaleToFit !== false
  const packingDensity = cfg.packingDensity ?? 0.6

  // Original accessor field names so the default tooltip's lookups land.
  const textKey =
    typeof cfg.textAccessor === "string" ? cfg.textAccessor : "word"
  const weightKey =
    typeof cfg.weightAccessor === "string" ? cfg.weightAccessor : "weight"
  const columnKey =
    typeof cfg.columnAccessor === "string" ? cfg.columnAccessor : "column"
  const segmentKey =
    typeof cfg.segmentAccessor === "string" ? cfg.segmentAccessor : "segment"

  // Parse into structured rows, tracking column order + weight domain.
  interface WordRow {
    col: string
    text: string
    weight: number
    segment: number
    datum: Datum
    dataIndex: number
  }
  const columnOrder: string[] = []
  const rowsByColumn = new Map<string, WordRow[]>()
  let sMin = Infinity
  let sMax = -Infinity
  for (let dataIndex = 0; dataIndex < ctx.data.length; dataIndex++) {
    const d = ctx.data[dataIndex]
    const col = String(getColumn(d))
    const text = String(getText(d))
    const weight = getWeight(d)
    const segment = getSegment(d)
    if (!text || !Number.isFinite(segment)) continue
    if (!rowsByColumn.has(col)) {
      columnOrder.push(col)
      rowsByColumn.set(col, [])
    }
    rowsByColumn.get(col)!.push({
      col,
      text,
      weight,
      segment,
      datum: d,
      dataIndex
    })
    if (segment < sMin) sMin = segment
    if (segment > sMax) sMax = segment
  }
  if (columnOrder.length === 0) return empty

  // Merge duplicate (column, word) rows to their peak unless repeats are on.
  if (!repeatWords) {
    for (const [col, rows] of rowsByColumn) {
      const peak = new Map<string, WordRow>()
      for (const r of rows) {
        const prev = peak.get(r.text)
        if (!prev || r.weight > prev.weight) peak.set(r.text, r)
      }
      rowsByColumn.set(col, [...peak.values()])
    }
  }

  // Weight domain across the (possibly merged) rows.
  let wMin = Infinity
  let wMax = -Infinity
  for (const rows of rowsByColumn.values()) {
    for (const r of rows) {
      if (r.weight < wMin) wMin = r.weight
      if (r.weight > wMax) wMax = r.weight
    }
  }
  if (!Number.isFinite(wMin)) return empty

  const finalColumns = cfg.columnOrder
    ? [
        ...cfg.columnOrder.filter((c) => rowsByColumn.has(c)),
        ...columnOrder.filter((c) => !cfg.columnOrder!.includes(c))
      ]
    : columnOrder

  // Resolve each column's authored/theme color once. Besides avoiding repeated
  // callback work, this gives per-word callbacks the exact hue they can tint.
  const resolvedColumnColors = new Map(
    finalColumns.map((col) => [
      col,
      cfg.columnColor?.(col) || ctx.resolveColor(col)
    ])
  )

  const [segLo, segHi] = cfg.segmentDomain ?? [sMin, sMax]
  const segSpan = segHi - segLo || 1

  // Area-proportional size: font ∝ √(weight / maxWeight), so a word's box area
  // scales with its weight. Sizes below the legibility floor are raised to it
  // (and reported), rather than rescaling every word onto [min, max].
  const wSpan = wMax - wMin || 1
  const proportionalFont = (w: number) =>
    wMax > 0 ? maxFont * Math.sqrt(w / wMax) : 0

  // Reserve chrome: column labels on top, segment axis on the left.
  const labelPad = showColumnLabels ? 22 : 0
  const axisPad = showSegmentAxis ? 52 : 0
  const bodyX = plot.x + axisPad
  const bodyY = plot.y + labelPad
  const bodyW = Math.max(0, plot.width - axisPad)
  const bodyH = Math.max(0, plot.height - labelPad)

  const n = finalColumns.length
  const usableW = Math.max(0, bodyW - gutter * Math.max(0, n - 1))
  const colW = n > 0 ? usableW / n : 0

  // Shared segment → y mapping used by both the words and the axis, so the
  // axis can never drift from the marks.
  const yPad = 14
  const yTop = bodyY + yPad
  const yBot = bodyY + bodyH - yPad
  const segToY = (s: number) => yTop + ((s - segLo) / segSpan) * (yBot - yTop)

  // Column geometry, base font (at scale k = 1), and each row's style inputs.
  interface ColumnPlan {
    col: string
    colLeft: number
    center: number
    rows: {
      id: string
      text: string
      weight: number
      segment: number
      baseFont: number
      floored: boolean
      rotation: number
      opacity: number
      color: string
      info: WordTrailsWordInfo
    }[]
  }
  const plans: ColumnPlan[] = finalColumns
    .map((col, ci) => {
      const resolvedColumnColor = resolvedColumnColors.get(col)!
      const rows = (rowsByColumn.get(col) ?? []).map((r, i) => {
        const info: WordTrailsWordInfo = {
          word: r.text,
          column: r.col,
          weight: r.weight,
          segment: r.segment,
          datum: r.datum,
          dataIndex: r.dataIndex,
          columnIndex: ci,
          resolvedColumnColor
        }
        const requestedOpacity = cfg.wordOpacity
          ? Number(cfg.wordOpacity(info))
          : 1
        const requestedColor = cfg.wordColor?.(info)
        const id = `${col}::${r.text}::${i}`
        const font = proportionalFont(r.weight)
        return {
          id,
          text: r.text,
          weight: r.weight,
          segment: r.segment,
          baseFont: Math.max(minFont, font),
          floored: font < minFont,
          rotation: rotate > 0 ? (hashUnit(id + "r") - 0.5) * 2 * rotate : 0,
          opacity: Number.isFinite(requestedOpacity)
            ? clamp(requestedOpacity, 0, 1)
            : 0,
          color: requestedColor || resolvedColumnColor,
          info
        }
      })
      if (rows.length === 0) return null
      return {
        col,
        colLeft: bodyX + ci * (colW + gutter),
        center: bodyX + ci * (colW + gutter) + colW / 2,
        rows
      }
    })
    .filter((p): p is ColumnPlan => p !== null)

  const sig = signatureKey([
    // Exact plot geometry: cached positions are absolute, so a rounded key
    // could hand back positions from a slightly different plot.
    plot.x,
    plot.y,
    plot.width,
    plot.height,
    labelPad,
    axisPad,
    gutter,
    collisionPadding,
    minFont,
    maxFont,
    rotate,
    scaleToFit,
    packingDensity,
    segLo,
    segHi,
    plans.length,
    rowsFingerprint(plans, 0x811c9dc5),
    rowsFingerprint(plans, 0x01000193)
  ])
  const geometry = GEOMETRY_CACHE.getOrCompute(sig, () =>
    placeWords({
      plans,
      colW,
      bodyH,
      yTop,
      yBot,
      segToY,
      collisionPadding,
      packingDensity,
      scaleToFit
    })
  )

  const infoAt = (planIndex: number, rowIndex: number) =>
    plans[planIndex].rows[rowIndex]
  const unplaced = geometry.unplaced.map(
    ({ planIndex, rowIndex }) => infoAt(planIndex, rowIndex).info
  )
  const placed: PlacedWord[] = geometry.placements.map((g) => {
    const row = infoAt(g.planIndex, g.rowIndex)
    const col = plans[g.planIndex].col
    const t = Math.sqrt((row.weight - wMin) / wSpan)
    return {
      id: g.id,
      text: row.text,
      x: g.x,
      y: g.y,
      w: g.w,
      h: g.h,
      fontSize: g.fontSize,
      rotation: g.rotation,
      floored: g.floored,
      color: row.color,
      opacity: row.opacity,
      info: row.info,
      datum: createSafeDatum((set) => {
        // Preserve authored metadata for tooltips/interaction. Copy into a
        // null-prototype target first, then let canonical layout aliases
        // win if the source row supplied conflicting values.
        for (const key of Object.keys(row.info.datum)) {
          set(key, row.info.datum[key])
        }
        set("word", row.text)
        set("weight", row.weight)
        set("column", col)
        set("segment", row.segment)
        if (textKey !== "word") set(textKey, row.text)
        if (weightKey !== "weight") set(weightKey, row.weight)
        if (columnKey !== "column") set(columnKey, col)
        if (segmentKey !== "segment") set(segmentKey, row.segment)
        set("__strength", 0.5 + 0.5 * t)
      })
    }
  })
  const visiblePlaced = placed.filter((p) => p.opacity > 0)

  // Transparent, hit-tested rect per word — earns keyboard nav, focus ring,
  // tooltip, selection, and transition identity. The visible glyph is the
  // overlay <text>; canvas hit-testing is geometric, so a transparent fill
  // still registers. Rotated words use their rotated bounds.
  const sceneNodes: RectSceneNode[] = visiblePlaced.map((p) => {
    const w = p.rotation ? p.w : boxWidth(p.text, p.fontSize)
    const h = p.rotation ? p.h : p.fontSize * LINE_HEIGHT_RATIO
    return {
      type: "rect",
      x: p.x - w / 2,
      y: p.y - h / 2,
      w,
      h,
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum: p.datum,
      group: String(p.datum.column),
      _transitionKey: p.id
    }
  })

  const overlays = (
    <g
      className="semiotic-word-trails"
      data-unplaced-count={unplaced.length || undefined}
    >
      {showSegmentAxis &&
        renderSegmentAxis({
          x: plot.x + axisPad - 10,
          yTop,
          yBot,
          segLo,
          segHi,
          segToY,
          tickCount,
          tickFormat,
          color: `var(--semiotic-text-secondary, ${ctx.theme.semantic.textSecondary ?? "#888"})`,
          label: cfg.segmentAxisLabel,
          labelX: plot.x
        })}
      {showColumnLabels &&
        finalColumns.map((col, ci) => {
          if (colW <= 0) return null
          const colLeft = bodyX + ci * (colW + gutter)
          return (
            <text
              key={`wt-col-${ci}`}
              x={colLeft + colW / 2}
              y={plot.y + 14}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={resolvedColumnColors.get(col)}
              style={{ pointerEvents: "none" }}
            >
              {col}
            </text>
          )
        })}
      {visiblePlaced.map((p) => (
        <text
          key={`wt-${p.id}`}
          x={p.x}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={p.fontSize}
          fontWeight={600}
          fill={p.color}
          opacity={
            (cfg.weightOpacity === false ? 1 : Number(p.datum.__strength)) *
            p.opacity
          }
          transform={
            p.rotation ? `rotate(${p.rotation} ${p.x} ${p.y})` : undefined
          }
          style={{ pointerEvents: "none" }}
        >
          {p.text}
        </text>
      ))}
    </g>
  )

  return {
    nodes: sceneNodes,
    overlays,
    // Word Trails doesn't restyle by selection; supplying `restyle` opts into
    // the frame's no-relayout selection path so a selection change doesn't
    // re-run placement.
    restyle: () => undefined,
    unplaced,
    sizeFloored: placed.filter((p) => p.floored).map((p) => p.info)
  }
}

interface PlacedWord {
  id: string
  text: string
  x: number
  y: number
  w: number
  h: number
  fontSize: number
  rotation: number
  floored: boolean
  color: string
  opacity: number
  info: WordTrailsWordInfo
  datum: Datum
}

function renderSegmentAxis(o: {
  x: number
  yTop: number
  yBot: number
  segLo: number
  segHi: number
  segToY: (s: number) => number
  tickCount: number
  tickFormat: (v: number) => string
  color: string
  label?: string
  labelX: number
}): React.ReactElement {
  const ticks: number[] = []
  const span = o.segHi - o.segLo || 1
  for (let i = 0; i < o.tickCount; i++) {
    ticks.push(o.segLo + (span * i) / Math.max(1, o.tickCount - 1))
  }
  return (
    <g className="semiotic-word-trails-axis" style={{ pointerEvents: "none" }}>
      <line
        x1={o.x}
        y1={o.yTop}
        x2={o.x}
        y2={o.yBot}
        stroke={o.color}
        strokeWidth={1}
        opacity={0.5}
      />
      {ticks.map((t, i) => {
        const y = o.segToY(t)
        return (
          <g key={`wt-tick-${i}`}>
            <line
              x1={o.x - 4}
              y1={y}
              x2={o.x}
              y2={y}
              stroke={o.color}
              strokeWidth={1}
              opacity={0.6}
            />
            <text
              x={o.x - 7}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fontSize={11}
              fill={o.color}
            >
              {o.tickFormat(t)}
            </text>
          </g>
        )
      })}
      {o.label && (
        <text
          transform={`rotate(-90 ${o.labelX + 10} ${(o.yTop + o.yBot) / 2})`}
          x={o.labelX + 10}
          y={(o.yTop + o.yBot) / 2}
          textAnchor="middle"
          fontSize={11}
          fontWeight={600}
          fill={o.color}
        >
          {o.label}
        </text>
      )}
    </g>
  )
}
