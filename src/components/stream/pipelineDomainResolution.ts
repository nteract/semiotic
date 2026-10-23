/**
 * Pure domain / scale resolution for PipelineStore.computeScene.
 * Chart-type-specific y-extent rules + d3 scale construction.
 */
import {
  scaleLinear,
  scaleLog,
  scaleSymlog,
  scaleTime,
  scaleUtc,
  type ScaleLinear
} from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import { computeBinExtent, histogramBinStart } from "../realtime/BinAccumulator"
import type { BinAlign } from "../realtime/BinAccumulator"
import { computeStackOffsets } from "./SceneGraph"
import type { PipelineConfig } from "./pipelineConfig"
import type { ArrowOfTime, StreamScales } from "./types"
import type { ResolvedRibbon } from "./xySceneBuilders/ribbonScene"
import type { RingBuffer } from "../realtime/RingBuffer"

export type StackExtentCache = {
  key: string
  yDomain: [number, number]
  /** Stack boundaries the scene passes to the y scale. */
  plottedY?: number[]
}

export function getTimeAxis(_arrowOfTime: ArrowOfTime): "x" {
  return "x"
}

export function mergePartialDomain(
  dataDomain: [number, number],
  userExtent: [number | undefined, number | undefined] | [number] | undefined
): [number, number] {
  if (!userExtent) return dataDomain
  return [
    userExtent[0] ?? dataDomain[0],
    userExtent[1] ?? dataDomain[1]
  ]
}

export function isFullySpecifiedExtent(
  extent: [number | undefined, number | undefined] | [number] | undefined
): boolean {
  return !!(extent && extent[0] != null && extent[1] != null)
}

/**
 * Stacked-area y-domain covering cumulative stack sums (or [0,1] when
 * normalized). Mirrors buildStackedAreaNodes order for wiggle offsets.
 */
