/**
 * Pure domain / scale resolution for PipelineStore.computeScene.
 * Chart-type-specific y-extent rules + d3 scale construction.
 */
import {
  scaleLinear,
  scaleLog,
  scaleSymlog,
  scaleTime,
  type ScaleLinear
} from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import { computeBinExtent } from "../realtime/BinAccumulator"
import { computeWaterfallExtent } from "../realtime/renderers/waterfallRenderer"
import {
  computeDivergingStackExtent,
  computeStackOffsets
} from "./SceneGraph"
import type { PipelineConfig } from "./pipelineConfig"
import type { ArrowOfTime, StreamScales } from "./types"
import type { ResolvedRibbon } from "./xySceneBuilders/ribbonScene"
import type { RingBuffer } from "../realtime/RingBuffer"

export type StackExtentCache = {
  key: string
  yDomain: [number, number]
}

export function getTimeAxis(arrowOfTime: ArrowOfTime): "x" | "y" {
  return arrowOfTime === "up" || arrowOfTime === "down" ? "y" : "x"
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
    "normalize" | "baseline" | "stackOrder" | "extentPadding" | "axisExtent"
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
  const exactMode = config.axisExtent === "exact"

  if (config.normalize) {
    const yDomain: [number, number] = [
      0,
      exactMode ? 1 : 1 + config.extentPadding
    ]
    return {
      yDomain,
      stackExtentCache: {
        key: `${options.bufferSize}:${options.ingestVersion}:norm`,
        yDomain
      }
    }
  }

  const stackCacheKey = `${options.bufferSize}:${options.ingestVersion}:${config.baseline ?? "zero"}:${config.stackOrder ?? "key"}`
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
  let maxStacked = 0
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
      if (total > maxStacked) maxStacked = total
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

  let yDomain: [number, number]
  if (config.baseline === "wiggle" || config.baseline === "silhouette") {
    const xValues = Array.from(xSet).sort((a, b) => a - b)
    const offsets = computeStackOffsets(
      xValues,
      groupKeys,
      (k, x) => valueMaps.get(k)?.get(x) || 0,
      config.baseline
    )
    let lo = Infinity
    let hi = -Infinity
    for (const x of xValues) {
      const off = offsets.get(x) ?? 0
      const total = xTotals.get(x) ?? 0
      if (off < lo) lo = off
      if (off + total > hi) hi = off + total
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      lo = 0
      hi = 0
    }
    const range = hi - lo
    const pad = exactMode ? 0 : range > 0 ? range * config.extentPadding : 1
    yDomain = [lo - pad, hi + pad]
  } else if (config.baseline === "diverging") {
    const xValues = Array.from(xSet).sort((a, b) => a - b)
    const [lo, hi] = computeDivergingStackExtent(
      xValues,
      groupKeys,
      (k, x) => valueMaps.get(k)?.get(x) || 0
    )
    const range = hi - lo
    const pad = exactMode ? 0 : range > 0 ? range * config.extentPadding : 1
    yDomain = [lo - pad, hi + pad]
  } else {
    const pad =
      exactMode ? 0 : maxStacked > 0 ? maxStacked * config.extentPadding : 1
    yDomain = [0, maxStacked + pad]
  }

  const stackExtentCache = { key: stackCacheKey, yDomain }
  return { yDomain, stackExtentCache }
}

export function resolveBarBinYDomain(
  buffer: RingBuffer<Datum>,
  getX: (d: Datum) => number,
  getY: (d: Datum) => number,
  binSize: number,
  getCategory: ((d: Datum) => string) | undefined,
  extentPadding: number,
  exactMode: boolean
): [number, number] {
  const [, maxTotal] = computeBinExtent(
    buffer,
    getX,
    getY,
    binSize,
    getCategory
  )
  return [0, exactMode ? maxTotal : maxTotal + maxTotal * extentPadding]
}

export function resolveWaterfallYDomain(
  buffer: RingBuffer<Datum>,
  getY: (d: Datum) => number,
  extentPadding: number,
  exactMode: boolean
): [number, number] {
  const [minCum, maxCum] = computeWaterfallExtent(buffer, getY)
  const range = maxCum - minCum
  const pad = exactMode ? 0 : range > 0 ? range * extentPadding : 1
  return [
    Math.min(0, minCum - Math.abs(pad)),
    Math.max(0, maxCum + Math.abs(pad))
  ]
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
      const now = Date.now()
      x = [now - 86400000, now]
    } else {
      x = [0, 1]
    }
  }
  if (y[0] === Infinity || y[1] === -Infinity) y = [0, 1]
  return { xDomain: x, yDomain: y }
}

export function makePipelineScale(
  type: "linear" | "log" | "symlog" | "time" | undefined,
  domain: [number, number],
  range: [number, number]
): ScaleLinear<number, number> {
  if (type === "log") {
    const safeDomain: [number, number] = [
      Math.max(domain[0], 1e-6),
      Math.max(domain[1], 1e-6)
    ]
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
  if (type === "time") {
    return scaleTime()
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
}): StreamScales {
  const { config, layout, xDomain, yDomain } = options
  const isStreaming = config.runtimeMode === "streaming"
  const rawSp = config.scalePadding || 0
  const sp = Math.max(
    0,
    Math.min(rawSp, Math.min(layout.width, layout.height) / 2 - 1)
  )

  if (isStreaming) {
    const timeAxis = getTimeAxis(config.arrowOfTime)
    if (timeAxis === "x") {
      const xRange: [number, number] =
        config.arrowOfTime === "right"
          ? [sp, layout.width - sp]
          : [layout.width - sp, sp]
      return {
        x: scaleLinear().domain(xDomain).range(xRange),
        y: makePipelineScale(config.yScaleType, yDomain, [
          layout.height - sp,
          sp
        ])
      }
    }
    const yRange: [number, number] =
      config.arrowOfTime === "down"
        ? [sp, layout.height - sp]
        : [layout.height - sp, sp]
    return {
      x: makePipelineScale(config.yScaleType, yDomain, [sp, layout.width - sp]),
      y: scaleLinear().domain(xDomain).range(yRange)
    }
  }

  return {
    x: makePipelineScale(config.xScaleType, xDomain, [sp, layout.width - sp]),
    y: makePipelineScale(config.yScaleType, yDomain, [
      layout.height - sp,
      sp
    ])
  }
}
