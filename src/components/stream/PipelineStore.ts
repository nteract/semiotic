import type { Datum } from "../charts/shared/datumTypes"
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
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import type {
  Changeset,
  StreamScales,
  StreamLayout,
  SceneNode,
  Style
} from "./types"
import { resolveAccessor, resolveStringAccessor, accessorsEquivalent, type CoercibleNumber } from "./accessorUtils"
import { coerceDateLikeValue, parseDateLikeString } from "../charts/shared/temporalStrings"
import { toIdSet } from "./pipelineIdentityOps"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import { now as getTimestamp, type ActiveTransition } from "./pipelineTransitionUtils"
import {
  computeDecayOpacity as computeDecayOpacityFn,
  applyDecay as applyDecayFn,
  buildDatumIndexMap
} from "./pipelineDecay"
import { applyPulse as applyPulseFn, hasActivePulses as hasActivePulsesFn } from "./pipelinePulse"
import {
  snapshotPositions as snapshotPositionsFn,
  startTransition as startTransitionFn,
  advanceTransition as advanceTransitionFn,
  getNodeIdentity,
  type PrevPosition,
  type PrevPath,
  type TransitionContext
} from "./pipelineTransitions"
import type { XYSceneContext } from "./xySceneBuilders/types"
import type { ResolvedRibbon } from "./xySceneBuilders/ribbonScene"
import { buildLineScene } from "./xySceneBuilders/lineScene"
import { buildAreaScene, buildStackedAreaScene } from "./xySceneBuilders/areaScene"
import { buildMixedScene } from "./xySceneBuilders/mixedScene"
import { buildPointScene } from "./xySceneBuilders/pointScene"
import { buildHeatmapScene } from "./xySceneBuilders/heatmapScene"
import { buildBarScene } from "./xySceneBuilders/barScene"
import { buildSwarmScene } from "./xySceneBuilders/swarmScene"
import { buildWaterfallScene } from "./xySceneBuilders/waterfallScene"
import { buildCandlestickScene } from "./xySceneBuilders/candlestickScene"
import type { LayoutContext, LayoutResult } from "./customLayout"
import type { CustomLayoutSelection } from "./customLayoutSelection"
import { warnCustomLayoutDiagnostics } from "./customLayoutDiagnostics"
import {
  createCustomLayoutFailureDiagnostic,
  type CustomLayoutFailureDiagnostic
} from "./customLayoutFailure"
import type { MarginType } from "../types/marginType"
import { resolveRibbons } from "./pipelineRibbons"
import {
  buildPipelineScales,
  expandYDomainWithRibbons,
  isFullySpecifiedExtent,
  mergePartialDomain,
  padYDomain,
  reapplyPartialYExtent,
  rescueDegenerateDomains,
  resolveBarBinYDomain,
  resolveStackedAreaYDomain,
  resolveWaterfallYDomain,
  type StackExtentCache,
  makePipelineScale
} from "./pipelineDomainResolution"
import {
  groupPipelineData,
  resolvePipelineColorMap,
  resolvePipelineGroupColor,
  resolvePipelineLineStyle,
  resolvePipelineAreaStyle,
  resolvePipelineBoundsStyle,
} from "./pipelineStyleResolvers"
import {
  type PipelineConfig,
  DEFAULT_GROWING_MAX_CAPACITY,
  GROWING_CAPACITY_WARN_THRESHOLD
} from "./pipelineConfig"
import {
  compactTimestampBufferForRemoval,
  createTimestampBufferForData,
  ensureRingBufferCapacity,
  pushWithTimestamp
} from "./pipelineBufferUtils"
import type { UpdateResult } from "./pipelineUpdateContract"
import { attachUpdateResultStore, type UpdateResultStore } from "./pipelineUpdateStore"
import { PipelineStoreUpdateResults } from "./pipelineStoreUpdateResults"
import { PipelineSpatialIndex } from "./pipelineSpatialIndex"

export type { PipelineConfig } from "./pipelineConfig"
export type {
  ChangeSet,
  Invalidation,
  RevisionSet,
  UpdateResult,
} from "./pipelineUpdateContract"
export {
  DEFAULT_GROWING_MAX_CAPACITY,
  GROWING_CAPACITY_WARN_THRESHOLD
} from "./pipelineConfig"

// ── PipelineStore config ───────────────────────────────────────────────

export class PipelineStore implements UpdateResultStore {
  declare getLastUpdateResult: () => UpdateResult
  declare getUpdateSnapshot: () => UpdateResult
  declare subscribeUpdateResult: (listener: () => void) => () => void
  declare setLayoutSelection: (selection: CustomLayoutSelection | null) => void
  declare markStylePaintPending: () => void
  declare consumeStylePaintPending: () => boolean

  private buffer: RingBuffer<Datum>
  private xExtent = new IncrementalExtent()
  private yExtent = new IncrementalExtent()
  private config: PipelineConfig
  private growingCap: number
  private growingCapacityWarned = false
  private windowSizeWarned = false

  private getX: (d: Datum) => number
  private getY: (d: Datum) => number
  private getGroup: ((d: Datum) => string) | undefined
  private getCategory: ((d: Datum) => string) | undefined
  private getSize: ((d: Datum) => number) | undefined
  private getColor: ((d: Datum) => string) | undefined
  private getSymbol: ((d: Datum) => string) | undefined
  private getY0: ((d: Datum) => number) | undefined
  /** Unified ribbon list — `boundsAccessor` + `band` both compose into
   *  this single array (see `resolveRibbons`). Read by the scene
   *  builders, y-extent expansion, and tooltip enrichment (which
   *  filters on `kind === "band"`). Empty when neither prop is set. */
  resolvedRibbons: ResolvedRibbon[] = []
  private getOpen: ((d: Datum) => number) | undefined
  private getHigh: ((d: Datum) => number) | undefined
  private getLow: ((d: Datum) => number) | undefined
  private getClose: ((d: Datum) => number) | undefined
  private getPointId: ((d: Datum) => string) | undefined

  // ── Pulse tracking ──────────────────────────────────────────────────
  private timestampBuffer: RingBuffer<number> | null = null

  // ── Transition animation ────────────────────────────────────────────
  activeTransition: ActiveTransition | null = null
  private _hasRenderedOnce = false
  private prevPositionMap = new Map<string, PrevPosition>()
  /** Previous line/area path arrays for path interpolation */
  private prevPathMap = new Map<string, PrevPath>()
  /** Exit nodes awaiting fade-out removal */
  exitNodes: SceneNode[] = []

  // ── Staleness tracking ──────────────────────────────────────────────
  lastIngestTime = 0

