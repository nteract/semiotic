/**
 * Sequence diagram kit — linear spines, span-arc packing, and shared-edge
 * partition helpers for custom charts that treat a row of marks as a baseline
 * (dependency arcs, co-reference, genomic links, alternate-hypothesis overlays).
 *
 * Pure / SSR-safe. Complements {@link packIntervals} (time tracks) and the
 * edge-router kit (network S-curves): here the domain is an ordered index on a
 * baseline and the mark is a vertical-band arc between two anchors.
 */

export interface SequenceItem {
  /** Stable identity used as the position map key. */
  id: string
}

export interface SequencePosition {
  id: string
  x: number
  y: number
  /** Zero-based order on the baseline. */
  index: number
}

export interface LayoutSequenceOptions {
  width: number
  y: number
  /** @default min(74, max(34, width * 0.08)) */
  paddingLeft?: number
  /** @default min(74, max(34, width * 0.08)) */
  paddingRight?: number
}

/**
 * Place ordered items evenly along a horizontal baseline. Returns a Map keyed
 * by `id` so callers can look up either end of a span arc in O(1).
 */
export function layoutSequence(
  items: readonly SequenceItem[],
  options: LayoutSequenceOptions
): Map<string, SequencePosition> {
  const width = Math.max(0, options.width)
  const y = options.y
  const defaultPad = Math.min(74, Math.max(34, width * 0.08))
  const paddingLeft = options.paddingLeft ?? defaultPad
  const paddingRight = options.paddingRight ?? defaultPad
  const inner = Math.max(0, width - paddingLeft - paddingRight)
  const step = items.length > 1 ? inner / (items.length - 1) : 0
  const positions = new Map<string, SequencePosition>()
  items.forEach((item, index) => {
    positions.set(item.id, {
      id: item.id,
      x: paddingLeft + step * index,
      y,
      index
    })
  })
  return positions
}

export interface ChipStripItem extends SequenceItem {
  /** Optional label used by the default width estimator. */
  label?: string
}

export interface LayoutChipStripOptions extends LayoutSequenceOptions {
  /** Gap between chips when packing by content width. @default 8 */
  gap?: number
  /**
   * When true (default), distribute free horizontal space evenly between chips
   * so the strip still spans the baseline. When false, pack left-to-right.
   */
  distribute?: boolean
  /** Override per-chip width. Defaults to {@link estimateLabelWidth} of `label`/`id`. */
  estimateWidth?: (item: ChipStripItem, index: number) => number
}

export interface ChipStripPosition extends SequencePosition {
  /** Chip width in px (for hulls / hit targets). */
  width: number
}

/**
 * Place ordered chips along a baseline, sizing each by estimated label width.
 * Prefer {@link layoutSequence} when marks are equal-spaced points rather than
 * variable-width chips.
 */
export function layoutChipStrip(
  items: readonly ChipStripItem[],
  options: LayoutChipStripOptions
): Map<string, ChipStripPosition> {
  const width = Math.max(0, options.width)
  const y = options.y
  const defaultPad = Math.min(74, Math.max(34, width * 0.08))
  const paddingLeft = options.paddingLeft ?? defaultPad
  const paddingRight = options.paddingRight ?? defaultPad
  const gap = options.gap ?? 8
  const distribute = options.distribute !== false
  const estimate =
    options.estimateWidth ??
    ((item: ChipStripItem) => estimateLabelWidth(item.label ?? item.id))

  const widths = items.map((item, index) => Math.max(1, estimate(item, index)))
  const content = widths.reduce((sum, w) => sum + w, 0) + gap * Math.max(0, items.length - 1)
  const inner = Math.max(0, width - paddingLeft - paddingRight)
  const free = Math.max(0, inner - content)
  const extra =
    distribute && items.length > 1 ? free / (items.length - 1) : 0

  const positions = new Map<string, ChipStripPosition>()
  let cursor = paddingLeft
  if (!distribute && items.length === 1) {
    cursor = paddingLeft + Math.max(0, (inner - widths[0]) / 2)
  }
  items.forEach((item, index) => {
    const w = widths[index]
    positions.set(item.id, {
      id: item.id,
      x: cursor + w / 2,
      y,
      index,
      width: w
    })
    cursor += w + gap + extra
  })
  return positions
}

/**
 * Rough text width for chip / arc labels. Matches the heuristic used by the
 * sentence-structure stage and is good enough for layout before paint.
 */
export function estimateLabelWidth(
  text: unknown,
  minimum = 38,
  charWidth = 7.4,
  pad = 20
): number {
  return Math.max(minimum, String(text ?? "").length * charWidth + pad)
}

export interface SpanInterval {
  /** Stable identity for the packed result. */
  id: string
  /** Inclusive left index on the sequence baseline. */
  a: number
  /** Inclusive right index on the sequence baseline. */
  b: number
}

export interface PackedSpanLevel<T extends SpanInterval = SpanInterval> {
  span: T
  /** Zero-based height level (0 = closest to the baseline). */
  level: number
}

export interface PackSpanLevelsResult<T extends SpanInterval = SpanInterval> {
  packed: PackedSpanLevel<T>[]
  /** Number of distinct levels used (`maxLevel + 1`, at least 1). */
  levelCount: number
  maxLevel: number
}

/**
 * Greedy span packing: assign each interval to the lowest level whose last
 * right edge is already left of this span's left edge. Short spans are packed
 * first so long arcs stack above them — the classic dependency-arc layout.
 *
 * Indices are treated as inclusive; a span with `a === b` is a zero-width hop.
 */
