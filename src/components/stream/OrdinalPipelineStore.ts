import type { Datum } from "../charts/shared/datumTypes"
/**
 * OrdinalPipelineStore — stateful pipeline for ordinal chart data.
 *
 * Owns: data ingestion (RingBuffer), scale computation (o-band + r-linear),
 * value domain logic (per-lane sums for swimlane, zero-inclusion for bars),
 * and scene layout delegation to ordinalSceneBuilders/*.
 *
 * Key design decisions:
 *   - Swimlane domain uses per-lane sums, not individual values, because
 *     stacked bars within a lane must fit within the lane's total range.
 *   - Zero-inclusion for bar/swimlane is skipped when explicit rExtent is
 *     set (either end non-null), enabling zoom/brush without domain override.
 *   - Scene builders are pure functions; this store coordinates them.
 *
 * Consumed by: StreamOrdinalFrame (sole consumer).
 */
import { scaleBand, scaleLinear, type ScaleBand, type ScaleLinear } from "d3-scale"
import type { Quadtree } from "d3-quadtree"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import type {
  OrdinalPipelineConfig,
  OrdinalScales,
  OrdinalSceneNode,
  OrdinalColumn,
  OrdinalLayout,
  WedgeSceneNode
} from "./ordinalTypes"
import type { Changeset, Style, PointSceneNode } from "./types"
import { buildDatumIndexMap, computeDecayOpacity } from "./pipelineDecay"
import { hasActivePulses as hasActivePulsesShared } from "./pipelinePulse"
import { applyOrdinalPulse } from "./ordinalPulse"
import { computeEasing, computeRawProgress, lerp, now as getTimestamp } from "./pipelineTransitionUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import { resolveAccessor, resolveStringAccessor, accessorsEquivalent } from "./accessorUtils"
import { toIdSet } from "./pipelineIdentityOps"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import { buildConnectors } from "./ordinalSceneBuilders/connectorScene"
import type { OrdinalSceneContext } from "./ordinalSceneBuilders/types"
import { ORDINAL_SCENE_BUILDERS as SCENE_BUILDERS } from "./ordinalSceneBuilders/sceneBuilderMap"
import {
  buildOrdinalColumns,
  computeOrdinalValueDomain
} from "./ordinalDomain"
import type { OrdinalLayoutContext, OrdinalLayoutResult } from "./ordinalCustomLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { resolveCustomLayoutPalette, buildResolveColor } from "./customLayoutPalette"
import { warnCustomLayoutDiagnostics } from "./customLayoutDiagnostics"
import {
  createCustomLayoutFailureDiagnostic,
  type CustomLayoutFailureDiagnostic
} from "./customLayoutFailure"
import type { MarginType } from "../types/marginType"
import {
  compactTimestampBufferForRemoval,
  ensureRingBufferCapacity,
  pushWithTimestamp
} from "./pipelineBufferUtils"
import type { UpdateResult } from "./pipelineUpdateContract"
import { buildOrdinalCategoryIndex } from "./ordinalDataIndex"
import { OrdinalPipelineUpdateResults } from "./ordinalPipelineUpdateResults"
import { syncOrdinalPulseTimestampBuffer } from "./ordinalPulseResources"
import { buildOrdinalPointSpatialIndex } from "./ordinalSpatialIndex"
// ── OrdinalPipelineStore ───────────────────────────────────────────────

export class OrdinalPipelineStore {
  private buffer: RingBuffer<Datum>
  private rExtent = new IncrementalExtent()
  /** Per-accessor extents for multiAxis mode */
  private rExtents: IncrementalExtent[] = []
  private config: OrdinalPipelineConfig
  private windowSizeWarned = false
  private updateResults = new OrdinalPipelineUpdateResults()

  private getO: (d: Datum) => string
  private getR: (d: Datum) => number
  /** All resolved rAccessors (length > 1 when multiAxis) */
  private rAccessors: ((d: Datum) => number)[] = []
  private getStack: ((d: Datum) => string) | undefined
  private getGroup: ((d: Datum) => string) | undefined
  private getColor: ((d: Datum) => string) | undefined
  private getSymbol: ((d: Datum) => string) | undefined
  private getConnector: ((d: Datum) => string) | undefined
  private getDataId: ((d: Datum) => string) | undefined

  /** Discovered categories in insertion order */
  private categories = new Set<string>()
  /** True once a non-bounded (push) changeset has been ingested */
  private _hasStreamingData = false
  /** Lazy color map built from colorScheme for resolvePieceStyle */
  private _colorSchemeMap: Map<string, string> | null = null
  private _colorSchemeIndex = 0

  // ── Pulse tracking ──────────────────────────────────────────────────
  private timestampBuffer: RingBuffer<number> | null = null

  // ── Transition animation ────────────────────────────────────────────
  activeTransition: ActiveTransition | null = null
  private prevPositionMap = new Map<string, { x: number; y: number; w?: number; h?: number; r?: number; startAngle?: number; endAngle?: number; innerRadius?: number; outerRadius?: number; opacity?: number }>()
  /** Exit nodes awaiting fade-out removal */
  exitNodes: import("./ordinalTypes").OrdinalSceneNode[] = []

  // ── Staleness tracking ──────────────────────────────────────────────
  lastIngestTime = 0

  scales: OrdinalScales | null = null
  /** Per-accessor scales for multiAxis */
  multiScales: (ScaleLinear<number, number>)[] = []
  scene: OrdinalSceneNode[] = []
  columns: Record<string, OrdinalColumn> = {}
  /** Overlays returned from customLayout (consumed by StreamOrdinalFrame). */
  customLayoutOverlays: import("react").ReactNode = null
  /** Most recent custom layout result for host readback (`getCustomLayout()`).
   *  Null before the first layout or without a custom layout. A failed rerun
   *  keeps the last successful result while its scene remains recoverable. */
  lastCustomLayoutResult: OrdinalLayoutResult | null = null
  /** Latest custom-layout failure for frame-handle readback. */
  lastCustomLayoutFailure: CustomLayoutFailureDiagnostic | null = null
  /** Lets `computeScene` retain a prior scene without mutating it after an
   * exception from `buildSceneNodes`. */
  private _customLayoutFailedThisBuild = false
  private _customLayoutDiagnosticsWarned = new Set<string>()
  /** Per-frame restyle callback from the custom layout result (see OrdinalLayoutResult.restyle). */
  private _customRestyle: OrdinalLayoutResult["restyle"] = undefined
  /** True when the active custom layout supplied a `restyle`. */
  hasCustomRestyle = false
  /** Base (as-emitted) style per node, so restyle passes don't compound. */
  private _baseStyles = new WeakMap<object, Style>()
  version = 0
  /** Bumped whenever the buffer is mutated. Used to invalidate per-frame caches. */
  private _dataVersion = 0
  /** Materialized source data, cached for pulse/decay animation frames. */
  private _bufferArrayCache: { version: number; data: Datum[] } | null = null
  // Spatial index for point hit testing (built when point count exceeds threshold)
  private _pointQuadtree: Quadtree<PointSceneNode> | null = null
  /** Largest visual point radius in the current scene. */
  private _maxPointRadius = 0
  /** Cached datum→index map for applyDecay/applyPulse. Keyed by `_dataVersion`. */
  private _datumIndexCache: { version: number; map: Map<any, number> } | null = null
  /** Cached category→indices map for applyPulse wedge path. Keyed by `_dataVersion`. */
  private _categoryIndexCache: { version: number; map: Map<string, number[]> } | null = null
  private _hasRenderedOnce = false

