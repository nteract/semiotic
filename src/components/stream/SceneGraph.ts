import type {
  SceneNode,
  SceneDatum,
  LineSceneNode,
  AreaSceneNode,
  PointSceneNode,
  SymbolSceneNode,
  RectSceneNode,
  HeatcellSceneNode,
  Style,
  StreamScales,
  CurveType
} from "./types"
import type { SymbolName } from "./symbolPath"
import type { Datum } from "../charts/shared/datumTypes"
import { buildSeriesGeometry } from "./seriesGeometry"

// ── Scene node builders ────────────────────────────────────────────────

export function buildLineNode(
  data: Datum[],
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  style: Style,
  group?: string
): LineSceneNode {
  const {
    topPath: path,
    rawValues,
    datum
  } = buildSeriesGeometry(data, scales, xGet, yGet)
  return { type: "line", path, rawValues, style, datum, group }
}

export function buildAreaNode(
  data: Datum[],
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  baselineY: number,
  style: Style,
  group?: string,
  y0Get?: (d: Datum) => number
): AreaSceneNode {
  return {
    type: "area",
    ...buildSeriesGeometry(
      data,
      scales,
      xGet,
      yGet,
      y0Get ?? (() => baselineY)
    ),
    style,
    group
  }
}

/** Per-group-per-x stacked top values, keyed by group then x */
export type StackedTops = Map<string, Map<number, number>>

export type StackBaseline = "zero" | "wiggle" | "silhouette" | "diverging"

/**
 * Compute per-x stack baseline offsets. Shared between scene rendering
 * (`buildStackedAreaNodes`) and extent computation (`PipelineStore`) so
 * both see the same y-bounds — without this, the wiggle offset's
 * accumulated drift can exceed `±total/2` and clip against a too-small
 * y-domain.
 *
 * Inputs:
 *   xValues   — sorted unique x values
 *   groupKeys — group keys in stacking order (same order both callers use)
 *   valueAt   — (groupKey, x) → group's value at x (0 if absent)
 *
 * `"diverging"` returns zero offsets — positives and negatives stack from
 * y=0 independently inside {@link buildStackedAreaNodes}.
 */
export function computeStackOffsets(
  xValues: number[],
  groupKeys: string[],
  valueAt: (groupKey: string, x: number) => number,
  baseline: StackBaseline
): Map<number, number> {
  const offsets = new Map<number, number>()
  if (baseline === "silhouette") {
    for (const x of xValues) {
      let total = 0
      for (const k of groupKeys) total += valueAt(k, x) || 0
      offsets.set(x, -total / 2)
    }
  } else if (baseline === "wiggle") {
    // Step 1 — Byron–Wattenberg wiggle dynamics: each x's offset is the
    // previous offset minus a "wiggle" term that minimizes the total
    // visual movement across series.
    if (xValues.length > 0) offsets.set(xValues[0], 0)
    for (let i = 1; i < xValues.length; i++) {
      const xPrev = xValues[i - 1]
      const x = xValues[i]
      let s1 = 0
      let s2 = 0
      let cumCur = 0
      for (const k of groupKeys) {
        const fj = valueAt(k, x) || 0
        const fjPrev = valueAt(k, xPrev) || 0
        const dj = fj - fjPrev
        s1 += (2 * cumCur + fj) * dj
        s2 += fj
        cumCur += fj
      }
      const prevOffset = offsets.get(xPrev) ?? 0
      const wiggle = s2 > 0 ? s1 / (2 * s2) : 0
      offsets.set(x, prevOffset - wiggle)
    }
    // Step 2 — post-center on y=0. Pure wiggle minimizes movement but
    // doesn't constrain the absolute baseline, so the streamgraph drifts
    // off-axis (visual middle ends up at, say, y=32 with the y-axis
    // running [0, 70]). Shift every offset so the average visual center
    // lands at y=0 — matches the canonical NYT-style streamgraph and
    // gives the y-axis symmetric ticks.
    if (xValues.length > 0) {
      let sumCenter = 0
      for (const x of xValues) {
        let total = 0
        for (const k of groupKeys) total += valueAt(k, x) || 0
        sumCenter += (offsets.get(x) ?? 0) + total / 2
      }
      const avgCenter = sumCenter / xValues.length
      for (const x of xValues) {
        offsets.set(x, (offsets.get(x) ?? 0) - avgCenter)
      }
    }
  } else {
    // "zero" and "diverging" both anchor stacks at y=0.
    for (const x of xValues) offsets.set(x, 0)
  }
  return offsets
}

/**
 * Diverging stack extent: positives accumulate above 0, negatives below.
 * Shared by PipelineStore auto-extent and any host that needs matching bounds.
 */
