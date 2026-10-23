import type { Datum } from "../../charts/shared/datumTypes"
/**
 * Heatmap scene builders — static grid and streaming aggregation variants.
 *
 * buildHeatmapScene — 2D grid from distinct x/y values with sequential color.
 * buildStreamingHeatmapScene — continuous x/y discretized into bins with
 *   count/sum/mean aggregation.
 *
 * Dependencies: SceneGraph (buildHeatcellNode), color palettes, accessorUtils
 * Consumed by: PipelineStore.buildSceneNodes (chartType "heatmap")
 */
import { getSequentialInterpolator, SEQUENTIAL_INTERPOLATORS } from "../../charts/shared/colorPalettes"
import type { HeatcellSceneNode, StreamLayout } from "../types"
import { buildHeatcellNode } from "../SceneGraph"
import { resolveAccessor, resolveRawAccessor, type CoercibleNumber } from "../accessorUtils"
import { heatmapBandScale } from "../heatmapBandTicks"
import type { XYSceneContext } from "./types"
import {
  attachSelectionProvenance,
  requestsSelectionProvenance
} from "../../store/selectionProvenance"

// Precomputed color LUT: 256 entries per scheme, built lazily and cached.
// Avoids per-cell d3 interpolation (which creates CSS strings through multiple fn calls).
const COLOR_LUT_SIZE = 256
const colorLutCache = new Map<string, string[]>()

function colorLutIndex(value: number, minValue: number, maxValue: number): number {
  if (minValue === maxValue) return Math.floor(COLOR_LUT_SIZE / 2)
  return Math.min(
    Math.floor(
      ((value - minValue) * (COLOR_LUT_SIZE - 1)) /
        (maxValue - minValue) +
        0.5
    ),
    COLOR_LUT_SIZE - 1
  )
}

function getColorLut(schemeName: string): string[] {
  const cacheKey = Object.prototype.hasOwnProperty.call(
    SEQUENTIAL_INTERPOLATORS,
    schemeName
  )
    ? schemeName
    : "blues"
  let lut = colorLutCache.get(cacheKey)
  if (lut) return lut
  lut = new Array(COLOR_LUT_SIZE)
  const fn = getSequentialInterpolator(cacheKey)
  for (let i = 0; i < COLOR_LUT_SIZE; i++) {
    lut[i] = fn(i / (COLOR_LUT_SIZE - 1))
  }
  colorLutCache.set(cacheKey, lut)
  return lut
}

function heatmapAxisKey(value: CoercibleNumber): {
  key: string | number
  label: string | number | Date
  numeric: boolean
  temporal: boolean
} {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isFinite(time)
      ? { key: time, label: value, numeric: true, temporal: true }
      : { key: "Invalid Date", label: "Invalid Date", numeric: false, temporal: false }
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { key: value, label: value, numeric: true, temporal: false }
  }
  return { key: String(value), label: String(value), numeric: false, temporal: false }
}

function sortHeatmapAxis(
  index: Map<string | number, number>,
  labels: Array<string | number | Date>
): void {
  const order = labels
    .map((label, previous) => ({ label, previous }))
    .sort((a, b) => heatmapLabelValue(a.label) - heatmapLabelValue(b.label))
  const remap = new Map<number, number>()
  order.forEach((item, next) => remap.set(item.previous, next))
  const keys = Array.from(index.keys())
  index.clear()
  for (let i = 0; i < keys.length; i++) {
    index.set(keys[i], remap.get(i)!)
  }
  labels.splice(0, labels.length, ...order.map((item) => item.label))
}

function heatmapLabelValue(label: string | number | Date): number {
  return label instanceof Date ? label.getTime() : Number(label)
}

function applyHeatcellStyle(
  node: HeatcellSceneNode,
  datum: Datum,
  ctx: XYSceneContext
): HeatcellSceneNode {
  const style = ctx.config.areaStyle?.(datum)
  if (style) {
    if (typeof style.fill === "string") node.fill = style.fill
    node.style = style
  }
  return node
}

