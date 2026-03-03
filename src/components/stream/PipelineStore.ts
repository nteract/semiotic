import { scaleLinear, type ScaleLinear } from "d3-scale"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import { computeBins, computeBinExtent } from "../realtime/BinAccumulator"
import { computeWaterfallExtent } from "../realtime/renderers/waterfallRenderer"
import type {
  Changeset,
  StreamChartType,
  StreamScales,
  StreamLayout,
  SceneNode,
  Style,
  ArrowOfTime,
  WindowMode
} from "./types"
import {
  buildLineNode,
  buildAreaNode,
  buildStackedAreaNodes,
  buildPointNode,
  buildRectNode,
  buildHeatcellNode
} from "./SceneGraph"

// ── Accessor resolution ────────────────────────────────────────────────

function resolveAccessor<T>(
  accessor: string | ((d: T) => number) | undefined,
  fallback: string
): (d: T) => number {
  if (typeof accessor === "function") return (d: T) => +accessor(d)
  const key = accessor || fallback
  return (d: T) => +(d as any)[key]
}

function resolveStringAccessor<T>(
  accessor: string | ((d: T) => string) | undefined,
  fallback?: string
): ((d: T) => string) | undefined {
  if (typeof accessor === "function") return accessor
  if (accessor) return (d: T) => String((d as any)[accessor])
  if (fallback) return (d: T) => String((d as any)[fallback])
  return undefined
}

// ── Axis direction helpers ─────────────────────────────────────────────

function getTimeAxis(arrowOfTime: ArrowOfTime): "x" | "y" {
  return arrowOfTime === "up" || arrowOfTime === "down" ? "y" : "x"
}

// ── PipelineStore config ───────────────────────────────────────────────

export interface PipelineConfig {
  chartType: StreamChartType
  windowSize: number
  windowMode: WindowMode
  arrowOfTime: ArrowOfTime
  extentPadding: number

  // Accessors
  xAccessor?: string | ((d: any) => number)
  yAccessor?: string | ((d: any) => number)
  timeAccessor?: string | ((d: any) => number)
  valueAccessor?: string | ((d: any) => number)
  colorAccessor?: string | ((d: any) => string)
  sizeAccessor?: string | ((d: any) => number)
  groupAccessor?: string | ((d: any) => string)
  categoryAccessor?: string | ((d: any) => string)
  lineDataAccessor?: string

  // Fixed extents
  xExtent?: [number, number]
  yExtent?: [number, number]
  sizeRange?: [number, number]

  // Bar/heatmap specifics
  binSize?: number
  normalize?: boolean

  // Style
  lineStyle?: any
  pointStyle?: (d: any) => Style & { r?: number }
  areaStyle?: (d: any) => Style
  colorScheme?: string | string[]
  barColors?: Record<string, string>
}

// ── PipelineStore ──────────────────────────────────────────────────────

export class PipelineStore {
  private buffer: RingBuffer<Record<string, any>>
  private xExtent = new IncrementalExtent()
  private yExtent = new IncrementalExtent()
  private config: PipelineConfig
  private growingCap: number

  private getX: (d: any) => number
  private getY: (d: any) => number
  private getGroup: ((d: any) => string) | undefined
  private getCategory: ((d: any) => string) | undefined

  scales: StreamScales | null = null
  scene: SceneNode[] = []
  version = 0

  constructor(config: PipelineConfig) {
    this.config = config
    this.buffer = new RingBuffer(config.windowSize)
    this.growingCap = config.windowSize

    // Resolve accessors based on chart type
    const isStreaming = ["bar", "swarm", "waterfall"].includes(config.chartType)
    if (isStreaming && config.timeAccessor) {
      this.getX = resolveAccessor(config.timeAccessor, "time")
      this.getY = resolveAccessor(
        config.valueAccessor || config.yAccessor,
        "value"
      )
    } else {
      this.getX = resolveAccessor(config.xAccessor, "x")
      this.getY = resolveAccessor(config.yAccessor, "y")
    }

    this.getGroup = resolveStringAccessor(config.groupAccessor)
    this.getCategory = resolveStringAccessor(config.categoryAccessor)
  }