export function computeDivergingStackExtent(
  xValues: number[],
  groupKeys: string[],
  valueAt: (groupKey: string, x: number) => number
): [number, number] {
  let lo = 0
  let hi = 0
  for (const x of xValues) {
    let pos = 0
    let neg = 0
    for (const k of groupKeys) {
      const v = valueAt(k, x) || 0
      if (v >= 0) pos += v
      else neg += v
    }
    if (neg < lo) lo = neg
    if (pos > hi) hi = pos
  }
  return [lo, hi]
}

export function buildStackedAreaNodes(
  groups: { key: string; data: Datum[] }[],
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  styleFn: (group: string, sampleDatum?: Datum) => Style,
  normalize?: boolean,
  curve?: CurveType,
  baseline: StackBaseline = "zero"
): { nodes: AreaSceneNode[]; stackedTops: StackedTops } {
  // Collect all unique x values. `Number.isFinite` rejects NaN,
  // Infinity, -Infinity, and non-numbers — must agree with the
  // PipelineStore extent computation, otherwise extent and scene
  // disagree on which rows count and the yDomain doesn't match what
  // gets drawn.
  const xSet = new Set<number>()
  type StackedValue = {
    value: number
    datum: Datum
    sources?: Datum[]
  }
  // Keep the value and its source together. Most group/x pairs have a single
  // row; only duplicates need a contributor array. Collect x in the same pass
  // but retain finite-x/invalid-y positions so they still break the path.
  const valueMaps = new Map<string, Map<number, StackedValue>>()
  for (const g of groups) {
    const m = new Map<number, StackedValue>()
    for (const d of g.data) {
      const x = xGet(d)
      const y = yGet(d)
      if (!Number.isFinite(x)) continue
      xSet.add(x)
      if (!Number.isFinite(y)) continue
      const existing = m.get(x)
      if (existing) {
        existing.value += y
        if (existing.sources) existing.sources.push(d)
        else existing.sources = [existing.datum, d]
      } else {
        m.set(x, { value: y, datum: d })
      }
    }
    valueMaps.set(g.key, m)
  }
  const xValues = Array.from(xSet).sort((a, b) => a - b)

  // Compute totals per x for normalization
  let totals: Map<number, number> | undefined
  if (normalize) {
    totals = new Map()
    for (const x of xValues) {
      let sum = 0
      for (const g of groups) {
        sum += valueMaps.get(g.key)?.get(x)?.value || 0
      }
      totals.set(x, sum || 1) // avoid div by 0
    }
  }

  const groupKeys = groups.map((g) => g.key)
  const valueAt = (k: string, x: number) => valueMaps.get(k)?.get(x)?.value || 0

  // Compute per-x baseline offset (shared with PipelineStore's extent pass).
  // Diverging stacks ignore the single-cursor offset and use dual bases.
  const offsets = computeStackOffsets(xValues, groupKeys, valueAt, baseline)
  const diverging = baseline === "diverging" && !normalize

  // Build stacked area nodes. Standard modes walk one cumulative cursor;
  // diverging keeps separate positive (above 0) and negative (below 0) cursors
  // so risk series with signed y values stack under the axis (d3 stackOffsetDiverging).
  const nodes: AreaSceneNode[] = []
  const stackedTops: StackedTops = new Map()
  const baselines = new Map<number, number>() // x → cumulative y (relative to offset)
  const posBases = new Map<number, number>()
  const negBases = new Map<number, number>()
  for (const x of xValues) {
    baselines.set(x, offsets.get(x) ?? 0)
    posBases.set(x, 0)
    negBases.set(x, 0)
  }

  for (const g of groups) {
    const vMap = valueMaps.get(g.key)!
    const groupTops = new Map<number, number>()
    // Contiguous non-zero runs → separate area nodes (LineChart gapStrategy
    // "break" semantics for stacks). Zero / missing values cut the band so we
    // don't draw a flat line along the axis for inactive series.
    let topPath: [number, number][] = []
    let bottomPath: [number, number][] = []
    let rawValues: number[] = []
    let datums: Datum[] = []
    let accessibleDatums: Datum[] = []
    let needsSort = false

    const flushSegment = () => {
      if (topPath.length === 0) return
      if (topPath.length >= 2) {
        // xValues are already sorted. Only reversed/non-monotonic projections
        // need a permutation; apply the SAME permutation to every channel.
        const order = needsSort
          ? topPath
              .map((_, index) => index)
              .sort((a, b) => topPath[a][0] - topPath[b][0])
          : undefined
        const areaNode: AreaSceneNode = {
          type: "area",
          topPath: order ? order.map((index) => topPath[index]) : topPath,
          bottomPath: order
            ? order.map((index) => bottomPath[index])
            : bottomPath,
          rawValues: order ? order.map((index) => rawValues[index]) : rawValues,
          style: styleFn(g.key, g.data[0]),
          datum: order ? order.map((index) => datums[index]) : datums,
          accessibleDatum: order
            ? order.map((index) => accessibleDatums[index])
            : accessibleDatums,
          group: g.key
        }
        if (curve) areaNode.curve = curve
        nodes.push(areaNode)
      }
      topPath = []
      bottomPath = []
      rawValues = []
      datums = []
      accessibleDatums = []
      needsSort = false
    }

    for (const x of xValues) {
      const entry = vMap.get(x)
      const hasValue = entry !== undefined
      let rawY = entry?.value ?? 0
      if (normalize && hasValue) {
        const total = totals!.get(x)!
        rawY = rawY / total
      }

      // Missing or non-finite → no contribution and cut the path.
      // Exact zero → no contribution and cut (no zero-height ribbon along the axis).
      const isDefined = hasValue && Number.isFinite(rawY) && rawY !== 0

      if (!isDefined) {
        flushSegment()
        continue
      }

      let base: number
      let stackedY: number
      if (diverging) {
        if (rawY > 0) {
          base = posBases.get(x)!
          stackedY = base + rawY
          posBases.set(x, stackedY)
        } else {
          // Negative branch: stack downward from 0 / previous negative total.
          base = negBases.get(x)!
          stackedY = base + rawY
          negBases.set(x, stackedY)
        }
      } else {
        base = baselines.get(x)!
        stackedY = base + rawY
        baselines.set(x, stackedY)
      }

      const px = scales.x(x)
      const bottomY = scales.y(base)
      const topY = scales.y(stackedY)
      if (
        !Number.isFinite(px) ||
        !Number.isFinite(bottomY) ||
        !Number.isFinite(topY)
      ) {
        flushSegment()
        continue
      }
      const sources = entry!.sources
      const aggregate = entry!.value
      const datum = !sources
        ? entry!.datum
        : {
            ...sources[0],
            __aggregateValue: aggregate,
            __aggregateCount: sources.length,
            __aggregateRows: sources
          }
      if (topPath.length > 0 && px < topPath[topPath.length - 1][0])
        needsSort = true
      // Write directly into the final buffers without a temporary vertex object.
      topPath.push([px, topY])
      bottomPath.push([px, bottomY])
      datums.push(datum)
      rawValues.push(aggregate)
      // An aggregate is not one arbitrarily selected source row.
      accessibleDatums.push(
        !sources
          ? datum
          : {
              x,
              value: aggregate,
              group: g.key,
              observations: sources.length
            }
      )
      groupTops.set(x, stackedY)
    }

    flushSegment()
    stackedTops.set(g.key, groupTops)
  }

  return { nodes, stackedTops }
}