export function buildHeatmapScene(ctx: XYSceneContext, data: Datum[], layout: StreamLayout): HeatcellSceneNode[] {
  // Streaming heatmap: 2D grid binning with aggregation
  if (ctx.config.heatmapAggregation) {
    return buildStreamingHeatmapScene(ctx, data, layout)
  }

  if (data.length === 0) return []

  const getVal = resolveAccessor(ctx.config.valueAccessor, "value")
  const getRawX = resolveRawAccessor<Datum, CoercibleNumber>(ctx.config.xAccessor, "x")
  const getRawY = resolveRawAccessor<Datum, CoercibleNumber>(ctx.config.yAccessor, "y")

  // Canonical keys collapse Date objects that share a timestamp. The first
  // label is kept for the tick. Strings stay in insertion order.
  const xIndex = new Map<string | number, number>()
  const yIndex = new Map<string | number, number>()
  const xLabels: Array<string | number | Date> = []
  const yLabels: Array<string | number | Date> = []
  const rawXKeys: Array<string | number> = new Array(data.length)
  const rawYKeys: Array<string | number> = new Array(data.length)
  // Dates sort with numbers, but the dense fallback only accepts plain
  // numbers. A date domain endpoint is not a timestamp the bin math can add to.
  let xAllNumbers = true
  let yAllNumbers = true
  let xSortable = true
  let ySortable = true
  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const xEntry = heatmapAxisKey(getRawX(d))
    const yEntry = heatmapAxisKey(getRawY(d))
    rawXKeys[i] = xEntry.key
    rawYKeys[i] = yEntry.key
    if (!xEntry.numeric) {
      xAllNumbers = false
      xSortable = false
    } else if (xEntry.temporal) {
      xAllNumbers = false
    }
    if (!yEntry.numeric) {
      yAllNumbers = false
      ySortable = false
    } else if (yEntry.temporal) {
      yAllNumbers = false
    }
    if (!xIndex.has(xEntry.key)) {
      xIndex.set(xEntry.key, xIndex.size)
      xLabels.push(xEntry.label)
    }
    if (!yIndex.has(yEntry.key)) {
      yIndex.set(yEntry.key, yIndex.size)
      yLabels.push(yEntry.label)
    }
  }

  const xCount = xIndex.size
  const yCount = yIndex.size
  if (xCount === 0 || yCount === 0) return []

  // Dense numeric grids miss frame budget on the per-cell static path.
  // Gate on occupied cells, not the cartesian product: a 65-point diagonal
  // has 65×65 > 4096 but only 65 marks to paint. Dates stay on this path.
  const DENSE_HEATMAP_CELL_THRESHOLD = 4096
  if (
    xAllNumbers &&
    yAllNumbers &&
    xCount * yCount > DENSE_HEATMAP_CELL_THRESHOLD &&
    data.length > DENSE_HEATMAP_CELL_THRESHOLD
  ) {
    const occupied = new Set<number>()
    for (let i = 0; i < data.length; i++) {
      const xi = xIndex.get(rawXKeys[i])
      const yi = yIndex.get(rawYKeys[i])
      if (xi === undefined || yi === undefined) continue
      occupied.add(yi * xCount + xi)
      if (occupied.size > DENSE_HEATMAP_CELL_THRESHOLD) {
        return buildStreamingHeatmapScene({
          ...ctx,
          config: {
            ...ctx.config,
            heatmapAggregation: ctx.config.valueAccessor ? "mean" as const : "count" as const,
          },
        }, data, layout)
      }
    }
  }

  if (xSortable) sortHeatmapAxis(xIndex, xLabels)
  if (ySortable) sortHeatmapAxis(yIndex, yLabels)

  // Parallel arrays: numeric keys, values, datums — avoids per-cell object allocation
  // Float64Array for keys: safe for sparse grids where yi * xCount + xi > 2^32
  const cellKeys = new Float64Array(data.length)
  const cellVals = new Float64Array(data.length)
  const cellDatums: Datum[] = new Array(data.length)
  // Track occupied cells to deduplicate (last write wins, same as old Map behavior)
  const occupied = new Map<number, number>() // key → index in parallel arrays
  let cellCount = 0

  for (let i = 0; i < data.length; i++) {
    const d = data[i]
    const xi = xIndex.get(rawXKeys[i])
    const yi = yIndex.get(rawYKeys[i])
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

  // Scheme priority: explicit string colorScheme > theme sequential > "blues".
  // d3-scale-chromatic scheme names (e.g. "blues", "viridis") are what the LUT
  // expects, and SemioticTheme.colors.sequential is already a scheme name.
  const schemeName = typeof ctx.config.colorScheme === "string"
    ? ctx.config.colorScheme
    : ctx.config.themeSequential || "blues"
  const customColorScale = ctx.config.heatmapColorScale
  const lut = customColorScale ? undefined : getColorLut(schemeName)

  const cellW = layout.width / xCount
  const cellH = layout.height / yCount
  const showValues = ctx.config.showValues
  const valueFormat = ctx.config.heatmapValueFormat
  const nodes: HeatcellSceneNode[] = []

  for (let i = 0; i < cellCount; i++) {
    const val = cellVals[i]
    if (!isFinite(val)) continue
    const key = cellKeys[i]
    const xi = key % xCount
    const yi = (key - xi) / xCount

    const lutIdx = colorLutIndex(val, minVal, maxVal)
    const fill = customColorScale ? customColorScale(val) : lut![lutIdx]
    const labelOpts = showValues
      ? { value: val, showValues: true as const, valueFormat }
      : { value: val }
    const datum = cellDatums[i]
    nodes.push(applyHeatcellStyle(buildHeatcellNode(
      xi * cellW,
      (yCount - 1 - yi) * cellH,
      cellW, cellH, fill, datum, labelOpts
    ), datum, ctx))
  }

  // Cells are laid out by index. Publish a matching band scale so axes
  // tick the keys at cell centers. Streaming bins keep their linear scales.
  if (ctx.scales && xCount > 0 && yCount > 0) {
    ctx.scales.x = heatmapBandScale(xLabels, [0, layout.width])
    ctx.scales.y = heatmapBandScale(yLabels, [layout.height, 0])
  }

  return nodes
}