  /** Keep ingest, pulse, staleness, and transition timestamps on one clock. */
  private currentTime(): number {
    return this.config.clock?.() ?? getTimestamp()
  }

  // ── Color map caching ──────────────────────────────────────────────
  /** Unified color map cache keyed by sorted category set — shared across point, swarm, etc. */
  private _colorMapCache: { key: string; map: Map<string, string>; version: number } | null = null
  /** groupData() result cache. The line/area/stacked-area builders all re-bucket
   *  the same buffer by group on every scene build (twice per frame for stacked
   *  area); cache keyed on (_ingestVersion, group accessor, data ref) so a
   *  streaming push re-buckets once rather than per builder. Mirrors the
   *  resolveColorMap cache. Buckets are read-only downstream, so sharing is safe. */
  private _groupDataCache: { version: number; group: ((d: Datum) => string) | undefined; data: Datum[]; result: { key: string; data: Datum[] }[] } | null = null
  /** Separate group→color map for resolveGroupColor (insertion-order based, never invalidates _colorMapCache).
   *  FIFO-bounded to `GROUP_COLOR_MAP_CAP` entries — in long-running streams with unique group IDs (e.g. UUIDs
   *  as `lineBy` keys) this would otherwise grow unboundedly. Evicted groups that re-appear get a new palette
   *  slot; stable color assignment is only guaranteed for the most-recent `CAP` unique groups. */
  private _groupColorMap: Map<string, string> = new Map()
  /** Monotonic counter for group-color palette indexing. Decoupled from `_groupColorMap.size` so FIFO eviction
   *  doesn't cause new groups to collide with existing entries on a shrunk map. */
  private _groupColorCounter: number = 0
  private static readonly GROUP_COLOR_MAP_CAP = 1000
  private _barCategoryCache: { key: string; order: string[] } | null = null
  /** Sorted bin boundary values from the last bar scene build (for data-driven brush snapping) */
  private _binBoundaries: number[] = []

  // ── Stacked area extent caching ───────────────────────────────────
  /** Cache stacked area cumulative sums to skip recalculation when buffer hasn't changed */
  private _stackExtentCache: StackExtentCache | null = null
  /** Monotonic counter incremented on each ingest — used as part of cache keys */
  private _ingestVersion = 0
  /** Datum→index map for decay/pulse, cached by `_ingestVersion`. */
  private _datumIndexCache: { version: number; map: Map<Datum, number> } | null = null

  // ── Buffer array caching ────────────────────────────────────────────
  /** Cached materialized array from buffer.toArray() — only rebuilt when buffer changes */
  private _bufferArrayCache: Datum[] | null = null
  /** True when the buffer has been mutated since last toArray() call */
  private _bufferDirty = true

  // ── Resize optimization──────────────────────────────────────────────
  private needsFullRebuild = true
  private lastLayout: StreamLayout | null = null

  // Additive M1 reference state. Existing frame paths still use their current
  // dirty flags; new hosts can observe the same mutations as explicit results.
  protected updateResults = new PipelineStoreUpdateResults()

  scales: StreamScales | null = null
  scene: SceneNode[] = []
  version = 0
  /** Overlays returned from customLayout (consumed by StreamXYFrame for SVGOverlay). */
  customLayoutOverlays: import("react").ReactNode = null
  /** The most recent custom layout result, exposed for host readback via the
   *  frame handle's `getCustomLayout()` — so a page that needs the computed
   *  placement (stats, inspectors) doesn't re-run the layout. Null before the
   *  first layout or when no custom layout is set. A rerun failure preserves
   *  this last successful result when it is safe to do so. */
  lastCustomLayoutResult: LayoutResult | null = null
  /** Latest custom-layout failure for frame-handle readback. */
  lastCustomLayoutFailure: CustomLayoutFailureDiagnostic | null = null
  /** Set only while `buildSceneNodes` is recovering from a layout exception.
   * `computeScene` uses it to retain the previous scene/scales without applying
   * a new transition, pulse, or decay pass to that retained output. */
  private _customLayoutFailedThisBuild = false
  private _customLayoutDiagnosticsWarned = new Set<string>()
  /** Per-frame restyle callback from the custom layout result (see LayoutResult.restyle). */
  private _customRestyle: LayoutResult["restyle"] = undefined
  /** True when the active custom layout supplied a `restyle`. */
  hasCustomRestyle = false
  /** Base (as-emitted) style per node, so restyle passes don't compound. */
  private _baseStyles = new WeakMap<object, Style>()

  /** True when the x accessor returns Date objects (auto-detected on first data ingestion) */
  xIsDate = false

  // ── Quadtree spatial index for O(log n) point hit testing ──────────
  private spatialIndex = new PipelineSpatialIndex()

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
    this.getSymbol = resolveStringAccessor(config.symbolAccessor)
    this.getY0 = config.y0Accessor
      ? resolveAccessor(config.y0Accessor, "y0")
      : undefined

    this.resolvedRibbons = resolveRibbons(config)

    this.getPointId = resolveStringAccessor(config.pointIdAccessor)

    // Candlestick accessors
    if (config.chartType === "candlestick") {
      const hasOpen = config.openAccessor != null
      const hasClose = config.closeAccessor != null
      this.getOpen = hasOpen ? resolveAccessor(config.openAccessor, "open") : undefined
      this.getHigh = resolveAccessor(config.highAccessor, "high")
      this.getLow = resolveAccessor(config.lowAccessor, "low")
      this.getClose = hasClose ? resolveAccessor(config.closeAccessor, "close") : undefined
      // Range mode: both open AND close must be missing. If only one is provided, the scene builder returns [].
      this.config.candlestickRangeMode = !hasOpen && !hasClose
    }

