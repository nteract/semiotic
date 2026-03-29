/**
 * PipelineStore — stateful pipeline for XY/streaming chart data.
 *
 * Owns: data ingestion (RingBuffer), extent tracking, scale computation,
 * scene layout delegation (via xySceneBuilders/), transition animation,
 * decay/pulse/staleness encoding, and quadtree spatial indexing.
 *
 * Scene building was extracted to xySceneBuilders/ — this store constructs
 * an XYSceneContext and dispatches to the appropriate builder function.
 *
 * Key dependencies:
 *   xySceneBuilders/ — per-chartType scene layout (line, area, point, etc.)
 *   SceneGraph        — node constructors (buildLineNode, buildPointNode, etc.)
 *   RingBuffer         — sliding window data storage
 *   IncrementalExtent  — O(1) min/max tracking
 *
 * Consumed by: StreamXYFrame (sole consumer).
 */
import { scaleLinear, scaleLog, type ScaleLinear } from "d3-scale"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import { computeBinExtent } from "../realtime/BinAccumulator"
import { computeWaterfallExtent } from "../realtime/renderers/waterfallRenderer"
import type {
  Changeset,
  StreamChartType,
  StreamScales,
  StreamLayout,
  SceneNode,
  PointSceneNode,
  CandlestickStyle,
  Style,
  ArrowOfTime,
  WindowMode,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  CurveType
} from "./types"
import { resolveAccessor, resolveStringAccessor, accessorsEquivalent } from "./accessorUtils"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import { computeDecayOpacity as computeDecayOpacityFn, applyDecay as applyDecayFn } from "./pipelineDecay"
import { applyPulse as applyPulseFn, hasActivePulses as hasActivePulsesFn } from "./pipelinePulse"
import {
  snapshotPositions as snapshotPositionsFn,
  startTransition as startTransitionFn,
  advanceTransition as advanceTransitionFn,
  type PrevPosition,
  type PrevPath,
  type TransitionContext
} from "./pipelineTransitions"
import type { XYSceneContext } from "./xySceneBuilders/types"
import { buildLineScene } from "./xySceneBuilders/lineScene"
import { buildAreaScene, buildStackedAreaScene } from "./xySceneBuilders/areaScene"
import { buildPointScene } from "./xySceneBuilders/pointScene"
import { buildHeatmapScene } from "./xySceneBuilders/heatmapScene"
import { buildBarScene } from "./xySceneBuilders/barScene"
import { buildSwarmScene } from "./xySceneBuilders/swarmScene"
import { buildWaterfallScene } from "./xySceneBuilders/waterfallScene"
import { buildCandlestickScene } from "./xySceneBuilders/candlestickScene"

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
  maxCapacity?: number

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

  // Scale types
  xScaleType?: "linear" | "log"
  yScaleType?: "linear" | "log"

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

  // Heatmap value labels
  showValues?: boolean
  heatmapValueFormat?: (v: number) => string

  // Point identification (for point-anchored annotations)
  pointIdAccessor?: string | ((d: any) => string)

  // Curve interpolation for line/area charts
  curve?: CurveType
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
  activeTransition: ActiveTransition | null = null
  private prevPositionMap = new Map<string, PrevPosition>()
  /** Previous line/area path arrays for path interpolation */
  private prevPathMap = new Map<string, PrevPath>()
  /** Exit nodes awaiting fade-out removal */
  exitNodes: SceneNode[] = []

  // ── Staleness tracking ──────────────────────────────────────────────
  lastIngestTime = 0

  // ── Color map caching ──────────────────────────────────────────────
  /** Unified color map cache keyed by sorted category set — shared across point, swarm, etc. */
  private _colorMapCache: { key: string; map: Map<string, string> } | null = null
  /** Separate group→color map for resolveGroupColor (insertion-order based, never invalidates _colorMapCache) */
  private _groupColorMap: Map<string, string> = new Map()
  private _barCategoryCache: { key: string; order: string[] } | null = null
  /** Sorted bin boundary values from the last bar scene build (for data-driven brush snapping) */
  private _binBoundaries: number[] = []

  // ── Stacked area extent caching ───────────────────────────────────
  /** Cache stacked area cumulative sums to skip recalculation when buffer hasn't changed */
  private _stackExtentCache: { key: string; yDomain: [number, number] } | null = null
  /** Monotonic counter incremented on each ingest — used as part of cache keys */
  private _ingestVersion = 0

  // ── Buffer array caching ────────────────────────────────────────────
  /** Cached materialized array from buffer.toArray() — only rebuilt when buffer changes */
  private _bufferArrayCache: Record<string, any>[] | null = null
  /** True when the buffer has been mutated since last toArray() call */
  private _bufferDirty = true

  // ── Resize optimization──────────────────────────────────────────────
  private needsFullRebuild = true
  private lastLayout: StreamLayout | null = null

  scales: StreamScales | null = null
  scene: SceneNode[] = []
  version = 0

  /** True when the x accessor returns Date objects (auto-detected on first data ingestion) */
  xIsDate = false

  // ── Quadtree spatial index for O(log n) point hit testing ──────────
  private _quadtree: Quadtree<PointSceneNode> | null = null
  private static readonly QUADTREE_THRESHOLD = 500

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
    this._bufferDirty = true
    this._ingestVersion++

    if (changeset.bounded) {
      // Full replacement for bounded data
      this.buffer.clear()
      this.xExtent.clear()
      this.yExtent.clear()
      if (this.timestampBuffer) this.timestampBuffer.clear()

      // Auto-detect Date x values on bounded ingestion.
      // Reset getX to the default resolved accessor first, so a previous
      // date-parsing override doesn't persist if data changes to non-date.
      const isStreaming = ["bar", "swarm", "waterfall"].includes(this.config.chartType)
        || this.config.runtimeMode === "streaming"
      this.getX = isStreaming
        ? resolveAccessor(this.config.timeAccessor || this.config.xAccessor, "time")
        : resolveAccessor(this.config.xAccessor, "x")
      this.xIsDate = false
      if (changeset.inserts.length > 0) {
        const sample = changeset.inserts[0]
        const rawAccessor = this.config.xAccessor
        const rawVal = typeof rawAccessor === "function"
          ? rawAccessor(sample)
          : (sample as any)[rawAccessor || "x"]

        const isDateObj = rawVal instanceof Date
        const isDateStr = typeof rawVal === "string"
          && rawVal.length >= 10
          && !isNaN(new Date(rawVal).getTime())
          && isNaN(Number(rawVal))

        this.xIsDate = isDateObj || isDateStr

        // resolveAccessor wraps with unary + which converts Date objects to
        // epoch ms correctly, but date strings like "2003-01-06" become NaN.
        // Swap getX to a date-parsing accessor when date strings are detected.
        if (isDateStr) {
          const key = typeof rawAccessor === "string" ? rawAccessor : undefined
          this.getX = key
            ? (d: any) => +new Date(d[key])
            : (d: any) => +((rawAccessor as (d: any) => any)(d) instanceof Date
                ? (rawAccessor as (d: any) => any)(d)
                : new Date((rawAccessor as (d: any) => any)(d)))
        }
      }

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
          const maxCap = this.config.maxCapacity || 1_000_000
          if (this.growingCap < maxCap) {
            this.growingCap = Math.min(this.growingCap * 2, maxCap)
            this.buffer.resize(this.growingCap)
            if (this.timestampBuffer) this.timestampBuffer.resize(this.growingCap)
          }
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

    // Materialize buffer once for all downstream consumers (cached when unchanged)
    const bufferArray = this.getBufferArray()

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
        // Cache the stacked extent computation — only rebuild when buffer data changes
        const stackCacheKey = `${buffer.size}:${this._ingestVersion}`
        if (this._stackExtentCache && this._stackExtentCache.key === stackCacheKey) {
          yDomain = this._stackExtentCache.yDomain
        } else {
          const groups = this.groupData(bufferArray)

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
          this._stackExtentCache = { key: stackCacheKey, yDomain }
        }
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
        for (const d of bufferArray) {
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
      // For log scales, ensure domain minimum stays positive (log(0) is undefined).
      // Use multiplicative padding instead of additive to avoid negative domains.
      if (config.yScaleType === "log" && yDomain[0] <= 0 && dataYDomain[0] > 0) {
        const logPad = 1 + config.extentPadding
        yDomain[0] = userMin != null ? yDomain[0] : dataYDomain[0] / logPad
      }
    }

    // Handle degenerate extents
    if (xDomain[0] === Infinity || xDomain[1] === -Infinity) xDomain = [0, 1]
    if (yDomain[0] === Infinity || yDomain[1] === -Infinity) yDomain = [0, 1]

    // Build scales
    // For streaming charts, use time/value axes based on arrowOfTime
    const isStreaming = config.runtimeMode === "streaming"
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
      const makeScale = (type: "linear" | "log" | undefined, domain: [number, number], range: [number, number]) => {
        if (type === "log") {
          // Log scales cannot include 0; clamp minimum to a small positive value
          const safeDomain: [number, number] = [Math.max(domain[0], 1e-6), Math.max(domain[1], 1e-6)]
          return scaleLog().domain(safeDomain).range(range).clamp(true) as unknown as ScaleLinear<number, number>
        }
        return scaleLinear().domain(domain).range(range)
      }
      this.scales = {
        x: makeScale(config.xScaleType, xDomain, [0, layout.width]),
        y: makeScale(config.yScaleType, yDomain, [layout.height, 0])
      }
    }

    // Snapshot positions for transition animation (before rebuild)
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }

    // Build scene graph based on chart type
    this.scene = this.buildSceneNodes(layout, bufferArray)

    // Apply decay opacity to discrete nodes
    if (this.config.decay) {
      this.applyDecay(this.scene, bufferArray)
    }

    // Apply pulse glow to discrete nodes
    if (this.config.pulse) {
      this.applyPulse(this.scene, bufferArray)
    }

    // Start transition animation from old to new positions
    if (this.config.transition && (this.prevPositionMap.size > 0 || this.prevPathMap.size > 0)) {
      this.startTransition()
    }

    // Build quadtree spatial index for scatter/bubble with many points
    this.rebuildQuadtree()

    this.needsFullRebuild = false
    this.lastLayout = { width: layout.width, height: layout.height }
    this.version++
  }

  /**
   * Build or clear the quadtree spatial index for point scene nodes.
   * Only built for scatter/bubble charts with >QUADTREE_THRESHOLD points.
   */
  private rebuildQuadtree(): void {
    const ct = this.config.chartType
    if (ct !== "scatter" && ct !== "bubble") {
      this._quadtree = null
      return
    }

    const pointNodes = this.scene.filter(
      (n): n is PointSceneNode => n.type === "point"
    )

    if (pointNodes.length <= PipelineStore.QUADTREE_THRESHOLD) {
      this._quadtree = null
      return
    }

    this._quadtree = d3Quadtree<PointSceneNode>()
      .x(n => n.x)
      .y(n => n.y)
      .addAll(pointNodes)
  }

  /**
   * Get the quadtree spatial index, if available.
   * Returns null when chart type is not scatter/bubble or point count is below threshold.
   */
  get quadtree(): Quadtree<PointSceneNode> | null {
    return this._quadtree
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

    // Rebuild scales with new pixel ranges (same data domain), preserving scale type
    const xDomain = this.scales!.x.domain() as [number, number]
    const yDomain = this.scales!.y.domain() as [number, number]
    const oldXRange = this.scales!.x.range() as [number, number]
    const oldYRange = this.scales!.y.range() as [number, number]
    const remapScale = (type: "linear" | "log" | undefined, domain: [number, number], range: [number, number]) => {
      if (type === "log") {
        const safeDomain: [number, number] = [Math.max(domain[0], 1e-6), Math.max(domain[1], 1e-6)]
        return scaleLog().domain(safeDomain).range(range).clamp(true) as unknown as ScaleLinear<number, number>
      }
      return scaleLinear().domain(domain).range(range)
    }
    this.scales = {
      x: remapScale(this.config.xScaleType, xDomain, [
        oldXRange[0] * wRatio, oldXRange[1] * wRatio
      ]),
      y: remapScale(this.config.yScaleType, yDomain, [
        oldYRange[0] * hRatio, oldYRange[1] * hRatio
      ])
    }

    this.lastLayout = { width: layout.width, height: layout.height }

    // Rebuild quadtree with remapped coordinates
    this.rebuildQuadtree()

    this.version++
  }

  private buildSceneNodes(layout: StreamLayout, data: Record<string, any>[]): SceneNode[] {
    const { config, scales } = this
    if (!scales || data.length === 0) return []

    const ctx: XYSceneContext = {
      scales,
      config,
      getX: this.getX,
      getY: this.getY,
      getY0: this.getY0,
      getSize: this.getSize,
      getColor: this.getColor,
      getGroup: this.getGroup,
      getCategory: this.getCategory,
      getPointId: this.getPointId,
      getBounds: this.getBounds,
      getOpen: this.getOpen,
      getHigh: this.getHigh,
      getLow: this.getLow,
      getClose: this.getClose,
      resolveLineStyle: (g, d) => this.resolveLineStyle(g, d),
      resolveAreaStyle: (g, d) => this.resolveAreaStyle(g, d),
      resolveBoundsStyle: (g, d) => this.resolveBoundsStyle(g, d),
      resolveColorMap: (d) => this.resolveColorMap(d),
      resolveGroupColor: (g) => this.resolveGroupColor(g),
      groupData: (d) => this.groupData(d),
      barCategoryCache: this._barCategoryCache,
    }

    switch (config.chartType) {
      case "line":
        return buildLineScene(ctx, data)
      case "area":
        return buildAreaScene(ctx, data)
      case "stackedarea":
        return buildStackedAreaScene(ctx, data)
      case "scatter":
      case "bubble":
        return buildPointScene(ctx, data)
      case "heatmap":
        return buildHeatmapScene(ctx, data, layout)
      case "bar": {
        const barResult = buildBarScene(ctx, data)
        this._barCategoryCache = ctx.barCategoryCache ?? null
        this._binBoundaries = barResult.binBoundaries
        return barResult.nodes
      }
      case "swarm":
        return buildSwarmScene(ctx, data)
      case "waterfall":
        return buildWaterfallScene(ctx, data, layout)
      case "candlestick":
        return buildCandlestickScene(ctx, data, layout)
      default:
        return []
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

  // ── Decay (delegated to pipelineDecay.ts) ───────────────────────────

  computeDecayOpacity(bufferIndex: number, bufferSize: number): number {
    const decay = this.config.decay
    if (!decay || bufferSize <= 1) return 1
    return computeDecayOpacityFn(decay, bufferIndex, bufferSize)
  }

  private applyDecay(nodes: SceneNode[], data: Record<string, any>[]): void {
    if (!this.config.decay) return
    applyDecayFn(this.config.decay, nodes, data)
  }

  // ── Pulse (delegated to pipelinePulse.ts) ──────────────────────────

  private applyPulse(nodes: SceneNode[], data: Record<string, any>[]): void {
    if (!this.config.pulse || !this.timestampBuffer) return
    applyPulseFn(this.config.pulse, nodes, data, this.timestampBuffer)
  }

  get hasActivePulses(): boolean {
    if (!this.config.pulse) return false
    return hasActivePulsesFn(this.config.pulse, this.timestampBuffer)
  }

  // ── Transitions (delegated to pipelineTransitions.ts) ──────────────

  private get transitionContext(): TransitionContext {
    return {
      runtimeMode: this.config.runtimeMode,
      getX: this.getX,
      getY: this.getY,
      getCategory: this.getCategory
    }
  }

  private snapshotPositions(): void {
    snapshotPositionsFn(this.transitionContext, this.scene, this.prevPositionMap, this.prevPathMap)
  }

  private startTransition(): void {
    if (!this.config.transition) return
    const state = startTransitionFn(
      this.transitionContext, this.config.transition,
      { scene: this.scene, exitNodes: this.exitNodes, activeTransition: this.activeTransition },
      this.prevPositionMap, this.prevPathMap
    )
    this.scene = state.scene
    this.exitNodes = state.exitNodes
    this.activeTransition = state.activeTransition
  }

  advanceTransition(now: number): boolean {
    if (!this.activeTransition || !this.config.transition) return false
    const state = { scene: this.scene, exitNodes: this.exitNodes, activeTransition: this.activeTransition }
    const animating = advanceTransitionFn(now, this.config.transition, state, this.prevPositionMap, this.prevPathMap)
    this.scene = state.scene
    this.exitNodes = state.exitNodes
    this.activeTransition = state.activeTransition
    return animating
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

  /**
   * Resolve a category→color map from data using the colorAccessor.
   * Caches the result in _colorMapCache keyed by sorted category set —
   * only rebuilds when the set of categories changes.
   */
  private resolveColorMap(data: Record<string, any>[]): Map<string, string> {
    const categories = new Set<string>()
    for (const d of data) {
      const c = this.getColor!(d)
      if (c) categories.add(c)
    }
    const sorted = Array.from(categories).sort()
    const cacheKey = sorted.join('\0')

    if (this._colorMapCache && this._colorMapCache.key === cacheKey) {
      return this._colorMapCache.map
    }

    const palette = Array.isArray(this.config.colorScheme)
      ? this.config.colorScheme
      : STREAMING_PALETTE
    const colorMap = new Map<string, string>()
    for (let ci = 0; ci < sorted.length; ci++) {
      colorMap.set(sorted[ci], palette[ci % palette.length])
    }
    this._colorMapCache = { key: cacheKey, map: colorMap }
    return colorMap
  }

  private resolveLineStyle(group: string, sampleDatum?: Record<string, any>): Style {
    const ls = this.config.lineStyle
    if (typeof ls === "function") {
      const style = ls(sampleDatum || {}, group)
      // When HOC returns no stroke (push API, colorScale unavailable),
      // fill in from the frame's palette. Use group name for color assignment
      // even when colorAccessor is not set (e.g. StackedAreaChart streaming).
      if (style && !style.stroke && group) {
        const color = this.resolveGroupColor(group)
        if (color) return { ...style, stroke: color }
      }
      return style
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
      const style = this.config.areaStyle(sampleDatum || {})
      // Fill in colors from frame's palette when HOC has no color scale (push API).
      // Use group name for assignment even without colorAccessor.
      if (style && !style.fill && group) {
        const color = this.resolveGroupColor(group)
        if (color) return { ...style, fill: color, stroke: style.stroke || color }
      }
      return style
    }
    // Fall back to lineStyle — AreaChart passes area styling via lineStyle
    const ls = this.config.lineStyle
    if (typeof ls === "function") {
      const style = ls(sampleDatum || {}, group)
      if (style && !style.fill && group) {
        const color = this.resolveGroupColor(group)
        if (color) return { ...style, fill: color, stroke: style.stroke || color }
      }
      return style
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

  /** Resolve a group name to a color from the cached color map or a dedicated group palette.
   *  First checks _colorMapCache (populated by resolveColorMap when colorAccessor is set).
   *  Falls back to _groupColorMap (insertion-order, never mutates _colorMapCache). */
  private resolveGroupColor(group: string): string | null {
    // Prefer the accessor-based color map when available
    if (this._colorMapCache) {
      const c = this._colorMapCache.map.get(group)
      if (c) return c
    }
    // Fall back to dedicated group color map (does not pollute _colorMapCache)
    const existing = this._groupColorMap.get(group)
    if (existing) return existing

    const palette = Array.isArray(this.config.colorScheme)
      ? this.config.colorScheme
      : STREAMING_PALETTE
    const color = palette[this._groupColorMap.size % palette.length]
    this._groupColorMap.set(group, color)
    return color
  }

  // ── Buffer array cache ──────────────────────────────────────────────

  /**
   * Return a cached materialized array of the buffer contents.
   * Only calls buffer.toArray() when the buffer has actually changed
   * (new push, resize, or clear), avoiding per-frame allocation on
   * transition ticks, hover redraws, and other non-data-changing renders.
   */
  private getBufferArray(): Record<string, any>[] {
    if (this._bufferDirty || !this._bufferArrayCache) {
      this._bufferArrayCache = this.buffer.toArray()
      this._bufferDirty = false
    }
    return this._bufferArrayCache
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Record<string, any>[] {
    return this.getBufferArray()
  }

  /** Returns sorted bin boundary values from the current bar scene (empty for non-bar chart types) */
  getBinBoundaries(): number[] {
    return this._binBoundaries
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
    this.prevPathMap.clear()
    this.exitNodes = []
    this.activeTransition = null
    this.lastIngestTime = 0

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._bufferArrayCache = null
    this.lastLayout = null
    this.scales = null
    this.scene = []
    this._quadtree = null
    this._colorMapCache = null
    this._groupColorMap = new Map()
    this._barCategoryCache = null
    this._binBoundaries = []
    this._stackExtentCache = null
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
    const prev = { ...this.config }

    // Invalidate color map caches when relevant config changes
    if (config.colorScheme !== undefined) {
      this._colorMapCache = null
      this._groupColorMap = new Map()
    }
    if (config.barColors !== undefined || config.colorScheme !== undefined) {
      this._barCategoryCache = null
    }
    // Invalidate stacked area extent cache on config changes that affect stacking
    if (config.normalize !== undefined || config.extentPadding !== undefined
      || config.xAccessor !== undefined || config.yAccessor !== undefined
      || config.groupAccessor !== undefined || config.categoryAccessor !== undefined
      || config.chartType !== undefined) {
      this._stackExtentCache = null
    }

    // Track whether any accessor actually changed (not just new function identity)
    let accessorChanged = false

    Object.assign(this.config, config)

    // Re-resolve accessor functions only when the accessor source actually changed.
    // Uses .toString() comparison to detect inline arrow functions that are
    // recreated on every parent render but have identical source code.
    // Re-resolve getX/getY when accessor props change, OR when chartType/runtimeMode
    // changes (which changes which fallback defaults apply: x/y vs time/value).
    const modeChanged = ("chartType" in config && config.chartType !== prev.chartType)
      || ("runtimeMode" in config && config.runtimeMode !== prev.runtimeMode)
    if (modeChanged
      || config.xAccessor !== undefined || config.yAccessor !== undefined
      || config.timeAccessor !== undefined || config.valueAccessor !== undefined) {
      const xChanged = modeChanged || !accessorsEquivalent(config.xAccessor ?? config.timeAccessor, prev.xAccessor ?? prev.timeAccessor)
      const yChanged = modeChanged || !accessorsEquivalent(config.yAccessor ?? config.valueAccessor, prev.yAccessor ?? prev.valueAccessor)
      if (xChanged || yChanged) {
        const isStreamingType = ["bar", "swarm", "waterfall"].includes(this.config.chartType)
        const useStreamingDefaults = isStreamingType || this.config.runtimeMode === "streaming"
        if (useStreamingDefaults) {
          this.getX = resolveAccessor(this.config.timeAccessor || this.config.xAccessor, "time")
          this.getY = resolveAccessor(this.config.valueAccessor || this.config.yAccessor, "value")
        } else {
          this.getX = resolveAccessor(this.config.xAccessor, "x")
          this.getY = resolveAccessor(this.config.yAccessor, "y")
        }
        accessorChanged = true
      }
    }
    if ("groupAccessor" in config && !accessorsEquivalent(config.groupAccessor, prev.groupAccessor)) {
      this.getGroup = this.config.groupAccessor != null ? resolveStringAccessor(this.config.groupAccessor) : undefined
      accessorChanged = true
    }
    if ("categoryAccessor" in config && !accessorsEquivalent(config.categoryAccessor, prev.categoryAccessor)) {
      this.getCategory = this.config.categoryAccessor != null ? resolveStringAccessor(this.config.categoryAccessor) : undefined
      accessorChanged = true
    }
    if ("sizeAccessor" in config && !accessorsEquivalent(config.sizeAccessor, prev.sizeAccessor)) {
      this.getSize = this.config.sizeAccessor
        ? resolveAccessor(this.config.sizeAccessor, "size")
        : undefined
      accessorChanged = true
    }
    if ("colorAccessor" in config && !accessorsEquivalent(config.colorAccessor, prev.colorAccessor)) {
      this.getColor = this.config.colorAccessor != null ? resolveStringAccessor(this.config.colorAccessor) : undefined
      accessorChanged = true
    }
    if ("y0Accessor" in config && !accessorsEquivalent(config.y0Accessor, prev.y0Accessor)) {
      this.getY0 = this.config.y0Accessor
        ? resolveAccessor(this.config.y0Accessor, "y0")
        : undefined
      accessorChanged = true
    }
    if ("pointIdAccessor" in config && !accessorsEquivalent(config.pointIdAccessor, prev.pointIdAccessor)) {
      this.getPointId = this.config.pointIdAccessor != null ? resolveStringAccessor(this.config.pointIdAccessor) : undefined
      accessorChanged = true
    }

    // Only mark full rebuild needed if non-accessor config actually changed or accessors changed.
    // Compare values (not just key presence) because updateConfig receives the full config object
    // on every React render, so all keys are always present.
    if (!accessorChanged) {
      const nonAccessorKeys = Object.keys(config).filter(k => !k.endsWith("Accessor") && k !== "timeAccessor" && k !== "valueAccessor")
      for (const k of nonAccessorKeys) {
        if ((config as any)[k] !== (prev as any)[k]) {
          accessorChanged = true
          break
        }
      }
    }
    if (accessorChanged) {
      this.needsFullRebuild = true
    }
  }
}
