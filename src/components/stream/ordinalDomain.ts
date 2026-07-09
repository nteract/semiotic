/**
 * Pure ordinal domain + column projection helpers for OrdinalPipelineStore.
 */

import type { ScaleBand } from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"
import type { OrdinalColumn, OrdinalLayout, OrdinalPipelineConfig } from "./ordinalTypes"

export interface OrdinalValueDomainInput {
  data: Datum[]
  chartType: OrdinalPipelineConfig["chartType"]
  projection?: OrdinalPipelineConfig["projection"]
  normalize?: boolean
  rExtent?: OrdinalPipelineConfig["rExtent"]
  extentPadding?: number
  baselinePadding?: boolean
  axisExtent?: OrdinalPipelineConfig["axisExtent"]
  getO: (d: Datum) => string
  getR: (d: Datum) => number
  getStack?: (d: Datum) => string
  /** IncrementalExtent-style [min, max]; Infinity/-Infinity when empty. */
  rawRExtent: [number, number]
}

/**
 * Compute the ordinal value (r) domain from data + chart type rules.
 * Pure: no store mutation; callers supply accessors and raw extent.
 */
export function computeOrdinalValueDomain(input: OrdinalValueDomainInput): [number, number] {
  const {
    data,
    chartType,
    projection,
    normalize,
    rExtent,
    extentPadding = 0.05,
    baselinePadding,
    axisExtent,
    getO,
    getR,
    getStack,
    rawRExtent
  } = input
  const pad = extentPadding

  // For radial pie/donut, the value axis represents proportions
  // But for radial point (radar), use actual data values
  if (projection === "radial" && (chartType === "pie" || chartType === "donut")) {
    return [0, 1]
  }

  let min = 0
  let max = 0

  if (chartType === "bar" && getStack && normalize) {
    // Normalized stacked bars: values are divided by column total → domain is [0, 1]
    min = 0
    max = 1
  } else if (chartType === "bar" && getStack) {
    // Stacked bars: compute per-category stacked sums
    const posSums = new Map<string, number>()
    const negSums = new Map<string, number>()

    for (const d of data) {
      const cat = getO(d)
      const val = getR(d)
      if (val >= 0) {
        posSums.set(cat, (posSums.get(cat) || 0) + val)
      } else {
        negSums.set(cat, (negSums.get(cat) || 0) + val)
      }
    }

    for (const s of posSums.values()) if (s > max) max = s
    for (const s of negSums.values()) if (s < min) min = s
  } else if (chartType === "bar") {
    // Non-stacked bars: pieces within each category are summed,
    // so the domain must cover the per-category total
    const catSums = new Map<string, number>()
    for (const d of data) {
      const cat = getO(d)
      const val = getR(d)
      catSums.set(cat, (catSums.get(cat) || 0) + val)
    }
    for (const s of catSums.values()) {
      if (s > max) max = s
      if (s < min) min = s
    }
  } else if (chartType === "swimlane") {
    // Swimlane: items stack sequentially per lane — domain covers max lane sum
    const laneSums = new Map<string, number>()
    for (const d of data) {
      const cat = getO(d)
      const val = Math.abs(getR(d))
      laneSums.set(cat, (laneSums.get(cat) || 0) + val)
    }
    for (const s of laneSums.values()) {
      if (s > max) max = s
    }
  } else if (chartType === "clusterbar" || chartType === "bar-funnel") {
    // Cluster bars / bar-funnel: individual values (side-by-side grouping)
    for (const d of data) {
      const val = getR(d)
      if (val > max) max = val
      if (val < min) min = val
    }
  } else {
    // Points, swarm, summary types: raw data extent
    const dataMin = rawRExtent[0]
    const dataMax = rawRExtent[1]
    if (dataMin !== Infinity) min = dataMin
    if (dataMax !== -Infinity) max = dataMax
  }

  // Apply user-specified extents
  if (rExtent) {
    if (rExtent[0] != null) min = rExtent[0]
    if (rExtent[1] != null) max = rExtent[1]
  }

  // Bars should include zero FIRST (unless user explicitly set rExtent)
  const isBarType =
    chartType === "bar" ||
    chartType === "clusterbar" ||
    chartType === "bar-funnel" ||
    chartType === "swimlane"
  if (isBarType) {
    if (!(rExtent?.[0] != null || rExtent?.[1] != null)) {
      if (min > 0) min = 0
      if (max < 0) max = 0
    }
  }

  // Apply padding AFTER include-zero (bar-funnel needs exact [0, max])
  // `axisExtent === "exact"` opts out of extent padding entirely so the
  // first and last ticks land on the literal data min/max — the user
  // accepts the trade-off that symbols at the extremes may sit at the
  // plot edge.
  if (chartType !== "bar-funnel" && axisExtent !== "exact") {
    const range = max - min
    const padAmount = range > 0 ? range * pad : 1
    // When baselinePadding is false (default), don't pad the side that sits at 0
    const skipMinPad = isBarType && !baselinePadding && min === 0
    const skipMaxPad =
      (isBarType && !baselinePadding && max === 0) || chartType === "swimlane"
    if (rExtent?.[0] == null && !skipMinPad) min -= padAmount
    if (rExtent?.[1] == null && !skipMaxPad) max += padAmount
  }

  return [min, max]
}

