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
  AreaSceneNode,
  PointSceneNode,
  CandlestickSceneNode,
  CandlestickStyle,
  Style,
  ArrowOfTime,
  WindowMode,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig
} from "./types"
import {
  buildLineNode,
  buildAreaNode,
  buildStackedAreaNodes,
  buildPointNode,
  buildRectNode,
  buildHeatcellNode
} from "./SceneGraph"
import { resolveAccessor, resolveStringAccessor } from "./accessorUtils"

// ── Axis direction helpers ─────────────────────────────────────────────

function getTimeAxis(arrowOfTime: ArrowOfTime): "x" | "y" {
  return arrowOfTime === "up" || arrowOfTime === "down" ? "y" : "x"
}

// ── PipelineStore config ───────────────────────────────────────────────

export interface PipelineConfig {
  chartType: StreamChartType
  runtimeMode?: "streaming" | "bounded"
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

  // Fixed extents (partial: [min] or [min, undefined] to set only min)
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  sizeRange?: [number, number]

  // Bar/heatmap specifics
  binSize?: number
  normalize?: boolean

  // Candlestick accessors
  openAccessor?: string | ((d: any) => number)
  highAccessor?: string | ((d: any) => number)
  lowAccessor?: string | ((d: any) => number)
  closeAccessor?: string | ((d: any) => number)
  candlestickStyle?: CandlestickStyle

  // Bounds/uncertainty
  boundsAccessor?: string | ((d: any) => number)
  boundsStyle?: any

  // Per-point area baseline (for band/ribbon charts like percentile bands)
  y0Accessor?: string | ((d: any) => number)

  // Area gradient fill (opacity fades from top to baseline)
  gradientFill?: { topOpacity: number; bottomOpacity: number }

  // Style
  lineStyle?: any
  pointStyle?: (d: any) => Style & { r?: number }
  areaStyle?: (d: any) => Style
  swarmStyle?: { radius?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }
  waterfallStyle?: { positiveColor?: string; negativeColor?: string; connectorStroke?: string; connectorWidth?: number; gap?: number; stroke?: string; strokeWidth?: number }
  colorScheme?: string | string[]
  barColors?: Record<string, string>

  // Annotations (threshold coloring uses these)
  annotations?: Record<string, any>[]

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  staleness?: StalenessConfig

  // Streaming heatmap
  heatmapAggregation?: "count" | "sum" | "mean"
  heatmapXBins?: number
  heatmapYBins?: number

  // Point identification (for point-anchored annotations)
  pointIdAccessor?: string | ((d: any) => string)
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
  private getSize: ((d: any) => number) | undefined
  private getColor: ((d: any) => string) | undefined
  private getBounds: ((d: any) => number) | undefined
  private getY0: ((d: any) => number) | undefined
  private getOpen: ((d: any) => number) | undefined
  private getHigh: ((d: any) => number) | undefined
  private getLow: ((d: any) => number) | undefined
  private getClose: ((d: any) => number) | undefined
  private getPointId: ((d: any) => string) | undefined

  // ── Pulse tracking ──────────────────────────────────────────────────
  private timestampBuffer: RingBuffer<number> | null = null

  // ── Transition animation ────────────────────────────────────────────
  activeTransition: { startTime: number; duration: number } | null = null
  private prevPositionMap = new Map<string, { x: number; y: number; w?: number; h?: number; r?: number }>()

  // ── Staleness tracking ──────────────────────────────────────────────
  lastIngestTime = 0

  // ── Resize optimization ──────────────────────────────────────────────
  private needsFullRebuild = true
  private lastLayout: StreamLayout | null = null

  scales: StreamScales | null = null
  scene: SceneNode[] = []
  version = 0

