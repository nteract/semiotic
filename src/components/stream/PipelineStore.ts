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
import { scaleLinear, scaleLog, scaleTime, type ScaleLinear } from "d3-scale"
import { quadtree as d3Quadtree, type Quadtree } from "d3-quadtree"
import { RingBuffer } from "../realtime/RingBuffer"
import { IncrementalExtent } from "../realtime/IncrementalExtent"
import { computeBinExtent } from "../realtime/BinAccumulator"
import { computeWaterfallExtent } from "../realtime/renderers/waterfallRenderer"
import { computeStackOffsets } from "./SceneGraph"
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
  CurveType,
  BarStyle,
  ThemeSemanticColors,
  BandConfig
} from "./types"
import { resolveAccessor, resolveStringAccessor, accessorsEquivalent, type CoercibleNumber } from "./accessorUtils"
import { STREAMING_PALETTE } from "../charts/shared/colorUtils"
import type { ActiveTransition } from "./pipelineTransitionUtils"
import { computeDecayOpacity as computeDecayOpacityFn, applyDecay as applyDecayFn } from "./pipelineDecay"
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
import type { CustomLayout, LayoutContext } from "./customLayout"
import type { MarginType } from "../types/marginType"

// ── Axis direction helpers ─────────────────────────────────────────────

function getTimeAxis(arrowOfTime: ArrowOfTime): "x" | "y" {
  return arrowOfTime === "up" || arrowOfTime === "down" ? "y" : "x"
}

// ── Ribbon resolution (bounds + band → ResolvedRibbon[]) ──────────────

/**
 * Read a value off a datum preserving null/undefined as NaN so ribbon
 * gap semantics work. `resolveAccessor` coerces null→0 via unary `+`,
 * which would silently produce a "valid" 0 baseline for missing data —
 * fine for primary y values, wrong for envelope edges.
 */
function resolveRibbonValueAccessor(
  accessor: string | ((d: Datum) => number) | undefined,
  fallback: string
): (d: Datum) => number {
  const get: (d: Datum) => unknown = typeof accessor === "function"
    ? accessor as (d: Datum) => unknown
    : (d) => (d as Record<string, unknown>)[accessor || fallback]
  return (d: Datum) => {
    const raw = get(d)
    if (raw == null) return Number.NaN
    return +(raw as number)
  }
}

/**
 * Compose the full ribbon list from both public envelope APIs:
 * `boundsAccessor` (symmetric ±offset) and `band` (asymmetric pairs).
 * Bounds is prepended so it paints furthest back when both are set on
 * the same chart. Both surfaces share scene-builder, y-extent, and
 * style-cascade machinery — only the resolution differs.
 *
 * Both APIs use null-preserving accessors (NaN for null/undefined) so
 * the unified `buildRibbonForGroup` can rely on a single
 * `Number.isFinite` check to skip gap datums. Without this, `null + 5`
 * coerces to `5` and would silently render a bounds ribbon around the
 * implicit-zero "value" of a missing row.
 */
function resolveRibbons(config: PipelineConfig): ResolvedRibbon[] {
  const ribbons: ResolvedRibbon[] = []
  const useStreamingDefaults =
    ["bar", "swarm", "waterfall"].includes(config.chartType) || config.runtimeMode === "streaming"
  const rawY = resolveRibbonValueAccessor(
    (useStreamingDefaults ? (config.valueAccessor || config.yAccessor) : config.yAccessor) as
      string | ((d: Datum) => number) | undefined,
    useStreamingDefaults ? "value" : "y"
  )

  // boundsAccessor → one ribbon. Legacy behavior: when the offset is
  // not a finite non-zero number, the top and bottom collapse to `y`
  // (degenerate zero-width ribbon — preserved via the conditional).
  if (config.boundsAccessor) {
    const offsetGet = resolveAccessor(config.boundsAccessor, "bounds")
    ribbons.push({
      kind: "bounds",
      getTop: (d) => {
        const y = rawY(d)
        if (!Number.isFinite(y)) return Number.NaN
        const o = offsetGet(d)
        return Number.isFinite(o) && o !== 0 ? y + o : y
      },
      getBottom: (d) => {
        const y = rawY(d)
        if (!Number.isFinite(y)) return Number.NaN
        const o = offsetGet(d)
        return Number.isFinite(o) && o !== 0 ? y - o : y
      },
      style: config.boundsStyle as Style | ((d: Datum, group?: string) => Style) | undefined,
      perSeries: true,
      interactive: false,
    })
  }

  // band → one ribbon per BandConfig (array form drives fan charts).
  if (config.band) {
    const list = Array.isArray(config.band) ? config.band : [config.band]
    for (const b of list) {
      ribbons.push({
        kind: "band",
        getTop: resolveRibbonValueAccessor(
          b.y1Accessor as string | ((d: Datum) => number) | undefined,
          "y1"
        ),
        getBottom: resolveRibbonValueAccessor(
          b.y0Accessor as string | ((d: Datum) => number) | undefined,
          "y0"
        ),
        style: b.style as Style | ((d: Datum, group?: string) => Style) | undefined,
        perSeries: b.perSeries !== false,
        interactive: b.interactive === true,
      })
    }
  }

  return ribbons
}