  constructor(config: OrdinalPipelineConfig) {
    this.config = config
    this.buffer = new RingBuffer(config.windowSize)

    // Resolve accessors
    this.getO = resolveStringAccessor(
      config.categoryAccessor || config.oAccessor,
      "category"
    ) as (d: Datum) => string

    const isStreaming = config.runtimeMode === "streaming"

    // Resolve valueAccessor/rAccessor — may be an array for multiAxis
    const rawR = config.valueAccessor || config.rAccessor
    if (Array.isArray(rawR)) {
      this.rAccessors = rawR.map(acc => resolveAccessor(acc, "value"))
      this.getR = this.rAccessors[0]
      this.rExtents = rawR.map(() => new IncrementalExtent())
    } else {
      if (isStreaming && (config.timeAccessor || rawR)) {
        this.getR = resolveAccessor(rawR as string | ((d: Datum) => number) | undefined, "value")
      } else {
        this.getR = resolveAccessor(rawR, "value")
      }
      this.rAccessors = [this.getR]
      this.rExtents = [this.rExtent]
    }

    this.getStack = resolveStringAccessor(config.stackBy)
    this.getGroup = resolveStringAccessor(config.groupBy)
    this.getColor = resolveStringAccessor(config.colorAccessor)
    this.getSymbol = resolveStringAccessor(config.symbolAccessor)
    this.getConnector = resolveStringAccessor(config.connectorAccessor)
    this.getDataId = resolveStringAccessor(config.dataIdAccessor)

    if (config.pulse) {
      this.timestampBuffer = new RingBuffer(config.windowSize)
    }
  }

  /**
   * Keep the optional pulse timestamp ring in lockstep with the datum ring.
   * Enabling pulse after mount must seed timestamps for retained rows; an
   * empty ring would associate later timestamps with the wrong datum index.
   */
  private syncPulseTimestampBuffer(): void {
    this.timestampBuffer = syncOrdinalPulseTimestampBuffer(
      Boolean(this.config.pulse),
      this.buffer,
      this.timestampBuffer,
      this.currentTime()
    )
  }

  /** Keep ingest, pulse, staleness, and transition timestamps on one clock. */
  private currentTime(): number {
    return this.config.clock?.() ?? getTimestamp()
  }

  // ── Data ingestion ───────────────────────────────────────────────────

  ingest(changeset: Changeset): boolean {
    const now = this.currentTime()
    this.lastIngestTime = now
    this._dataVersion++

    if (changeset.bounded) {
      this.buffer.clear()
      // Clear all per-accessor extents — in multiAxis (rAccessor is an
      // array), `rExtents` holds distinct IncrementalExtent instances
      // that aren't aliased by `rExtent`, so only clearing `rExtent`
      // leaves stale min/max on the other axes. In the single-accessor
      // case `rExtents[0]` *is* `rExtent`, so the two-line sequence is
      // still correct (the second clear is a no-op).
      this.rExtent.clear()
      for (const ext of this.rExtents) ext.clear()
      // `preserveCategoryOrder` is the escape hatch for aggregator HOCs
      // that re-derive their full dataset from streaming input on every
      // push (LikertChart, etc.). Without it, the category insertion
      // order resets on every replacement and categories appear to
      // shuffle as values fluctuate. The flag also marks the store as
      // streaming-sourced so `resolveCategories` takes the preserve
      // branch.
      if (!changeset.preserveCategoryOrder) {
        this.categories.clear()
      } else {
        this._hasStreamingData = true
      }
      if (this.timestampBuffer) this.timestampBuffer.clear()

      const targetSize = changeset.totalSize || changeset.inserts.length
      ensureRingBufferCapacity(this.buffer, targetSize, this.timestampBuffer)

      for (const d of changeset.inserts) {
        pushWithTimestamp(this.buffer, d, this.timestampBuffer, now)
        this.categories.add(this.getO(d))
        this.pushValueExtent(d)
      }
    } else {
      // Streaming append
      this._hasStreamingData = true
      for (const d of changeset.inserts) {
        const evicted = pushWithTimestamp(this.buffer, d, this.timestampBuffer, now)
        this.categories.add(this.getO(d))
        this.pushValueExtent(d)

        if (evicted != null) {
          this.evictValueExtent(evicted)
        }
      }
    }

    this.updateResults.recordData(
      changeset.bounded ? "replace" : "ingest",
      changeset.inserts.length
    )
    return true
  }

  ingestWithResult(changeset: Changeset): UpdateResult {
    this.ingest(changeset)
    return this.updateResults.last
  }

  private pushValueExtent(d: Datum): void {
    if (this.config.chartType === "timeline") {
      const range = this.getRawRange(d)
      if (range) {
        this.rExtent.push(range[0])
        this.rExtent.push(range[1])
      }
    } else if (this.rAccessors.length > 1) {
      // MultiAxis: track extents per accessor
      for (let i = 0; i < this.rAccessors.length; i++) {
        this.rExtents[i].push(this.rAccessors[i](d))
      }
      // Also push to primary extent for single-scale fallback
      this.rExtent.push(this.getR(d))
    } else {
      this.rExtent.push(this.getR(d))
    }
  }

  private evictValueExtent(d: Datum): void {
    if (this.config.chartType === "timeline") {
      const range = this.getRawRange(d)
      if (range) {
        this.rExtent.evict(range[0])
        this.rExtent.evict(range[1])
      }
    } else if (this.rAccessors.length > 1) {
      for (let i = 0; i < this.rAccessors.length; i++) {
        this.rExtents[i].evict(this.rAccessors[i](d))
      }
      this.rExtent.evict(this.getR(d))
    } else {
      this.rExtent.evict(this.getR(d))
    }
  }

  /** For timeline type: resolve rAccessor as a [start, end] pair */
  private getRawRange(d: Datum): [number, number] | null {
    const acc = this.config.valueAccessor || this.config.rAccessor
    if (!acc) return null
    const result = typeof acc === "function" ? (acc as ((...args: any[]) => any))(d) : d[acc as string]
    if (Array.isArray(result) && result.length >= 2) {
      return [+result[0], +result[1]]
    }
    return null
  }

  // ── Scene computation ────────────────────────────────────────────────