  constructor(config: PipelineConfig) {
    this.config = config
    this.buffer = new RingBuffer(config.windowSize)
    this.growingCap = config.windowSize

    // Resolve accessors based on streaming vs bounded mode.
    // Streaming types use time/value defaults; bounded types use x/y defaults.
    const isStreamingType = ["bar", "swarm", "waterfall"].includes(config.chartType)
    const useStreamingDefaults = isStreamingType || config.runtimeMode === "streaming"

    if (useStreamingDefaults) {
      this.getX = resolveAccessor(config.timeAccessor || config.xAccessor, "time")
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
    this.getSize = config.sizeAccessor
      ? resolveAccessor(config.sizeAccessor, "size")
      : undefined
    this.getColor = resolveStringAccessor(config.colorAccessor)
    this.getBounds = config.boundsAccessor
      ? resolveAccessor(config.boundsAccessor, "bounds")
      : undefined
    this.getY0 = config.y0Accessor
      ? resolveAccessor(config.y0Accessor, "y0")
      : undefined

    this.getPointId = resolveStringAccessor(config.pointIdAccessor)

    // Candlestick accessors
    if (config.chartType === "candlestick") {
      this.getOpen = resolveAccessor(config.openAccessor, "open")
      this.getHigh = resolveAccessor(config.highAccessor, "high")
      this.getLow = resolveAccessor(config.lowAccessor, "low")
      this.getClose = resolveAccessor(config.closeAccessor, "close")
    }

    // Pulse: parallel timestamp buffer
    if (config.pulse) {
      this.timestampBuffer = new RingBuffer(config.windowSize)
    }
  }

  /**
   * Process a changeset from DataSourceAdapter.
   * Returns true if the scene needs re-rendering.
   */
  ingest(changeset: Changeset): boolean {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    this.lastIngestTime = now
    this.needsFullRebuild = true

    if (changeset.bounded) {
      // Full replacement for bounded data
      this.buffer.clear()
      this.xExtent.clear()
      this.yExtent.clear()
      if (this.timestampBuffer) this.timestampBuffer.clear()

      // Auto-resize buffer to fit all bounded data.
      // totalSize is set when data is progressively chunked — pre-allocate
      // for the full dataset so subsequent append chunks don't evict.
      const targetSize = changeset.totalSize || changeset.inserts.length
      if (targetSize > this.buffer.capacity) {
        this.buffer.resize(targetSize)
        if (this.timestampBuffer && targetSize > this.timestampBuffer.capacity) {
          this.timestampBuffer.resize(targetSize)
        }
      }

      for (const d of changeset.inserts) {
        this.buffer.push(d)
        if (this.timestampBuffer) this.timestampBuffer.push(now)
        this.xExtent.push(this.getX(d))
        if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
          this.yExtent.push(this.getHigh(d))
          this.yExtent.push(this.getLow(d))
        } else {
          this.yExtent.push(this.getY(d))
          if (this.getY0) this.yExtent.push(this.getY0(d))
        }
      }
    } else {
      // Streaming append
      for (const d of changeset.inserts) {
        if (this.config.windowMode === "growing" && this.buffer.full) {
          this.growingCap *= 2
          this.buffer.resize(this.growingCap)
          if (this.timestampBuffer) this.timestampBuffer.resize(this.growingCap)
        }

        const evicted = this.buffer.push(d)
        if (this.timestampBuffer) this.timestampBuffer.push(now)
        this.xExtent.push(this.getX(d))
        if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
          this.yExtent.push(this.getHigh(d))
          this.yExtent.push(this.getLow(d))
        } else {
          this.yExtent.push(this.getY(d))
          if (this.getY0) this.yExtent.push(this.getY0(d))
        }

        if (evicted != null) {
          this.xExtent.evict(this.getX(evicted))
          if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
            this.yExtent.evict(this.getHigh(evicted))
            this.yExtent.evict(this.getLow(evicted))
          } else {
            this.yExtent.evict(this.getY(evicted))
          }
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

    // Fast path: if only layout dimensions changed (no data or config change),
    // remap existing scene node coordinates instead of rebuilding from scratch.
    if (
      !this.needsFullRebuild &&
      this.lastLayout &&
      this.scene.length > 0 &&
      this.scales &&
      (this.lastLayout.width !== layout.width || this.lastLayout.height !== layout.height)
    ) {
      this.remapScene(layout)
      return
    }

    // Recalculate dirty extents
    if (this.xExtent.dirty) {
      this.xExtent.recalculate(buffer, this.getX)
    }
    if (this.yExtent.dirty) {
      if (config.chartType === "candlestick" && this.getHigh && this.getLow) {
        // Candlestick y-extent spans high→low, not a single y accessor
        this.yExtent.clear()
        for (const d of buffer) {
          this.yExtent.push(this.getHigh(d))
          this.yExtent.push(this.getLow(d))
        }
      } else {
        this.yExtent.recalculate(buffer, this.getY)
      }
    }

    // Resolve domains — merge user-specified extents with data extents
    const dataXDomain = this.xExtent.extent
    const dataYDomain = this.yExtent.extent
    let xDomain: [number, number] = config.xExtent
      ? [
          config.xExtent[0] ?? dataXDomain[0],
          config.xExtent[1] ?? dataXDomain[1]
        ]
      : dataXDomain
    let yDomain: [number, number] = config.yExtent
      ? [
          config.yExtent[0] ?? dataYDomain[0],
          config.yExtent[1] ?? dataYDomain[1]
        ]
      : dataYDomain

    // Determine if extents are fully user-specified (no padding needed)
    const yFullySpecified = config.yExtent && config.yExtent[0] != null && config.yExtent[1] != null
    const xFullySpecified = config.xExtent && config.xExtent[0] != null && config.xExtent[1] != null

    // Chart-type specific extent adjustments
    if (config.chartType === "stackedarea" && !yFullySpecified && buffer.size > 0) {
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
    } else if (config.chartType === "bar" && config.binSize && !yFullySpecified && buffer.size > 0) {
      const [, maxTotal] = computeBinExtent(
        buffer, this.getX, this.getY, config.binSize, this.getCategory
      )
      yDomain = [0, maxTotal + maxTotal * config.extentPadding]
    } else if (config.chartType === "waterfall" && !yFullySpecified && buffer.size > 0) {
      const [minCum, maxCum] = computeWaterfallExtent(buffer, this.getY)
      const range = maxCum - minCum
      const pad = range > 0 ? range * config.extentPadding : 1
      yDomain = [
        Math.min(0, minCum - Math.abs(pad)),
        Math.max(0, maxCum + Math.abs(pad))
      ]
    } else if (!yFullySpecified && yDomain[0] !== Infinity) {
      // Expand extent to include bounds/uncertainty offsets
      if (this.getBounds) {
        const data = buffer.toArray()
        for (const d of data) {
          const y = this.getY(d)
          const offset = this.getBounds(d)
          if (y == null || Number.isNaN(y) || !offset) continue
          if (y + offset > yDomain[1]) yDomain[1] = y + offset
          if (y - offset < yDomain[0]) yDomain[0] = y - offset
        }
      }
      const range = yDomain[1] - yDomain[0]
      const pad = range > 0 ? range * config.extentPadding : 1
      // Only pad the data-derived side; preserve user-specified bounds
      const userMin = config.yExtent?.[0]
      const userMax = config.yExtent?.[1]
      yDomain = [
        userMin != null ? yDomain[0] : yDomain[0] - pad,
        userMax != null ? yDomain[1] : yDomain[1] + pad
      ]
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

    // Snapshot positions for transition animation (before rebuild)
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }

    // Build scene graph based on chart type
    const data = buffer.toArray()
    this.scene = this.buildSceneNodes(layout)

    // Apply decay opacity to discrete nodes
    if (this.config.decay) {
      this.applyDecay(this.scene, data)
    }

    // Apply pulse glow to discrete nodes
    if (this.config.pulse) {
      this.applyPulse(this.scene, data)
    }

    // Start transition animation from old to new positions
    if (this.config.transition && this.prevPositionMap.size > 0) {
      this.startTransition()
    }

    this.needsFullRebuild = false
    this.lastLayout = { width: layout.width, height: layout.height }
    this.version++
  }

  /**
   * Remap existing scene node coordinates for a new layout size.
   * Proportionally scales all pixel coordinates without rebuilding from data.
   */
  private remapScene(layout: StreamLayout): void {
    const oldW = this.lastLayout!.width
    const oldH = this.lastLayout!.height
    const wRatio = layout.width / oldW
    const hRatio = layout.height / oldH

    for (const node of this.scene) {
      switch (node.type) {
        case "line":
          for (const p of node.path) { p[0] *= wRatio; p[1] *= hRatio }
          break
        case "area":
          for (const p of node.topPath) { p[0] *= wRatio; p[1] *= hRatio }
          for (const p of node.bottomPath) { p[0] *= wRatio; p[1] *= hRatio }
          break
        case "point":
          node.x *= wRatio; node.y *= hRatio
          break
        case "rect":
          node.x *= wRatio; node.y *= hRatio
          node.w *= wRatio; node.h *= hRatio
          break
        case "heatcell":
          node.x *= wRatio; node.y *= hRatio
          node.w *= wRatio; node.h *= hRatio
          break
        case "candlestick":
          node.x *= wRatio
          node.openY *= hRatio; node.closeY *= hRatio
          node.highY *= hRatio; node.lowY *= hRatio
          break
      }
    }

    // Rebuild scales with new pixel ranges (same data domain)
    const xDomain = this.scales!.x.domain() as [number, number]
    const yDomain = this.scales!.y.domain() as [number, number]
    const oldXRange = this.scales!.x.range() as [number, number]
    const oldYRange = this.scales!.y.range() as [number, number]
    this.scales = {
      x: scaleLinear().domain(xDomain).range([
        oldXRange[0] * wRatio, oldXRange[1] * wRatio
      ]),
      y: scaleLinear().domain(yDomain).range([
        oldYRange[0] * hRatio, oldYRange[1] * hRatio
      ])
    }

    this.lastLayout = { width: layout.width, height: layout.height }
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
      case "candlestick":
        return this.buildCandlestickScene(data, layout)
      default:
        return []
    }
  }

