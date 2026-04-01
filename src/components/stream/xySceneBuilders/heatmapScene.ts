/**
 * Heatmap scene builders — static grid and streaming aggregation variants.
 *
 * buildHeatmapScene — 2D grid from distinct x/y values with sequential color.
 * buildStreamingHeatmapScene — continuous x/y discretized into bins with
 *   count/sum/mean aggregation.
 *
 * Dependencies: SceneGraph (buildHeatcellNode), d3-scale/chromatic, accessorUtils
 * Consumed by: PipelineStore.buildSceneNodes (chartType "heatmap")
 */
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateViridis } from "d3-scale-chromatic"
import type { SceneNode, StreamLayout } from "../types"
import { buildHeatcellNode } from "../SceneGraph"
import { resolveAccessor, resolveRawAccessor } from "../accessorUtils"
import type { XYSceneContext } from "./types"

const HEAT_INTERPOLATORS: Record<string, (t: number) => string> = {
  blues: interpolateBlues,
  reds: interpolateReds,
  greens: interpolateGreens,
  viridis: interpolateViridis,
}

// Precomputed color LUT: 256 entries per scheme, built lazily and cached.
// Avoids per-cell d3 interpolation (which creates CSS strings through multiple fn calls).
const COLOR_LUT_SIZE = 256
const colorLutCache = new Map<string, string[]>()

function getColorLut(schemeName: string): string[] {
  const cacheKey = schemeName in HEAT_INTERPOLATORS ? schemeName : "blues"
  let lut = colorLutCache.get(cacheKey)
  if (lut) return lut
  lut = new Array(COLOR_LUT_SIZE)
  const fn = HEAT_INTERPOLATORS[cacheKey] || interpolateBlues
  for (let i = 0; i < COLOR_LUT_SIZE; i++) {
    lut[i] = fn(i / (COLOR_LUT_SIZE - 1))
  }
  colorLutCache.set(cacheKey, lut)
  return lut
}

export function buildHeatmapScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  // Streaming heatmap: 2D grid binning with aggregation
  if (ctx.config.heatmapAggregation) {
    return buildStreamingHeatmapScene(ctx, data, layout)
  }

  if (data.length === 0) return []

  const getVal = resolveAccessor(ctx.config.valueAccessor, "value")
  const getRawX = resolveRawAccessor(ctx.config.xAccessor, "x")
  const getRawY = resolveRawAccessor(ctx.config.yAccessor, "y")

  // Build index maps: raw value → integer index (avoids string key allocation)
  // Cache raw values so non-stable accessors (e.g. returning new Date) work correctly
  const xIndex = new Map<any, number>()
  const yIndex = new Map<any, number>()
  const rawXs = new Array(data.length)
  const rawYs = new Array(data.length)
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const rx = getRawX(d)
    const ry = getRawY(d)
    rawXs[i] = rx
    rawYs[i] = ry
    if (!xIndex.has(rx)) xIndex.set(rx, xIndex.size)
    if (!yIndex.has(ry)) yIndex.set(ry, yIndex.size)
  }

  const xCount = xIndex.size
  const yCount = yIndex.size
  if (xCount === 0 || yCount === 0) return []

  // For numeric axes, sort and rebuild indices
  const xKeys = Array.from(xIndex.keys())
  const yKeys = Array.from(yIndex.keys())
  const xNumeric = xKeys.every(v => typeof v === "number" && !isNaN(v))
  const yNumeric = yKeys.every(v => typeof v === "number" && !isNaN(v))

  if (xNumeric) {
    xKeys.sort((a, b) => a - b)
    xIndex.clear()
    for (let i = 0; i < xKeys.length; i++) xIndex.set(xKeys[i], i)
  }
  if (yNumeric) {
    yKeys.sort((a, b) => a - b)
    yIndex.clear()
    for (let i = 0; i < yKeys.length; i++) yIndex.set(yKeys[i], i)
  }

  // Parallel arrays: numeric keys, values, datums — avoids per-cell object allocation
  // Float64Array for keys: safe for sparse grids where yi * xCount + xi > 2^32
  const cellKeys = new Float64Array(data.length)
  const cellVals = new Float64Array(data.length)
  const cellDatums: any[] = new Array(data.length)
  // Track occupied cells to deduplicate (last write wins, same as old Map behavior)
  const occupied = new Map<number, number>() // key → index in parallel arrays
  let cellCount = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const xi = xIndex.get(rawXs[i])
    const yi = yIndex.get(rawYs[i])
    if (xi === undefined || yi === undefined) continue
    const val = getVal(d)
    const key = yi * xCount + xi

    const existing = occupied.get(key)
    let slot: number
    if (existing !== undefined) {
      slot = existing
    } else {
      slot = cellCount++
      occupied.set(key, slot)
    }
    cellKeys[slot] = key
    cellVals[slot] = val
    cellDatums[slot] = d
  }

  // Compute min/max over deduped cells only (not during insert, where
  // overwritten values could incorrectly widen the range)
  let minVal = Infinity
  let maxVal = -Infinity
  for (let i = 0; i < cellCount; i++) {
    const val = cellVals[i]
    if (isFinite(val)) {
      if (val < minVal) minVal = val
      if (val > maxVal) maxVal = val
    }
  }
  if (!isFinite(minVal) || !isFinite(maxVal)) return []

  const schemeName = typeof ctx.config.colorScheme === "string" ? ctx.config.colorScheme : "blues"
  const lut = getColorLut(schemeName)
  const valRange = maxVal - minVal || 1
  const lutScale = (COLOR_LUT_SIZE - 1) / valRange

  const cellW = layout.width / xCount
  const cellH = layout.height / yCount
  const showValues = ctx.config.showValues
  const valueFormat = ctx.config.heatmapValueFormat
  const nodes: SceneNode[] = []

  for (let i = 0; i < cellCount; i++) {
    const val = cellVals[i]
    if (!isFinite(val)) continue
    const key = cellKeys[i]
    const xi = key % xCount
    const yi = (key - xi) / xCount

    const lutIdx = Math.min((val - minVal) * lutScale + 0.5 | 0, COLOR_LUT_SIZE - 1)
    const fill = lut[lutIdx]
    const labelOpts = showValues
      ? { value: val, showValues: true as const, valueFormat }
      : undefined
    nodes.push(buildHeatcellNode(
      xi * cellW,
      (yCount - 1 - yi) * cellH,
      cellW, cellH, fill, cellDatums[i], labelOpts
    ))
  }

  return nodes
}

function buildStreamingHeatmapScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  const xBins = Math.max(1, Math.floor(ctx.config.heatmapXBins ?? 20))
  const yBins = Math.max(1, Math.floor(ctx.config.heatmapYBins ?? 20))
  const agg = ctx.config.heatmapAggregation ?? "count"
  const getVal = resolveAccessor(ctx.config.valueAccessor, "value")

  if (!ctx.scales || data.length === 0) return []

  const [xMin, xMax] = ctx.scales.x.domain() as [number, number]
  const [yMin, yMax] = ctx.scales.y.domain() as [number, number]
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1
  const xBinSize = xRange / xBins
  const yBinSize = yRange / yBins

  // Flat typed arrays — indexed by yi * xBins + xi — no string keys, no Map overhead
  // Cap grid size to prevent OOM from extreme bin configs (e.g. 10000×10000)
  const MAX_CELLS = 1_000_000
  const totalCells = xBins * yBins
  if (totalCells > MAX_CELLS) return []

  const counts = new Int32Array(totalCells)
  const sums = new Float64Array(totalCells)

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const xVal = ctx.getX(d)
    const yVal = ctx.getY(d)
    if (!isFinite(xVal) || !isFinite(yVal)) continue
    const xi = Math.min(Math.floor((xVal - xMin) / xBinSize), xBins - 1)
    const yi = Math.min(Math.floor((yVal - yMin) / yBinSize), yBins - 1)
    if (xi < 0 || yi < 0) continue

    const idx = yi * xBins + xi
    counts[idx]++
    const val = getVal(d)
    sums[idx] += isFinite(val) ? val : 0
  }

  // Compute aggregated values for color scale min/max without overwriting sums
  // (sums preserved so datum.sum always reflects the raw sum-of-values)
  let minVal = Infinity
  let maxVal = -Infinity
  for (let i = 0; i < totalCells; i++) {
    if (counts[i] === 0) continue
    let val: number
    switch (agg) {
      case "sum": val = sums[i]; break
      case "mean": val = sums[i] / counts[i]; break
      default: val = counts[i]; break
    }
    if (val < minVal) minVal = val
    if (val > maxVal) maxVal = val
  }
  if (!isFinite(minVal)) return []

  const valRange = maxVal - minVal || 1
  const cellW = layout.width / xBins
  const cellH = layout.height / yBins
  const showValues = ctx.config.showValues
  const valueFormat = ctx.config.heatmapValueFormat
  const nodes: SceneNode[] = []

  for (let yi = 0; yi < yBins; yi++) {
    const rowOffset = yi * xBins
    for (let xi = 0; xi < xBins; xi++) {
      const idx = rowOffset + xi
      if (counts[idx] === 0) continue

      // Recompute aggregated value (not stored to preserve raw sums)
      let val: number
      switch (agg) {
        case "sum": val = sums[idx]; break
        case "mean": val = sums[idx] / counts[idx]; break
        default: val = counts[idx]; break
      }

      const t = (val - minVal) / valRange
      const r = 220 - (180 * t + 0.5) | 0
      const g = 220 - (100 * t + 0.5) | 0
      const b = 255 - (50 * t + 0.5) | 0
      const fill = `rgb(${r},${g},${b})`

      const labelOpts = showValues
        ? { value: val, showValues: true as const, valueFormat }
        : undefined
      nodes.push(buildHeatcellNode(
        xi * cellW, (yBins - 1 - yi) * cellH,
        cellW, cellH, fill,
        { xi, yi, value: val, count: counts[idx], sum: sums[idx] },
        labelOpts
      ))
    }
  }

  return nodes
}