export function packSpanLevels<T extends SpanInterval>(
  spans: readonly T[]
): PackSpanLevelsResult<T> {
  const prepared = spans
    .map((span) => {
      const a = Math.min(span.a, span.b)
      const b = Math.max(span.a, span.b)
      return { span, a, b, width: b - a }
    })
    .sort((left, right) => left.width - right.width || left.a - right.a)

  const levelEnds: number[] = []
  const packed: PackedSpanLevel<T>[] = prepared.map((item) => {
    // Inclusive indices: a span ending at `b` frees the level for any span that
    // starts at `b` or later (they share an endpoint token, which is fine for arcs).
    let level = levelEnds.findIndex((occupiedUntil) => item.a >= occupiedUntil)
    if (level < 0) {
      level = levelEnds.length
      levelEnds.push(item.b)
    } else {
      levelEnds[level] = item.b
    }
    return { span: item.span, level }
  })

  const maxLevel = packed.reduce((max, item) => Math.max(max, item.level), 0)
  return {
    packed,
    maxLevel,
    levelCount: packed.length ? maxLevel + 1 : 1
  }
}

export interface ScaleArcBandOptions {
  /** Y of the sequence baseline (token line). */
  baselineY: number
  /** Top of the free vertical band arcs may occupy. */
  ceilingY: number
  /** From {@link packSpanLevels}. */
  levelCount: number
  /** Vertical room reserved under each peak for a mid-arc label. @default 18 */
  labelRoom?: number
}

export interface ScaleArcBandResult {
  /** Height of the shortest (level 0) arc above the baseline foot. */
  arcLift: number
  /** Vertical spacing between successive levels. */
  levelStep: number
}

/**
 * Stretch packed arc levels across the free band between `ceilingY` and the
 * baseline so short plots are not a cramped nest under a blank canvas.
 */
export function scaleArcBand(options: ScaleArcBandOptions): ScaleArcBandResult {
  const labelRoom = options.labelRoom ?? 18
  const usable = Math.max(48, options.baselineY - options.ceilingY - 28)
  const levels = Math.max(1, options.levelCount)
  const arcLift = Math.min(42, Math.max(26, usable * 0.18))
  const remaining = Math.max(24, usable - arcLift - labelRoom)
  const levelStep =
    levels <= 1 ? remaining : remaining / Math.max(1, levels - 1)
  return {
    arcLift,
    levelStep: Math.min(72, Math.max(28, levelStep))
  }
}

export interface SpanArcPathOptions {
  /**
   * How far above `baselineY` the arc feet attach (keeps arcs off token chips).
   * @default 26
   */
  footLift?: number
}

/**
 * Quadratic span arc between two x-positions on a baseline. Pure path `d`
 * string for SVG overlays / scene edge emission.
 */
export function spanArcPath(
  x0: number,
  x1: number,
  baselineY: number,
  peakY: number,
  options: SpanArcPathOptions = {}
): string {
  const footLift = options.footLift ?? 26
  const footY = baselineY - footLift
  const midX = (x0 + x1) / 2
  return `M${x0} ${footY}Q${midX} ${peakY} ${x1} ${footY}`
}

/**
 * Peak y for a packed span level given band metrics from {@link scaleArcBand}.
 */
export function spanArcPeakY(
  baselineY: number,
  level: number,
  metrics: ScaleArcBandResult
): number {
  return baselineY - metrics.arcLift - level * metrics.levelStep
}

export type EdgeKeyFn<T> = (edge: T) => string

/**
 * Partition several edge lists into the shared intersection (present in every
 * set under `keyOf`) and the per-set exclusive remainder. Used by compare views
 * that paint common topology once and disputed links per hypothesis.
 *
 * Shared edges are taken from the first set (stable identity for paint keys).
 */
export function partitionSharedEdges<T>(
  edgeSets: readonly (readonly T[])[],
  keyOf: EdgeKeyFn<T> = defaultEdgeKey
): { shared: T[]; exclusive: T[][] } {
  if (!edgeSets.length) return { shared: [], exclusive: [] }
  if (edgeSets.length === 1) {
    return { shared: [...edgeSets[0]], exclusive: [[]] }
  }

  const keySets = edgeSets.map(
    (edges) => new Set(edges.map((edge) => keyOf(edge)))
  )
  const sharedKeys = new Set<string>()
  for (const key of keySets[0]) {
    if (keySets.every((set) => set.has(key))) sharedKeys.add(key)
  }

  const shared: T[] = []
  const seenShared = new Set<string>()
  for (const edge of edgeSets[0]) {
    const key = keyOf(edge)
    if (sharedKeys.has(key) && !seenShared.has(key)) {
      shared.push(edge)
      seenShared.add(key)
    }
  }

  const exclusive = edgeSets.map((edges) =>
    edges.filter((edge) => !sharedKeys.has(keyOf(edge)))
  )
  return { shared, exclusive }
}

function defaultEdgeKey(edge: unknown): string {
  if (edge == null) return String(edge)
  if (typeof edge !== "object") return String(edge)
  const record = edge as Record<string, unknown>
  if (record.id != null) return String(record.id)
  const source = record.sourceTokenId ?? record.source
  const target = record.targetTokenId ?? record.target
  const relation = record.relation ?? record.label ?? ""
  return `${String(source)}|${String(target)}|${String(relation)}`
}