// ── PipelineStore config ───────────────────────────────────────────────

export interface PipelineConfig {
  chartType: StreamChartType
  runtimeMode?: "streaming" | "bounded"
  windowSize: number
  windowMode: WindowMode
  arrowOfTime: ArrowOfTime
  extentPadding: number
  /** Pixel inset on scale ranges to prevent glyph clipping at chart edges. Default 0. */
  scalePadding?: number
  /** When `"exact"`, the x and y axis domains pin to the literal data
   *  min/max — `extentPadding` is skipped so the first and last ticks
   *  read as the actual data bounds. Default `"nice"` keeps the existing
   *  padded domain so glyphs at the extremes don't clip the plot edge. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
  maxCapacity?: number

  // Accessors
  xAccessor?: string | ((d: Datum) => CoercibleNumber)
  yAccessor?: string | ((d: Datum) => CoercibleNumber)
  timeAccessor?: string | ((d: Datum) => CoercibleNumber)
  valueAccessor?: string | ((d: Datum) => CoercibleNumber)
  colorAccessor?: string | ((d: Datum) => string)
  sizeAccessor?: string | ((d: Datum) => CoercibleNumber)
  groupAccessor?: string | ((d: Datum) => string)
  categoryAccessor?: string | ((d: Datum) => string)
  lineDataAccessor?: string

  // Scale types
  xScaleType?: "linear" | "log" | "time"
  yScaleType?: "linear" | "log"

  // Fixed extents (partial: [min] or [min, undefined] to set only min)
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  sizeRange?: [number, number]

  // Bar/heatmap specifics
  binSize?: number
  normalize?: boolean
  /** Stacked area baseline mode. Only consulted by stackedarea chart type. */
  baseline?: "zero" | "wiggle" | "silhouette"
  /** Stack order — see StreamXYFrameProps.stackOrder. */
  stackOrder?: "key" | "insideOut" | "asc" | "desc"

  // Candlestick accessors
  openAccessor?: string | ((d: Datum) => CoercibleNumber)
  highAccessor?: string | ((d: Datum) => CoercibleNumber)
  lowAccessor?: string | ((d: Datum) => CoercibleNumber)
  closeAccessor?: string | ((d: Datum) => CoercibleNumber)
  candlestickStyle?: CandlestickStyle
  /** Internal: set by PipelineStore when open/close accessors are both missing */
  candlestickRangeMode?: boolean

  // Bounds/uncertainty
  boundsAccessor?: string | ((d: Datum) => CoercibleNumber)
  boundsStyle?: any

  // Per-point area baseline (for band/ribbon charts like percentile bands)
  y0Accessor?: string | ((d: Datum) => CoercibleNumber)

  // Asymmetric min/max band(s) drawn under the lines/areas. Single
  // BandConfig or array (fan chart). Normalized into the unified
  // `resolvedRibbons: ResolvedRibbon[]` at store construction alongside
  // any `boundsAccessor` ribbon.
  band?: BandConfig | BandConfig[]