  /**
   * Process a changeset from DataSourceAdapter.
   * Returns true if the scene needs re-rendering.
   */
  ingest(changeset: Changeset): boolean {
    if (changeset.bounded) {
      // Full replacement for bounded data
      this.buffer.clear()
      this.xExtent.clear()
      this.yExtent.clear()

      for (const d of changeset.inserts) {
        this.buffer.push(d)
        this.xExtent.push(this.getX(d))
        this.yExtent.push(this.getY(d))
      }
    } else {
      // Streaming append
      for (const d of changeset.inserts) {
        if (this.config.windowMode === "growing" && this.buffer.full) {
          this.growingCap *= 2
          this.buffer.resize(this.growingCap)
        }

        const evicted = this.buffer.push(d)
        this.xExtent.push(this.getX(d))
        this.yExtent.push(this.getY(d))

        if (evicted != null) {
          this.xExtent.evict(this.getX(evicted))
          this.yExtent.evict(this.getY(evicted))
        }
      }
    }

    return true
  }

  /**
   * Recompute scales and scene graph for the current buffer contents.
   */
  computeScene(layout: StreamLayout): void {
    const { config, buffer } = this

    // Recalculate dirty extents
    if (this.xExtent.dirty) {
      this.xExtent.recalculate(buffer, this.getX)
    }
    if (this.yExtent.dirty) {
      this.yExtent.recalculate(buffer, this.getY)
    }

    // Resolve domains
    let xDomain = config.xExtent || this.xExtent.extent
    let yDomain = config.yExtent || this.yExtent.extent

    // Chart-type specific extent adjustments
    if (config.chartType === "stackedarea" && !config.yExtent && buffer.size > 0) {
      // Stacked areas: y-extent must cover the cumulative sums, not raw values
      if (config.normalize) {
        // Normalized: all stacks sum to 1.0
        yDomain = [0, 1 + config.extentPadding]
      } else {
        const data = buffer.toArray()
        const groups = this.groupData(data)

        // Build per-x-value totals across all groups
        const xTotals = new Map<number, number>()
        for (const g of groups) {
          for (const d of g.data) {
            const x = this.getX(d)
            const y = this.getY(d)
            if (x != null && y != null && !Number.isNaN(x) && !Number.isNaN(y)) {
              xTotals.set(x, (xTotals.get(x) || 0) + y)
            }
          }
        }

        let maxStacked = 0
        for (const total of xTotals.values()) {
          if (total > maxStacked) maxStacked = total
        }

        const pad = maxStacked > 0 ? maxStacked * config.extentPadding : 1
        yDomain = [0, maxStacked + pad]
      }
    } else if (config.chartType === "bar" && config.binSize && !config.yExtent && buffer.size > 0) {
      const [, maxTotal] = computeBinExtent(
        buffer, this.getX, this.getY, config.binSize, this.getCategory
      )
      yDomain = [0, maxTotal + maxTotal * config.extentPadding]
    } else if (config.chartType === "waterfall" && !config.yExtent && buffer.size > 0) {
      const [minCum, maxCum] = computeWaterfallExtent(buffer, this.getY)
      const range = maxCum - minCum
      const pad = range > 0 ? range * config.extentPadding : 1
      yDomain = [
        Math.min(0, minCum - Math.abs(pad)),
        Math.max(0, maxCum + Math.abs(pad))
      ]
    } else if (!config.yExtent && yDomain[0] !== Infinity) {
      const range = yDomain[1] - yDomain[0]
      const pad = range > 0 ? range * config.extentPadding : 1
      yDomain = [yDomain[0] - pad, yDomain[1] + pad]
    }

    // Handle degenerate extents
    if (xDomain[0] === Infinity || xDomain[1] === -Infinity) xDomain = [0, 1]
    if (yDomain[0] === Infinity || yDomain[1] === -Infinity) yDomain = [0, 1]

    // Build scales
    // For streaming charts, use time/value axes based on arrowOfTime
    const isStreaming = config.arrowOfTime !== undefined
    if (isStreaming) {
      const timeAxis = getTimeAxis(config.arrowOfTime)
      if (timeAxis === "x") {
        const xRange: [number, number] = config.arrowOfTime === "right"
          ? [0, layout.width]
          : [layout.width, 0]
        this.scales = {
          x: scaleLinear().domain(xDomain).range(xRange),
          y: scaleLinear().domain(yDomain).range([layout.height, 0])
        }
      } else {
        const yRange: [number, number] = config.arrowOfTime === "down"
          ? [0, layout.height]
          : [layout.height, 0]
        this.scales = {
          x: scaleLinear().domain(yDomain).range([0, layout.width]),
          y: scaleLinear().domain(xDomain).range(yRange)
        }
      }
    } else {
      this.scales = {
        x: scaleLinear().domain(xDomain).range([0, layout.width]),
        y: scaleLinear().domain(yDomain).range([layout.height, 0])
      }
    }

    // Build scene graph based on chart type
    this.scene = this.buildSceneNodes(layout)
    this.version++
  }