  private buildLineScene(data: Record<string, any>[]): SceneNode[] {
    const groups = this.groupData(data)
    const nodes: SceneNode[] = []

    // Extract color thresholds from annotations (if any)
    const colorThresholds = this.config.annotations
      ?.filter((a: any) => a.type === "threshold" && a.color)
      .map((a: any) => ({
        value: a.value as number,
        color: a.color as string,
        thresholdType: (a.thresholdType || "greater") as "greater" | "lesser"
      }))

    // Build bounds areas first so they render behind lines
    if (this.getBounds) {
      for (const g of groups) {
        const boundsNode = this.buildBoundsForGroup(g.data, g.key)
        if (boundsNode) nodes.push(boundsNode)
      }
    }

    for (const g of groups) {
      const style = this.resolveLineStyle(g.key, g.data[0])
      const lineNode = buildLineNode(g.data, this.scales!, this.getX, this.getY, style, g.key)
      // Attach threshold info for the renderer
      if (colorThresholds && colorThresholds.length > 0) {
        lineNode.colorThresholds = colorThresholds
      }
      nodes.push(lineNode)
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
      const node = buildAreaNode(g.data, this.scales!, this.getX, this.getY, baseline, style, g.key, this.getY0)
      if (this.config.gradientFill) {
        node.fillGradient = this.config.gradientFill
      }
      nodes.push(node)
    }

    return nodes
  }

