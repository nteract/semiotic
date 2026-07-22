import * as React from "react"
import type { OrdinalCustomLayout } from "../stream/ordinalCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"
import type { RectSceneNode } from "../stream/types"
import { resolveAccessor, createSafeDatum, clamp } from "./recipeUtils"
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
 *   - **font size** encodes frequency/weight.
 *
 * Each column is laid out with greedy, largest-first placement: every word
 * searches outward from its segment anchor for the nearest free spot, so the
 * result is **overlap-free by construction**. A single global font scale
 * (`scaleToFit`) shrinks every word together until it all fits — relative
 * magnitude is preserved, nothing is clipped or dropped.
 *
 * The reading: scan a column top-to-bottom to follow one speaker through time;
 * scan across a row to compare what everyone emphasised at the same moment.
 *
 * Inspired by Elijah Meeks's 2016 "Word Trails" debate visualization. Because
 * placement is *box*-aware (not sprite/pixel), the layout needs no canvas text
 * measurement — it is pure and SSR-clean.
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
  /** Smallest font size, px. @default 11 */
  minFontSize?: number
  /** Largest font size, px. @default 42 */
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
   * Uniformly shrink every word by one global factor until nothing overlaps.
   * Relative magnitude is preserved (a word twice as frequent stays twice the
   * area) — only the absolute scale drops as words are added. Turn it off to
   * keep exact `minFontSize`/`maxFontSize` sizing and accept overlap.
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