export function resolveStackedAreaYDomain(options: {
  config: Pick<
    PipelineConfig,
    | "normalize"
    | "baseline"
    | "stackOrder"
    | "extentPadding"
    | "axisExtent"
    | "yAxisExtent"
    | "yScaleType"
  >
  groups: { key: string; data: Datum[] }[]
  getX: (d: Datum) => number
  getY: (d: Datum) => number
  bufferSize: number
  ingestVersion: number
  stackExtentCache: StackExtentCache | null
}): {
  yDomain: [number, number]
  stackExtentCache: StackExtentCache
} {
  const { config, groups, getX, getY } = options
  const exactMode = (config.yAxisExtent ?? config.axisExtent) === "exact"

  // Normalized stacks still need their cumulative shares. The unit domain is
  // fixed, but log sampling has to see 0→1/3→1 rather than the raw rows.
  // Stack order changes the cumulative shares even when the unit domain
  // stays [0, 1]. Exact mode drops the padding on that unit domain.
  // updateConfig does not bump the ingest version for either change.
  const extentKey = exactMode ? "exact" : "pad"
  // Log sampling is the only reader of the boundary list. A linear chart must
  // not retain it, and a later scale-type change has to miss this cache.
  const sampleKey = config.yScaleType === "log" ? "log" : "lin"
  const stackCacheKey = config.normalize
    ? `${options.bufferSize}:${options.ingestVersion}:norm:${config.stackOrder ?? "key"}:${extentKey}:${sampleKey}`
    : `${options.bufferSize}:${options.ingestVersion}:${config.baseline ?? "zero"}:${config.stackOrder ?? "key"}:${extentKey}:${sampleKey}`
  if (
    options.stackExtentCache &&
    options.stackExtentCache.key === stackCacheKey
  ) {
    return {
      yDomain: options.stackExtentCache.yDomain,
      stackExtentCache: options.stackExtentCache
    }
  }

  const valueMaps = new Map<string, Map<number, number>>()
  const xSet = new Set<number>()
  const xTotals = new Map<number, number>()
  const groupTotals = new Map<string, number>()
  for (const g of groups) {
    const m = new Map<number, number>()
    let groupTotal = 0
    for (const d of g.data) {
      const x = getX(d)
      const y = getY(d)
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      m.set(x, (m.get(x) || 0) + y)
      xSet.add(x)
      groupTotal += y
      const total = (xTotals.get(x) || 0) + y
      xTotals.set(x, total)
    }
    valueMaps.set(g.key, m)
    groupTotals.set(g.key, groupTotal)
  }

  const order = config.stackOrder ?? "key"
  const keyCmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
  let groupKeys: string[]
  if (order === "input") {
    groupKeys = groups.map((g) => g.key)
  } else if (order === "insideOut") {
    const sorted = [...groups]
      .map((g) => g.key)
      .sort((a, b) => {
        const d = (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0)
        return d !== 0 ? d : keyCmp(a, b)
      })
    const tops: string[] = []
    const bottoms: string[] = []
    let topSum = 0
    let bottomSum = 0
    for (const k of sorted) {
      if (topSum < bottomSum) {
        tops.push(k)
        topSum += groupTotals.get(k) ?? 0
      } else {
        bottoms.push(k)
        bottomSum += groupTotals.get(k) ?? 0
      }
    }
    groupKeys = [...bottoms.reverse(), ...tops]
  } else if (order === "asc") {
    groupKeys = groups.map((g) => g.key).sort((a, b) => {
      const d = (groupTotals.get(a) ?? 0) - (groupTotals.get(b) ?? 0)
      return d !== 0 ? d : keyCmp(a, b)
    })
  } else if (order === "desc") {
    groupKeys = groups.map((g) => g.key).sort((a, b) => {
      const d = (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0)
      return d !== 0 ? d : keyCmp(a, b)
    })
  } else {
    groupKeys = groups.map((g) => g.key).sort(keyCmp)
  }

  if (config.normalize) {
    for (const map of valueMaps.values()) {
      for (const [x, y] of map) {
        // The scene divides by `sum || 1`. A zero total still draws the raw
        // signed layers; recording zeros here drops them from the log sample.
        map.set(x, y / (xTotals.get(x) || 1))
      }
    }
  }

  // The scene forces a zero baseline whenever normalize is set.
  const baseline = config.normalize ? "zero" : config.baseline
  const collectSamples = config.yScaleType === "log"
  const plottedY = collectSamples ? [] as number[] : null
  const remember = (cursor: number) => {
    if (!plottedY) return
    if (plottedY.length > 0 && plottedY[plottedY.length - 1] === cursor) return
    plottedY.push(cursor)
  }
  const finish = (yDomain: [number, number]) => {
    const stackExtentCache: StackExtentCache = { key: stackCacheKey, yDomain }
    if (plottedY) stackExtentCache.plottedY = plottedY
    return { yDomain, stackExtentCache }
  }
  let yDomain: [number, number]
  if (baseline === "wiggle" || baseline === "silhouette") {
    const xValues = Array.from(xSet).sort((a, b) => a - b)
    const offsets = computeStackOffsets(
      xValues,
      groupKeys,
      (k, x) => valueMaps.get(k)?.get(x) || 0,
      baseline
    )
    let lo = Infinity
    let hi = -Infinity
    const record = (cursor: number) => {
      remember(cursor)
      if (cursor < lo) lo = cursor
      if (cursor > hi) hi = cursor
    }
    // Every cumulative boundary, not only the envelope. A silhouette of
    // three 10s has edges -15, -5, 5, and 15; the positive 5-to-15 layer
    // has to be in the log sample or it collapses onto the domain edge.
    // A missing group adds nothing, so it must not be stored again.
    for (const x of xValues) {
      let cursor = offsets.get(x) ?? 0
      record(cursor)
      for (const key of groupKeys) {
        const value = valueMaps.get(key)?.get(x) || 0
        if (value === 0) continue
        cursor += value
        record(cursor)
      }
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0
      hi = 0
    }
    const range = hi - lo
    const pad = exactMode ? 0 : range > 0 ? range * config.extentPadding : 1
    return finish([lo - pad, hi + pad])
  } else if (baseline === "diverging") {
    const xValues = Array.from(xSet).sort((a, b) => a - b)
    let lo = 0
    let hi = 0
    const record = (cursor: number) => {
      remember(cursor)
      if (cursor < lo) lo = cursor
      if (cursor > hi) hi = cursor
    }
    for (const x of xValues) {
      let pos = 0
      let neg = 0
      for (const key of groupKeys) {
        const value = valueMaps.get(key)?.get(x) || 0
        if (value === 0) continue
        if (value > 0) {
          pos += value
          record(pos)
        } else {
          neg += value
          record(neg)
        }
      }
    }
    const range = hi - lo
    const pad = exactMode ? 0 : range > 0 ? range * config.extentPadding : 1
    return finish([lo - pad, hi + pad])
  } else {
    // Walk the same stack order as the scene. A commutative total hides
    // negative layers and order-dependent peaks, so the domain follows the
    // running cursor and keeps a zero baseline when the stack never goes below it.
    const xValues = Array.from(xSet).sort((a, b) => a - b)
    let lo = 0
    let hi = 0
    for (const x of xValues) {
      let cursor = 0
      for (const key of groupKeys) {
        const value = valueMaps.get(key)?.get(x) || 0
        if (value === 0) continue
        cursor += value
        remember(cursor)
        if (cursor < lo) lo = cursor
        if (cursor > hi) hi = cursor
      }
    }
    const range = hi - lo
    const pad = exactMode ? 0 : range > 0 ? range * config.extentPadding : 1
    yDomain = config.normalize
      ? [0, exactMode ? 1 : 1 + config.extentPadding]
      : [lo < 0 ? lo - pad : 0, hi + pad]
    return finish(yDomain)
  }
}