  private buildStackedAreaScene(data: Record<string, any>[]): SceneNode[] {
    const groups = this.groupData(data)
    // Sort groups by key to ensure a stable stacking order. Without this,
    // a sliding window can reorder groups when eviction changes which group
    // appears first in the buffer, causing layers to swap and flicker.
    groups.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0)
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
    const sizeRange = this.config.sizeRange || [3, 15]

    // Compute size scale if sizeAccessor is set and no pointStyle handles it
    let sizeScale: ((v: number) => number) | null = null
    if (this.getSize && !this.config.pointStyle) {
      const sizes = data.map(d => this.getSize!(d)).filter(s => s != null && !Number.isNaN(s))
      if (sizes.length > 0) {
        const minSize = Math.min(...sizes)
        const maxSize = Math.max(...sizes)
        sizeScale = (s: number) => {
          if (minSize === maxSize) return (sizeRange[0] + sizeRange[1]) / 2
          return sizeRange[0] + ((s - minSize) / (maxSize - minSize)) * (sizeRange[1] - sizeRange[0])
        }
      }
    }

    // Build color map from colorAccessor if no pointStyle handles it
    // Sort categories alphabetically for stable palette assignment across frames
    let colorMap: Map<string, string> | null = null
    if (this.getColor && !this.config.pointStyle) {
      const categories = new Set<string>()
      for (const d of data) {
        const c = this.getColor(d)
        if (c) categories.add(c)
      }
      const sorted = Array.from(categories).sort()
      const palette = Array.isArray(this.config.colorScheme) ? this.config.colorScheme
        : ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"]
      colorMap = new Map()
      for (let ci = 0; ci < sorted.length; ci++) {
        colorMap.set(sorted[ci], palette[ci % palette.length])
      }
    }

    for (const d of data) {
      let style = this.config.pointStyle ? this.config.pointStyle(d) : { fill: "#4e79a7", opacity: 0.8 }

      // Apply size from accessor if pointStyle doesn't provide it
      let r = style.r || defaultR
      if (sizeScale && this.getSize) {
        const sizeVal = this.getSize(d)
        if (sizeVal != null && !Number.isNaN(sizeVal)) {
          r = sizeScale(sizeVal)
        }
      }

      // Apply color from accessor if pointStyle doesn't provide a custom fill
      if (colorMap && this.getColor) {
        const colorVal = this.getColor(d)
        if (colorVal && colorMap.has(colorVal)) {
          style = { ...style, fill: colorMap.get(colorVal)! }
        }
      }

      const pointId = this.getPointId ? String(this.getPointId(d)) : undefined
      const node = buildPointNode(d, this.scales!, this.getX, this.getY, r, style, pointId)
      if (node) nodes.push(node)
    }

