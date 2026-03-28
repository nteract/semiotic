import { quantile as d3Quantile } from "d3-array"
import { buildRectNode } from "../SceneGraph"
import type {
  OrdinalSceneNode,
  OrdinalLayout,
  BoxplotSceneNode,
  ViolinSceneNode,
  DistributionStats
} from "../ordinalTypes"
import type { OrdinalSceneContext } from "./types"

export function buildBoxplotScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, resolveSummaryStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const showOutliers = config.showOutliers !== false

  for (const col of Object.values(columns)) {
    const values = col.pieceData
      .map(d => getR(d))
      .filter(v => v != null && !isNaN(v))
      .sort((a, b) => a - b)

    if (values.length === 0) continue

    const min = values[0]
    const max = values[values.length - 1]
    const q1 = d3Quantile(values, 0.25) ?? min
    const median = d3Quantile(values, 0.5) ?? (min + max) / 2
    const q3 = d3Quantile(values, 0.75) ?? max

    // IQR-based whiskers
    const iqr = q3 - q1
    const lowerFence = q1 - 1.5 * iqr
    const upperFence = q3 + 1.5 * iqr
    const whiskerMin = values.find(v => v >= lowerFence) ?? min
    const whiskerMax = [...values].reverse().find(v => v <= upperFence) ?? max

    const style = resolveSummaryStyle(col.pieceData[0], col.name)

    const outliers: BoxplotSceneNode["outliers"] = []
    if (showOutliers) {
      for (const d of col.pieceData) {
        const v = getR(d)
        if (v < lowerFence || v > upperFence) {
          const px = isVertical ? col.middle : rScale(v)
          const py = isVertical ? rScale(v) : col.middle
          outliers.push({ px, py, value: v, datum: d })
        }
      }
    }

    nodes.push({
      type: "boxplot",
      x: isVertical ? col.middle : 0,
      y: isVertical ? 0 : col.middle,
      projection: isVertical ? "vertical" : "horizontal",
      columnWidth: col.width * 0.6,
      minPos: rScale(whiskerMin),
      q1Pos: rScale(q1),
      medianPos: rScale(median),
      q3Pos: rScale(q3),
      maxPos: rScale(whiskerMax),
      stats: { n: values.length, min: whiskerMin, q1, median, q3, max: whiskerMax, mean: values.reduce((s, v) => s + v, 0) / values.length },
      style,
      datum: col.pieceData,
      category: col.name,
      outliers
    } as BoxplotSceneNode)

    // Add outlier points
    if (showOutliers) {
      for (const o of outliers) {
        nodes.push({
          type: "point",
          x: o.px,
          y: o.py,
          r: 3,
          style: { fill: style.fill || "#999", opacity: 0.6 },
          datum: o.datum
        })
      }
    }
  }

  return nodes
}

function computeDistributionStats(sortedValues: number[]): DistributionStats {
  const n = sortedValues.length
  const min = sortedValues[0]
  const max = sortedValues[n - 1]
  const q1 = d3Quantile(sortedValues, 0.25) ?? min
  const median = d3Quantile(sortedValues, 0.5) ?? (min + max) / 2
  const q3 = d3Quantile(sortedValues, 0.75) ?? max
  const mean = sortedValues.reduce((s, v) => s + v, 0) / n
  return { n, min, q1, median, q3, max, mean }
}