function buildStreamingHeatmapScene(ctx: XYSceneContext, data: Datum[], layout: StreamLayout): HeatcellSceneNode[] {
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
  const cellRows =
    !!ctx.config.trackHoverRows || requestsSelectionProvenance(ctx.config.areaStyle)
    ? new Map<number, Datum[]>()
    : undefined

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
    if (cellRows) {
      let rows = cellRows.get(idx)
      if (!rows) {
        rows = []
        cellRows.set(idx, rows)
      }
      rows.push(d)
    }
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

  const customColorScale = ctx.config.heatmapColorScale
  const schemeName = typeof ctx.config.colorScheme === "string"
    ? ctx.config.colorScheme
    : ctx.config.themeSequential || "blues"
  const lut = customColorScale ? undefined : getColorLut(schemeName)
  const cellW = layout.width / xBins
  const cellH = layout.height / yBins
  const showValues = ctx.config.showValues
  const valueFormat = ctx.config.heatmapValueFormat
  const nodes: HeatcellSceneNode[] = []

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

      const lutIdx = colorLutIndex(val, minVal, maxVal)
      const fill = customColorScale ? customColorScale(val) : lut![lutIdx]

      const labelOpts = showValues
        ? { value: val, showValues: true as const, valueFormat }
        : { value: val }
      // Enrich the datum with the bin's data-space center coords + the
      // aggregation type so consumer tooltips can show meaningful values.
      // Without these the streaming heatmap datum is just `{xi, yi, ...}`
      // which doesn't tell the user *where* in their data the cell sits.
      const xCenter = xMin + (xi + 0.5) * xBinSize
      const yCenter = yMin + (yi + 0.5) * yBinSize
      const datum = attachSelectionProvenance(
        {
          xi,
          yi,
          value: val,
          count: counts[idx],
          sum: sums[idx],
          xCenter,
          yCenter,
          agg
        },
        cellRows?.get(idx)
      )
      nodes.push(applyHeatcellStyle(buildHeatcellNode(
        xi * cellW, (yBins - 1 - yi) * cellH,
        cellW, cellH, fill,
        datum,
        labelOpts
      ), datum, ctx))
    }
  }

  return nodes
}