    return nodes
  }

  private buildHeatmapScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    const nodes: SceneNode[] = []

    // Streaming heatmap: 2D grid binning with aggregation
    if (this.config.heatmapAggregation) {
      return this.buildStreamingHeatmapScene(data, layout)
    }

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

  /**
   * Streaming heatmap: discretize continuous x/y into a grid and aggregate.
   */
  private buildStreamingHeatmapScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    const nodes: SceneNode[] = []
    const xBins = this.config.heatmapXBins ?? 20
    const yBins = this.config.heatmapYBins ?? 20
    const agg = this.config.heatmapAggregation ?? "count"
    const getVal = resolveAccessor(this.config.valueAccessor, "value")

    if (!this.scales || data.length === 0) return nodes

    const [xMin, xMax] = this.scales.x.domain() as [number, number]
    const [yMin, yMax] = this.scales.y.domain() as [number, number]
    const xRange = xMax - xMin || 1
    const yRange = yMax - yMin || 1
    const xBinSize = xRange / xBins
    const yBinSize = yRange / yBins

    // Grid cells: [xi][yi] → { sum, count }
    const grid = new Map<string, { sum: number; count: number; data: any[] }>()

    for (const d of data) {
      const xVal = this.getX(d)
      const yVal = this.getY(d)
      const xi = Math.min(Math.floor((xVal - xMin) / xBinSize), xBins - 1)
      const yi = Math.min(Math.floor((yVal - yMin) / yBinSize), yBins - 1)
      if (xi < 0 || yi < 0) continue

      const key = `${xi}_${yi}`
      let cell = grid.get(key)
      if (!cell) {
        cell = { sum: 0, count: 0, data: [] }
        grid.set(key, cell)
      }
      cell.count++
      cell.sum += getVal(d)
      cell.data.push(d)
    }

    // Compute aggregated values and find range
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
      nodes.push(buildHeatcellNode(
        xi * cellW,
        (yBins - 1 - yi) * cellH,
        cellW,
        cellH,
        fill,
        { xi, yi, value: val, count: cell.count, sum: cell.sum, data: cell.data }
      ))
    }

    return nodes
  }

  private buildBarScene(data: Record<string, any>[]): SceneNode[] {
    if (!this.config.binSize) return []

    const bins = computeBins(data, this.getX, this.getY, this.config.binSize, this.getCategory)
    if (bins.size === 0) return []

    // Establish a global category order that is stable across frames.
    // Use barColors keys first (preserves user-specified order), then any
    // additional categories sorted alphabetically.  This prevents flicker
    // when bins partially exit the sliding window and their per-category
    // values shrink/disappear — without a fixed order the Map iteration
    // order shifts and stacked segments jump around.
    let categoryOrder: string[] | null = null
    if (this.getCategory) {
      const allCategories = new Set<string>()
      for (const bin of bins.values()) {
        for (const cat of bin.categories.keys()) {
          allCategories.add(cat)
        }
      }
      const colorKeys = this.config.barColors ? Object.keys(this.config.barColors) : []
      const listed = new Set(colorKeys)
      const unlisted = Array.from(allCategories).filter(c => !listed.has(c)).sort()
      categoryOrder = [...colorKeys.filter(k => allCategories.has(k)), ...unlisted]
    }

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
      const rawWidth = Math.abs(rawX1 - rawX0)
      // When bins are narrow, reduce gap to preserve visibility (min 1px bar)
      const effectiveGap = rawWidth > gap + 1 ? gap : 0
      const x0 = Math.min(rawX0, rawX1) + effectiveGap / 2
      const barWidth = Math.max(rawWidth - effectiveGap, 1)
      if (barWidth <= 0) continue

      if (categoryOrder && bin.categories.size > 0) {
        let cumulativeBase = 0
        for (const cat of categoryOrder) {
          const catVal = bin.categories.get(cat) || 0
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
    const swarm = this.config.swarmStyle || {}
    const radius = swarm.radius ?? 3
    const defaultFill = swarm.fill ?? "#007bff"
    const opacity = swarm.opacity ?? 0.7
    const stroke = swarm.stroke
    const strokeWidth = swarm.strokeWidth

    for (const d of data) {
      const xVal = this.getX(d)
      const yVal = this.getY(d)
      if (yVal == null || Number.isNaN(yVal)) continue

      const x = this.scales!.x(xVal)
      const y = this.scales!.y(yVal)

      let fill = defaultFill
      if (this.getCategory) {
        const cat = this.getCategory(d)
        fill = this.config.barColors?.[cat] || fill
      }

      const node: PointSceneNode = {
        type: "point",
        x, y, r: radius,
        style: { fill, opacity, stroke, strokeWidth },
        datum: d
      }
      if (this.getPointId) node.pointId = String(this.getPointId(d))
      nodes.push(node)
    }

    return nodes
  }

  private buildWaterfallScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    const nodes: SceneNode[] = []
    const scales = this.scales!
    const ws = this.config.waterfallStyle

    // Filter valid data
    const arr = data.filter(d => {
      const v = this.getY(d)
      return v != null && !Number.isNaN(v)
    })
    if (arr.length === 0) return nodes

    const positiveColor = ws?.positiveColor ?? "#28a745"
    const negativeColor = ws?.negativeColor ?? "#dc3545"
    const gap = ws?.gap ?? 1
    const barStroke = ws?.stroke
    const barStrokeWidth = ws?.strokeWidth
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

      const fill = delta >= 0 ? positiveColor : negativeColor
      nodes.push(buildRectNode(
        x0, rectY, barWidth, rectH,
        { fill, stroke: barStroke, strokeWidth: barStrokeWidth },
        { ...d, baseline, cumEnd, delta, _connectorStroke: ws?.connectorStroke, _connectorWidth: ws?.connectorWidth }
      ))

      baseline = cumEnd
    }

    return nodes
  }

  private buildCandlestickScene(data: Record<string, any>[], layout: StreamLayout): SceneNode[] {
    if (!this.getOpen || !this.getHigh || !this.getLow || !this.getClose || !this.scales) return []

    const nodes: SceneNode[] = []
    const cs = this.config.candlestickStyle || {}
    const upColor = cs.upColor || "#28a745"
    const downColor = cs.downColor || "#dc3545"
    const wickColor = cs.wickColor || "#333"
    const wickWidth = cs.wickWidth || 1

    // Compute body width from data spacing
    const sortedX = data
      .map(d => this.getX(d))
      .filter(x => x != null && !Number.isNaN(x))
      .sort((a, b) => a - b)

    let bodyWidth = cs.bodyWidth || 6
    if (!cs.bodyWidth && sortedX.length > 1) {
      // Auto-size: 60% of the minimum gap between adjacent x values
      let minGap = Infinity
      for (let i = 1; i < sortedX.length; i++) {
        const gap = Math.abs(this.scales!.x(sortedX[i]) - this.scales!.x(sortedX[i - 1]))
        if (gap > 0 && gap < minGap) minGap = gap
      }
      if (minGap !== Infinity) {
        bodyWidth = Math.max(2, Math.min(minGap * 0.6, 20))
      }
    }

    for (const d of data) {
      const xVal = this.getX(d)
      if (xVal == null || Number.isNaN(xVal)) continue

      const open = this.getOpen(d)
      const high = this.getHigh(d)
      const low = this.getLow(d)
      const close = this.getClose(d)
      if ([open, high, low, close].some(v => v == null || Number.isNaN(v))) continue

      const isUp = close >= open

      nodes.push({
        type: "candlestick",
        x: this.scales!.x(xVal),
        openY: this.scales!.y(open),
        closeY: this.scales!.y(close),
        highY: this.scales!.y(high),
        lowY: this.scales!.y(low),
        bodyWidth,
        upColor,
        downColor,
        wickColor,
        wickWidth,
        isUp,
        datum: d
      } as CandlestickSceneNode)
    }

    return nodes
  }

  // ── Bounds helpers ───────────────────────────────────────────────────

  private buildBoundsForGroup(data: Record<string, any>[], group: string): AreaSceneNode | null {
    if (!this.getBounds || !this.scales) return null

    const topPath: [number, number][] = []
    const bottomPath: [number, number][] = []

    for (const d of data) {
      const x = this.getX(d)
      const y = this.getY(d)
      if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) continue

      const offset = this.getBounds(d)
      const px = this.scales!.x(x)

      if (!offset || offset === 0) {
        // No bounds at this point — collapse to the line
        const py = this.scales!.y(y)
        topPath.push([px, py])
        bottomPath.push([px, py])
      } else {
        topPath.push([px, this.scales!.y(y + offset)])
        bottomPath.push([px, this.scales!.y(y - offset)])
      }
    }

    if (topPath.length < 2) return null

    return {
      type: "area",
      topPath,
      bottomPath,
      style: this.resolveBoundsStyle(group, data[0]),
      datum: data,
      group,
      interactive: false
    }
  }

  private resolveBoundsStyle(group: string, sampleDatum?: Record<string, any>): Style {
    const bs = this.config.boundsStyle
    if (typeof bs === "function") {
      return bs(sampleDatum || {}, group)
    }
    if (bs && typeof bs === "object") {
      return bs
    }
    // Default: match line color with low opacity
    const lineStyle = this.resolveLineStyle(group, sampleDatum)
    return {
      fill: lineStyle.stroke || "#4e79a7",
      fillOpacity: 0.2,
      stroke: "none"
    }
  }

  // ── Decay ────────────────────────────────────────────────────────────

  /**
   * Compute decay opacity for a datum at `bufferIndex` out of `bufferSize` items.
   * Index 0 = oldest, bufferSize-1 = newest. Returns 0–1.
   */
  computeDecayOpacity(bufferIndex: number, bufferSize: number): number {
    const decay = this.config.decay
    if (!decay || bufferSize <= 1) return 1

    const minOpacity = decay.minOpacity ?? 0.1
    // age: 0 = newest, bufferSize-1 = oldest
    const age = bufferSize - 1 - bufferIndex

    switch (decay.type) {
      case "linear": {
        const t = 1 - age / (bufferSize - 1)
        return minOpacity + t * (1 - minOpacity)
      }
      case "exponential": {
        const halfLife = decay.halfLife ?? bufferSize / 2
        const t = Math.pow(0.5, age / halfLife)
        return minOpacity + t * (1 - minOpacity)
      }
      case "step": {
        const threshold = decay.stepThreshold ?? bufferSize * 0.5
        return age < threshold ? 1 : minOpacity
      }
      default:
        return 1
    }
  }

  /**
   * Apply decay opacity to a list of discrete scene nodes.
   * Uses the datum's index in the buffer data array.
   */
  private applyDecay(nodes: SceneNode[], data: Record<string, any>[]): void {
    if (!this.config.decay) return
    const bufferSize = data.length
    if (bufferSize <= 1) return

    // Build datum→index lookup
    const indexMap = new Map<any, number>()
    for (let i = 0; i < data.length; i++) {
      indexMap.set(data[i], i)
    }

    for (const node of nodes) {
      if (node.type === "line" || node.type === "area") continue
      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const decayOpacity = this.computeDecayOpacity(idx, bufferSize)
      if (node.type === "heatcell") {
        ;(node as any).style = { opacity: decayOpacity }
      } else if (node.type === "candlestick") {
        // Candlestick doesn't have a style object — store opacity for renderer
        ;(node as any)._decayOpacity = decayOpacity
      } else {
        const baseOpacity = node.style?.opacity ?? 1
        node.style = { ...node.style, opacity: baseOpacity * decayOpacity }
      }
    }
  }

  // ── Pulse ───────────────────────────────────────────────────────────

  /**
   * Compute pulse intensity for a datum inserted at `insertTime`.
   * Returns 0–1 (1 = just inserted, 0 = pulse expired).
   */
  private computePulseIntensity(insertTime: number, now: number): number {
    const pulse = this.config.pulse
    if (!pulse) return 0
    const duration = pulse.duration ?? 500
    const age = now - insertTime
    if (age >= duration) return 0
    return 1 - age / duration
  }

  /**
   * Apply pulse glow to discrete scene nodes.
   */
  private applyPulse(nodes: SceneNode[], data: Record<string, any>[]): void {
    if (!this.config.pulse || !this.timestampBuffer) return
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const pulseColor = this.config.pulse.color ?? "rgba(255,255,255,0.6)"
    const glowRadius = this.config.pulse.glowRadius ?? 4

    // Build datum→index lookup
    const indexMap = new Map<any, number>()
    for (let i = 0; i < data.length; i++) {
      indexMap.set(data[i], i)
    }

    for (const node of nodes) {
      if (node.type === "line") continue

      // Area nodes: datum is an array of data points for the group.
      // Pulse the area when any constituent point was recently inserted.
      if (node.type === "area") {
        const datumArr = Array.isArray(node.datum) ? node.datum : [node.datum]
        let bestIntensity = 0
        for (const d of datumArr) {
          const idx = indexMap.get(d)
          if (idx == null) continue
          const insertTime = this.timestampBuffer.get(idx)
          if (insertTime == null) continue
          const intensity = this.computePulseIntensity(insertTime, now)
          if (intensity > bestIntensity) bestIntensity = intensity
        }
        if (bestIntensity > 0) {
          node._pulseIntensity = bestIntensity
          node._pulseColor = pulseColor
        }
        continue
      }

      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const insertTime = this.timestampBuffer.get(idx)
      if (insertTime == null) continue
      const intensity = this.computePulseIntensity(insertTime, now)
      if (intensity > 0) {
        (node as any)._pulseIntensity = intensity
        ;(node as any)._pulseColor = pulseColor
        ;(node as any)._pulseGlowRadius = glowRadius
      }
    }
  }

  /**
   * Returns true if there are active pulse animations that need continuous rendering.
   */
  get hasActivePulses(): boolean {
    if (!this.config.pulse || !this.timestampBuffer || this.timestampBuffer.size === 0) return false
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const duration = this.config.pulse.duration ?? 500
    const newest = this.timestampBuffer.peek()
    return newest != null && (now - newest) < duration
  }

  // ── Transitions ─────────────────────────────────────────────────────

  /**
   * Snapshot current scene node positions before rebuild.
   */
  private snapshotPositions(): void {
    this.prevPositionMap.clear()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeIdentity(node, i)
      if (!key) continue
      if (node.type === "point") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, r: node.r })
      } else if (node.type === "rect") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h })
      } else if (node.type === "heatcell") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h })
      } else if (node.type === "candlestick") {
        this.prevPositionMap.set(key, { x: node.x, y: node.openY })
      }
    }
  }

  /**
   * Get a stable identity key for a scene node.
   */
  private getNodeIdentity(node: SceneNode, index: number): string | null {
    switch (node.type) {
      case "point":
        return `p:${node.datum === undefined ? index : this.getX(node.datum)}_${this.getY(node.datum)}`
      case "rect":
        return `r:${node.group || ""}:${node.datum?.binStart ?? node.datum?.category ?? index}`
      case "heatcell":
        return `h:${node.x}_${node.y}`
      case "candlestick":
        return `c:${this.getX(node.datum)}`
      default:
        return null
    }
  }

  /**
   * After scene rebuild, set up transition from old to new positions.
   */
  private startTransition(): void {
    if (!this.config.transition || this.prevPositionMap.size === 0) return
    const duration = this.config.transition.duration ?? 300

    let hasChanges = false
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeIdentity(node, i)
      if (!key) continue
      const prev = this.prevPositionMap.get(key)
      if (!prev) continue

      // Store target positions and restore previous for animation start
      if (node.type === "point") {
        const target = { x: node.x, y: node.y, r: node.r }
        if (prev.x !== target.x || prev.y !== target.y) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetR = target.r
          node.x = prev.x
          node.y = prev.y
          node.r = prev.r ?? node.r
          hasChanges = true
        }
      } else if (node.type === "rect") {
        const target = { x: node.x, y: node.y, w: node.w, h: node.h }
        if (prev.x !== target.x || prev.y !== target.y || prev.w !== target.w || prev.h !== target.h) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetW = target.w
          node._targetH = target.h
          node.x = prev.x
          node.y = prev.y
          node.w = prev.w ?? node.w
          node.h = prev.h ?? node.h
          hasChanges = true
        }
      } else if (node.type === "heatcell") {
        const target = { x: node.x, y: node.y, w: node.w, h: node.h }
        if (prev.x !== target.x || prev.y !== target.y) {
          node._targetX = target.x
          node._targetY = target.y
          node._targetW = target.w
          node._targetH = target.h
          node.x = prev.x
          node.y = prev.y
          node.w = prev.w ?? node.w
          node.h = prev.h ?? node.h
          hasChanges = true
        }
      }
    }

    if (hasChanges) {
      this.activeTransition = {
        startTime: typeof performance !== "undefined" ? performance.now() : Date.now(),
        duration
      }
    }
  }

  /**
   * Advance the transition animation. Returns true if still animating.
   */
  advanceTransition(now: number): boolean {
    if (!this.activeTransition) return false

    const elapsed = now - this.activeTransition.startTime
    const rawT = Math.min(elapsed / this.activeTransition.duration, 1)
    // Ease-out cubic (or linear)
    const t = this.config.transition?.easing === "linear"
      ? rawT
      : 1 - Math.pow(1 - rawT, 3)

    for (const node of this.scene) {
      if (node.type === "point") {
        if (node._targetX === undefined) continue
        const key = this.getNodeIdentity(node, 0)
        if (!key) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = prev.x + (node._targetX - prev.x) * t
        node.y = prev.y + (node._targetY! - prev.y) * t
        if (node._targetR !== undefined && prev.r !== undefined) {
          node.r = prev.r + (node._targetR - prev.r) * t
        }
      } else if (node.type === "rect") {
        if (node._targetX === undefined) continue
        const key = this.getNodeIdentity(node, 0)
        if (!key) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = prev.x + (node._targetX - prev.x) * t
        node.y = prev.y + (node._targetY! - prev.y) * t
        if (prev.w !== undefined) node.w = prev.w + (node._targetW! - prev.w) * t
        if (prev.h !== undefined) node.h = prev.h + (node._targetH! - prev.h) * t
      } else if (node.type === "heatcell") {
        if (node._targetX === undefined) continue
        const key = this.getNodeIdentity(node, 0)
        if (!key) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = prev.x + (node._targetX - prev.x) * t
        node.y = prev.y + (node._targetY! - prev.y) * t
        if (prev.w !== undefined) node.w = prev.w + (node._targetW! - prev.w) * t
        if (prev.h !== undefined) node.h = prev.h + (node._targetH! - prev.h) * t
      }
    }

    if (rawT >= 1) {
      // Snap to targets and clear transition
      for (const node of this.scene) {
        if (node.type === "point") {
          if (node._targetX === undefined) continue
          node.x = node._targetX
          node.y = node._targetY!
          if (node._targetR !== undefined) node.r = node._targetR
          node._targetX = undefined
          node._targetY = undefined
          node._targetR = undefined
        } else if (node.type === "rect") {
          if (node._targetX === undefined) continue
          node.x = node._targetX
          node.y = node._targetY!
          node.w = node._targetW!
          node.h = node._targetH!
          node._targetX = undefined
          node._targetY = undefined
          node._targetW = undefined
          node._targetH = undefined
        } else if (node.type === "heatcell") {
          if (node._targetX === undefined) continue
          node.x = node._targetX
          node.y = node._targetY!
          node.w = node._targetW!
          node.h = node._targetH!
          node._targetX = undefined
          node._targetY = undefined
          node._targetW = undefined
          node._targetH = undefined
        }
      }
      this.activeTransition = null
      return false
    }

    return true
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
        strokeDasharray: ls.strokeDasharray,
        fill: ls.fill,
        fillOpacity: ls.fillOpacity,
        opacity: ls.opacity
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
    if (this.timestampBuffer) this.timestampBuffer.clear()
    this.prevPositionMap.clear()
    this.activeTransition = null
    this.lastIngestTime = 0
    this.needsFullRebuild = true
    this.lastLayout = null
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
    this.needsFullRebuild = true
  }
}