export function resolveBarBinYDomain(
  buffer: RingBuffer<Datum>,
  getX: (d: Datum) => number,
  getY: (d: Datum) => number,
  binSize: number,
  getCategory: ((d: Datum) => string) | undefined,
  extentPadding: number,
  exactMode: boolean,
  binAlign: BinAlign = "start"
): [number, number] {
  const [minTotal, maxTotal] = computeBinExtent(
    buffer,
    getX,
    getY,
    binSize,
    getCategory,
    binAlign
  )
  if (minTotal === 0 && maxTotal === 0) return [0, 0]
  const span = maxTotal - minTotal
  const pad = exactMode ? 0 : span * extentPadding
  return [minTotal < 0 ? minTotal - pad : 0, maxTotal + pad]
}

/** Cover whole centered edge bins automatically, preserving explicit bounds. */
export function resolveCenteredBinXDomain(
  dataDomain: [number, number],
  binSize: number,
  userExtent: PipelineConfig["xExtent"]
): [number, number] {
  if (!dataDomain.every(Number.isFinite)) return mergePartialDomain(dataDomain, userExtent)
  return mergePartialDomain([
    histogramBinStart(dataDomain[0], binSize, "center"),
    histogramBinStart(dataDomain[1], binSize, "center") + binSize
  ], userExtent)
}

/**
 * Cumulative ends of the bars `buildWaterfallScene` draws. A missing or
 * non-finite x is not a bar, so that row must not move the cursor.
 */
export function waterfallCumulativeEnds(
  data: Iterable<Datum>,
  getX: (d: Datum) => number,
  getY: (d: Datum) => number
): number[] {
  const values: number[] = []
  let cumulative = 0
  for (const datum of data) {
    const value = getY(datum)
    const x = getX(datum)
    if (value == null || Number.isNaN(value) || x == null || !isFinite(x as number)) continue
    cumulative += value
    values.push(cumulative)
  }
  return values
}

export function resolveWaterfallYDomain(
  buffer: RingBuffer<Datum>,
  getX: (d: Datum) => number,
  getY: (d: Datum) => number,
  extentPadding: number,
  exactMode: boolean
): [number, number] {
  let minCum = 0
  let maxCum = 0
  for (const cumulative of waterfallCumulativeEnds(buffer, getX, getY)) {
    if (cumulative < minCum) minCum = cumulative
    if (cumulative > maxCum) maxCum = cumulative
  }
  const range = maxCum - minCum
  const pad = exactMode ? 0 : range > 0 ? range * extentPadding : 1
  return [
    Math.min(0, minCum - Math.abs(pad)),
    Math.max(0, maxCum + Math.abs(pad))
  ]
}

/**
 * Waterfall x values identify bar centers, so the automatic domain needs half
 * of the neighboring interval beyond each edge datum. User-specified bounds
 * remain authoritative, including partial extents.
 */
export function resolveWaterfallXDomain(
  data: Datum[],
  getX: (d: Datum) => number,
  dataDomain: [number, number],
  userExtent: [number | undefined, number | undefined] | [number] | undefined,
  xScaleType: PipelineConfig["xScaleType"]
): [number, number] {
  const values = Array.from(new Set(
    data
      .map(getX)
      .filter((value) => Number.isFinite(value))
  )).sort((a, b) => a - b)

  if (values.length < 2) return mergePartialDomain(dataDomain, userExtent)

  const first = values[0]
  const second = values[1]
  const last = values[values.length - 1]
  const penultimate = values[values.length - 2]
  const autoDomain: [number, number] = xScaleType === "log" && first > 0
    ? [
        first / Math.sqrt(second / first),
        last * Math.sqrt(last / penultimate)
      ]
    : [
        first - (second - first) / 2,
        last + (last - penultimate) / 2
      ]

  return mergePartialDomain(autoDomain, userExtent)
}