  // Area gradient fill (opacity or multi-color)
  gradientFill?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  // Series names rendered as areas in "mixed" chart type
  areaGroups?: Set<string>
  // Horizontal gradient for line strokes
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }

  // Style
  lineStyle?: any
  pointStyle?: (d: Datum) => Style & { r?: number }
  areaStyle?: (d: Datum) => Style
  swarmStyle?: { radius?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number }
  waterfallStyle?: { positiveColor?: string; negativeColor?: string; connectorStroke?: string; connectorWidth?: number; gap?: number; stroke?: string; strokeWidth?: number }
  colorScheme?: string | string[]
  /** Theme categorical palette — used as fallback when colorScheme is not an explicit array */
  themeCategorical?: string[]
  /**
   * Theme-resolved semantic role colors. Scene builders use these as the
   * default before falling back to hardcoded hex. Populated by the Stream
   * Frame from the in-memory `SemioticTheme.colors` object at render time
   * — the values are concrete hex (or whatever the preset declares), not
   * `var(...)` strings, and so this channel does NOT participate in the
   * DOM CSS cascade. Changing the ambient theme (`<ThemeProvider>`) or
   * swapping to a nested provider is how you override these values.
   *
   * Per-scope overrides via CSS custom properties
   * (e.g. `<div style={{ "--semiotic-danger": "#c00" }}>`) work only for
   * values a user explicitly passes through as `var(--...)` strings in
   * chart props — those are resolved via `getComputedStyle` in the
   * canvas renderer at paint time (see `resolveCSSColor.ts`). The theme
   * defaults in this field don't read CSS.
   */
  themeSemantic?: ThemeSemanticColors
  /** Theme sequential scheme name (e.g. "blues") — fallback when `colorScheme` is not explicitly set for magnitude encodings (heatmap, choropleth, size). */
  themeSequential?: string
  /** Theme diverging scheme name (e.g. "RdBu") — fallback when `colorScheme` is not explicitly set for midpoint encodings (likert, bivariate, ± deviation). */
  themeDiverging?: string
  barColors?: Record<string, string>
  /** Histogram bar style — fill/stroke/strokeWidth/gap. Accepted by RealtimeHistogram and routed through to the bar scene builder. */
  barStyle?: BarStyle

  // Annotations (threshold coloring uses these)
  annotations?: Datum[]

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render (points scale up, lines/areas clip from left, rects grow from baseline) */
  introAnimation?: boolean
  staleness?: StalenessConfig

  // Streaming heatmap
  heatmapAggregation?: "count" | "sum" | "mean"
  heatmapXBins?: number
  heatmapYBins?: number

  // Heatmap value labels
  showValues?: boolean
  heatmapValueFormat?: (v: number) => string

  // Point identification (for point-anchored annotations)
  pointIdAccessor?: string | ((d: Datum) => string)

  // Curve interpolation for line/area charts
  curve?: CurveType

  // ── customLayout escape hatch ─────────────────────────────────────
  /** When provided, replaces chart-type dispatch in scene building.
   *  Receives a LayoutContext (scales, dimensions, theme, resolveColor)
   *  and returns scene nodes plus optional overlays. */
  customLayout?: CustomLayout
  /** User-supplied config blob threaded through to LayoutContext.config. */
  layoutConfig?: object
  /** Resolved margin — passed through so LayoutContext.dimensions.margin reflects what the frame actually used. */
  layoutMargin?: MarginType
}

// ── PipelineStore ──────────────────────────────────────────────────────

export class PipelineStore {
  private buffer: RingBuffer<Datum>
  private xExtent = new IncrementalExtent()
  private yExtent = new IncrementalExtent()
  private config: PipelineConfig
  private growingCap: number

  private getX: (d: Datum) => number
  private getY: (d: Datum) => number
  private getGroup: ((d: Datum) => string) | undefined
  private getCategory: ((d: Datum) => string) | undefined
  private getSize: ((d: Datum) => number) | undefined
  private getColor: ((d: Datum) => string) | undefined
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
  private _stackExtentCache: { key: string; yDomain: [number, number] } | null = null
  /** Monotonic counter incremented on each ingest — used as part of cache keys */
  private _ingestVersion = 0

  // ── Buffer array caching ────────────────────────────────────────────
  /** Cached materialized array from buffer.toArray() — only rebuilt when buffer changes */
  private _bufferArrayCache: Datum[] | null = null
  /** True when the buffer has been mutated since last toArray() call */
  private _bufferDirty = true

  // ── Resize optimization──────────────────────────────────────────────
  private needsFullRebuild = true
  private lastLayout: StreamLayout | null = null

  scales: StreamScales | null = null
  scene: SceneNode[] = []
  version = 0
  /** Overlays returned from customLayout (consumed by StreamXYFrame for SVGOverlay). */
  customLayoutOverlays: import("react").ReactNode = null

  /** True when the x accessor returns Date objects (auto-detected on first data ingestion) */
  xIsDate = false