export interface BuildOrdinalColumnsInput {
  data: Datum[]
  oExtent: string[]
  oScale: ScaleBand<string>
  projection: string
  layout: OrdinalLayout
  dynamicColumnWidth?: OrdinalPipelineConfig["dynamicColumnWidth"]
  getO: (d: Datum) => string
  getR: (d: Datum) => number
}

/** Project band scale + data into per-category column geometry. */
export function buildOrdinalColumns(
  input: BuildOrdinalColumnsInput
): Record<string, OrdinalColumn> {
  const {
    data,
    oExtent,
    oScale,
    projection,
    layout,
    dynamicColumnWidth: dcw,
    getO,
    getR
  } = input
  const columns: Record<string, OrdinalColumn> = {}

  // Group data by category
  const grouped = new Map<string, Datum[]>()
  for (const d of data) {
    const cat = getO(d)
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(d)
  }

  // Compute total for radial proportions
  let total = 0
  if (projection === "radial") {
    for (const d of data) {
      total += Math.abs(getR(d))
    }
  }

  // Dynamic column widths: compute proportional widths instead of uniform bands
  let dynamicWidths: Map<string, number> | null = null
  if (dcw && projection !== "radial") {
    dynamicWidths = new Map()
    let totalWidth = 0
    for (const cat of oExtent) {
      const pieceData = grouped.get(cat) || []
      let colValue: number
      if (typeof dcw === "string") {
        colValue = pieceData.reduce((s, d) => s + (Number(d[dcw]) || 0), 0)
      } else {
        colValue = dcw(pieceData)
      }
      dynamicWidths.set(cat, colValue)
      totalWidth += colValue
    }
    // Normalize to available space
    const availableSpace = projection === "horizontal" ? layout.height : layout.width
    const paddingTotal = oScale.padding() * oScale.step() * oExtent.length
    const usableSpace = availableSpace - paddingTotal
    if (totalWidth > 0) {
      for (const [cat, val] of dynamicWidths) {
        dynamicWidths.set(cat, (val / totalWidth) * usableSpace)
      }
    }
  }

  let cumulativePct = 0
  let cumulativeX = 0

  for (const cat of oExtent) {
    const pieceData = grouped.get(cat) || []
    const catSum = pieceData.reduce((s, d) => s + Math.abs(getR(d)), 0)
    const pct = total > 0 ? catSum / total : 0

    let bandStart: number
    let bandwidth: number
    if (dynamicWidths) {
      bandStart = cumulativeX
      bandwidth = dynamicWidths.get(cat) || oScale.bandwidth()
      cumulativeX += bandwidth + oScale.padding() * oScale.step()
    } else {
      bandStart = oScale(cat) ?? 0
      bandwidth = oScale.bandwidth()
    }

    columns[cat] = {
      name: cat,
      x: bandStart,
      y: 0,
      width: bandwidth,
      middle: bandStart + bandwidth / 2,
      padding: oScale.padding() * oScale.step(),
      pieceData,
      pct,
      pctStart: cumulativePct
    }

    cumulativePct += pct
  }

  return columns
}
