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
import { scaleSequential } from "d3-scale"
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

export function buildHeatmapScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  // Streaming heatmap: 2D grid binning with aggregation
  if (ctx.config.heatmapAggregation) {
    return buildStreamingHeatmapScene(ctx, data, layout)
  }

  const nodes: SceneNode[] = []
  const getVal = resolveAccessor(ctx.config.valueAccessor, "value")
  const getRawX = resolveRawAccessor(ctx.config.xAccessor, "x")
  const getRawY = resolveRawAccessor(ctx.config.yAccessor, "y")

  const xSet = new Set<any>()
  const ySet = new Set<any>()
  for (const d of data) {
    xSet.add(getRawX(d))
    ySet.add(getRawY(d))
  }

  const xRaw = Array.from(xSet)
  const yRaw = Array.from(ySet)
  const xNumeric = xRaw.every(v => typeof v === "number" && !isNaN(v))
  const yNumeric = yRaw.every(v => typeof v === "number" && !isNaN(v))
  const xValues = xNumeric ? xRaw.sort((a, b) => a - b) : xRaw
  const yValues = yNumeric ? yRaw.sort((a, b) => a - b) : yRaw
  if (xValues.length === 0 || yValues.length === 0) return nodes

  const cellW = layout.width / xValues.length
  const cellH = layout.height / yValues.length

  const valueMap = new Map<string, { val: number; datum: any }>()
  for (const d of data) {
    const key = `${getRawX(d)}\0${getRawY(d)}`
    valueMap.set(key, { val: getVal(d), datum: d })
  }

  let minVal = Infinity
  let maxVal = -Infinity
  for (const { val } of valueMap.values()) {
    if (!isFinite(val)) continue
    if (val < minVal) minVal = val
    if (val > maxVal) maxVal = val
  }
  if (!isFinite(minVal) || !isFinite(maxVal)) return nodes

  const schemeName = typeof ctx.config.colorScheme === "string" ? ctx.config.colorScheme : "blues"
  const interpolator = HEAT_INTERPOLATORS[schemeName] || interpolateBlues
  const heatColor = scaleSequential(interpolator).domain([minVal, maxVal])

  for (let xi = 0; xi < xValues.length; xi++) {
    for (let yi = 0; yi < yValues.length; yi++) {
      const key = `${xValues[xi]}\0${yValues[yi]}`
      const entry = valueMap.get(key)
      if (!entry || !isFinite(entry.val)) continue

      const fill = heatColor(entry.val)
      const labelOpts = ctx.config.showValues
        ? { value: entry.val, showValues: true as const, valueFormat: ctx.config.heatmapValueFormat }
        : undefined
      nodes.push(buildHeatcellNode(
        xi * cellW,
        (yValues.length - 1 - yi) * cellH,
        cellW, cellH, fill, entry.datum, labelOpts
      ))
    }
  }

  return nodes
}

function buildStreamingHeatmapScene(ctx: XYSceneContext, data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
  const nodes: SceneNode[] = []
  const xBins = Math.max(1, Math.floor(ctx.config.heatmapXBins ?? 20))
  const yBins = Math.max(1, Math.floor(ctx.config.heatmapYBins ?? 20))
  const agg = ctx.config.heatmapAggregation ?? "count"
  const getVal = resolveAccessor(ctx.config.valueAccessor, "value")

  if (!ctx.scales || data.length === 0) return nodes

  const [xMin, xMax] = ctx.scales.x.domain() as [number, number]
  const [yMin, yMax] = ctx.scales.y.domain() as [number, number]
  const xRange = xMax - xMin || 1
  const yRange = yMax - yMin || 1
  const xBinSize = xRange / xBins
  const yBinSize = yRange / yBins

  const grid = new Map<string, { sum: number; count: number; data: any[] }>()

  for (const d of data) {
    const xVal = ctx.getX(d)
    const yVal = ctx.getY(d)
    if (!isFinite(xVal) || !isFinite(yVal)) continue
    const xi = Math.min(Math.floor((xVal - xMin) / xBinSize), xBins - 1)
    const yi = Math.min(Math.floor((yVal - yMin) / yBinSize), yBins - 1)
    if (xi < 0 || yi < 0) continue

    const val = getVal(d)
    const key = `${xi}_${yi}`
    let cell = grid.get(key)
    if (!cell) {
      cell = { sum: 0, count: 0, data: [] }
      grid.set(key, cell)
    }
    cell.count++
    cell.sum += isFinite(val) ? val : 0
    cell.data.push(d)
  }

  let minVal = Infinity
  let maxVal = -Infinity
  const cellValues = new Map<string, number>()
  for (const [key, cell] of grid) {
    let val: number
    switch (agg) {
      case "sum": val = cell.sum; break
      case "mean": val = cell.count > 0 ? cell.sum / cell.count : 0; break
      default: val = cell.count; break
    }
    cellValues.set(key, val)
    if (val < minVal) minVal = val
    if (val > maxVal) maxVal = val
  }
  const valRange = maxVal - minVal || 1

  const cellW = layout.width / xBins
  const cellH = layout.height / yBins

  for (const [key, val] of cellValues) {
    const [xiStr, yiStr] = key.split("_")
    const xi = +xiStr
    const yi = +yiStr

    const t = (val - minVal) / valRange
    const r = Math.round(220 - 180 * t)
    const g = Math.round(220 - 100 * t)
    const b = Math.round(255 - 50 * t)
    const fill = `rgb(${r},${g},${b})`

    const cell = grid.get(key)!
    const streamLabelOpts = ctx.config.showValues
      ? { value: val, showValues: true as const, valueFormat: ctx.config.heatmapValueFormat }
      : undefined
    nodes.push(buildHeatcellNode(
      xi * cellW, (yBins - 1 - yi) * cellH,
      cellW, cellH, fill,
      { xi, yi, value: val, count: cell.count, sum: cell.sum, data: cell.data },
      streamLabelOpts
    ))
  }

  return nodes
}