  computeScene(layout: OrdinalLayout): void {
    const { config, buffer } = this
    const previousScales = this.scales
    const previousMultiScales = this.multiScales
    const previousColumns = this.columns
    if (buffer.size === 0) {
      this.scales = null
      this.multiScales = []
      this.scene = []
      this.columns = {}
      this.customLayoutOverlays = null
      this.lastCustomLayoutResult = null
      this.lastCustomLayoutFailure = null
      this._customRestyle = undefined
      this.hasCustomRestyle = false
      this._baseStyles = new WeakMap()
      this.version++
      return
    }

    // Recalculate dirty extents
    if (this.rExtent.dirty) {
      this.rExtent.recalculate(buffer, this.getR)
    }

    const data = this.getBufferArray()
    const projection = config.projection || "vertical"

    // 1. Resolve category extent
    const oExtent = config.oExtent || this.resolveCategories(data)

    // 2. Compute value extent
    const rDomain = this.computeValueDomain(data, oExtent)

    // 3. Build scales
    const isVertical = projection === "vertical"
    const isHorizontal = projection === "horizontal"
    const isRadial = projection === "radial"

    // `barPadding` is a raw pixel value (default 40 per HOC). We convert it
    // to d3-scale-band's 0..1 padding ratio against the content axis. Clamp
    // the ratio below 1 so degenerate layouts — e.g. a horizontal swimlane
    // where `showCategoryTicks: false` shrinks the left margin but the
    // vertical content area is less than `barPadding * 2` — still produce
    // bands with non-zero bandwidth instead of painting a blank canvas.
    const rawPadding = config.barPadding != null ? config.barPadding / (isVertical ? layout.width : layout.height) : 0.1
    const padding = Math.min(0.9, Math.max(0, rawPadding))

    let oScale: ScaleBand<string>
    let rScale: ScaleLinear<number, number>

    if (isRadial) {
      // Radial: oScale maps to [0, 2π], rScale maps outward
      oScale = scaleBand<string>().domain(oExtent).range([0, 1]).padding(0)
      const maxR = Math.min(layout.width, layout.height) / 2
      const innerR = config.innerRadius || 0
      rScale = scaleLinear().domain(rDomain).range([innerR, maxR])
    } else if (isHorizontal) {
      oScale = scaleBand<string>().domain(oExtent).range([0, layout.height]).padding(padding)
      rScale = scaleLinear().domain(rDomain).range([0, layout.width])
    } else {
      // vertical (default)
      oScale = scaleBand<string>().domain(oExtent).range([0, layout.width]).padding(padding)
      rScale = scaleLinear().domain(rDomain).range([layout.height, 0])
    }

    this.scales = { o: oScale, r: rScale, projection }

    // 3b. Build per-accessor scales for multiAxis mode
    if (this.rAccessors.length > 1 && config.multiAxis) {
      this.multiScales = this.rAccessors.map((acc, i) => {
        const ext = this.rExtents[i]
        if (ext.dirty) ext.recalculate(buffer, acc)
        let [min, max] = ext.extent
        if (min === Infinity) { min = 0; max = 1 }
        const pad = config.extentPadding ?? 0.05
        const range = max - min
        const padAmt = range > 0 ? range * pad : 1
        min -= padAmt
        max += padAmt
        if (min > 0) min = 0

        if (isHorizontal) return scaleLinear().domain([min, max]).range([0, layout.width])
        return scaleLinear().domain([min, max]).range([layout.height, 0])
      })
    } else {
      this.multiScales = []
    }

    // 3c. Expand data for multi-accessor: each datum becomes N pieces with rIndex
    let expandedData = data
    if (this.rAccessors.length > 1) {
      expandedData = data.flatMap(d =>
        this.rAccessors.map((acc, rIndex) => ({
          ...d,
          __rIndex: rIndex,
          __rValue: acc(d),
          __rName: this.resolveRAccessorName(rIndex)
        }))
      )
    }

    // 4. Build projected columns
    this.columns = this.buildColumns(expandedData, oExtent, oScale, projection, layout)

    // 5. Build scene graph
    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(expandedData, layout)
    if (this._customLayoutFailedThisBuild) {
      const preservedLastGoodScene =
        this.lastCustomLayoutFailure?.preservedLastGoodScene === true
      if (preservedLastGoodScene) {
        this.scales = previousScales
        this.multiScales = previousMultiScales
        this.columns = previousColumns
      } else {
        // Do not retain a built-in scene if a newly-installed custom layout
        // fails before producing its first output.
        this.scene = []
        this.rebuildPointQuadtree()
      }
      return
    }

    // Snapshot only after a successful callback so a retained scene keeps its
    // old transition state on recovery.
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }
    this.scene = nextScene
    this.rebuildPointQuadtree()

    // Apply decay/pulse to discrete scene nodes
    if (this.config.decay) {
      this.applyDecay(this.scene, data)
    }
    if (this.config.pulse) {
      this.applyPulse(this.scene, data)
    }

    // Intro animation: synthesize zero-state on first render
    if (this.config.transition && !this._hasRenderedOnce && this.scene.length > 0) {
      if (this.config.introAnimation) {
        this.synthesizeIntroPositions()
      }
      this._hasRenderedOnce = true
    }

    // Start transition animation
    if (this.config.transition && this.prevPositionMap.size > 0) {
      this.startTransition()
    }