  // ── Quadtree spatial index for O(log n) point hit testing ──────────
  private _quadtree: Quadtree<PointSceneNode> | null = null
  /** Largest visual point radius in the current scene. The hit tester uses
   *  this to widen its quadtree query so points with big radii (bubble) don't
   *  fall outside the search region. */
  private _maxPointRadius = 0
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
      return false
    }
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
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
            ? (d: Datum) => +new Date(d[key])
            : (d: Datum) => +((rawAccessor as (d: Datum) => any)(d) instanceof Date
                ? (rawAccessor as (d: Datum) => any)(d)
                : new Date((rawAccessor as (d: Datum) => any)(d)))
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
          for (const r of this.resolvedRibbons) {
            const top = r.getTop(d); const bottom = r.getBottom(d)
            if (Number.isFinite(top)) this.yExtent.push(top)
            if (Number.isFinite(bottom)) this.yExtent.push(bottom)
          }
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
          for (const r of this.resolvedRibbons) {
            const top = r.getTop(d); const bottom = r.getBottom(d)
            if (Number.isFinite(top)) this.yExtent.push(top)
            if (Number.isFinite(bottom)) this.yExtent.push(bottom)
          }
        }

        if (evicted != null) {
          this.xExtent.evict(this.getX(evicted))
          if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
            this.yExtent.evict(this.getHigh(evicted))
            this.yExtent.evict(this.getLow(evicted))
          } else {
            this.yExtent.evict(this.getY(evicted))
            if (this.getY0) this.yExtent.evict(this.getY0(evicted))
            for (const r of this.resolvedRibbons) {
              const top = r.getTop(evicted); const bottom = r.getBottom(evicted)
              if (Number.isFinite(top)) this.yExtent.evict(top)
              if (Number.isFinite(bottom)) this.yExtent.evict(bottom)
            }
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
    const _xFullySpecified = config.xExtent && config.xExtent[0] != null && config.xExtent[1] != null

    // `axisExtent === "exact"` pins the y-domain to the literal data
    // min/max — `extentPadding` is treated as 0 below so the first/last
    // ticks read as the actual data bounds. Trade-off: glyphs at the
    // extremes can sit at the plot edge. Per-branch padding sites are
    // guarded by this constant rather than swapping the config value so
    // user-supplied partial extents still merge correctly.
    const exactMode = config.axisExtent === "exact"

    // Chart-type specific extent adjustments
    if (config.chartType === "stackedarea" && !yFullySpecified && buffer.size > 0) {
      // Stacked areas: y-extent must cover the cumulative sums, not raw values
      if (config.normalize) {
        // Normalized: all stacks sum to 1.0
        yDomain = [0, exactMode ? 1 : 1 + config.extentPadding]
      } else {
        // Cache the stacked extent computation — only rebuild when buffer data changes
        const stackCacheKey = `${buffer.size}:${this._ingestVersion}:${config.baseline ?? "zero"}:${config.stackOrder ?? "key"}`
        if (this._stackExtentCache && this._stackExtentCache.key === stackCacheKey) {
          yDomain = this._stackExtentCache.yDomain
        } else {
          const groups = this.groupData(bufferArray)

          // Per-group-per-x value lookup (mirrors buildStackedAreaNodes).
          const valueMaps = new Map<string, Map<number, number>>()
          const xSet = new Set<number>()
          let maxStacked = 0
          const xTotals = new Map<number, number>()
          const groupTotals = new Map<string, number>()
          for (const g of groups) {
            const m = new Map<number, number>()
            let groupTotal = 0
            for (const d of g.data) {
              const x = this.getX(d)
              const y = this.getY(d)
              // `Number.isFinite` rejects NaN, Infinity, -Infinity, and
              // non-numbers — stricter than `isNaN` (which only catches
              // NaN). Without this, ±Infinity values leak into totals
              // and the resulting yDomain can be ±Infinity (zero
              // baseline) or fall back to [0,0] (wiggle/silhouette
              // non-finite guard), producing blank/clipped charts.
              if (!Number.isFinite(x) || !Number.isFinite(y)) continue
              m.set(x, (m.get(x) || 0) + y)
              xSet.add(x)
              groupTotal += y
              const total = (xTotals.get(x) || 0) + y
              xTotals.set(x, total)
              if (total > maxStacked) maxStacked = total
            }
            valueMaps.set(g.key, m)
            groupTotals.set(g.key, groupTotal)
          }

          // Sort group keys to match buildStackedAreaNodes' stacking order —
          // wiggle offsets depend on group order, so the extent must agree
          // with the rendered geometry.
          const order = config.stackOrder ?? "key"
          // Tie-breaker for equal-total groups — must match areaScene
          // exactly (both paths use lexicographic key order on ties).
          // Without this, sliding-window eviction can re-order tied
          // groups between frames and the rendered stack swaps layers.
          const keyCmp = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
          let groupKeys: string[]
          if (order === "insideOut") {
            const sorted = [...groups].map((g) => g.key)
              .sort((a, b) => {
                const d = (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0)
                return d !== 0 ? d : keyCmp(a, b)
              })
            const tops: string[] = []
            const bottoms: string[] = []
            let topSum = 0
            let bottomSum = 0
            for (const k of sorted) {
              if (topSum < bottomSum) { tops.push(k); topSum += groupTotals.get(k) ?? 0 }
              else { bottoms.push(k); bottomSum += groupTotals.get(k) ?? 0 }
            }
            groupKeys = [...bottoms.reverse(), ...tops]
          } else if (order === "asc") {
            groupKeys = groups.map((g) => g.key).sort((a, b) => {
              const d = (groupTotals.get(a) ?? 0) - (groupTotals.get(b) ?? 0)
              return d !== 0 ? d : keyCmp(a, b)
            })
          } else if (order === "desc") {
            groupKeys = groups.map((g) => g.key).sort((a, b) => {
              const d = (groupTotals.get(b) ?? 0) - (groupTotals.get(a) ?? 0)
              return d !== 0 ? d : keyCmp(a, b)
            })
          } else {
            groupKeys = groups.map((g) => g.key).sort(keyCmp)
          }

          if (config.baseline === "wiggle" || config.baseline === "silhouette") {
            // Compute the actual per-x offsets and bound the y-domain by the
            // observed min(offset) and max(offset + total). For wiggle the
            // accumulated offset can drift well outside ±total/2; using the
            // exact rendered range is the only safe way to avoid clipping.
            const xValues = Array.from(xSet).sort((a, b) => a - b)
            const offsets = computeStackOffsets(
              xValues,
              groupKeys,
              (k, x) => valueMaps.get(k)?.get(x) || 0,
              config.baseline
            )
            let lo = Infinity
            let hi = -Infinity
            for (const x of xValues) {
              const off = offsets.get(x) ?? 0
              const total = xTotals.get(x) ?? 0
              if (off < lo) lo = off
              if (off + total > hi) hi = off + total
            }
            if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
              lo = 0; hi = 0
            }
            const range = hi - lo
            const pad = exactMode ? 0 : (range > 0 ? range * config.extentPadding : 1)
            yDomain = [lo - pad, hi + pad]
          } else {
            const pad = exactMode ? 0 : (maxStacked > 0 ? maxStacked * config.extentPadding : 1)
            yDomain = [0, maxStacked + pad]
          }
          this._stackExtentCache = { key: stackCacheKey, yDomain }
        }
      }
    } else if (config.chartType === "bar" && config.binSize && !yFullySpecified && buffer.size > 0) {
      const [, maxTotal] = computeBinExtent(
        buffer, this.getX, this.getY, config.binSize, this.getCategory
      )
      yDomain = [0, exactMode ? maxTotal : maxTotal + maxTotal * config.extentPadding]
    } else if (config.chartType === "waterfall" && !yFullySpecified && buffer.size > 0) {
      const [minCum, maxCum] = computeWaterfallExtent(buffer, this.getY)
      const range = maxCum - minCum
      const pad = exactMode ? 0 : (range > 0 ? range * config.extentPadding : 1)
      yDomain = [
        Math.min(0, minCum - Math.abs(pad)),
        Math.max(0, maxCum + Math.abs(pad))
      ]
    } else if (!yFullySpecified && yDomain[0] !== Infinity) {
      // Expand extent to include every ribbon's top/bottom value. Both
      // `boundsAccessor` (symmetric ±offset) and `band` (asymmetric
      // pairs) normalize into the same `resolvedRibbons` list at
      // construction time, so this one loop covers both APIs.
      if (this.resolvedRibbons.length > 0) {
        for (const d of bufferArray) {
          for (const r of this.resolvedRibbons) {
            const top = r.getTop(d)
            const bottom = r.getBottom(d)
            if (Number.isFinite(top)) {
              if (top < yDomain[0]) yDomain[0] = top
              if (top > yDomain[1]) yDomain[1] = top
            }
            if (Number.isFinite(bottom)) {
              if (bottom < yDomain[0]) yDomain[0] = bottom
              if (bottom > yDomain[1]) yDomain[1] = bottom
            }
          }
        }
      }
      const range = yDomain[1] - yDomain[0]
      const pad = exactMode ? 0 : (range > 0 ? range * config.extentPadding : 1)
      // Only pad the data-derived side; preserve user-specified bounds
      const userMin = config.yExtent?.[0]
      const userMax = config.yExtent?.[1]
      yDomain = [
        userMin != null ? yDomain[0] : yDomain[0] - pad,
        userMax != null ? yDomain[1] : yDomain[1] + pad
      ]
      // For log scales, ensure domain minimum stays positive (log(0) is undefined).
      // This branch handles the case where extent-padding pushed an
      // otherwise-positive `dataYDomain[0]` to ≤ 0: substitute a
      // multiplicative pad instead. Exact mode skips this rescue because
      // it skips padding entirely — but note the downstream `makeScale`
      // log branch ALSO clamps both bounds to ≥ 1e-6 unconditionally
      // (see line ~807), so non-positive data extents produce a clamped
      // scale even in exact mode. The first/last ticks in that case
      // read as `max(dataMin, 1e-6)` and `max(dataMax, 1e-6)`, not the
      // literal data values.
      if (config.yScaleType === "log" && yDomain[0] <= 0 && dataYDomain[0] > 0 && !exactMode) {
        const logPad = 1 + config.extentPadding
        yDomain[0] = userMin != null ? yDomain[0] : dataYDomain[0] / logPad
      }
    }

    // Re-apply user-specified partial `yExtent` bounds after the
    // chart-type-specific extent rules. The stackedarea / bar-binSize /
    // waterfall branches replace yDomain wholesale to cover their
    // cumulative-sum or signed-bar geometry; without this merge a
    // user's `yExtent={[0, undefined]}` would be silently dropped on
    // those chart types (the generic branch already merges partial
    // bounds inline, but the chart-type branches don't go through it).
    // Copy before assigning in case yDomain came from `_stackExtentCache`
    // — mutating the cached reference would poison subsequent hits.
    if (config.yExtent && !yFullySpecified) {
      const userMin = config.yExtent[0]
      const userMax = config.yExtent[1]
      if (userMin != null || userMax != null) {
        yDomain = [
          userMin != null ? userMin : yDomain[0],
          userMax != null ? userMax : yDomain[1],
        ]
      }
    }

    // Handle degenerate extents
    if (xDomain[0] === Infinity || xDomain[1] === -Infinity) {
      // Empty data fallback — use sensible default for the scale type
      if (config.xScaleType === "time") {
        const now = Date.now()
        xDomain = [now - 86400000, now] // last 24 hours
      } else {
        xDomain = [0, 1]
      }
    }
    if (yDomain[0] === Infinity || yDomain[1] === -Infinity) yDomain = [0, 1]

    // Build scales
    // For streaming charts, use time/value axes based on arrowOfTime
    const isStreaming = config.runtimeMode === "streaming"
    // Clamp scalePadding to non-negative, no larger than half the smallest layout dimension
    const rawSp = config.scalePadding || 0
    const sp = Math.max(0, Math.min(rawSp, Math.min(layout.width, layout.height) / 2 - 1))
    if (isStreaming) {
      const timeAxis = getTimeAxis(config.arrowOfTime)
      if (timeAxis === "x") {
        const xRange: [number, number] = config.arrowOfTime === "right"
          ? [sp, layout.width - sp]
          : [layout.width - sp, sp]
        this.scales = {
          x: scaleLinear().domain(xDomain).range(xRange),
          y: scaleLinear().domain(yDomain).range([layout.height - sp, sp])
        }
      } else {
        const yRange: [number, number] = config.arrowOfTime === "down"
          ? [sp, layout.height - sp]
          : [layout.height - sp, sp]
        this.scales = {
          x: scaleLinear().domain(yDomain).range([sp, layout.width - sp]),
          y: scaleLinear().domain(xDomain).range(yRange)
        }
      }
    } else {
      const makeScale = (type: "linear" | "log" | "time" | undefined, domain: [number, number], range: [number, number]) => {
        if (type === "log") {
          const safeDomain: [number, number] = [Math.max(domain[0], 1e-6), Math.max(domain[1], 1e-6)]
          return scaleLog().domain(safeDomain).range(range).clamp(true) as unknown as ScaleLinear<number, number>
        }
        if (type === "time") {
          // Cast: scaleTime returns Date ticks at runtime, but typed as ScaleLinear for pipeline compat.
          // Consumers should use valueOf() when comparing domain values (see StreamScales JSDoc).
          return scaleTime().domain([new Date(domain[0]), new Date(domain[1])]).range(range) as unknown as ScaleLinear<number, number>
        }
        return scaleLinear().domain(domain).range(range)
      }
      this.scales = {
        x: makeScale(config.xScaleType, xDomain, [sp, layout.width - sp]),
        y: makeScale(config.yScaleType, yDomain, [layout.height - sp, sp])
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
      this._maxPointRadius = 0
      return
    }

    // Walk once to collect point nodes and track the largest radius so the
    // hit tester can widen its query radius for variable-size bubble charts.
    let pointCount = 0
    let maxR = 0
    for (const node of this.scene) {
      if (node.type === "point") {
        pointCount++
        if (node.r > maxR) maxR = node.r
      }
    }
    this._maxPointRadius = maxR

    if (pointCount <= PipelineStore.QUADTREE_THRESHOLD) {
      this._quadtree = null
      return
    }

    const points: PointSceneNode[] = new Array(pointCount)
    let i = 0
    for (const node of this.scene) {
      if (node.type === "point") points[i++] = node as PointSceneNode
    }
    this._quadtree = d3Quadtree<PointSceneNode>()
      .x(n => n.x)
      .y(n => n.y)
      .addAll(points)
  }

  /**
   * Get the quadtree spatial index, if available.
   * Returns null when chart type is not scatter/bubble or point count is below threshold.
   */
  get quadtree(): Quadtree<PointSceneNode> | null {
    return this._quadtree
  }

  /** Largest visual point radius in the current scene. */
  get maxPointRadius(): number {
    return this._maxPointRadius
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
    const remapScale = (type: "linear" | "log" | "time" | undefined, domain: [number, number], range: [number, number]) => {
      if (type === "log") {
        const safeDomain: [number, number] = [Math.max(domain[0], 1e-6), Math.max(domain[1], 1e-6)]
        return scaleLog().domain(safeDomain).range(range).clamp(true) as unknown as ScaleLinear<number, number>
      }
      if (type === "time") {
        return scaleTime().domain([new Date(domain[0]), new Date(domain[1])]).range(range) as unknown as ScaleLinear<number, number>
      }
      return scaleLinear().domain(domain).range(range)
    }
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
    this.rebuildQuadtree()

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
      }
      let result
      try {
        result = config.customLayout(layoutCtx)
      } catch (err) {
        // Layouts can throw — surface in dev, fall back to empty scene in prod.
        if (process.env.NODE_ENV !== "production") {
          console.error("[semiotic] customLayout threw:", err)
        }
        this.customLayoutOverlays = null
        return []
      }
      this.customLayoutOverlays = result.overlays ?? null
      return result.nodes ?? []
    }

    // Built-in chart types: ensure stale overlays from a prior customLayout
    // run don't bleed through after the user removes the prop.
    this.customLayoutOverlays = null

    if (data.length === 0) return []

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
      fill: lineStyle.stroke || this.config.themeSemantic?.primary || "#4e79a7",
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

  private applyDecay(nodes: SceneNode[], data: Datum[]): void {
    if (!this.config.decay) return
    applyDecayFn(this.config.decay, nodes, data)
  }

  // ── Pulse (delegated to pipelinePulse.ts) ──────────────────────────

  private applyPulse(nodes: SceneNode[], data: Datum[]): void {
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
    // Fast path: same buffer, same grouping, same ingest → reuse the buckets.
    if (
      this._groupDataCache &&
      this._groupDataCache.version === this._ingestVersion &&
      this._groupDataCache.group === this.getGroup &&
      this._groupDataCache.data === data
    ) {
      return this._groupDataCache.result
    }

    let result: { key: string; data: Datum[] }[]
    if (!this.getGroup) {
      result = [{ key: "_default", data }]
    } else {
      const groups = new Map<string, Datum[]>()
      for (const d of data) {
        const key = this.getGroup(d)
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(d)
      }
      result = Array.from(groups.entries()).map(([key, data]) => ({ key, data }))
    }

    this._groupDataCache = { version: this._ingestVersion, group: this.getGroup, data, result }
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
    if (this._colorMapCache && this._colorMapCache.version === this._ingestVersion) {
      return this._colorMapCache.map
    }

    const categories = new Set<string>()
    for (const d of data) {
      const c = this.getColor!(d)
      if (c) categories.add(c)
    }
    const sorted = Array.from(categories).sort()
    const cacheKey = sorted.join('\0')

    if (this._colorMapCache && this._colorMapCache.key === cacheKey) {
      // Categories unchanged across the version bump (e.g., layout-only update).
      // Refresh the version so future calls in this frame short-circuit.
      this._colorMapCache.version = this._ingestVersion
      return this._colorMapCache.map
    }

    const palette = Array.isArray(this.config.colorScheme)
      ? this.config.colorScheme
      : this.config.themeCategorical || STREAMING_PALETTE
    const colorMap = new Map<string, string>()
    for (let ci = 0; ci < sorted.length; ci++) {
      colorMap.set(sorted[ci], palette[ci % palette.length])
    }
    this._colorMapCache = { key: cacheKey, map: colorMap, version: this._ingestVersion }
    return colorMap
  }

  private resolveLineStyle(group: string, sampleDatum?: Datum): Style {
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
    // Theme primary is the designer-facing default; hardcoded #007bff stays
    // as the ultimate fallback when no theme is in scope.
    const themePrimary = this.config.themeSemantic?.primary
    if (ls && typeof ls === "object") {
      return {
        stroke: ls.stroke || themePrimary || "#007bff",
        strokeWidth: ls.strokeWidth || 2,
        strokeDasharray: ls.strokeDasharray,
        fill: ls.fill,
        fillOpacity: ls.fillOpacity,
        opacity: ls.opacity
      }
    }
    const color = this.resolveGroupColor(group) || themePrimary || "#007bff"
    return { stroke: color, strokeWidth: 2 }
  }

  private resolveAreaStyle(group: string, sampleDatum?: Datum): Style {
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
    const themePrimary = this.config.themeSemantic?.primary
    if (ls && typeof ls === "object") {
      return {
        fill: ls.fill || ls.stroke || themePrimary || "#4e79a7",
        fillOpacity: ls.fillOpacity ?? 0.7,
        stroke: ls.stroke || themePrimary || "#4e79a7",
        strokeWidth: ls.strokeWidth || 2
      }
    }
    const color = this.resolveGroupColor(group) || themePrimary || "#4e79a7"
    return { fill: color, fillOpacity: 0.7, stroke: color, strokeWidth: 2 }
  }

  /** Resolve a group name to a color from the cached color map or a dedicated group palette.
   *  First checks _colorMapCache (populated by resolveColorMap when colorAccessor is set).
   *  Falls back to _groupColorMap (insertion-order, never mutates _colorMapCache).
   *
   *  FIFO-evicts the oldest entry when the map exceeds `GROUP_COLOR_MAP_CAP`. The palette index
   *  uses `_groupColorCounter` (monotonic, decoupled from map size) so eviction doesn't cause
   *  new groups to collide with existing entries on a shrunk map. */
  private resolveGroupColor(group: string): string | null {
    // Prefer the accessor-based color map when available
    if (this._colorMapCache) {
      const c = this._colorMapCache.map.get(group)
      if (c) return c
    }
    // Fall back to dedicated group color map (does not pollute _colorMapCache)
    const existing = this._groupColorMap.get(group)
    if (existing) return existing

    // Palette selection with empty-array guards — an explicit `colorScheme: []`
    // (or empty `themeCategorical`) would otherwise index `palette[NaN]` → undefined
    // and poison the cached color.
    const userScheme = Array.isArray(this.config.colorScheme) && this.config.colorScheme.length > 0
      ? this.config.colorScheme
      : null
    const themePalette = Array.isArray(this.config.themeCategorical) && this.config.themeCategorical.length > 0
      ? this.config.themeCategorical
      : null
    const palette = userScheme || themePalette || STREAMING_PALETTE
    if (palette.length === 0) return null

    const color = palette[this._groupColorCounter % palette.length]
    this._groupColorCounter++
    this._groupColorMap.set(group, color)

    if (this._groupColorMap.size > PipelineStore.GROUP_COLOR_MAP_CAP) {
      const oldestKey = this._groupColorMap.keys().next().value
      if (oldestKey !== undefined) this._groupColorMap.delete(oldestKey)
    }
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
    const ids = new Set(Array.isArray(id) ? id : [id])
    const getPointId = this.getPointId
    // Compact timestamp buffer in lockstep with data removal
    const predicate = (item: Datum) => ids.has(getPointId(item))
    if (this.timestampBuffer && this.timestampBuffer.size > 0) {
      const oldTimestamps = this.timestampBuffer.toArray()
      const removeSet = new Set<number>()
      this.buffer.forEach((item, i) => { if (predicate(item)) removeSet.add(i) })
      this.timestampBuffer.clear()
      for (let i = 0; i < oldTimestamps.length; i++) {
        if (!removeSet.has(i)) this.timestampBuffer.push(oldTimestamps[i])
      }
    }

    const removed = this.buffer.remove(predicate)
    if (removed.length === 0) return removed

    // Evict removed values from extent tracking — mirror ingest() logic
    for (const d of removed) {
      this.xExtent.evict(this.getX(d))
      if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
        this.yExtent.evict(this.getHigh(d))
        this.yExtent.evict(this.getLow(d))
      } else {
        this.yExtent.evict(this.getY(d))
        if (this.getY0) this.yExtent.evict(this.getY0(d))
      }
    }

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._ingestVersion++
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
    const ids = new Set(Array.isArray(id) ? id : [id])
    const getPointId = this.getPointId
    // Capture matched indices before mutation (updater may change the ID field)
    const matchedIndices = new Set<number>()
    this.buffer.forEach((d, i) => { if (ids.has(getPointId(d))) matchedIndices.add(i) })

    const previous = this.buffer.update(
      item => ids.has(getPointId(item)),
      updater
    )
    if (previous.length === 0) return previous

    // Evict old values — mirror ingest() logic for candlestick/y0
    for (const old of previous) {
      this.xExtent.evict(this.getX(old))
      if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
        this.yExtent.evict(this.getHigh(old))
        this.yExtent.evict(this.getLow(old))
      } else {
        this.yExtent.evict(this.getY(old))
        if (this.getY0) this.yExtent.evict(this.getY0(old))
      }
    }
    // Push new extents using pre-captured indices (safe if ID changed)
    this.buffer.forEach((d, i) => {
      if (matchedIndices.has(i)) {
        this.xExtent.push(this.getX(d))
        if (this.config.chartType === "candlestick" && this.getHigh && this.getLow) {
          this.yExtent.push(this.getHigh(d))
          this.yExtent.push(this.getLow(d))
        } else {
          this.yExtent.push(this.getY(d))
          if (this.getY0) this.yExtent.push(this.getY0(d))
        }
      }
    })

    this.needsFullRebuild = true
    this._bufferDirty = true
    this._ingestVersion++
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
    this.lastLayout = null
    this.scales = null
    this.scene = []
    this._quadtree = null
    this._maxPointRadius = 0
    this._colorMapCache = null
    this._groupDataCache = null
    this._groupColorMap = new Map()
    this._groupColorCounter = 0
    this._barCategoryCache = null
    this._binBoundaries = []
    this._stackExtentCache = null
    this.version++
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

  updateConfig(config: Partial<PipelineConfig>): void {
    const prev = { ...this.config }

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

    // Re-resolve accessor functions only when the accessor source actually changed.
    // Uses .toString() comparison to detect inline arrow functions that are
    // recreated on every parent render but have identical source code.
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
  }
}