export function buildPointNode(
  datum: Datum,
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  r: number,
  style: Style,
  pointId?: string
): PointSceneNode | null {
  const xVal = xGet(datum)
  const yVal = yGet(datum)
  if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return null
  const node: PointSceneNode = {
    type: "point",
    x: scales.x(xVal),
    y: scales.y(yVal),
    r,
    style,
    datum
  }
  if (pointId !== undefined) node.pointId = pointId
  return node
}

/** Build a {@link SymbolSceneNode} — the glyph sibling of {@link buildPointNode}.
 *  `size` is the d3-symbol area (px²); convert from a target radius with πr². */
export function buildSymbolNode(
  datum: Datum,
  scales: StreamScales,
  xGet: (d: Datum) => number,
  yGet: (d: Datum) => number,
  size: number,
  symbolType: SymbolName,
  style: Style,
  pointId?: string
): SymbolSceneNode | null {
  const xVal = xGet(datum)
  const yVal = yGet(datum)
  if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) return null
  const node: SymbolSceneNode = {
    type: "symbol",
    x: scales.x(xVal),
    y: scales.y(yVal),
    size,
    symbolType,
    style,
    datum
  }
  if (pointId !== undefined) node.pointId = pointId
  return node
}

export function buildRectNode(
  x: number,
  y: number,
  w: number,
  h: number,
  style: Style,
  datum: SceneDatum,
  group?: string
): RectSceneNode {
  return { type: "rect", x, y, w, h, style, datum, group }
}

export function buildHeatcellNode(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  datum: Datum,
  options?: {
    value?: number
    showValues?: boolean
    valueFormat?: (v: number) => string
  }
): HeatcellSceneNode {
  const node: HeatcellSceneNode = { type: "heatcell", x, y, w, h, fill, datum }
  if (options?.value !== undefined) node.value = options.value
  if (options?.showValues) {
    node.showValues = true
    if (options.valueFormat) node.valueFormat = options.valueFormat
  }
  return node
}

// ── Scene graph container ──────────────────────────────────────────────

export interface SceneGraphData {
  nodes: SceneNode[]
  version: number
}

export function createSceneGraph(): SceneGraphData {
  return { nodes: [], version: 0 }
}

export function updateSceneGraph(
  scene: SceneGraphData,
  nodes: SceneNode[]
): SceneGraphData {
  return { nodes, version: scene.version + 1 }
}