    this.version++
  }

  private resolveRAccessorName(index: number): string {
    const rawR = this.config.valueAccessor || this.config.rAccessor
    const acc = Array.isArray(rawR) ? rawR[index] : rawR
    return typeof acc === "string" ? acc : `value${index}`
  }

  // ── Category resolution ──────────────────────────────────────────────

  private resolveCategories(data: Datum[]): string[] {
    const sort = this.config.oSort
    const isStreaming = this.config.runtimeMode === "streaming" || this._hasStreamingData

    // "auto" means "insertion order when streaming, value-desc when
    // static" — the right default for charts where users want value-sort
    // on a finished dataset but FIFO stability while data is still
    // arriving (DotPlot, LikertChart). Both arms collapse to `undefined`
    // because the streaming-preserve branch fires on `undefined && isStreaming`
    // and the value-desc fallback fires on `undefined && !isStreaming`.
    const effectiveSort: typeof sort = sort === "auto" ? undefined : sort

    // Under streaming, `this.categories` is an insertion-ordered memory
    // of every category we've ever seen (including ones whose data was
    // evicted or dropped by a `replace()`). That's load-bearing for FIFO
    // stability across re-appearances, but we don't want axis ticks or
    // columns for categories that aren't in the current dataset — every
    // branch below should filter against `liveCategories` so explicit
    // sorts (`"desc"`, comparator, `false`) don't render ghost columns
    // after a replacement drops a category.
    let liveCategories: Set<string> | null = null
    if (isStreaming) {
      liveCategories = new Set<string>()
      for (const d of data) {
        liveCategories.add(this.getO(d))
      }
    }
    const cats = liveCategories
      ? Array.from(this.categories).filter(cat => liveCategories!.has(cat))
      : Array.from(this.categories)

    // In streaming mode (explicit runtimeMode or push-API data), preserve
    // insertion order by default to avoid jarring category shuffling as
    // values fluctuate in the sliding window
    if (isStreaming && effectiveSort === undefined) {
      // Cap the retained history to prevent unbounded growth in high-cardinality
      // streams. Prune dead categories from the front (oldest first) when the
      // Set exceeds 3x the live count, keeping recent evictions for FIFO stability.
      const maxRetained = Math.max(50, liveCategories!.size * 3)
      if (this.categories.size > maxRetained) {
        let toRemove = this.categories.size - maxRetained
        for (const cat of this.categories) {
          if (toRemove <= 0) break
          if (!liveCategories!.has(cat)) {
            this.categories.delete(cat)
            toRemove--
          }
        }
      }

      return cats
    }

    if (effectiveSort === false) return cats

    if (typeof effectiveSort === "function") {
      return cats.sort(effectiveSort)
    }

    // Default: sort by total value descending (unless explicitly "asc")
    const sums = new Map<string, number>()
    for (const d of data) {
      const cat = this.getO(d)
      sums.set(cat, (sums.get(cat) || 0) + Math.abs(this.getR(d)))
    }

    if (effectiveSort === "asc") {
      return cats.sort((a, b) => (sums.get(a) || 0) - (sums.get(b) || 0))
    }

    // Default, true, "desc", or undefined → descending
    return cats.sort((a, b) => (sums.get(b) || 0) - (sums.get(a) || 0))
  }

  // ── Value domain computation ─────────────────────────────────────────

  private computeValueDomain(data: Datum[], _oExtent: string[]): [number, number] {
    return computeOrdinalValueDomain({
      data,
      chartType: this.config.chartType,
      projection: this.config.projection,
      normalize: this.config.normalize,
      rExtent: this.config.rExtent,
      extentPadding: this.config.extentPadding,
      baselinePadding: this.config.baselinePadding,
      axisExtent: this.config.axisExtent,
      getO: this.getO,
      getR: this.getR,
      getStack: this.getStack,
      rawRExtent: this.rExtent.extent
    })
  }

  // ── Column projection ────────────────────────────────────────────────

  private buildColumns(
    data: Datum[],
    oExtent: string[],
    oScale: ScaleBand<string>,
    projection: string,
    layout: OrdinalLayout
  ): Record<string, OrdinalColumn> {
    return buildOrdinalColumns({
      data,
      oExtent,
      oScale,
      projection,
      layout,
      dynamicColumnWidth: this.config.dynamicColumnWidth,
      getO: this.getO,
      getR: this.getR
    })
  }

  // ── Scene graph building ─────────────────────────────────────────────

  private getSceneContext(): OrdinalSceneContext {
    return {
      scales: this.scales!,
      columns: this.columns,
      config: this.config,
      getR: this.getR,
      getStack: this.getStack,
      getGroup: this.getGroup,
      getColor: this.getColor,
      getSymbol: this.getSymbol,
      getConnector: this.getConnector,
      getO: this.getO,
      multiScales: this.multiScales,
      rAccessors: this.rAccessors,
      resolvePieceStyle: (d: any, category?: string) => this.resolvePieceStyle(d, category),
      resolveSummaryStyle: (d: any, category?: string) => this.resolveSummaryStyle(d, category),
      getRawRange: (d: Datum) => this.getRawRange(d)
    }
  }

  private buildSceneNodes(data: Datum[], layout: OrdinalLayout): OrdinalSceneNode[] {
    if (!this.scales) return []

    // customLayout escape hatch — short-circuit chart-type dispatch when
    // the user has supplied their own layout function. The layout runs
    // against fully-built scales (o + r) and produces scene primitives
    // directly. Hit testing, decay, transitions, and SSR keep working
    // because they consume `this.scene`.
    if (this.config.customLayout) {
      const layoutCtx = this.buildLayoutContext(data, layout)
      let result
      try {
        result = this.config.customLayout(layoutCtx)
      } catch (err) {
        const preservedLastGoodScene = this.lastCustomLayoutResult !== null
        const diagnostic = createCustomLayoutFailureDiagnostic(
          "ordinal",
          err,
          preservedLastGoodScene,
          this.version
        )
        this.lastCustomLayoutFailure = diagnostic
        this._customLayoutFailedThisBuild = true
        if (process.env.NODE_ENV !== "production") {
          console.error("[semiotic] ordinal customLayout threw:", err)
        }
        try {
          this.config.onLayoutError?.(diagnostic)
        } catch (callbackError) {
          if (process.env.NODE_ENV !== "production") {
            console.error("[semiotic] onLayoutError threw:", callbackError)
          }
        }
        if (!preservedLastGoodScene) {
          this.customLayoutOverlays = null
          this.lastCustomLayoutResult = null
          this._customRestyle = undefined
          this.hasCustomRestyle = false
          this._baseStyles = new WeakMap()
          return []
        }
        return this.scene
      }
      this.customLayoutOverlays = result.overlays ?? null
      this.lastCustomLayoutResult = result
      this.lastCustomLayoutFailure = null
      const nodes = result.nodes ?? []
      // Stash the restyle callback; snapshot base styles + apply once for the
      // current selection (these `nodes` become `this.scene`).
      this._customRestyle = result.restyle
      this.hasCustomRestyle = !!result.restyle
      if (this.hasCustomRestyle) {
        this._baseStyles = new WeakMap()
        for (const n of nodes) if (n.style) this._baseStyles.set(n, n.style)
        this.applyCustomRestyle(nodes, this.config.layoutSelection ?? null)
      }
      warnCustomLayoutDiagnostics({
        label: "ordinal customLayout",
        nodes,
        overlays: this.customLayoutOverlays,
        warned: this._customLayoutDiagnosticsWarned,
      })
      return nodes
    }

    // Built-in chart types: clear stale overlays from a prior customLayout run.
    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false

    const ctx = this.getSceneContext()
    const builder = SCENE_BUILDERS[this.config.chartType]
    let nodes = builder ? builder(ctx, layout) : []

    // Build connectors if configured
    if (this.getConnector && this.scales) {
      const connectorNodes = buildConnectors(ctx, nodes, layout)
      // Connectors render behind pieces
      nodes = [...connectorNodes, ...nodes]
    }

    return nodes
  }

  private buildLayoutContext(data: Datum[], layout: OrdinalLayout): OrdinalLayoutContext {
    const cfg = this.config
    const margin: MarginType = cfg.layoutMargin ?? { top: 0, right: 0, bottom: 0, left: 0 }

    // Palette + resolveColor share the same shape across network and
    // ordinal customLayout escape hatches — see `customLayoutPalette.ts`.
    const palette = resolveCustomLayoutPalette(
      cfg.colorScheme,
      cfg.themeCategorical,
      STREAMING_PALETTE
    )

    const scales = this.scales!
    // Coordinate-system shape depends on projection. The frame translates
    // the canvas/SVG context to:
    //   vertical/horizontal: (margin.left, margin.top) — top-left of plot
    //   radial:              (margin.left + plot.width/2, margin.top + plot.height/2)
    //                        — center of plot
    // So scene-node coords for radial layouts are center-relative. Reflect
    // that in `dimensions.plot` so layout authors using `plot.x`/`plot.y`
    // see the actual top-left of the visible plot rect in their coord
    // space (not assume 0,0 always means top-left).
    const isRadial = scales.projection === "radial"
    const plotRect = isRadial
      ? {
          x: -layout.width / 2,
          y: -layout.height / 2,
          width: layout.width,
          height: layout.height,
        }
      : { x: 0, y: 0, width: layout.width, height: layout.height }

    return {
      // Use the data array passed to buildSceneNodes — that's what the
      // built-in scene builders see (post multiAxis expansion etc.). Re-
      // fetching from the buffer would diverge whenever the pipeline
      // expanded the rows before dispatch, and would also waste an
      // allocation.
      data,
      scales: { o: scales.o, r: scales.r, projection: scales.projection },
      dimensions: {
        width: layout.width,
        height: layout.height,
        margin,
        plot: plotRect,
      },
      theme: {
        semantic: cfg.themeSemantic ?? {},
        categorical: [...palette],
      },
      resolveColor: buildResolveColor(palette, cfg.colorScheme),
      config: (cfg.layoutConfig ?? {}) as Record<string, unknown>,
      selection: cfg.layoutSelection ?? null,
    }
  }

  // ── Style resolution ─────────────────────────────────────────────────

  private resolvePieceStyle(d: any, category?: string): Style {
    if (typeof this.config.pieceStyle === "function") {
      const style = this.config.pieceStyle(d, category)
      // If the function returned a style without a fill color and we have a category,
      // fill in from the frame's color scheme. This handles push API where HOC colorScale
      // is not yet available.
      if (style && !style.fill && category) {
        return { ...style, fill: this.getColorFromScheme(category) }
      }
      return style
    }
    if (this.config.pieceStyle && typeof this.config.pieceStyle === "object") {
      return this.config.pieceStyle as unknown as Style
    }
    if (this.config.barColors && category) {
      return { fill: this.config.barColors[category] || "#007bff" }
    }
    // Use colorScheme (or default palette) to generate colors by category
    if (category) {
      return { fill: this.getColorFromScheme(category) }
    }
    return { fill: "#007bff" }
  }

  private getColorFromScheme(key: string): string {
    if (!this._colorSchemeMap) this._colorSchemeMap = new Map()
    const existing = this._colorSchemeMap.get(key)
    if (existing) return existing

    const palette = Array.isArray(this.config.colorScheme)
      ? this.config.colorScheme
      : this.config.themeCategorical || STREAMING_PALETTE
    const color = palette[this._colorSchemeIndex % palette.length]
    this._colorSchemeIndex++
    this._colorSchemeMap.set(key, color)
    return color
  }

  private resolveSummaryStyle(d: any, category?: string): Style {
    if (typeof this.config.summaryStyle === "function") {
      return this.config.summaryStyle(d, category)
    }
    if (this.config.summaryStyle && typeof this.config.summaryStyle === "object") {
      return this.config.summaryStyle as unknown as Style
    }
    return { fill: "#007bff", fillOpacity: 0.6, stroke: "#007bff", strokeWidth: 1 }
  }

  // ── Decay ────────────────────────────────────────────────────────────

  computeDecayOpacity(bufferIndex: number, bufferSize: number): number {
    const decay = this.config.decay
    if (!decay || bufferSize <= 1) return 1
    return computeDecayOpacity(decay, bufferIndex, bufferSize)
  }

  /**
   * Build (or return cached) datum→buffer-index map. Cached against
   * `_dataVersion` so the per-frame applyDecay/applyPulse calls don't
   * rebuild it during animation when the buffer hasn't changed.
   */
  private getDatumIndexMap(data: Datum[]): Map<any, number> {
    if (this._datumIndexCache && this._datumIndexCache.version === this._dataVersion) {
      return this._datumIndexCache.map
    }
    const map = buildDatumIndexMap(data)
    this._datumIndexCache = { version: this._dataVersion, map }
    return map
  }

  /**
   * Build (or return cached) category→[indices] map used by applyPulse for
   * wedge nodes. Cached against `_dataVersion` so the per-wedge inner loop
   * collapses from O(data) to O(matches-for-this-category).
   */
  private getCategoryIndexMap(data: Datum[]): Map<string, number[]> {
    if (this._categoryIndexCache && this._categoryIndexCache.version === this._dataVersion) {
      return this._categoryIndexCache.map
    }
    const map = buildOrdinalCategoryIndex(
      data,
      this.config.categoryAccessor || this.config.oAccessor
    )
    this._categoryIndexCache = { version: this._dataVersion, map }
    return map
  }

  /**
   * Build (or clear) a quadtree spatial index for point scene nodes.
   * Useful for swarm plots — other ordinal types (bar/wedge/box/violin) are
   * not indexed because they're typically few in number or already O(1) hit
   * tests via bbox checks.
   */
  private rebuildPointQuadtree(): void {
    const index = buildOrdinalPointSpatialIndex(this.scene)
    this._pointQuadtree = index.quadtree
    this._maxPointRadius = index.maxRadius
  }

  /** Quadtree spatial index for point hit testing, or null when below threshold. */
  get pointQuadtree(): Quadtree<PointSceneNode> | null {
    return this._pointQuadtree
  }

  /** Largest visual point radius in the current scene. */
  get maxPointRadius(): number {
    return this._maxPointRadius
  }

  private applyDecay(nodes: OrdinalSceneNode[], data: Datum[]): void {
    if (!this.config.decay) return
    const bufferSize = data.length
    if (bufferSize <= 1) return

    const indexMap = this.getDatumIndexMap(data)

    for (const node of nodes) {
      // Decay dims marks by their position in the time-ordered buffer, which is
      // undefined for aggregate/distribution marks (a wedge is a category total;
      // violin/boxplot are distribution summaries) and decorative connectors —
      // none maps to a single buffer index. Pulse intentionally DOES handle
      // wedges ("this category just received a point" is meaningful for an
      // aggregate); decay does not, by the same reasoning. This asymmetry is
      // deliberate, not an oversight.
      if (node.type === "connector" || node.type === "violin" || node.type === "boxplot" || node.type === "wedge") continue
      const idx = indexMap.get(node.datum)
      if (idx == null) continue
      const decayOpacity = this.computeDecayOpacity(idx, bufferSize)
      const baseOpacity = node.style?.opacity ?? 1
      node.style = { ...node.style, opacity: baseOpacity * decayOpacity }
    }
  }

  // ── Pulse ───────────────────────────────────────────────────────────

  private applyPulse(nodes: OrdinalSceneNode[], data: Datum[], now = this.currentTime()): boolean {
    if (!this.config.pulse || !this.timestampBuffer) return false
    return applyOrdinalPulse(
      this.config.pulse,
      nodes,
      this.timestampBuffer,
      this.getDatumIndexMap(data),
      category => this.getCategoryIndexMap(data).get(category),
      now
    )
  }

  /**
   * Refresh only pulse-derived fields on the existing scene. This deliberately
   * avoids a scene/layout rebuild on every rAF pulse tick.
   */
  refreshPulse(now: number): boolean {
    if (this.lastCustomLayoutFailure?.preservedLastGoodScene === true) return false
    return this.applyPulse(this.scene, this.getBufferArray(), now)
  }

  hasActivePulsesAt(now: number): boolean {
    if (!this.config.pulse) return false
    return hasActivePulsesShared(this.config.pulse, this.timestampBuffer, now)
  }

  get hasActivePulses(): boolean {
    return this.hasActivePulsesAt(this.currentTime())
  }

  // ── Transitions ─────────────────────────────────────────────────────

  /** Synthesize a zero-state prevPositionMap for animated intro (first render). */
  private synthesizeIntroPositions(): void {
    this.prevPositionMap.clear()
    const keyCounts = new Map<string, number>()
    const baseline = this.scales?.r(0) ?? 0
    const isVertical = this.scales?.projection !== "horizontal"
    let wedgeStartOffset: number | undefined

    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeKey(node, keyCounts)
      if (!key) continue

      if (node.type === "rect") {
        // Bars: zero height at baseline
        if (isVertical) {
          this.prevPositionMap.set(key, {
            x: node.x, y: baseline, w: node.w, h: 0,
            opacity: node.style.opacity ?? 1
          })
        } else {
          this.prevPositionMap.set(key, {
            x: baseline, y: node.y, w: 0, h: node.h,
            opacity: node.style.opacity ?? 1
          })
        }
      } else if (node.type === "point") {
        // Points: scale from r=0
        this.prevPositionMap.set(key, {
          x: node.x, y: node.y, r: 0, opacity: 0
        })
      } else if (node.type === "wedge") {
        // Wedges: collapse all arcs to the start angle offset
        if (wedgeStartOffset === undefined) wedgeStartOffset = node.startAngle
        this.prevPositionMap.set(key, {
          x: node.cx, y: node.cy,
          startAngle: wedgeStartOffset, endAngle: wedgeStartOffset,
          innerRadius: node.innerRadius, outerRadius: node.outerRadius,
          opacity: 0
        })
      }
    }
  }

  /** Build a stable identity key for a scene node based on its content, not array index */
  private getNodeKey(node: OrdinalSceneNode, keyCounts: Map<string, number>): string | null {
    if (node.type === "point") {
      const cat = node.datum ? this.getO(node.datum) : ""
      const val = node.datum ? this.getR(node.datum) : 0
      const baseKey = `p:${cat}:${val}`
      const count = keyCounts.get(baseKey) || 0
      keyCounts.set(baseKey, count + 1)
      return `${baseKey}:${count}`
    } else if (node.type === "rect") {
      return `r:${node.group || ""}:${node.datum?.category ?? ""}`
    } else if (node.type === "wedge") {
      return `w:${node.category ?? ""}`
    }
    return null
  }

  private snapshotPositions(): void {
    this.prevPositionMap.clear()
    const keyCounts = new Map<string, number>()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeKey(node, keyCounts)
      if (!key) continue
      if (node.type === "point") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, r: node.r, opacity: node.style.opacity })
      } else if (node.type === "rect") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, w: node.w, h: node.h, opacity: node.style.opacity })
      } else if (node.type === "wedge") {
        // Store transition opacity (style.opacity), NOT fillOpacity.
        // The renderer multiplies fillOpacity * opacity, so storing
        // fillOpacity here would cause double-multiplication.
        this.prevPositionMap.set(key, {
          x: node.cx, y: node.cy,
          startAngle: node.startAngle, endAngle: node.endAngle,
          innerRadius: node.innerRadius, outerRadius: node.outerRadius,
          opacity: node.style.opacity ?? 1
        })
      }
    }
  }

  private startTransition(): void {
    if (!this.config.transition || this.prevPositionMap.size === 0) return
    const duration = this.config.transition.duration ?? 300

    // Clear any previously-appended exit nodes from the scene
    if (this.exitNodes.length > 0) {
      const exitSet = new Set(this.exitNodes)
      this.scene = this.scene.filter(n => !exitSet.has(n))
      this.exitNodes = []
    }

    let hasChanges = false
    const matchedPrevKeys = new Set<string>()
    const keyCounts = new Map<string, number>()
    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = this.getNodeKey(node, keyCounts)
      if (!key) continue

      // Store stable key on node so advanceTransition can use it
      // even after exit nodes are appended to the scene
      node._transitionKey = key

      const prev = this.prevPositionMap.get(key)

      if (node.type === "point") {
        if (prev) {
          matchedPrevKeys.add(key)
          node._targetOpacity = node.style.opacity ?? 1
          if (prev.x !== node.x || prev.y !== node.y || (prev.r !== undefined && prev.r !== node.r)) {
            node._targetX = node.x
            node._targetY = node.y
            node._targetR = node.r
            node.x = prev.x
            node.y = prev.y
            if (prev.r !== undefined) node.r = prev.r
            hasChanges = true
          }
        } else {
          // Entering node — scale from r=0
          node._targetOpacity = node.style.opacity ?? 1
          node._targetR = node.r
          node.r = 0
          node.style = { ...node.style, opacity: 0 }
          hasChanges = true
        }
      } else if (node.type === "rect") {
        if (prev) {
          matchedPrevKeys.add(key)
          node._targetOpacity = node.style.opacity ?? 1
          if (prev.x !== node.x || prev.y !== node.y || prev.w !== node.w || prev.h !== node.h) {
            node._targetX = node.x
            node._targetY = node.y
            node._targetW = node.w
            node._targetH = node.h
            node.x = prev.x
            node.y = prev.y
            node.w = prev.w ?? node.w
            node.h = prev.h ?? node.h
            hasChanges = true
          }
        } else {
          // Entering node
          node._targetOpacity = node.style.opacity ?? 1
          node.style = { ...node.style, opacity: 0 }
          hasChanges = true
        }
      } else if (node.type === "wedge") {
        if (prev) {
          matchedPrevKeys.add(key)
          node._targetOpacity = node.style.opacity ?? 1
          if (prev.startAngle !== node.startAngle || prev.endAngle !== node.endAngle) {
            node._targetStartAngle = node.startAngle
            node._targetEndAngle = node.endAngle
            node.startAngle = prev.startAngle!
            node.endAngle = prev.endAngle!
            hasChanges = true
          }
        } else {
          // Entering wedge: collapse to zero arc at start angle, then sweep open
          node._targetOpacity = node.style.opacity ?? 1
          node._targetStartAngle = node.startAngle
          node._targetEndAngle = node.endAngle
          const collapsed = node.startAngle
          node.startAngle = collapsed
          node.endAngle = collapsed
          node.style = { ...node.style, opacity: 0 }
          // Store synthetic prev so advanceTransition has a "from"
          this.prevPositionMap.set(key, {
            x: node.cx, y: node.cy,
            startAngle: collapsed, endAngle: collapsed,
            innerRadius: node.innerRadius, outerRadius: node.outerRadius,
            opacity: 0
          })
          hasChanges = true
        }
      }
    }

    // Detect exit nodes
    this.exitNodes = []
    for (const [key, prev] of this.prevPositionMap) {
      if (matchedPrevKeys.has(key)) continue
      if (key.startsWith("p:")) {
        this.exitNodes.push({
          type: "point", x: prev.x, y: prev.y, r: prev.r ?? 3,
          style: { opacity: prev.opacity ?? 1 }, datum: null,
          _targetOpacity: 0, _transitionKey: key
        })
      } else if (key.startsWith("r:")) {
        this.exitNodes.push({
          type: "rect", x: prev.x, y: prev.y, w: prev.w ?? 0, h: prev.h ?? 0,
          style: { opacity: prev.opacity ?? 1, fill: "#999" }, datum: null,
          _targetOpacity: 0, _transitionKey: key
        })
      } else if (key.startsWith("w:")) {
        // Exiting wedge: collapse arc to midpoint and fade out
        const midAngle = ((prev.startAngle ?? 0) + (prev.endAngle ?? 0)) / 2
        const exitNode: WedgeSceneNode = {
          type: "wedge",
          cx: prev.x, cy: prev.y,
          innerRadius: prev.innerRadius ?? 0,
          outerRadius: prev.outerRadius ?? 100,
          startAngle: prev.startAngle ?? 0,
          endAngle: prev.endAngle ?? 0,
          style: { opacity: prev.opacity ?? 1 },
          datum: null,
          category: key.slice(2),
          _targetStartAngle: midAngle,
          _targetEndAngle: midAngle,
          _targetOpacity: 0,
          _transitionKey: key
        }
        this.exitNodes.push(exitNode)
      }
      hasChanges = true
    }

    // Append exit nodes (at end to preserve existing indices)
    if (this.exitNodes.length > 0) {
      this.scene = [...this.scene, ...this.exitNodes]
    }

    if (hasChanges) {
      this.activeTransition = {
        startTime: this.currentTime(),
        duration
      }
    }
  }

  advanceTransition(now: number): boolean {
    if (!this.activeTransition) return false

    const rawT = computeRawProgress(now, this.activeTransition)
    const easing = this.config.transition?.easing === "linear" ? "linear" : "ease-out-cubic"
    const t = computeEasing(rawT, easing)

    for (const node of this.scene) {
      // Use stable key stored during startTransition (immune to exit node shifts)
      const key = node._transitionKey
      if (!key) continue

      if (node.type === "point") {
        // Interpolate opacity for enter/exit
        if (node._targetOpacity !== undefined) {
          const prev = this.prevPositionMap.get(key)
          const startOpacity = prev ? (prev.opacity ?? 1) : 0
          node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
        }
        const prev = this.prevPositionMap.get(key)
        if (node._targetX !== undefined && prev) {
          node.x = lerp(prev.x, node._targetX, t)
          node.y = lerp(prev.y, node._targetY!, t)
        }
        if (node._targetR !== undefined && prev?.r !== undefined) {
          node.r = lerp(prev.r, node._targetR, t)
        }
      } else if (node.type === "rect") {
        if (node._targetOpacity !== undefined) {
          const prev = this.prevPositionMap.get(key)
          const startOpacity = prev ? (prev.opacity ?? 1) : 0
          node.style.opacity = lerp(startOpacity, node._targetOpacity, t)
        }
        if (node._targetX === undefined) continue
        const prev = this.prevPositionMap.get(key)
        if (!prev) continue
        node.x = lerp(prev.x, node._targetX, t)
        node.y = lerp(prev.y, node._targetY!, t)
        if (prev.w !== undefined) {
          node.w = lerp(prev.w, node._targetW!, t)
          node.h = lerp(prev.h!, node._targetH!, t)
        }
      } else if (node.type === "wedge") {
        if (node._targetOpacity !== undefined) {
          const prev = this.prevPositionMap.get(key)
          const startOpacity = prev ? (prev.opacity ?? 1) : 0
          node.style = { ...node.style, opacity: lerp(startOpacity, node._targetOpacity, t) }
        }
        if (node._targetStartAngle !== undefined && node._targetEndAngle !== undefined) {
          const prev = this.prevPositionMap.get(key)
          if (prev && prev.startAngle !== undefined) {
            node.startAngle = lerp(prev.startAngle, node._targetStartAngle, t)
            node.endAngle = lerp(prev.endAngle!, node._targetEndAngle, t)
          }
        }
      }
    }

    if (rawT >= 1) {
      for (const node of this.scene) {
        if (node._targetOpacity !== undefined) {
          node.style = { ...(node.style || {}), opacity: node._targetOpacity === 0 ? 0 : node._targetOpacity }
          node._targetOpacity = undefined
        }
        if (node.type === "point") {
          if (node._targetX === undefined && node._targetR === undefined) continue
          if (node._targetX !== undefined) { node.x = node._targetX; node.y = node._targetY! }
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
        } else if (node.type === "wedge") {
          if (node._targetStartAngle !== undefined) {
            node.startAngle = node._targetStartAngle
            node.endAngle = node._targetEndAngle!
            node._targetStartAngle = undefined
            node._targetEndAngle = undefined
          }
        }
      }
      // Remove exit nodes
      if (this.exitNodes.length > 0) {
        const exitSet = new Set(this.exitNodes)
        this.scene = this.scene.filter(n => !exitSet.has(n))
        this.exitNodes = []
      }
      this.activeTransition = null
      return false
    }

    return true
  }

  /**
   * Cancel any pending intro animation that the most recent
   * `computeScene` call set up. After this, the next paint shows the
   * scene in its final state directly. See `PipelineStore.cancelIntroAnimation`
   * for the full rationale — Stream Frames call this when they detect
   * SSR hydration so the canvas takeover doesn't re-animate from blank
   * after the server already painted the chart.
   */
  cancelIntroAnimation(): void {
    this.prevPositionMap.clear()
    this.activeTransition = null
  }

  /**
   * Materialize the ring buffer at most once per data version. Pulse decay
   * ticks reuse this array and the datum/category index caches rather than
   * allocating a fresh copy at animation-frame frequency.
   */
  private getBufferArray(): Datum[] {
    if (this._bufferArrayCache?.version !== this._dataVersion) {
      this._bufferArrayCache = {
        version: this._dataVersion,
        data: this.buffer.toArray()
      }
    }
    return this._bufferArrayCache.data
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Datum[] {
    // Keep this public accessor's historical copy-on-read behavior. The
    // private cache above is only for internal frame-time pulse/scene work;
    // callers must not be able to mutate the array those paths rely on.
    return this.buffer.toArray()
  }

  /** Most recent additive update result for revision-aware hosts and tests. */
  getLastUpdateResult(): UpdateResult {
    return this.updateResults.last
  }

  getUpdateSnapshot(): UpdateResult {
    return this.updateResults.last
  }

  subscribeUpdateResult(listener: () => void): () => void {
    return this.updateResults.subscribe(listener)
  }

  /**
   * Remove data items by ID. Requires dataIdAccessor to be configured.
   * Returns the removed items. Marks the store dirty for scene rebuild.
   */
  remove(id: string | string[]): Datum[] {
    if (!this.getDataId) {
      throw new Error("remove() requires dataIdAccessor to be configured")
    }
    // Snapshot positions before mutation so the transition system can animate exits
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }
    const ids = toIdSet(id)
    const getDataId = this.getDataId
    const predicate = (item: Datum) => ids.has(getDataId(item))
    compactTimestampBufferForRemoval(this.buffer, this.timestampBuffer, predicate)
    const removed = this.buffer.remove(predicate)
    if (removed.length === 0) {
      this.updateResults.recordNoop("remove")
      return removed
    }

    for (const d of removed) {
      this.evictValueExtent(d)
    }

    // Rebuild category set from remaining data
    this.categories.clear()
    this.buffer.forEach(d => this.categories.add(this.getO(d)))

    this._dataVersion++
    this.version++
    // A removal is data activity — refresh the staleness clock.
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("remove", removed.length)
    return removed
  }

  /**
   * Update data items by ID. Requires dataIdAccessor.
   * Returns the previous values. Categories and extents are rebuilt.
   */
  update(id: string | string[], updater: (d: Datum) => Datum): Datum[] {
    if (!this.getDataId) {
      throw new Error("update() requires dataIdAccessor to be configured")
    }
    const ids = toIdSet(id)
    const getDataId = this.getDataId
    // Capture matched indices before mutation (updater may change the ID field)
    const matchedIndices = new Set<number>()
    this.buffer.forEach((d, i) => { if (ids.has(getDataId(d))) matchedIndices.add(i) })

    const previous = this.buffer.update(
      item => ids.has(getDataId(item)),
      updater
    )
    if (previous.length === 0) {
      this.updateResults.recordNoop("update")
      return previous
    }

    // Evict old values using the existing extent helper (handles timeline/multiAxis)
    for (const old of previous) {
      this.evictValueExtent(old)
    }
    // Rebuild categories and push new extents using pre-captured indices
    this.categories.clear()
    this.buffer.forEach((d, i) => {
      this.categories.add(this.getO(d))
      if (matchedIndices.has(i)) {
        this.pushValueExtent(d)
      }
    })

    this._dataVersion++
    this.version++
    // An in-place update is data activity — refresh the staleness clock so a
    // chart streamed via update() (e.g. a refill demo) isn't flagged stale.
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("update", previous.length)
    return previous
  }

  clear(): void {
    this.buffer.clear()
    this.rExtent.clear()
    this.categories.clear()
    this._hasStreamingData = false
    this._hasRenderedOnce = false
    if (this.timestampBuffer) this.timestampBuffer.clear()
    this.prevPositionMap.clear()
    this.exitNodes = []
    this.activeTransition = null
    this.lastIngestTime = 0
    this.scales = null
    this.scene = []
    this.columns = {}
    this.multiScales = []
    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()
    this._pointQuadtree = null
    this._maxPointRadius = 0
    // The categorical color cache must reset too, or a clear()+reload assigns
    // colors from a polluted palette index (drift) and reappearing categories
    // keep stale colors — unlike a freshly-mounted chart. Mirrors the reset in
    // updateConfig() and XY's clear() (_colorMapCache/_groupColorMap).
    this._colorSchemeMap = null
    this._colorSchemeIndex = 0
    this._dataVersion++
    this.version++
    this.updateResults.recordData("clear")
  }

  get size(): number {
    return this.buffer.size
  }

  getOAccessor(): (d: Datum) => string {
    return this.getO
  }

  getRAccessor(): (d: Datum) => number {
    return this.getR
  }

  /** Update the selection the layout reads at the next rebuild, without one. */
  setLayoutSelection(selection: CustomLayoutSelection | null): void {
    this.config.layoutSelection = selection
  }

  private applyCustomRestyle(nodes: OrdinalSceneNode[], selection: CustomLayoutSelection | null): void {
    const fn = this._customRestyle
    if (!fn) return
    for (const node of nodes) {
      const base = this._baseStyles.get(node) ?? node.style ?? ({} as Style)
      const patch = fn(node, selection)
      node.style = patch ? { ...base, ...patch } : base
    }
  }

  /**
   * Re-apply the custom layout's `restyle` to the existing scene for
   * `selection`, off each node's base style — no relayout, no quadtree rebuild.
   * No-op when the layout supplied no `restyle`.
   */
  restyleScene(selection: CustomLayoutSelection | null): void {
    if (!this._customRestyle) {
      this.updateResults.recordRestyle(false)
      return
    }
    this.applyCustomRestyle(this.scene, selection)
    this.updateResults.recordRestyle(true)
  }

  /**
   * Re-derive every retained fact that depends on the category/value
   * accessors. `updateConfig` can change an accessor without a subsequent
   * ingest (the normal React path), so clearing only a cache would leave the
   * next scene with an empty/stale domain against the existing buffer.
   */
  private rebuildAccessorDerivedState(): void {
    this.categories.clear()
    this.rExtent.clear()
    for (const ext of this.rExtents) ext.clear()
    this._categoryIndexCache = null

    this.buffer.forEach(d => {
      this.categories.add(this.getO(d))
      this.pushValueExtent(d)
    })
  }

  updateConfig(config: Partial<OrdinalPipelineConfig>): void {
    const prev = { ...this.config }
    const changedConfigKeys = Object.keys(config).filter(
      (key) => (config as Record<string, unknown>)[key] !==
        (prev as Record<string, unknown>)[key]
    )

    // `windowSize` allocates the data and pulse rings in the constructor.
    // Resizing it after mount would need coordinated category/extent and
    // transition semantics, so keep the current mount-only contract explicit
    // rather than silently updating only the config object.
    if (
      process.env.NODE_ENV !== "production" &&
      !this.windowSizeWarned &&
      "windowSize" in config &&
      config.windowSize !== prev.windowSize
    ) {
      this.windowSizeWarned = true
      console.warn(
        `[Semiotic] windowSize changed after mount (${prev.windowSize} → ${config.windowSize}) ` +
          `but it is a mount-only setting — the ring buffer keeps its original capacity. ` +
          `Remount the chart (e.g. via a React key) to apply a new windowSize.`,
      )
    }

    // `_colorSchemeMap` falls back to `themeCategorical` and looks up colors
    // via `getColor` (derived from `colorAccessor`) — all three of those must
    // invalidate the cache alongside `colorScheme`. Use `in config` rather
    // than `!== undefined` so a caller explicitly clearing a field (e.g. a
    // theme switch sets `themeCategorical` to undefined) still invalidates.
    if (
      ("colorScheme" in config && config.colorScheme !== prev.colorScheme)
      || ("themeCategorical" in config && config.themeCategorical !== prev.themeCategorical)
      || ("colorAccessor" in config && !accessorsEquivalent(config.colorAccessor, prev.colorAccessor))
    ) {
      this._colorSchemeMap = null
      this._colorSchemeIndex = 0
    }

    // `_categoryIndexCache` is keyed only on `_dataVersion`; an accessor swap
    // without an ingest would leave a stale map. Invalidate explicitly.
    if (
      ("categoryAccessor" in config && !accessorsEquivalent(config.categoryAccessor, prev.categoryAccessor))
      || ("oAccessor" in config && !accessorsEquivalent(config.oAccessor, prev.oAccessor))
    ) {
      this._categoryIndexCache = null
    }

    Object.assign(this.config, config)

    // Pulse is a dynamic prop even though its timestamp resource was created
    // in the constructor. Preserve active timestamps across style/duration
    // changes, seed on enable, and discard them on disable.
    if ("pulse" in config) {
      this.syncPulseTimestampBuffer()
    }

    // Re-resolve accessors only when the accessor spec actually changed, using
    // identity semantics (`accessorsEquivalent` — string by value, function by
    // reference). A new function object re-resolves even if its source matches,
    // because identical source can capture different values. Callers passing
    // inline function accessors should memoize them; string accessors are stable.
    // `in config` rather than `!== undefined` so an explicit clear (prop removed
    // or conditionally rendered `undefined`) still reverts to the fallback.
    let oAccessorChanged = false
    if ("categoryAccessor" in config || "oAccessor" in config) {
      // Compare effective accessors from the merged config: a patch to the
      // deprecated alias must not replace an active canonical accessor.
      const nextO = this.config.categoryAccessor || this.config.oAccessor
      const prevO = prev.categoryAccessor || prev.oAccessor
      if (!accessorsEquivalent(nextO, prevO)) {
        this.getO = resolveStringAccessor(
          this.config.categoryAccessor || this.config.oAccessor,
          "category"
        ) as (d: Datum) => string
        oAccessorChanged = true
      }
    }
    let rAccessorChanged = false
    if ("valueAccessor" in config || "rAccessor" in config) {
      const newR = this.config.valueAccessor || this.config.rAccessor
      const prevR = prev.valueAccessor || prev.rAccessor
      const newArr = Array.isArray(newR) ? newR : [newR]
      const prevArr = Array.isArray(prevR) ? prevR : [prevR]
      rAccessorChanged = newArr.length !== prevArr.length || newArr.some((acc, i) => !accessorsEquivalent(acc, prevArr[i]))
      if (rAccessorChanged) {
        const rawR = this.config.valueAccessor || this.config.rAccessor
        if (Array.isArray(rawR)) {
          this.rAccessors = rawR.map(acc => resolveAccessor(acc, "value"))
          this.getR = this.rAccessors[0]
          this.rExtents = rawR.map(() => new IncrementalExtent())
        } else {
          this.getR = resolveAccessor(rawR, "value")
          this.rAccessors = [this.getR]
          this.rExtents = [this.rExtent]
        }
      }
    }
    if ("stackBy" in config && !accessorsEquivalent(config.stackBy, prev.stackBy)) {
      this.getStack = this.config.stackBy != null ? resolveStringAccessor(this.config.stackBy) : undefined
    }
    if ("groupBy" in config && !accessorsEquivalent(config.groupBy, prev.groupBy)) {
      this.getGroup = this.config.groupBy != null ? resolveStringAccessor(this.config.groupBy) : undefined
    }
    if ("colorAccessor" in config && !accessorsEquivalent(config.colorAccessor, prev.colorAccessor)) {
      this.getColor = this.config.colorAccessor != null ? resolveStringAccessor(this.config.colorAccessor) : undefined
    }
    if ("symbolAccessor" in config && !accessorsEquivalent(config.symbolAccessor, prev.symbolAccessor)) {
      this.getSymbol = this.config.symbolAccessor != null ? resolveStringAccessor(this.config.symbolAccessor) : undefined
    }
    if ("connectorAccessor" in config && !accessorsEquivalent(config.connectorAccessor, prev.connectorAccessor)) {
      this.getConnector = this.config.connectorAccessor != null ? resolveStringAccessor(this.config.connectorAccessor) : undefined
    }

    // A new accessor identity or an explicit revision bump both need to
    // rebuild derived categories/extents from retained data immediately. React
    // normally updates config then schedules a render; it does not re-ingest
    // the same data merely because an accessor changed.
    const accessorRevisionChanged =
      "accessorRevision" in config && config.accessorRevision !== prev.accessorRevision
    if (oAccessorChanged || rAccessorChanged || accessorRevisionChanged) {
      this.rebuildAccessorDerivedState()
    }
    this.updateResults.recordConfig(changedConfigKeys)
  }

  updateConfigWithResult(config: Partial<OrdinalPipelineConfig>): UpdateResult {
    this.updateConfig(config)
    return this.updateResults.last
  }
}