export function expandYDomainWithRibbons(
  yDomain: [number, number],
  bufferArray: Datum[],
  ribbons: ResolvedRibbon[]
): [number, number] {
  if (!ribbons.length) return yDomain
  let [lo, hi] = yDomain
  for (const d of bufferArray) {
    for (const r of ribbons) {
      const top = r.getTop(d)
      const bottom = r.getBottom(d)
      if (Number.isFinite(top)) {
        if (top < lo) lo = top
        if (top > hi) hi = top
      }
      if (Number.isFinite(bottom)) {
        if (bottom < lo) lo = bottom
        if (bottom > hi) hi = bottom
      }
    }
  }
  return [lo, hi]
}

export function padYDomain(
  yDomain: [number, number],
  options: {
    exactMode: boolean
    extentPadding: number
    userMin?: number
    userMax?: number
    yScaleType?: PipelineConfig["yScaleType"]
    dataYDomain: [number, number]
  }
): [number, number] {
  const range = yDomain[1] - yDomain[0]
  const pad =
    options.exactMode ? 0 : range > 0 ? range * options.extentPadding : 1
  const next: [number, number] = [
    options.userMin != null ? yDomain[0] : yDomain[0] - pad,
    options.userMax != null ? yDomain[1] : yDomain[1] + pad
  ]
  if (
    options.yScaleType === "log" &&
    next[0] <= 0 &&
    options.dataYDomain[0] > 0 &&
    !options.exactMode
  ) {
    const logPad = 1 + options.extentPadding
    if (options.userMin == null) {
      next[0] = options.dataYDomain[0] / logPad
    }
  }
  return next
}

export function reapplyPartialYExtent(
  yDomain: [number, number],
  yExtent: PipelineConfig["yExtent"],
  yFullySpecified: boolean
): [number, number] {
  if (!yExtent || yFullySpecified) return yDomain
  const userMin = yExtent[0]
  const userMax = yExtent[1]
  if (userMin == null && userMax == null) return yDomain
  return [
    userMin != null ? userMin : yDomain[0],
    userMax != null ? userMax : yDomain[1]
  ]
}

export function rescueDegenerateDomains(
  xDomain: [number, number],
  yDomain: [number, number],
  xScaleType?: PipelineConfig["xScaleType"]
): { xDomain: [number, number]; yDomain: [number, number] } {
  let x = xDomain
  let y = yDomain
  if (x[0] === Infinity || x[1] === -Infinity) {
    if (xScaleType === "time") {
      // Empty charts have no observation time. A fixed epoch keeps static
      // exports and the first hydration render on the same scale.
      x = [0, 86400000]
    } else {
      x = [0, 1]
    }
  }
  if (y[0] === Infinity || y[1] === -Infinity) y = [0, 1]
  return { xDomain: x, yDomain: y }
}

/**
 * Log scales cannot plot non-positive bounds. Keep an already-positive
 * domain, including a flipped one. With no positive sample, keep an explicit
 * positive end and open one decade from it. Use [1, 10] only when neither
 * end is an explicit positive bound, even if padding left a positive end.
 * Otherwise replace each non-positive end with the smallest or largest
 * positive sample. A sample past an explicit positive end must not replace
 * that end; open one decade from it instead. Computed ends, such as a
 * normalized unit domain, still expand.
 */
export function clampLogDomain(
  domain: [number, number],
  positive: { min: number; max: number } | null,
  explicit?: readonly (number | undefined)[]
): [number, number] {
  const ascending = domain[0] <= domain[1]
  const low = ascending ? domain[0] : domain[1]
  const high = ascending ? domain[1] : domain[0]
  const lowOk = low > 0 && Number.isFinite(low)
  const highOk = high > 0 && Number.isFinite(high)
  if (lowOk && highOk) return domain
  const locked = new Set<number>()
  if (explicit) {
    for (const value of explicit) {
      if (value != null && value > 0 && Number.isFinite(value)) locked.add(value)
    }
  }
  if (!positive) {
    if (highOk && locked.has(high)) {
      const nextLow = high / 10
      return ascending ? [nextLow, high] : [high, nextLow]
    }
    return ascending ? [1, 10] : [10, 1]
  }
  let nextLow = lowOk ? low : positive.min
  let nextHigh = highOk ? high : positive.max
  if (!(nextHigh > nextLow)) {
    if (highOk && locked.has(high)) nextLow = nextHigh / 10
    else nextHigh = nextLow * 10
  }
  return ascending ? [nextLow, nextHigh] : [nextHigh, nextLow]
}