  private buildSceneNodes(layout: StreamLayout): SceneNode[] {
    const { config, buffer, scales } = this
    if (!scales || buffer.size === 0) return []

    const data = buffer.toArray()

    switch (config.chartType) {
      case "line":
        return this.buildLineScene(data)
      case "area":
        return this.buildAreaScene(data)
      case "stackedarea":
        return this.buildStackedAreaScene(data)
      case "scatter":
      case "bubble":
        return this.buildPointScene(data)
      case "heatmap":
        return this.buildHeatmapScene(data, layout)
      case "bar":
        return this.buildBarScene(data)
      case "swarm":
        return this.buildSwarmScene(data)
      case "waterfall":
        return this.buildWaterfallScene(data, layout)
      default:
        return []
    }
  }

  private buildLineScene(data: Record<string, any>[]): SceneNode[] {
    const groups = this.groupData(data)
    const nodes: SceneNode[] = []

    for (const g of groups) {
      const style = this.resolveLineStyle(g.key, g.data[0])
      nodes.push(buildLineNode(g.data, this.scales!, this.getX, this.getY, style, g.key))
    }

    return nodes
  }

  private buildAreaScene(data: Record<string, any>[]): SceneNode[] {
    const groups = this.groupData(data)
    const nodes: SceneNode[] = []

    // Use the bottom of the y domain as the baseline so areas fill to the chart edge
    const yDomain = this.scales!.y.domain() as [number, number]
    const baseline = yDomain[0]

    for (const g of groups) {
      const style = this.resolveAreaStyle(g.key, g.data[0])
      nodes.push(buildAreaNode(g.data, this.scales!, this.getX, this.getY, baseline, style, g.key))
    }

    return nodes
  }

  private buildStackedAreaScene(data: Record<string, any>[]): SceneNode[] {
    const groups = this.groupData(data)
    const styleFn = (group: string, sampleDatum?: Record<string, any>) =>
      this.resolveAreaStyle(group, sampleDatum)
    return buildStackedAreaNodes(
      groups,
      this.scales!,
      this.getX,
      this.getY,
      styleFn,
      this.config.normalize
    )
  }

  private buildPointScene(data: Record<string, any>[]): SceneNode[] {
    const nodes: SceneNode[] = []
    const defaultR = this.config.chartType === "bubble" ? 10 : 5

    for (const d of data) {
      const style = this.config.pointStyle ? this.config.pointStyle(d) : { fill: "#4e79a7", opacity: 0.8 }
      const r = style.r || defaultR
      const node = buildPointNode(d, this.scales!, this.getX, this.getY, r, style)
      if (node) nodes.push(node)
    }

    return nodes
  }

  private buildHeatmapScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    const nodes: SceneNode[] = []
    const getVal = resolveAccessor(this.config.valueAccessor, "value")

    // Determine grid dimensions from unique x/y values
    const xSet = new Set<number>()
    const ySet = new Set<number>()
    for (const d of data) {
      xSet.add(this.getX(d))
      ySet.add(this.getY(d))
    }

    const xValues = Array.from(xSet).sort((a, b) => a - b)
    const yValues = Array.from(ySet).sort((a, b) => a - b)
    if (xValues.length === 0 || yValues.length === 0) return nodes

    const cellW = layout.width / xValues.length
    const cellH = layout.height / yValues.length