/** Deterministic [0,1) hash (FNV-1a) — stable jitter + rotation per word. */
function hashUnit(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

const LINE_HEIGHT_RATIO = 1.15
// Per-glyph advance widths (em) for a regular sans-serif — Helvetica/Arial
// metrics, which system-ui/Inter track closely. Tokens are lowercased, so a
// lowercase + apostrophe table measures word boxes accurately *without* a
// canvas — far tighter than a flat average, which is what lets words pack
// closely with no overlap. A small safety factor covers font-family drift.
const CHAR_EM: Record<string, number> = {
  a: 0.556,
  b: 0.556,
  c: 0.5,
  d: 0.556,
  e: 0.556,
  f: 0.278,
  g: 0.556,
  h: 0.556,
  i: 0.222,
  j: 0.222,
  k: 0.5,
  l: 0.222,
  m: 0.833,
  n: 0.556,
  o: 0.556,
  p: 0.556,
  q: 0.556,
  r: 0.333,
  s: 0.5,
  t: 0.278,
  u: 0.556,
  v: 0.5,
  w: 0.722,
  x: 0.5,
  y: 0.5,
  z: 0.5,
  "'": 0.191,
  "-": 0.333,
  ".": 0.278,
  " ": 0.278
}
const FONT_SAFETY = 1.05
const BOX_PAD = 1

/** Estimated rendered width of a string, in em. */
function textWidthEm(s: string): number {
  let w = 0
  for (const ch of s) w += CHAR_EM[ch] ?? 0.6
  return w
}

/** Rendered width of a word's box, px (accurate glyph sum + small safety). */
function boxWidth(text: string, font: number): number {
  return Math.max(8, textWidthEm(text) * font * FONT_SAFETY + BOX_PAD)
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** True if `cand` (center coords) overlaps any placed box, keeping `pad` between edges. */
function collidesAny(
  cand: Box,
  placed: ReadonlyArray<Box>,
  pad: number
): boolean {
  for (const b of placed) {
    if (
      Math.abs(cand.x - b.x) < (cand.w + b.w) / 2 + pad &&
      Math.abs(cand.y - b.y) < (cand.h + b.h) / 2 + pad
    ) {
      return true
    }
  }
  return false
}

interface PlacedWord {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  color: string
  opacity: number
  rotation: number
  datum: Datum
}

export const wordTrailsLayout: OrdinalCustomLayout<WordTrailsConfig> = (
  ctx
) => {
  const cfg = ctx.config
  const { plot } = ctx.dimensions
  if (plot.width <= 0 || plot.height <= 0 || ctx.data.length === 0)
    return { nodes: [] }

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
  if (columnOrder.length === 0) return { nodes: [] }

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
  if (!Number.isFinite(wMin)) return { nodes: [] }

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

  // sqrt weight → font size (area-fair for size perception).
  const wSpan = wMax - wMin || 1
  const fontFor = (w: number) => {
    const t = Math.sqrt((w - wMin) / wSpan) // 0..1
    return minFont + t * (maxFont - minFont)
  }

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

  // Column geometry, base font (at scale k = 1), and the two per-column limits
  // on the global scale: an area budget (total box area ≤ packingDensity of the
  // column) and a width limit (the widest word must fit the column band).
  interface ColumnPlan {
    col: string
    colLeft: number
    center: number
    rows: {
      text: string
      weight: number
      segment: number
      baseFont: number
      opacity: number
      color: string
      info: WordTrailsWordInfo
    }[]
  }
  const colArea = colW * bodyH
  let kArea = Infinity
  let kWidth = Infinity
  const plans: ColumnPlan[] = finalColumns
    .map((col, ci) => {
      const resolvedColumnColor = resolvedColumnColors.get(col)!
      const rows = (rowsByColumn.get(col) ?? []).map((r) => {
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
        return {
          text: r.text,
          weight: r.weight,
          segment: r.segment,
          baseFont: fontFor(r.weight),
          opacity: Number.isFinite(requestedOpacity)
            ? clamp(requestedOpacity, 0, 1)
            : 0,
          color: requestedColor || resolvedColumnColor,
          info
        }
      })
      if (rows.length === 0) return null
      let sumArea = 0
      for (const r of rows) {
        const wUnit = textWidthEm(r.text) * FONT_SAFETY
        sumArea += wUnit * LINE_HEIGHT_RATIO * r.baseFont * r.baseFont
        kWidth = Math.min(kWidth, (colW - 8 - BOX_PAD) / (wUnit * r.baseFont))
      }
      if (sumArea > 0)
        kArea = Math.min(kArea, Math.sqrt((packingDensity * colArea) / sumArea))
      return {
        col,
        colLeft: bodyX + ci * (colW + gutter),
        center: bodyX + ci * (colW + gutter) + colW / 2,
        rows
      }
    })
    .filter((p): p is ColumnPlan => p !== null)

  // The global uniform scale. Same k for every word ⇒ relative magnitude is
  // preserved everywhere; only the absolute size drops as words are added.
  const kFit = scaleToFit ? Math.min(1, kArea, kWidth) : Math.min(1, kWidth) // even without fit-shrink, never let a word spill the frame

  // Place every column at a given scale via greedy largest-first placement.
  // Each word searches outward (sunflower sampling) from its segment anchor for
  // the nearest spot that clears every already-placed box — so the result is
  // *overlap-free by construction*, not by relaxation. Larger words are placed
  // first and win the spots nearest their true time; smaller words settle into
  // the gaps. `unplaced` counts words that found no room within the column at
  // this scale (⇒ shrink and retry). Deterministic for a given k.
  const runPlace = (k: number): { placed: PlacedWord[]; unplaced: number } => {
    const out: PlacedWord[] = []
    let unplaced = 0
    for (const plan of plans) {
      if (colW <= 0) continue
      const xLo = plan.colLeft + 4
      const xHi = plan.colLeft + colW - 4

      const words = plan.rows
        .map((r, i) => {
          const font = Math.max(5, k * r.baseFont)
          const id = `${plan.col}::${r.text}::${i}`
          return {
            id,
            text: r.text,
            weight: r.weight,
            segment: r.segment,
            font,
            w: boxWidth(r.text, font),
            h: font * LINE_HEIGHT_RATIO + 2,
            anchorY: segToY(r.segment),
            seed: (hashUnit(id) - 0.5) * Math.min(colW * 0.5, 80),
            opacity: r.opacity,
            color: r.color,
            info: r.info
          }
        })
        // Largest first — big words claim the spots closest to their segment.
        .sort((a, b) => b.font - a.font || (a.id < b.id ? -1 : 1))

      const placedBoxes: { x: number; y: number; w: number; h: number }[] = []
      for (const word of words) {
        const halfW = word.w / 2
        const halfH = word.h / 2
        const cx0 = clamp(plan.center + word.seed, xLo + halfW, xHi - halfW)
        const cy0 = word.anchorY
        let px = cx0
        let py = clamp(cy0, yTop + halfH, yBot - halfH)
        let found = false
        // Sunflower search: even angular coverage, radius ∝ √step. The first
        // clear sample is close to the anchor, so words stay near their time.
        for (let step = 0; step < 2600; step++) {
          const radius = 3.2 * Math.sqrt(step)
          const angle = step * 2.399963229728653 // golden angle
          const cand = {
            x: clamp(cx0 + radius * Math.cos(angle), xLo + halfW, xHi - halfW),
            y: clamp(
              cy0 + radius * Math.sin(angle),
              yTop + halfH,
              yBot - halfH
            ),
            w: word.w,
            h: word.h
          }
          if (!collidesAny(cand, placedBoxes, collisionPadding)) {
            px = cand.x
            py = cand.y
            found = true
            break
          }
        }
        if (!found) unplaced++
        placedBoxes.push({ x: px, y: py, w: word.w, h: word.h })

        const t = Math.sqrt((word.weight - wMin) / wSpan)
        const rotation =
          rotate > 0 ? (hashUnit(word.id + "r") - 0.5) * 2 * rotate : 0
        out.push({
          id: word.id,
          text: word.text,
          x: px,
          y: py,
          fontSize: word.font,
          rotation,
          color: word.color,
          opacity: word.opacity,
          datum: createSafeDatum((set) => {
            // Preserve authored metadata for tooltips/interaction. Copy into a
            // null-prototype target first, then let canonical layout aliases
            // win if the source row supplied conflicting values.
            for (const key of Object.keys(word.info.datum)) {
              set(key, word.info.datum[key])
            }
            set("word", word.text)
            set("weight", word.weight)
            set("column", plan.col)
            set("segment", word.segment)
            if (textKey !== "word") set(textKey, word.text)
            if (weightKey !== "weight") set(weightKey, word.weight)
            if (columnKey !== "column") set(columnKey, plan.col)
            if (segmentKey !== "segment") set(segmentKey, word.segment)
            set("__strength", 0.5 + 0.5 * t)
          })
        })
      }
    }
    return { placed: out, unplaced }
  }

  // Place at the fit scale, then — if any word found no room — shrink the
  // global scale and retry until everything fits or we hit the floor. The area
  // budget makes 0–1 extra passes the norm.
  let k = kFit
  let result = runPlace(k)
  if (scaleToFit) {
    for (
      let attempt = 0;
      attempt < 6 && result.unplaced > 0 && k > 0.1;
      attempt++
    ) {
      k *= 0.88
      result = runPlace(k)
    }
  }
  const placed = result.placed
  const visiblePlaced = placed.filter((p) => p.opacity > 0)

  // Transparent, hit-tested rect per word — earns keyboard nav, focus ring,
  // tooltip, selection, and transition identity. The visible glyph is the
  // overlay <text>; canvas hit-testing is geometric, so a transparent fill
  // still registers.
  const sceneNodes: RectSceneNode[] = visiblePlaced.map((p) => {
    const halfW = boxWidth(p.text, p.fontSize) / 2
    const halfH = (p.fontSize * LINE_HEIGHT_RATIO) / 2
    return {
      type: "rect",
      x: p.x - halfW,
      y: p.y - halfH,
      w: halfW * 2,
      h: halfH * 2,
      style: { fill: "rgba(0,0,0,0)", stroke: "none" },
      datum: p.datum,
      group: String(p.datum.column),
      _transitionKey: p.id
    }
  })

  const overlays = (
    <g className="semiotic-word-trails">
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

  return { nodes: sceneNodes, overlays }
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