/**
 * Y channels a non-aggregate scene paints. Mirrors PipelineStore's y-extent
 * walk: candle high/low, an explicit area baseline, and ribbon endpoints.
 * Sampling only `getY` drops a valid low onto the same pixel as a larger high.
 */
export function collectPlottedYChannels(input: {
  chartType: string
  data: Iterable<Datum>
  getY: (datum: Datum) => number
  getY0?: (datum: Datum) => number
  getHigh?: (datum: Datum) => number
  getLow?: (datum: Datum) => number
  ribbons: readonly ResolvedRibbon[]
}): number[] {
  const values: number[] = []
  if (input.chartType === "candlestick" && input.getHigh && input.getLow) {
    const getHigh = input.getHigh
    const getLow = input.getLow
    for (const datum of input.data) values.push(getHigh(datum), getLow(datum))
    return values
  }
  for (const datum of input.data) {
    values.push(input.getY(datum))
    if (input.getY0) values.push(input.getY0(datum))
    for (const ribbon of input.ribbons) {
      const top = ribbon.getTop(datum)
      const bottom = ribbon.getBottom(datum)
      if (Number.isFinite(top)) values.push(top)
      if (Number.isFinite(bottom)) values.push(bottom)
    }
  }
  return values
}

export function collectPositiveSamples(values: Iterable<number>): {
  positive: { min: number; max: number } | null
  droppedNonPositive: boolean
} {
  let min = Infinity
  let max = -Infinity
  let droppedNonPositive = false
  for (const value of values) {
    if (!Number.isFinite(value)) continue
    if (!(value > 0)) {
      droppedNonPositive = true
      continue
    }
    if (value < min) min = value
    if (value > max) max = value
  }
  return {
    positive: Number.isFinite(min) ? { min, max } : null,
    droppedNonPositive
  }
}

export function makePipelineScale(
  type: "linear" | "log" | "symlog" | "time" | "utc" | undefined,
  domain: [number, number],
  range: [number, number]
): ScaleLinear<number, number> {
  if (type === "log") {
    let safeDomain = clampLogDomain(domain, null)
    if (
      safeDomain[0] === safeDomain[1] &&
      safeDomain[0] > 0 &&
      Number.isFinite(safeDomain[0])
    ) {
      safeDomain = [safeDomain[0], safeDomain[0] * 10]
    }
    return scaleLog()
      .domain(safeDomain)
      .range(range)
      .clamp(true) as unknown as ScaleLinear<number, number>
  }
  if (type === "symlog") {
    return scaleSymlog()
      .domain(domain)
      .range(range) as unknown as ScaleLinear<number, number>
  }
  if (type === "time" || type === "utc") {
    return (type === "utc" ? scaleUtc() : scaleTime())
      .domain([new Date(domain[0]), new Date(domain[1])])
      .range(range) as unknown as ScaleLinear<number, number>
  }
  return scaleLinear().domain(domain).range(range)
}

export function buildPipelineScales(options: {
  config: PipelineConfig
  layout: { width: number; height: number }
  xDomain: [number, number]
  yDomain: [number, number]
  xIsDate?: boolean
}): StreamScales {
  const { config, layout, xDomain } = options
  // Automatic date labels use UTC; calendar ticks must use the same zone.
  const xScaleType = config.xScaleType ?? (options.xIsDate ? "utc" : undefined)
  const yDomain: [number, number] = config.invertY
    ? [options.yDomain[1], options.yDomain[0]]
    : options.yDomain
  const isStreaming = config.runtimeMode === "streaming"
  const rawSp = config.scalePadding || 0
  const sp = Math.max(
    0,
    Math.min(rawSp, Math.min(layout.width, layout.height) / 2 - 1)
  )

  if (isStreaming) {
    // Streaming XY scene builders consistently encode time on x and value on
    // y. Treat the source-compatible legacy vertical values (and any untyped
    // invalid runtime value) as the safe default `right` direction instead of
    // constructing a vertical scale that the builders do not consume.
    const xRange: [number, number] = config.arrowOfTime === "left"
      ? [layout.width - sp, sp]
      : [sp, layout.width - sp]
    return {
      x: makePipelineScale(xScaleType, xDomain, xRange),
      y: makePipelineScale(config.yScaleType, yDomain, [
        layout.height - sp,
        sp
      ])
    }
  }

  return {
    x: makePipelineScale(xScaleType, xDomain, [sp, layout.width - sp]),
    y: makePipelineScale(config.yScaleType, yDomain, [
      layout.height - sp,
      sp
    ])
  }
}