    // Build value lookup
    const valueMap = new Map<string, { val: number; datum: any }>()
    for (const d of data) {
      const key = `${this.getX(d)}_${this.getY(d)}`
      valueMap.set(key, { val: getVal(d), datum: d })
    }

    // Compute value range for color
    let minVal = Infinity
    let maxVal = -Infinity
    for (const { val } of valueMap.values()) {
      if (val < minVal) minVal = val
      if (val > maxVal) maxVal = val
    }
    const valRange = maxVal - minVal || 1

    for (let xi = 0; xi < xValues.length; xi++) {
      for (let yi = 0; yi < yValues.length; yi++) {
        const key = `${xValues[xi]}_${yValues[yi]}`
        const entry = valueMap.get(key)
        if (!entry) continue

        const t = (entry.val - minVal) / valRange
        // Default to blues interpolation
        const r = Math.round(220 - 180 * t)
        const g = Math.round(220 - 100 * t)
        const b = Math.round(255 - 50 * t)
        const fill = `rgb(${r},${g},${b})`

        nodes.push(buildHeatcellNode(
          xi * cellW,
          (yValues.length - 1 - yi) * cellH,
          cellW,
          cellH,
          fill,
          entry.datum
        ))
      }
    }

    return nodes
  }

  private buildBarScene(data: Record<string, any>[]): SceneNode[] {
    if (!this.config.binSize) return []

    const bins = computeBins(data, this.getX, this.getY, this.config.binSize, this.getCategory)
    if (bins.size === 0) return []

    const nodes: SceneNode[] = []
    const scales = this.scales!
    const [domainMin, domainMax] = scales.x.domain() as [number, number]
    const gap = this.config.barColors ? 1 : 1

    for (const bin of bins.values()) {
      const clampedStart = Math.max(bin.start, domainMin)
      const clampedEnd = Math.min(bin.end, domainMax)
      if (clampedStart >= clampedEnd) continue

      const rawX0 = scales.x(clampedStart)
      const rawX1 = scales.x(clampedEnd)
      const x0 = Math.min(rawX0, rawX1) + gap / 2
      const x1 = Math.max(rawX0, rawX1) - gap / 2
      const barWidth = x1 - x0
      if (barWidth <= 0) continue

      if (this.getCategory && bin.categories.size > 0) {
        let cumulativeBase = 0
        for (const [cat, catVal] of bin.categories) {
          if (catVal === 0) continue
          const yBottom = scales.y(cumulativeBase)
          const yTop = scales.y(cumulativeBase + catVal)
          const rectY = Math.min(yBottom, yTop)
          const rectH = Math.abs(yBottom - yTop)

          nodes.push(buildRectNode(
            x0, rectY, barWidth, rectH,
            { fill: this.config.barColors?.[cat] || "#4e79a7" },
            { binStart: bin.start, binEnd: bin.end, total: bin.total, category: cat, categoryValue: catVal },
            cat
          ))
          cumulativeBase += catVal
        }
      } else {
        const yZero = scales.y(0)
        const yTop = scales.y(bin.total)
        const rectY = Math.min(yZero, yTop)
        const rectH = Math.abs(yZero - yTop)

        nodes.push(buildRectNode(
          x0, rectY, barWidth, rectH,
          { fill: "#007bff" },
          { binStart: bin.start, binEnd: bin.end, total: bin.total }
        ))
      }
    }

    return nodes
  }

  private buildSwarmScene(data: Record<string, any>[]): SceneNode[] {
    const nodes: SceneNode[] = []
    const ss = this.config
    const radius = 3

    for (const d of data) {
      const xVal = this.getX(d)
      const yVal = this.getY(d)
      if (yVal == null || Number.isNaN(yVal)) continue

      const x = this.scales!.x(xVal)
      const y = this.scales!.y(yVal)

      let fill = "#007bff"
      if (this.getCategory) {
        const cat = this.getCategory(d)
        fill = ss.barColors?.[cat] || "#4e79a7"
      }

      nodes.push({
        type: "point",
        x, y, r: radius,
        style: { fill, opacity: 0.7 },
        datum: d
      })
    }

    return nodes
  }

  private buildWaterfallScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    const nodes: SceneNode[] = []
    const scales = this.scales!

    // Filter valid data
    const arr = data.filter(d => {
      const v = this.getY(d)
      return v != null && !Number.isNaN(v)
    })
    if (arr.length === 0) return nodes

    const gap = 1
    let baseline = 0

    for (let i = 0; i < arr.length; i++) {
      const d = arr[i]
      const t = this.getX(d)
      const delta = this.getY(d)
      const cumEnd = baseline + delta

      // Compute bar width from time gap
      let barWidthTime: number
      if (i < arr.length - 1) {
        barWidthTime = this.getX(arr[i + 1]) - t
      } else if (i > 0) {
        barWidthTime = t - this.getX(arr[i - 1])
      } else {
        barWidthTime = 0
      }

      const rawX0 = scales.x(t)
      const rawX1 = barWidthTime !== 0 ? scales.x(t + barWidthTime) : rawX0 + layout.width / 10
      const x0 = Math.min(rawX0, rawX1) + gap / 2
      const x1 = Math.max(rawX0, rawX1) - gap / 2
      const barWidth = x1 - x0
      if (barWidth <= 0) {
        baseline = cumEnd
        continue
      }

      const yBaseline = scales.y(baseline)
      const yTop = scales.y(cumEnd)
      const rectY = Math.min(yBaseline, yTop)
      const rectH = Math.abs(yBaseline - yTop)

      const fill = delta >= 0 ? "#28a745" : "#dc3545"
      nodes.push(buildRectNode(
        x0, rectY, barWidth, rectH,
        { fill },
        { ...d, baseline, cumEnd, delta }
      ))

      baseline = cumEnd
    }

    return nodes
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private groupData(data: Record<string, any>[]): { key: string; data: Record<string, any>[] }[] {
    if (!this.getGroup) {
      return [{ key: "_default", data }]
    }

    const groups = new Map<string, Record<string, any>[]>()
    for (const d of data) {
      const key = this.getGroup(d)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(d)
    }

    return Array.from(groups.entries()).map(([key, data]) => ({ key, data }))
  }

  private resolveLineStyle(group: string, sampleDatum?: Record<string, any>): Style {
    const ls = this.config.lineStyle
    if (typeof ls === "function") {
      return ls(sampleDatum || {}, group)
    }
    if (ls && typeof ls === "object") {
      return {
        stroke: ls.stroke || "#007bff",
        strokeWidth: ls.strokeWidth || 2,
        strokeDasharray: ls.strokeDasharray
      }
    }
    return { stroke: "#007bff", strokeWidth: 2 }
  }

  private resolveAreaStyle(group: string, sampleDatum?: Record<string, any>): Style {
    if (this.config.areaStyle) {
      return this.config.areaStyle(sampleDatum || {})
    }
    // Fall back to lineStyle — AreaChart passes area styling via lineStyle
    const ls = this.config.lineStyle
    if (typeof ls === "function") {
      return ls(sampleDatum || {}, group)
    }
    if (ls && typeof ls === "object") {
      return {
        fill: ls.fill || ls.stroke || "#4e79a7",
        fillOpacity: ls.fillOpacity ?? 0.7,
        stroke: ls.stroke || "#4e79a7",
        strokeWidth: ls.strokeWidth || 2
      }
    }
    return { fill: "#4e79a7", fillOpacity: 0.7, stroke: "#4e79a7", strokeWidth: 2 }
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Record<string, any>[] {
    return this.buffer.toArray()
  }

  getExtents(): { x: [number, number]; y: [number, number] } | null {
    if (this.xExtent.min === Infinity) return null
    return {
      x: this.xExtent.extent,
      y: this.yExtent.extent
    }
  }

  clear(): void {
    this.buffer.clear()
    this.xExtent.clear()
    this.yExtent.clear()
    this.scales = null
    this.scene = []
    this.version++
  }

  get size(): number {
    return this.buffer.size
  }

  getBuffer(): RingBuffer<Record<string, any>> {
    return this.buffer
  }

  getXAccessor(): (d: any) => number {
    return this.getX
  }

  getYAccessor(): (d: any) => number {
    return this.getY
  }

  getCategoryAccessor(): ((d: any) => string) | undefined {
    return this.getCategory
  }

  updateConfig(config: Partial<PipelineConfig>): void {
    Object.assign(this.config, config)
  }
}