export function buildViolinScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, resolveSummaryStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const isVertical = projection === "vertical"
  const bins = config.bins || 20
  const showIQR = config.showIQR !== false

  for (const col of Object.values(columns)) {
    const values = col.pieceData
      .map(d => getR(d))
      .filter(v => v != null && !isNaN(v))
      .sort((a, b) => a - b)

    if (values.length < 2) continue

    const vMin = values[0]
    const vMax = values[values.length - 1]
    const binWidth = (vMax - vMin) / bins || 1

    // Build histogram bins
    const counts = new Array(bins).fill(0)
    for (const v of values) {
      const idx = Math.min(Math.floor((v - vMin) / binWidth), bins - 1)
      counts[idx]++
    }
    const maxCount = Math.max(...counts, 1)

    // Build symmetric violin path
    const halfWidth = col.width / 2 * 0.9
    let pathStr = ""

    if (isVertical) {
      // Right side: start at vMin (zero width), through bin centers, end at vMax (zero width)
      pathStr = `M ${col.middle} ${rScale(vMin)}`
      for (let i = 0; i < bins; i++) {
        const y = rScale(vMin + (i + 0.5) * binWidth)
        const w = (counts[i] / maxCount) * halfWidth
        pathStr += ` L ${col.middle + w} ${y}`
      }
      pathStr += ` L ${col.middle} ${rScale(vMax)}`
      // Left side: vMax back to vMin
      for (let i = bins - 1; i >= 0; i--) {
        const y = rScale(vMin + (i + 0.5) * binWidth)
        const w = (counts[i] / maxCount) * halfWidth
        pathStr += ` L ${col.middle - w} ${y}`
      }
      pathStr += " Z"
    } else {
      // Top side: start at vMin (zero width), through bin centers, end at vMax (zero width)
      pathStr = `M ${rScale(vMin)} ${col.middle}`
      for (let i = 0; i < bins; i++) {
        const x = rScale(vMin + (i + 0.5) * binWidth)
        const w = (counts[i] / maxCount) * halfWidth
        pathStr += ` L ${x} ${col.middle - w}`
      }
      pathStr += ` L ${rScale(vMax)} ${col.middle}`
      // Bottom side: vMax back to vMin
      for (let i = bins - 1; i >= 0; i--) {
        const x = rScale(vMin + (i + 0.5) * binWidth)
        const w = (counts[i] / maxCount) * halfWidth
        pathStr += ` L ${x} ${col.middle + w}`
      }
      pathStr += " Z"
    }

    const style = resolveSummaryStyle(col.pieceData[0], col.name)

    // IQR overlay
    let iqrLine: ViolinSceneNode["iqrLine"]
    if (showIQR && values.length >= 4) {
      const q1 = d3Quantile(values, 0.25) ?? vMin
      const median = d3Quantile(values, 0.5) ?? (vMin + vMax) / 2
      const q3 = d3Quantile(values, 0.75) ?? vMax
      iqrLine = {
        q1Pos: rScale(q1),
        medianPos: rScale(median),
        q3Pos: rScale(q3),
        centerPos: col.middle,
        isVertical
      }
    }

    const violinBounds = isVertical
      ? { x: col.x, y: Math.min(rScale(vMax), rScale(vMin)), width: col.width, height: Math.abs(rScale(vMax) - rScale(vMin)) }
      : { x: Math.min(rScale(vMin), rScale(vMax)), y: col.x, width: Math.abs(rScale(vMax) - rScale(vMin)), height: col.width }

    nodes.push({
      type: "violin",
      pathString: pathStr,
      translateX: 0,
      translateY: 0,
      bounds: violinBounds,
      iqrLine,
      stats: computeDistributionStats(values),
      style,
      datum: col.pieceData,
      category: col.name
    } as ViolinSceneNode)
  }

  return nodes
}

export function buildHistogramScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, resolveSummaryStyle } = ctx
  const { r: rScale } = scales
  const nodes: OrdinalSceneNode[] = []
  const numBins = config.bins || 25
  const isRelative = config.normalize

  // Use rScale domain as global extent so all categories share the same bin boundaries.
  // The domain comes from rExtent (set by the Histogram HOC) or from auto-computed data extent.
  const domain = rScale.domain?.() as [number, number] | undefined
  const globalMin = domain ? +domain[0] : undefined
  const globalMax = domain ? +domain[1] : undefined

  // Histograms always render horizontally: categories on y-axis, value bins on x-axis
  for (const col of Object.values(columns)) {
    const values = col.pieceData
      .map(d => getR(d))
      .filter(v => v != null && !isNaN(v))

    if (values.length === 0) continue

    const vMin = globalMin != null && isFinite(globalMin) ? globalMin : Math.min(...values)
    const vMax = globalMax != null && isFinite(globalMax) ? globalMax : Math.max(...values)
    const binWidth = (vMax - vMin) / numBins || 1

    const counts = new Array(numBins).fill(0)
    for (const v of values) {
      // Skip values outside the visible domain (avoids piling into edge bins when rExtent is set)
      if (v < vMin || v > vMax) continue
      const idx = Math.min(Math.floor((v - vMin) / binWidth), numBins - 1)
      counts[idx]++
    }

    const total = values.length
    const maxCount = Math.max(...counts, 1)

    const style = resolveSummaryStyle(col.pieceData[0], col.name)

    for (let i = 0; i < numBins; i++) {
      if (counts[i] === 0) continue

      const normCount = isRelative ? counts[i] / total : counts[i] / maxCount
      // Bar height proportional to count, within the column band
      const barH = normCount * col.width * 0.9

      // Bin position on the value (x) axis
      const binStart = rScale(vMin + i * binWidth)
      const binEnd = rScale(vMin + (i + 1) * binWidth)
      const x = Math.min(binStart, binEnd)
      const w = Math.abs(binEnd - binStart)

      // Align bar to baseline (bottom of the column band)
      const y = col.x + col.width - barH

      nodes.push(buildRectNode(
        x, y, w, barH,
        style,
        { bin: i, count: counts[i], range: [vMin + i * binWidth, vMin + (i + 1) * binWidth], category: col.name },
        col.name
      ))
    }
  }

  return nodes
}