    // Pulse: parallel timestamp buffer
    if (config.pulse) {
      this.timestampBuffer = new RingBuffer(config.windowSize)
    }
  }

  /**
   * Keep pulse timestamps structurally coupled to the datum ring when pulse
   * is changed after construction. A fresh timestamp ring must be seeded for
   * already-retained data; otherwise the next push would be timestamp index 0
   * while its datum is at the end of the data ring.
   */
  private syncPulseTimestampBuffer(): void {
    if (!this.config.pulse) {
      this.timestampBuffer = null
      return
    }

    const isAligned = this.timestampBuffer != null
      && this.timestampBuffer.capacity === this.buffer.capacity
      && this.timestampBuffer.size === this.buffer.size
    if (!isAligned) {
      this.timestampBuffer = createTimestampBufferForData(this.buffer, this.currentTime())
    }
  }

  private pushDatumYExtent(d: Datum): void {
    if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
      this.yExtent.push(this.getHigh(d))
      this.yExtent.push(this.getLow(d))
      return
    }
    this.yExtent.push(this.getY(d))
    if (this.getY0) this.yExtent.push(this.getY0(d))
    for (const r of this.resolvedRibbons) {
      const top = r.getTop(d)
      const bottom = r.getBottom(d)
      if (Number.isFinite(top)) this.yExtent.push(top)
      if (Number.isFinite(bottom)) this.yExtent.push(bottom)
    }
  }

  /**
   * Remove every y-domain contribution made by {@link pushDatumYExtent}.
   * Keeping these paths paired is important: a ribbon/band can extend the
   * visible domain beyond the point itself, so removing or replacing that
   * datum must evict its envelope extrema too.
   */
  private evictDatumYExtent(d: Datum): void {
    if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
      this.yExtent.evict(this.getHigh(d))
      this.yExtent.evict(this.getLow(d))
      return
    }
    this.yExtent.evict(this.getY(d))
    if (this.getY0) this.yExtent.evict(this.getY0(d))
    for (const r of this.resolvedRibbons) {
      const top = r.getTop(d)
      const bottom = r.getBottom(d)
      if (Number.isFinite(top)) this.yExtent.evict(top)
      if (Number.isFinite(bottom)) this.yExtent.evict(bottom)
    }
  }

  private rebuildYExtent(): void {
    this.yExtent.clear()
    for (const d of this.buffer) {
      this.pushDatumYExtent(d)
    }
  }

  private rebuildExtents(): void {
    this.xExtent.clear()
    this.yExtent.clear()
    for (const d of this.buffer) {
      this.xExtent.push(this.getX(d))
      this.pushDatumYExtent(d)
    }
  }

  // Last `inserts` array reference seen by a `bounded: true` ingest.
  // The render-time SSR branch in every Stream Frame calls
  // `store.ingest({ inserts: data, bounded: true })` from inside
  // render — necessary because there's no useEffect path on the
  // server pass, and the in-frame SVG branch needs the scene populated
  // before it can serialize. React StrictMode renders components
  // twice, so without an idempotency check we'd ingest the same array
  // twice per dev-mode mount. The fast-path comparison below makes
  // the second call a true no-op when the data reference is unchanged.
  private _lastBoundedInsertsRef: unknown[] | null = null

  /**
   * Process a changeset from DataSourceAdapter.
   * Returns true if the scene needs re-rendering.
   *
   * Bounded mode is idempotent on identical `inserts` references —
   * passing the same array a second time is a no-op (returns `false`,
   * indicating no re-render needed). This makes render-time calls
   * from the SSR branch safe under React StrictMode / concurrent
   * rendering, where render runs twice. Non-bounded (streaming)
   * ingests have no such guard because each new buffer entry is
   * meaningful — streaming consumers don't pass the same array twice.
   */
  ingest(changeset: Changeset): boolean {
    if (changeset.bounded && this._lastBoundedInsertsRef === changeset.inserts) {
      // Same data reference — already fully ingested in a prior call.
      // Skip the buffer-clear + re-extent work; the existing scene
      // state is exactly what this call would produce.
      this.updateResults.recordNoop("replace")
      return false
    }
    const now = this.currentTime()
    this.lastIngestTime = now
    this.needsFullRebuild = true
    this._bufferDirty = true
    this._ingestVersion++

    if (changeset.bounded) {
      this._lastBoundedInsertsRef = changeset.inserts
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
          : (sample as Record<string, unknown>)[rawAccessor || "x"]

        const isDateObj = rawVal instanceof Date
        const isDateStr = typeof rawVal === "string"
          && Number.isFinite(parseDateLikeString(rawVal))

        this.xIsDate = isDateObj || isDateStr

        // resolveAccessor wraps with unary + which converts Date objects to
        // epoch ms correctly, but date strings like "2003-01-06" and
        // year-month strings like "2003-01" become NaN.
        // Swap getX to a date-parsing accessor when date strings are detected.
        if (isDateStr) {
          const key = typeof rawAccessor === "string" ? rawAccessor : undefined
          this.getX = key
            ? (d: Datum) => coerceDateLikeValue(d[key])
            : (d: Datum) => coerceDateLikeValue((rawAccessor as (d: Datum) => CoercibleNumber)(d))
        }
      }

      // Auto-resize buffer to fit all bounded data.
      // totalSize is set when data is progressively chunked — pre-allocate
      // for the full dataset so subsequent append chunks don't evict.
      const targetSize = changeset.totalSize || changeset.inserts.length
      ensureRingBufferCapacity(this.buffer, targetSize, this.timestampBuffer)

      for (const d of changeset.inserts) {
        pushWithTimestamp(this.buffer, d, this.timestampBuffer, now)
        this.xExtent.push(this.getX(d))
        this.pushDatumYExtent(d)
      }
    } else {
      // Streaming append
      for (const d of changeset.inserts) {
        if (this.config.windowMode === "growing" && this.buffer.full) {
          const maxCap = this.config.maxCapacity ?? DEFAULT_GROWING_MAX_CAPACITY
          if (this.growingCap < maxCap) {
            this.growingCap = Math.min(this.growingCap * 2, maxCap)
            this.buffer.resize(this.growingCap)
            if (this.timestampBuffer) this.timestampBuffer.resize(this.growingCap)
            if (
              process.env.NODE_ENV !== "production" &&
              !this.growingCapacityWarned &&
              this.growingCap >= GROWING_CAPACITY_WARN_THRESHOLD
            ) {
              this.growingCapacityWarned = true
              console.warn(
                `[Semiotic] Growing window buffer reached ${this.growingCap} points ` +
                  `(cap ${maxCap}). Large canvas scenes are expensive — prefer a sliding ` +
                  `window, aggregation, or an explicit maxCapacity if this is intentional.`
              )
            }
          }
        }

        const evicted = pushWithTimestamp(this.buffer, d, this.timestampBuffer, now)
        this.xExtent.push(this.getX(d))
        this.pushDatumYExtent(d)

        if (evicted != null) {
          this.xExtent.evict(this.getX(evicted))
          this.evictDatumYExtent(evicted)
        }
      }
    }

    this.updateResults.recordData(changeset.bounded ? "replace" : "ingest", changeset.inserts.length)
    return true
  }

  /** Additive explicit-result form of {@link ingest}; `ingest()` remains unchanged. */
  ingestWithResult(changeset: Changeset): UpdateResult {
    this.ingest(changeset)
    return this.updateResults.last
  }

  /**
   * Recompute scales and scene graph for the current buffer contents.
   */
  computeScene(layout: StreamLayout): void {
    const { config, buffer } = this
    const previousScales = this.scales
    const previousLastLayout = this.lastLayout

    // Fast path: if only layout dimensions changed (no data or config change),
    // remap existing scene node coordinates instead of rebuilding from scratch.
    //
    // Excluded for custom layouts: a custom layout positions both scene nodes
    // AND overlays with arbitrary geometry (fixed pixel offsets, non-linear
    // padding floors, glyph chrome), so a *proportional* coordinate remap is
    // not equivalent to re-running the layout — and crucially `remapScene`
    // never regenerates `customLayoutOverlays`, so the overlay glyphs would
    // stay at the previous dimensions while the canvas scene nodes move,
    // drifting the two apart on a responsive resize (the classic "flowers
    // offset from their stems until any other change forces a rebuild" bug).
    // Re-running the layout on a dimension change is the correct behavior for
    // these and the per-resize cost is acceptable.
    if (
      !this.needsFullRebuild &&
      !config.customLayout &&
      this.lastLayout &&
      this.scene.length > 0 &&
      this.scales &&
      (this.config.scalePadding ?? 0) <= 0 &&  // positive scalePadding requires full rebuild (proportional remap distorts constant pixel inset)
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
      this.rebuildYExtent()
    }

    // Materialize buffer once for all downstream consumers (cached when unchanged)
    const bufferArray = this.getBufferArray()

    // Resolve domains — merge user-specified extents with data extents
    // (chart-type rules + scale construction live in pipelineDomainResolution.ts)
    const dataXDomain = this.xExtent.extent
    const dataYDomain = this.yExtent.extent
    let xDomain = mergePartialDomain(dataXDomain, config.xExtent)
    let yDomain = mergePartialDomain(dataYDomain, config.yExtent)

    const yFullySpecified = isFullySpecifiedExtent(config.yExtent)
    const exactMode = config.axisExtent === "exact"

    if (config.chartType === "stackedarea" && !yFullySpecified && buffer.size > 0) {
      const stacked = resolveStackedAreaYDomain({
        config,
        groups: this.groupData(bufferArray),
        getX: this.getX,
        getY: this.getY,
        bufferSize: buffer.size,
        ingestVersion: this._ingestVersion,
        stackExtentCache: this._stackExtentCache
      })
      yDomain = stacked.yDomain
      this._stackExtentCache = stacked.stackExtentCache
    } else if (config.chartType === "bar" && config.binSize && !yFullySpecified && buffer.size > 0) {
      yDomain = resolveBarBinYDomain(
        buffer,
        this.getX,
        this.getY,
        config.binSize,
        this.getCategory,
        config.extentPadding,
        exactMode
      )
    } else if (config.chartType === "waterfall" && !yFullySpecified && buffer.size > 0) {
      yDomain = resolveWaterfallYDomain(
        buffer,
        this.getY,
        config.extentPadding,
        exactMode
      )
    } else if (!yFullySpecified && yDomain[0] !== Infinity) {
      yDomain = expandYDomainWithRibbons(
        yDomain,
        bufferArray,
        this.resolvedRibbons
      )
      yDomain = padYDomain(yDomain, {
        exactMode,
        extentPadding: config.extentPadding,
        userMin: config.yExtent?.[0],
        userMax: config.yExtent?.[1],
        yScaleType: config.yScaleType,
        dataYDomain
      })
    }

    yDomain = reapplyPartialYExtent(yDomain, config.yExtent, !!yFullySpecified)
    ;({ xDomain, yDomain } = rescueDegenerateDomains(
      xDomain,
      yDomain,
      config.xScaleType
    ))

    this.scales = buildPipelineScales({
      config,
      layout,
      xDomain,
      yDomain
    })

    // Build scene graph based on chart type
    this._customLayoutFailedThisBuild = false
    const nextScene = this.buildSceneNodes(layout, bufferArray)
    if (this._customLayoutFailedThisBuild) {
      const preservedLastGoodScene =
        this.lastCustomLayoutFailure?.preservedLastGoodScene === true
      if (preservedLastGoodScene) {
        // Keep the already-rendered custom scene, its old scales, and its
        // overlays aligned. Applying the new decay/pulse/transition state to
        // retained nodes would turn recovery into a subtly corrupted repaint.
        this.scales = previousScales
        this.lastLayout = previousLastLayout
      } else {
        // A custom layout newly added to a built-in chart may fail before it
        // ever produces output. Do not leave the built-in scene visible and
        // accidentally report it as a custom-layout recovery.
        this.scene = []
        this.spatialIndex.rebuild(this.config.chartType, this.scene)
      }
      this.needsFullRebuild = true
      return
    }

    // Snapshot positions for transition animation only after a successful
    // layout attempt. A failed custom layout must leave the retained scene's
    // animation state untouched.
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }
    this.scene = nextScene

    // Apply decay opacity to discrete nodes
    if (this.config.decay) {
      this.applyDecay(this.scene, bufferArray)
    }

    // Apply pulse glow to discrete nodes
    if (this.config.pulse) {
      this.applyPulse(this.scene, bufferArray, this.currentTime())
    }

    // Intro animation: synthesize zero-state on first render
    if (this.config.transition && !this._hasRenderedOnce && this.scene.length > 0) {
      if (this.config.introAnimation) {
        this.synthesizeIntroPositions()
      }
      this._hasRenderedOnce = true
    }

    // Start transition animation from old to new positions
    if (this.config.transition && (this.prevPositionMap.size > 0 || this.prevPathMap.size > 0)) {
      this.startTransition()
    }

    // Build quadtree spatial index for dense point scenes
    this.spatialIndex.rebuild(this.config.chartType, this.scene)

    this.needsFullRebuild = false
    this.lastLayout = { width: layout.width, height: layout.height }
    this.version++
  }

  /** Get the retained point-scene spatial index, if available. */
  get quadtree() { return this.spatialIndex.quadtree }

  /** Largest visual point radius in the current scene. */
  get maxPointRadius(): number { return this.spatialIndex.maxPointRadius }

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
          // Remap user-supplied clipRect (horizon recipe) so responsive
          // resizes don't leave the clip in stale coordinates.
          if (node.clipRect) {
            node.clipRect = {
              x: node.clipRect.x * wRatio,
              y: node.clipRect.y * hRatio,
              width: node.clipRect.width * wRatio,
              height: node.clipRect.height * hRatio,
            }
          }
          if (node.strokeColorBands) {
            node.strokeColorBands = node.strokeColorBands.map((band) => ({
              ...band,
              y: band.y * hRatio,
              height: band.height * hRatio,
            }))
          }
          break
        case "point":
          node.x *= wRatio; node.y *= hRatio
          break
        case "glyph":
          // Position tracks the resize; drawn size stays author-set (like
          // a point's radius).
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
    const remapScale = makePipelineScale
    // Rebuild ranges preserving original direction (e.g. arrowOfTime="left" has reversed x range)
    const rsp = Math.max(0, Math.min(this.config.scalePadding || 0, Math.min(layout.width, layout.height) / 2 - 1))
    const xFlipped = oldXRange[0] > oldXRange[1]
    const yFlipped = oldYRange[0] < oldYRange[1]  // standard Y is [height, 0] (flipped = [0, height])
    this.scales = {
      x: remapScale(this.config.xScaleType, xDomain,
        xFlipped ? [layout.width - rsp, rsp] : [rsp, layout.width - rsp]),
      y: remapScale(this.config.yScaleType, yDomain,
        yFlipped ? [rsp, layout.height - rsp] : [layout.height - rsp, rsp])
    }

    this.lastLayout = { width: layout.width, height: layout.height }

    // Rebuild quadtree with remapped coordinates
    this.spatialIndex.rebuild(this.config.chartType, this.scene)

    this.version++
  }

  private buildSceneNodes(layout: StreamLayout, data: Datum[]): SceneNode[] {
    const { config, scales } = this
    if (!scales) return []

    // customLayout escape hatch — short-circuit chart-type dispatch when
    // the user has supplied their own layout function. The layout runs
    // against fully-built scales so it can use them directly, and gets
    // the same theme/color resolution as built-in scene builders.
    if (config.customLayout) {
      const margin: MarginType = config.layoutMargin ?? { top: 0, right: 0, bottom: 0, left: 0 }
      const layoutCtx: LayoutContext = {
        data,
        scales,
        dimensions: {
          // All scene-node coordinates are plot-relative (the canvas/SVG
          // group already lives inside `margin.left`/`margin.top`), so
          // `dimensions.width`/`height` describe the plot rect, matching
          // `dimensions.plot.width`/`height`. Read `margin` if you need the
          // outer canvas size.
          width: layout.width,
          height: layout.height,
          margin,
          plot: { x: 0, y: 0, width: layout.width, height: layout.height }
        },
        theme: {
          semantic: config.themeSemantic ?? {},
          categorical: config.themeCategorical ?? STREAMING_PALETTE
        },
        resolveColor: (group, datum) => {
          const c = this.resolveGroupColor(group)
          if (c) return c
          // fall back to line style resolver for sample-aware color
          const s = this.resolveLineStyle(group, datum)
          if (s.stroke) return s.stroke
          // s.fill can be a CanvasPattern; only return string fills
          if (typeof s.fill === "string") return s.fill
          return config.themeSemantic?.primary ?? "#4e79a7"
        },
        // `layoutConfig` is typed as `object` at the frame boundary so any
        // user-defined config interface flows through without casts. The
        // narrowing back to `C` happens through the user's typed
        // `CustomLayout<C>` parameter — at this boundary, hand the value
        // through as the default `Record<string, unknown>`.
        config: (config.layoutConfig ?? {}) as Record<string, unknown>,
        selection: config.layoutSelection ?? null,
      }
      let result
      try {
        result = config.customLayout(layoutCtx)
      } catch (err) {
        const preservedLastGoodScene = this.lastCustomLayoutResult !== null
        const diagnostic = createCustomLayoutFailureDiagnostic(
          "xy",
          err,
          preservedLastGoodScene,
          this.version
        )
        this.lastCustomLayoutFailure = diagnostic
        this._customLayoutFailedThisBuild = true
        if (process.env.NODE_ENV !== "production") {
          console.error("[semiotic] customLayout threw:", err)
        }
        try {
          config.onLayoutError?.(diagnostic)
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
      // Stash the per-frame restyle callback; its presence opts into the cheap
      // selection path. Snapshot base styles and apply once for the current
      // selection (these `nodes` become `this.scene`, so restyleScene mutates them).
      this._customRestyle = result.restyle
      this.hasCustomRestyle = !!result.restyle
      if (this.hasCustomRestyle) {
        this._baseStyles = new WeakMap()
        for (const n of nodes) if (n.style) this._baseStyles.set(n, n.style)
        this.applyCustomRestyle(nodes, config.layoutSelection ?? null)
      }
      warnCustomLayoutDiagnostics({
        label: "customLayout",
        nodes,
        overlays: this.customLayoutOverlays,
        warned: this._customLayoutDiagnosticsWarned,
      })
      return nodes
    }

    // Built-in chart types: ensure stale overlays from a prior customLayout
    // run don't bleed through after the user removes the prop.
    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false

    if (data.length === 0) return []

    const ctx: XYSceneContext = {
      scales,
      config,
      getX: this.getX,
      getY: this.getY,
      getY0: this.getY0,
      getSize: this.getSize,
      getColor: this.getColor,
      getSymbol: this.getSymbol,
      getGroup: this.getGroup,
      getCategory: this.getCategory,
      getPointId: this.getPointId,
      ribbons: this.resolvedRibbons,
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
      case "mixed":
        return buildMixedScene(ctx, data)
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

  private resolveBoundsStyle(group: string, sampleDatum?: Datum): Style {
    return resolvePipelineBoundsStyle(
      this.config,
      group,
      sampleDatum,
      (g, d) => this.resolveLineStyle(g, d)
    )
  }

  // ── Decay (delegated to pipelineDecay.ts) ───────────────────────────

  computeDecayOpacity(bufferIndex: number, bufferSize: number): number {
    const decay = this.config.decay
    if (!decay || bufferSize <= 1) return 1
    return computeDecayOpacityFn(decay, bufferIndex, bufferSize)
  }

  private getDatumIndexMap(data: Datum[]): Map<Datum, number> {
    if (this._datumIndexCache && this._datumIndexCache.version === this._ingestVersion) {
      return this._datumIndexCache.map
    }
    const map = buildDatumIndexMap(data)
    this._datumIndexCache = { version: this._ingestVersion, map }
    return map
  }

  private applyDecay(nodes: SceneNode[], data: Datum[]): void {
    if (!this.config.decay) return
    applyDecayFn(this.config.decay, nodes, data, this.getDatumIndexMap(data))
  }

  // ── Pulse (delegated to pipelinePulse.ts) ──────────────────────────
  private applyPulse = (nodes: SceneNode[], data: Datum[], now?: number): boolean =>
    this.config.pulse && this.timestampBuffer
      ? applyPulseFn(this.config.pulse, nodes, data, this.timestampBuffer, this.getDatumIndexMap(data), now)
      : false

  /** Refresh pulse fields without rebuilding layout; retained custom scenes stay immutable. */
  refreshPulse(now: number): boolean {
    if (this.lastCustomLayoutFailure?.preservedLastGoodScene === true) return false
    return this.applyPulse(this.scene, this.getBufferArray(), now)
  }

  hasActivePulsesAt(now: number): boolean {
    return !!this.config.pulse && hasActivePulsesFn(this.config.pulse, this.timestampBuffer, now)
  }

  get hasActivePulses(): boolean { return this.hasActivePulsesAt(this.currentTime()) }

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

  /** Synthesize a zero-state prevPositionMap/prevPathMap for animated intro (first render). */
  private synthesizeIntroPositions(): void {
    this.prevPositionMap.clear()
    this.prevPathMap.clear()
    const baseline = this.scales?.y(0) ?? 0

    for (let i = 0; i < this.scene.length; i++) {
      const node = this.scene[i]
      const key = getNodeIdentity(this.transitionContext, node, i)
      if (!key) continue

      if (node.type === "point") {
        this.prevPositionMap.set(key, { x: node.x, y: node.y, r: 0, opacity: 0 })
      } else if (node.type === "rect") {
        this.prevPositionMap.set(key, {
          x: node.x, y: baseline, w: node.w, h: 0, opacity: node.style.opacity ?? 1
        })
      } else if (node.type === "heatcell") {
        this.prevPositionMap.set(key, {
          x: node.x, y: node.y, w: node.w, h: node.h, opacity: 0
        })
      } else if (node.type === "line") {
        // Draw from left: use actual path, reveal via clip fraction 0→1
        node._introClipFraction = 0
        this.prevPathMap.set(key, {
          path: node.path.map(p => [p[0], p[1]] as [number, number]),
          opacity: node.style.opacity
        })
      } else if (node.type === "area") {
        // Draw from left: use actual paths, reveal via clip fraction 0→1
        node._introClipFraction = 0
        this.prevPathMap.set(key, {
          topPath: node.topPath.map(p => [p[0], p[1]] as [number, number]),
          bottomPath: node.bottomPath.map(p => [p[0], p[1]] as [number, number]),
          opacity: node.style.opacity
        })
      }
    }
  }

  private startTransition(): void {
    if (!this.config.transition) return
    const state = startTransitionFn(
      this.transitionContext, this.config.transition,
      { scene: this.scene, exitNodes: this.exitNodes, activeTransition: this.activeTransition },
      this.prevPositionMap, this.prevPathMap, this.currentTime()
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

  /**
   * Cancel any pending intro animation that the most recent
   * `computeScene` call set up. After this, the next paint shows the
   * scene in its final state directly — no transition from zero-state
   * positions, no clip-from-left animation on line/area marks.
   *
   * Stream Frames call this when they detect SSR hydration: the server
   * already painted the chart in its final state via the SVG branch,
   * so re-animating from blank when the canvas takes over is a visual
   * regression. Subsequent data-change transitions still animate
   * normally because they re-populate `prevPositionMap` from the
   * snapshot taken before the change.
   *
   * Per-node `_introClipFraction` MUST be cleared too — line and area
   * canvas renderers consume it directly (a `clipFrac < 1` produces a
   * left-clip that hides the rest of the path), and `synthesizeIntroPositions`
   * sets it to 0. Without the clear, line / area charts would paint
   * blank on the first canvas frame after hydration.
   *
   * Idempotent — a second call is a no-op since the maps are already
   * empty and the per-node flags are already undefined.
   */
  cancelIntroAnimation(): void {
    this.prevPositionMap.clear()
    this.prevPathMap.clear()
    this.activeTransition = null
    for (const node of this.scene) {
      if (node.type === "line" || node.type === "area") {
        node._introClipFraction = undefined
      }
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private groupData(data: Datum[]): { key: string; data: Datum[] }[] {
    const { result, cache } = groupPipelineData(
      data,
      this.getGroup,
      this._ingestVersion,
      this._groupDataCache
    )
    this._groupDataCache = cache
    return result
  }

  /**
   * Resolve a category→color map from data using the colorAccessor.
   * Caches the result in _colorMapCache keyed by `_ingestVersion` (fast path)
   * and a sorted-category fingerprint (so palette/scheme changes still
   * invalidate). Multiple scene builders within one frame skip the data scan
   * entirely after the first call.
   */
  private resolveColorMap(data: Datum[]): Map<string, string> {
    const { map, cache } = resolvePipelineColorMap(
      data,
      this.getColor,
      this.config,
      this._ingestVersion,
      this._colorMapCache
    )
    this._colorMapCache = cache
    return map
  }

  private resolveLineStyle(group: string, sampleDatum?: Datum): Style {
    return resolvePipelineLineStyle(
      this.config,
      group,
      sampleDatum,
      (g) => this.resolveGroupColor(g)
    )
  }

  private resolveAreaStyle(group: string, sampleDatum?: Datum): Style {
    return resolvePipelineAreaStyle(
      this.config,
      group,
      sampleDatum,
      (g) => this.resolveGroupColor(g)
    )
  }

  private resolveGroupColor(group: string): string | null {
    const { color, groupColorCounter } = resolvePipelineGroupColor({
      group,
      colorMapCache: this._colorMapCache,
      groupColorMap: this._groupColorMap,
      groupColorCounter: this._groupColorCounter,
      groupColorMapCap: PipelineStore.GROUP_COLOR_MAP_CAP,
      config: this.config
    })
    this._groupColorCounter = groupColorCounter
    return color
  }


  // ── Buffer array cache ──────────────────────────────────────────────

  /**
   * Return a cached materialized array of the buffer contents.
   * Only calls buffer.toArray() when the buffer has actually changed
   * (new push, resize, or clear), avoiding per-frame allocation on
   * transition ticks, hover redraws, and other non-data-changing renders.
   */
  private getBufferArray(): Datum[] {
    if (this._bufferDirty || !this._bufferArrayCache) {
      this._bufferArrayCache = this.buffer.toArray()
      this._bufferDirty = false
    }
    return this._bufferArrayCache
  }

  // ── Public accessors ─────────────────────────────────────────────────

  getData(): Datum[] {
    return this.getBufferArray()
  }

  /**
   * Remove data points by ID. Requires pointIdAccessor to be configured.
   * Returns the removed items. Marks the store dirty for scene rebuild.
   */
  remove(id: string | string[]): Datum[] {
    if (!this.getPointId) {
      throw new Error("remove() requires pointIdAccessor to be configured")
    }
    // Snapshot positions before mutation so the transition system can animate exits
    if (this.config.transition && this.scene.length > 0) {
      this.snapshotPositions()
    }
    const ids = toIdSet(id)
    const getPointId = this.getPointId
    const predicate = (item: Datum) => ids.has(getPointId(item))
    compactTimestampBufferForRemoval(this.buffer, this.timestampBuffer, predicate)

    const removed = this.buffer.remove(predicate)
    if (removed.length === 0) {
      this.updateResults.recordNoop("remove")
      return removed
    }

    // Evict removed values from extent tracking — mirror ingest() logic
    for (const d of removed) {
      this.xExtent.evict(this.getX(d))
      this.evictDatumYExtent(d)
    }

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._ingestVersion++
    // A removal is data activity — refresh the staleness clock so a chart
    // mutated via remove() isn't flagged stale.
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("remove", removed.length)
    return removed
  }

  /**
   * Update data points by ID. Requires pointIdAccessor.
   * The updater receives the current datum and returns the replacement.
   * Returns the previous values. Extents and scene are marked dirty.
   */
  update(id: string | string[], updater: (d: Datum) => Datum): Datum[] {
    if (!this.getPointId) {
      throw new Error("update() requires pointIdAccessor to be configured")
    }
    const ids = toIdSet(id)
    const getPointId = this.getPointId
    // Capture matched indices before mutation (updater may change the ID field)
    const matchedIndices = new Set<number>()
    this.buffer.forEach((d, i) => { if (ids.has(getPointId(d))) matchedIndices.add(i) })

    const previous = this.buffer.update(
      item => ids.has(getPointId(item)),
      updater
    )
    if (previous.length === 0) {
      this.updateResults.recordNoop("update")
      return previous
    }

    // Evict old values — mirror ingest() logic for candlestick/y0
    for (const old of previous) {
      this.xExtent.evict(this.getX(old))
      this.evictDatumYExtent(old)
    }
    // Push new extents using pre-captured indices (safe if ID changed)
    this.buffer.forEach((d, i) => {
      if (matchedIndices.has(i)) {
        this.xExtent.push(this.getX(d))
        this.pushDatumYExtent(d)
      }
    })

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._ingestVersion++
    // An in-place update is data activity — refresh the staleness clock so a
    // chart streamed via update() isn't flagged stale between updates.
    this.lastIngestTime = this.currentTime()
    this.updateResults.recordData("update", previous.length)
    return previous
  }

  /** Returns sorted bin boundary values from the last bar scene build. Persists until clear() or the next bar scene build. */
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
    this._hasRenderedOnce = false
    if (this.timestampBuffer) this.timestampBuffer.clear()
    this.prevPositionMap.clear()
    this.prevPathMap.clear()
    this.exitNodes = []
    this.activeTransition = null
    this.lastIngestTime = 0
    // Forget the last bounded ingest reference so a subsequent
    // ingest with the same array re-runs the buffer fill (the
    // buffer was just cleared above).
    this._lastBoundedInsertsRef = null

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._bufferArrayCache = null
    this._datumIndexCache = null
    this.lastLayout = null
    this.scales = null
    this.scene = []
    this.customLayoutOverlays = null
    this.lastCustomLayoutResult = null
    this.lastCustomLayoutFailure = null
    this._customRestyle = undefined
    this.hasCustomRestyle = false
    this._baseStyles = new WeakMap()
    this.spatialIndex.clear()
    this._colorMapCache = null
    this._groupDataCache = null
    this._groupColorMap = new Map()
    this._groupColorCounter = 0
    this._barCategoryCache = null
    this._binBoundaries = []
    this._stackExtentCache = null
    this.version++
    this.updateResults.recordData("clear")
  }

  get size(): number {
    return this.buffer.size
  }

  getBuffer(): RingBuffer<Datum> {
    return this.buffer
  }

  getXAccessor(): (d: Datum) => number {
    return this.getX
  }

  getYAccessor(): (d: Datum) => number {
    return this.getY
  }

  getCategoryAccessor(): ((d: Datum) => string) | undefined {
    return this.getCategory
  }

  private applyCustomRestyle(nodes: SceneNode[], selection: CustomLayoutSelection | null): void {
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
   * `selection`, off each node's base style — no relayout, no quadtree rebuild
   * (positions are unchanged). No-op when the layout supplied no `restyle`.
   * Flags a style-only repaint so the render loop redraws the mutated styles.
   */
  restyleScene(selection: CustomLayoutSelection | null): void {
    if (!this._customRestyle) {
      this.updateResults.recordRestyle(false)
      return
    }
    this.applyCustomRestyle(this.scene, selection)
    this.markStylePaintPending()
    this.updateResults.recordRestyle(true)
  }

  updateConfig(config: Partial<PipelineConfig>): void {
    const prev = { ...this.config }
    const changedConfigKeys = Object.keys(config).filter(
      key => (config as Record<string, unknown>)[key] !== (prev as Record<string, unknown>)[key],
    )

    // `windowSize` sizes the ring buffer in the constructor and is NOT applied
    // reactively — changing it after mount has no effect on the retained
    // buffer. Warn once in development so the setting isn't silently ignored.
    // (Reactive resize via RingBuffer.resize is a tracked follow-up; it has
    // bounded-vs-streaming mode interactions that need their own contract.)
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

    // Invalidate color map caches when any color-relevant config changes.
    // resolveColorMap short-circuits on _ingestVersion, so we must explicitly
    // null the cache for changes that don't bump that counter (theme palette
    // swaps, accessor swaps, scheme overrides). Use `in config` rather than
    // `!== undefined` so a caller explicitly clearing a field (e.g. theme
    // switch sets themeCategorical to undefined) still invalidates.
    if (
      "colorScheme" in config
      || "themeCategorical" in config
      || "colorAccessor" in config
    ) {
      this._colorMapCache = null
      this._groupColorMap = new Map()
      this._groupColorCounter = 0
    }
    if ("barColors" in config || "colorScheme" in config) {
      this._barCategoryCache = null
    }
    // Invalidate stacked area extent cache on any config change that affects
    // the stacked y-domain. `_stackExtentCache` is keyed by buffer size +
    // _ingestVersion, so config-only changes (accessor swaps, mode changes)
    // must be explicitly invalidated since they don't bump those counters.
    if ("normalize" in config || "extentPadding" in config
      || "xAccessor" in config || "yAccessor" in config
      || "timeAccessor" in config || "valueAccessor" in config
      || "boundsAccessor" in config || "band" in config || "y0Accessor" in config
      || "openAccessor" in config || "highAccessor" in config
      || "lowAccessor" in config || "closeAccessor" in config
      || "groupAccessor" in config || "categoryAccessor" in config
      || "chartType" in config || "runtimeMode" in config) {
      this._stackExtentCache = null
    }

    // Track whether any accessor actually changed (not just new function identity)
    let accessorChanged = false
    let extentAccessorChanged = false

    Object.assign(this.config, config)

    // `pulse` owns a constructor-created parallel timestamp resource. React
    // can add, remove, or replace it after mount, so synchronize that resource
    // immediately rather than leaving the new configuration inert until a
    // remount. Existing pulse timestamps deliberately survive color/duration
    // tweaks; only activation (or a detected mismatch) reseeds them.
    if ("pulse" in config) {
      this.syncPulseTimestampBuffer()
    }

    // Re-resolve accessors only when their effective specs changed. Function
    // accessors compare by identity; identical source can close over different
    // values. Read the merged config below rather than the partial patch so a
    // y-only update never accidentally treats x as cleared to its fallback.
    // Re-resolve getX/getY when accessor props change, OR when chartType/runtimeMode
    // changes (which changes which fallback defaults apply: x/y vs time/value).
    const modeChanged = ("chartType" in config && config.chartType !== prev.chartType)
      || ("runtimeMode" in config && config.runtimeMode !== prev.runtimeMode)
    // Use `in config` rather than `!== undefined` so a caller explicitly
    // clearing an accessor (`{xAccessor: undefined}` — valid React pattern
    // when a prop is conditionally rendered) still enters the block. The
    // inner `accessorsEquivalent` check handles the defined→undefined case.
    if (modeChanged
      || "xAccessor" in config || "yAccessor" in config
      || "timeAccessor" in config || "valueAccessor" in config) {
      const isStreamingType = ["bar", "swarm", "waterfall"].includes(this.config.chartType)
      const useStreamingDefaults = isStreamingType || this.config.runtimeMode === "streaming"
      const nextXAccessor = useStreamingDefaults
        ? this.config.timeAccessor || this.config.xAccessor
        : this.config.xAccessor
      const prevXAccessor = useStreamingDefaults
        ? prev.timeAccessor || prev.xAccessor
        : prev.xAccessor
      const nextYAccessor = useStreamingDefaults
        ? this.config.valueAccessor || this.config.yAccessor
        : this.config.yAccessor
      const prevYAccessor = useStreamingDefaults
        ? prev.valueAccessor || prev.yAccessor
        : prev.yAccessor
      const xChanged = modeChanged || !accessorsEquivalent(nextXAccessor, prevXAccessor)
      const yChanged = modeChanged || !accessorsEquivalent(nextYAccessor, prevYAccessor)
      if (xChanged || yChanged) {
        if (useStreamingDefaults) {
          this.getX = resolveAccessor(this.config.timeAccessor || this.config.xAccessor, "time")
          this.getY = resolveAccessor(this.config.valueAccessor || this.config.yAccessor, "value")
        } else {
          this.getX = resolveAccessor(this.config.xAccessor, "x")
          this.getY = resolveAccessor(this.config.yAccessor, "y")
        }
        // The bounds ribbon (when present) captures `getY` in its closure
        // because `y ± offset` reads through this.getY. A yAccessor swap
        // would otherwise leave the ribbon referencing the previous accessor.
        if (yChanged && this.resolvedRibbons.some(r => r.kind === "bounds")) {
          this.resolvedRibbons = resolveRibbons(this.config)
        }
        accessorChanged = true
        extentAccessorChanged = true
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
    if ("symbolAccessor" in config && !accessorsEquivalent(config.symbolAccessor, prev.symbolAccessor)) {
      this.getSymbol = this.config.symbolAccessor != null ? resolveStringAccessor(this.config.symbolAccessor) : undefined
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
      extentAccessorChanged = true
    }
    if (
      ("boundsAccessor" in config && !accessorsEquivalent(config.boundsAccessor, prev.boundsAccessor)) ||
      ("band" in config && config.band !== prev.band) ||
      ("boundsStyle" in config && config.boundsStyle !== prev.boundsStyle)
    ) {
      this.resolvedRibbons = resolveRibbons(this.config)
      accessorChanged = true
      extentAccessorChanged = true
    }
    if ("pointIdAccessor" in config && !accessorsEquivalent(config.pointIdAccessor, prev.pointIdAccessor)) {
      this.getPointId = this.config.pointIdAccessor != null ? resolveStringAccessor(this.config.pointIdAccessor) : undefined
      accessorChanged = true
    }
    // Recompute candlestick OHLC accessors + range mode when they change
    if (this.config.chartType === "candlestick" && (
      modeChanged ||
      ("openAccessor" in config && !accessorsEquivalent(config.openAccessor, prev.openAccessor)) ||
      ("closeAccessor" in config && !accessorsEquivalent(config.closeAccessor, prev.closeAccessor)) ||
      ("highAccessor" in config && !accessorsEquivalent(config.highAccessor, prev.highAccessor)) ||
      ("lowAccessor" in config && !accessorsEquivalent(config.lowAccessor, prev.lowAccessor))
    )) {
      const hasOpen = this.config.openAccessor != null
      const hasClose = this.config.closeAccessor != null
      this.getOpen = hasOpen ? resolveAccessor(this.config.openAccessor, "open") : undefined
      this.getHigh = resolveAccessor(this.config.highAccessor, "high")
      this.getLow = resolveAccessor(this.config.lowAccessor, "low")
      this.getClose = hasClose ? resolveAccessor(this.config.closeAccessor, "close") : undefined
      this.config.candlestickRangeMode = !hasOpen && !hasClose
      accessorChanged = true
      extentAccessorChanged = true
    }

    // Escape hatch: an explicit `accessorRevision` bump forces re-derivation
    // even when every accessor reference is unchanged. This covers a stable
    // function accessor whose captured semantics changed without its identity
    // changing. Resolved accessors already call the live function, so we only
    // need to recompute derived extents and rebuild the scene.
    if ("accessorRevision" in config && config.accessorRevision !== prev.accessorRevision) {
      accessorChanged = true
      extentAccessorChanged = true
    }

    // Only mark full rebuild needed if non-accessor config actually changed or accessors changed.
    // Compare values (not just key presence) because updateConfig receives the full config object
    // on every React render, so all keys are always present.
    if (!accessorChanged) {
      const nonAccessorKeys = Object.keys(config).filter(k => !k.endsWith("Accessor") && k !== "timeAccessor" && k !== "valueAccessor")
      for (const k of nonAccessorKeys) {
        if ((config as Record<string, unknown>)[k] !== (prev as Record<string, unknown>)[k]) {
          accessorChanged = true
          break
        }
      }
    }
    if (accessorChanged) {
      if (extentAccessorChanged) this.rebuildExtents()
      this.needsFullRebuild = true
    }
    this.updateResults.recordConfig(changedConfigKeys)
  }

  /** Additive explicit-result form of {@link updateConfig}. */
  updateConfigWithResult(config: Partial<PipelineConfig>): UpdateResult {
    this.updateConfig(config)
    return this.updateResults.last
  }
}

attachUpdateResultStore(PipelineStore)