export function buildRidgelineScene(ctx: OrdinalSceneContext, layout: OrdinalLayout): OrdinalSceneNode[] {
  const { scales, columns, config, getR, resolveSummaryStyle } = ctx
  const { r: rScale, projection } = scales
  const nodes: OrdinalSceneNode[] = []
  const numBins = config.bins || 20
  const isHorizontal = projection === "horizontal"
  // Amplitude controls how far the density extends (can overlap neighbors)
  const amplitude = (config as any).amplitude || 1.5

  for (const col of Object.values(columns)) {
    const values = col.pieceData
      .map(d => getR(d))
      .filter(v => v != null && !isNaN(v))
      .sort((a, b) => a - b)

    if (values.length < 2) continue

    const vMin = values[0]
    const vMax = values[values.length - 1]
    const binWidth = (vMax - vMin) / numBins || 1

    // Build histogram bins
    const counts = new Array(numBins).fill(0)
    for (const v of values) {
      // Skip values outside the visible domain (avoids piling into edge bins when rExtent is set)
      if (v < vMin || v > vMax) continue
      const idx = Math.min(Math.floor((v - vMin) / binWidth), numBins - 1)
      counts[idx]++
    }
    const maxCount = Math.max(...counts, 1)

    const style = resolveSummaryStyle(col.pieceData[0], col.name)
    const halfBand = col.width * amplitude

    // Build one-sided area path (density extends in one direction from baseline)
    let pathStr = ""

    if (isHorizontal) {
      // Horizontal: categories on y, values on x
      // Baseline is the bottom of the column band, density extends upward
      const baseline = col.x + col.width

      // Start at baseline
      pathStr = `M ${rScale(vMin)} ${baseline}`
      // Density curve going upward (negative y)
      for (let i = 0; i < numBins; i++) {
        const x = rScale(vMin + (i + 0.5) * binWidth)
        const h = (counts[i] / maxCount) * halfBand
        pathStr += ` L ${x} ${baseline - h}`
      }
      // Close back to baseline
      pathStr += ` L ${rScale(vMax)} ${baseline} Z`
    } else {
      // Vertical: categories on x, values on y
      // Baseline is the left of the column band, density extends rightward
      const baseline = col.x

      pathStr = `M ${baseline} ${rScale(vMin)}`
      for (let i = 0; i < numBins; i++) {
        const y = rScale(vMin + (i + 0.5) * binWidth)
        const w = (counts[i] / maxCount) * halfBand
        pathStr += ` L ${baseline + w} ${y}`
      }
      pathStr += ` L ${baseline} ${rScale(vMax)} Z`
    }

    const ridgeBounds = isHorizontal
      ? { x: Math.min(rScale(vMin), rScale(vMax)), y: col.x, width: Math.abs(rScale(vMax) - rScale(vMin)), height: col.width }
      : { x: col.x, y: Math.min(rScale(vMax), rScale(vMin)), width: col.width, height: Math.abs(rScale(vMax) - rScale(vMin)) }

    nodes.push({
      type: "violin",
      pathString: pathStr,
      translateX: 0,
      translateY: 0,
      bounds: ridgeBounds,
      stats: computeDistributionStats(values),
      style: { ...style, fillOpacity: style.fillOpacity ?? 0.5 },
      datum: col.pieceData,
      category: col.name
    } as ViolinSceneNode)
  }

  return nodes
}
