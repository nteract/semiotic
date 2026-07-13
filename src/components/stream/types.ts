import type { ReactNode } from "react"
import type { ScaleLinear } from "d3-scale"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { LegendGroup, GradientLegendConfig, LegendLayout } from "../types/legendTypes"
import type {
  ArrowOfTime,
  WindowMode,
  LineStyle,
  BarStyle,
  WaterfallStyle,
  SwarmStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  AnnotationAnchorMode
} from "../realtime/types"
import type { Datum } from "../charts/shared/datumTypes"
import type { CoercibleNumber } from "./accessorUtils"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { SymbolName } from "./symbolPath"
import type { GlyphDef } from "./glyphDef"

export type SceneDatum = Datum | null
export type SeriesDatum = Datum[] | null
export type AxisTickFormat =
  | ((d: number, index?: number, allTicks?: number[]) => string)
  | ((d: string, index?: number, allTicks?: number[]) => string)
  | ((d: Date, index?: number, allTicks?: number[]) => string)

// ── Theme-resolved semantic role colors ──────────────────────────────
//
// Concrete color values (hex strings, not `var(...)`), populated by a
// Stream Frame from the active `SemioticTheme.colors` and threaded
// through `PipelineConfig` → scene context. Scene builders read these
// as the default fallback before hardcoded hex literals.
//
// Shared between `PipelineConfig` (XY / streaming) and
// `XYSceneConfig`/`OrdinalSceneConfig`/etc. — one type so role additions
// don't drift across the pipeline.
export interface ThemeSemanticColors {
  primary?: string
  secondary?: string
  success?: string
  danger?: string
  warning?: string
  error?: string
  info?: string
  text?: string
  textSecondary?: string
  border?: string
  grid?: string
  surface?: string
}

// ── Realtime encoding configs ─────────────────────────────────────────

export interface DecayConfig {
  type: "linear" | "exponential" | "step"
  /** Exponential: half-life in buffer positions (default: bufferSize/2) */
  halfLife?: number
  /** Minimum opacity floor (default: 0.1) */
  minOpacity?: number
  /** Step: positions from newest before fading (default: bufferSize*0.5) */
  stepThreshold?: number
}

export interface PulseConfig {
  /** Duration of the pulse glow in ms (default: 500) */
  duration?: number
  /** Glow color (default: "rgba(255,255,255,0.6)") */
  color?: string
  /** Extra px radius for glow ring on points (default: 4) */
  glowRadius?: number
}

export interface TransitionConfig {
  /** Animation duration in ms (default: 300) */
  duration?: number
  /** Easing function (default: "ease-out") */
  easing?: "ease-out" | "linear"
}

export interface StalenessConfig {
  /**
   * ms without data before "stale" (default: 5000). In graded mode this
   * is the base TTL the lifecycle bands are measured against — `aging`
   * begins here, `stale` at 1.5×, `expired` at 3× (overridable).
   */
  threshold?: number
  /** Canvas alpha when stale, binary mode (default: 0.5) */
  dimOpacity?: number
  /** Render LIVE/STALE badge (default: false) */
  showBadge?: boolean
  /** Badge position (default: "top-right") */
  badgePosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  /**
   * Opt into graded (banded) staleness. Instead of a single live→stale
   * flip at `threshold`, frames that support graded staleness dim
   * progressively through fresh → aging → stale → expired as idle time
   * crosses multiples of `threshold`, sharing one schedule with per-datum
   * decay and annotation freshness. (Currently honored by `StreamXYFrame`,
   * which backs the realtime XY charts; other frames treat it as binary.)
   * `true` uses the default per-band opacities; pass an object to override
   * the band thresholds or opacities.
   */
  graded?: boolean | {
    /** Multiples of `threshold` marking each band edge (see LifecycleBandThresholds). */
    thresholds?: import("../realtime/lifecycleBands").LifecycleBandThresholds
    /** Per-band canvas alpha override. Missing bands use the defaults. */
    opacities?: Partial<Record<import("../realtime/lifecycleBands").LifecycleBand, number>>
  }
}

// ── Marginal graphics ─────────────────────────────────────────────────

export type MarginalType = "histogram" | "violin" | "ridgeline" | "boxplot"

export interface MarginalConfig {
  type: MarginalType
  /** Number of bins for histogram/violin/ridgeline @default 20 */
  bins?: number
  /** Fill color @default "#4e79a7" */
  fill?: string
  /** Fill opacity @default 0.5 */
  fillOpacity?: number
  /** Stroke color @default "none" */
  stroke?: string
  /** Stroke width @default 1 */
  strokeWidth?: number
}

export interface MarginalGraphicsConfig {
  top?: MarginalConfig | MarginalType
  bottom?: MarginalConfig | MarginalType
  left?: MarginalConfig | MarginalType
  right?: MarginalConfig | MarginalType
}

// ── Chart types ────────────────────────────────────────────────────────

export type StreamChartType =
  | "line"
  | "area"
  | "stackedarea"
  | "mixed"
  | "scatter"
  | "bubble"
  | "heatmap"
  | "bar"
  | "swarm"
  | "waterfall"
  | "candlestick"
  | "custom"

export type RuntimeMode = "bounded" | "streaming"

// ── Scene graph ────────────────────────────────────────────────────────

export interface Style {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  strokeLinecap?: "butt" | "round" | "square"
  /** Fill color or CanvasPattern (e.g. from createHatchPattern) */
  fill?: string | CanvasPattern
  fillOpacity?: number
  opacity?: number
  /** For icon/isotype bars: an image to stamp instead of filling */
  icon?: HTMLImageElement | HTMLCanvasElement
  /** Padding between stamped icons */
  iconPadding?: number
  /** Optional radius when style callbacks drive point size directly. */
  r?: number
  /** Internal geo line flag: fade line ends at projection clipping edges. */
  _edgeFade?: boolean
}

/**
 * Optional semantic payload carried beside render geometry. `accessibleDatum`
 * preserves the full row; `tableFields` lets a recipe expose a curated,
 * user-facing table projection without reducing the scene datum itself.
 */
export interface SceneAccessibilityMetadata {
  accessibleDatum?: SceneDatum | Datum[]
  accessibility?: {
    label?: string
    tableFields?: SceneDatum | Datum[]
  }
}

export type SceneNode =
  | LineSceneNode
  | AreaSceneNode
  | PointSceneNode
  | SymbolSceneNode
  | GlyphSceneNode
  | RectSceneNode
  | HeatcellSceneNode
  | CandlestickSceneNode

export interface LineColorThreshold {
  value: number
  color: string
  thresholdType: "greater" | "lesser"
}

export interface LineSceneNode {
  type: "line"
  path: [number, number][]
  /** Raw y-values corresponding to each path point (for threshold coloring) */
  rawValues?: number[]
  /** Threshold-based color segments */
  colorThresholds?: LineColorThreshold[]
  style: Style
  datum: SeriesDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  group?: string
  /** Horizontal gradient for the line stroke */
  strokeGradient?: { colorStops: Array<{ offset: number; color: string }> }
  /** Curve interpolation type (default: linear / straight segments) */
  curve?: CurveType
  /** Per-vertex decay opacities (oldest→newest = minOpacity→1.0). Set by PipelineStore.applyDecay. */
  _decayOpacities?: number[]
  /** Animation target opacity (set during enter/exit transitions) */
  _targetOpacity?: number
  /** Captured start opacity for linear interpolation (avoids compounding from per-tick mutation) */
  _startOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
  /** Previous path coordinates for interpolation during transitions */
  _prevPath?: [number, number][]
  /** Target path coordinates for interpolation during transitions */
  _targetPath?: [number, number][]
  /** Intro clip fraction (0→1): reveals line from left to right via canvas clip */
  _introClipFraction?: number
}

export interface AreaSceneNode {
  type: "area"
  topPath: [number, number][]
  bottomPath: [number, number][]
  style: Style
  datum: SeriesDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  group?: string
  /** Clip the area to this rect (in plot-relative pixels). Used by horizon
   *  charts to band a single series into N slices. */
  clipRect?: { x: number; y: number; width: number; height: number }
  /** Gradient fill: opacity-based (topOpacity/bottomOpacity) or multi-color (colorStops) */
  fillGradient?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** Horizontal gradient for the line stroke */
  strokeGradient?: { colorStops: Array<{ offset: number; color: string }> }
  /** When false, skip hit testing (used for decorative bounds areas) */
  interactive?: boolean
  /** Pulse intensity 0–1 (set when aggregated group value changes) */
  _pulseIntensity?: number
  /** Pulse color */
  _pulseColor?: string
  /** Curve interpolation type (default: linear / straight segments) */
  curve?: CurveType
  /** Per-vertex decay opacities (oldest→newest = minOpacity→1.0). Set by PipelineStore.applyDecay. */
  _decayOpacities?: number[]
  /** Animation target opacity (set during enter/exit transitions) */
  _targetOpacity?: number
  /** Captured start opacity for linear interpolation (avoids compounding from per-tick mutation) */
  _startOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
  /** Previous top path coordinates for interpolation during transitions */
  _prevTopPath?: [number, number][]
  /** Target top path coordinates for interpolation during transitions */
  _targetTopPath?: [number, number][]
  /** Previous bottom path coordinates for interpolation during transitions */
  _prevBottomPath?: [number, number][]
  /** Target bottom path coordinates for interpolation during transitions */
  _targetBottomPath?: [number, number][]
  /** Intro clip fraction (0→1): reveals area from left to right via canvas clip */
  _introClipFraction?: number
}

export interface PointSceneNode {
  type: "point"
  x: number
  y: number
  r: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  /** Optional unique identifier for point-anchored annotations */
  pointId?: string
  /** Pulse glow intensity 0–1 (set by PipelineStore when pulse is active) */
  _pulseIntensity?: number
  /** Pulse glow color */
  _pulseColor?: string
  /** Pulse glow radius in px (default: 4) */
  _pulseGlowRadius?: number
  /** Animation target fields (set during transitions) */
  _targetX?: number
  _targetY?: number
  _targetR?: number
  _targetOpacity?: number
  _decayOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
}

/**
 * Symbol node — the per-datum **shape channel**, shared with the network and
 * ordinal pipelines. A glyph drawn from a `d3-shape` symbol path (or a custom
 * `path`), painted on canvas and in SVG/SSR via the shared `symbolPath` helpers,
 * and hit-tested + keyboard-navigated as a unit. Emitted by custom XY layouts
 * and by Scatterplot's `symbolBy` encoding. Uses `x`/`y` like its sibling
 * `PointSceneNode` (the network variant uses `cx`/`cy`).
 */
export interface SymbolSceneNode {
  type: "symbol"
  x: number
  y: number
  /** d3-symbol area in px² — drives the glyph's drawn size. */
  size: number
  /** Named shape. Ignored when `path` is set. @default "circle" */
  symbolType?: SymbolName
  /** Pre-built SVG path string, origin-centered — overrides `symbolType`. */
  path?: string
  /** Rotation in radians about (x, y). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  /** Optional unique identifier for point-anchored annotations. */
  pointId?: string
  /** Pulse glow intensity 0–1 (set by PipelineStore when pulse is active). */
  _pulseIntensity?: number
  /** Pulse glow color. */
  _pulseColor?: string
  /** Pulse glow radius in px. */
  _pulseGlowRadius?: number
  /** Animation target fields (set during transitions). */
  _targetX?: number
  _targetY?: number
  _targetR?: number
  _targetOpacity?: number
  /** Per-datum decay opacity (set by PipelineStore.applyDecay). */
  _decayOpacity?: number
  /** Stable identity key for transition tracking. */
  _transitionKey?: string
}

/**
 * Glyph node — the composite-pictogram channel. Where `symbol` stamps one
 * `d3-shape` path, `glyph` stamps a small multi-part vector pictogram (a
 * `GlyphDef`: an ISOTYPE server sign, a factory, a worker) with per-node
 * `color`/`accent` paints resolved against the definition's role tokens, and
 * an optional partial fill (`fraction`/`fractionStart`) for unit-chart final
 * signs — pair with the `unitize` recipe. Painted on canvas and in SVG/SSR
 * via the shared `glyphDef` helpers, hit-tested and keyboard-navigated by its
 * drawn bounds, and transition-tracked like a point. Uses `x`/`y` in XY,
 * ordinal, and geo scenes (the network variant uses `cx`/`cy`).
 */
export interface GlyphSceneNode {
  type: "glyph"
  x: number
  y: number
  /** Rendered height in px — width follows the definition's viewBox aspect. */
  size: number
  /** The multi-part pictogram definition to stamp. */
  glyph: GlyphDef
  /** Primary paint for parts declaring `"color"`. Falls back to `style.fill`. */
  color?: string
  /** Accent paint for parts declaring `"accent"`. */
  accent?: string
  /** Partial fill 0–1 — how much of the sign is painted. @default 1 */
  fraction?: number
  /** Where the partial fill begins, 0–1 (range boundary signs). @default 0 */
  fractionStart?: number
  /** Partial-fill axis: horizontal fills left→right, vertical bottom→up. @default "horizontal" */
  fractionDirection?: "horizontal" | "vertical"
  /** Ghost paint drawn at full extent beneath a partial fill so the whole
   *  sign stays countable (the ISOTYPE partial-symbol convention). */
  ghostColor?: string
  /** Rotation in radians about (x, y). */
  rotation?: number
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  /** Optional unique identifier for point-anchored annotations. */
  pointId?: string
  /** Pulse glow intensity 0–1 (set by PipelineStore when pulse is active). */
  _pulseIntensity?: number
  /** Pulse glow color. */
  _pulseColor?: string
  /** Pulse glow radius in px. */
  _pulseGlowRadius?: number
  /** Animation target fields (set during transitions). */
  _targetX?: number
  _targetY?: number
  _targetR?: number
  _targetOpacity?: number
  /** Per-datum decay opacity (set by PipelineStore.applyDecay). */
  _decayOpacity?: number
  /** Stable identity key for transition tracking. */
  _transitionKey?: string
}

export interface RectSceneNode {
  type: "rect"
  x: number
  y: number
  w: number
  h: number
  /** Rounded corner radius on the end away from the baseline */
  roundedTop?: number
  /** Which edge is the "tip" (opposite the baseline): "top"/"bottom" for
   *  vertical orientation, "right"/"left" for horizontal. Used by the
   *  renderer for rounded-corner placement AND gradient direction. Set by
   *  bar scene builders unconditionally so gradients resolve without
   *  requiring roundedTop. */
  roundedEdge?: "top" | "bottom" | "right" | "left"
  /** Explicit per-corner radii. Overrides the `roundedTop` + `roundedEdge`
   *  shortcut when present. Used by swimlanes (and any future chart that
   *  needs to round arbitrary subsets of a rect's four corners) — the
   *  outermost pieces of a lane round their leading/trailing corners and
   *  middle pieces stay square. Keys map to physical corners: `tl`
   *  top-left, `tr` top-right, `br` bottom-right, `bl` bottom-left.
   *  Missing keys are treated as 0 (square). */
  cornerRadii?: { tl?: number; tr?: number; br?: number; bl?: number }
  /** Gradient fill — same shape as the area-scene version. Runs tip → base
   *  along the bar axis (inferred from `roundedEdge`). */
  fillGradient?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  group?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** Animation target fields (set during transitions) */
  _targetX?: number
  _targetY?: number
  _targetW?: number
  _targetH?: number
  _targetOpacity?: number
  _decayOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
}

export interface HeatcellSceneNode {
  type: "heatcell"
  x: number
  y: number
  w: number
  h: number
  fill: string
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  /** Optional style object (used for decay/transition opacity on heatmap cells) */
  style?: Style
  /** Numeric cell value (for canvas text rendering when showValues is enabled) */
  value?: number
  /** Whether to render the value as text inside the cell */
  showValues?: boolean
  /** Format function for the displayed value */
  valueFormat?: (v: number) => string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** Animation target fields (set during transitions) */
  _targetX?: number
  _targetY?: number
  _targetW?: number
  _targetH?: number
  _targetOpacity?: number
  _decayOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
}

export interface CandlestickSceneNode {
  type: "candlestick"
  x: number
  openY: number
  closeY: number
  highY: number
  lowY: number
  bodyWidth: number
  upColor: string
  downColor: string
  wickColor: string
  wickWidth: number
  isUp: boolean
  /** Range/dumbbell mode — no body, endpoint dots instead */
  isRange?: boolean
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  /** Optional style object (used during transition opacity animations) */
  style?: Style
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  /** Animation target opacity (set during enter/exit transitions) */
  _targetOpacity?: number
  /** Decay opacity for candlestick nodes (no style object, stored separately) */
  _decayOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
  /** Geometry targets — set during a transition so advanceTransition can lerp
   *  toward them from the snapshotted prev position. Cleared on completion. */
  _targetX?: number
  _targetOpenY?: number
  _targetCloseY?: number
  _targetHighY?: number
  _targetLowY?: number
}

// ── Candlestick style ──────────────────────────────────────────────────

export interface CandlestickStyle {
  upColor?: string
  downColor?: string
  wickColor?: string
  bodyWidth?: number
  wickWidth?: number
  /** Single color for range/dumbbell mode (replaces up/down when no open/close provided) */
  rangeColor?: string
}

// ── Changeset ──────────────────────────────────────────────────────────

export interface Changeset<T = Datum> {
  inserts: T[]
  bounded: boolean
  /** Hint: total dataset size when progressively chunking bounded data */
  totalSize?: number
  /** When true on a bounded changeset, the store replaces the buffer
   *  contents but does NOT clear its category insertion-order memory
   *  and marks itself as having received streaming-sourced data. Used
   *  by aggregator HOCs (LikertChart, future density/bin charts) that
   *  re-derive their full dataset from streaming input on every push —
   *  the user perceives it as a stream even though the transport is
   *  a wholesale replacement. Without this, re-aggregation would wipe
   *  the category order and categories would shuffle on every tick. */
  preserveCategoryOrder?: boolean
}

// ── Scales ─────────────────────────────────────────────────────────────

/**
 * Note: when xScaleType="time", the x scale is a d3.scaleTime at runtime
 * (domain returns Date objects, ticks() returns Date[]). It is typed as
 * ScaleLinear for compatibility — use valueOf() when comparing domain values.
 */
export interface StreamScales {
  x: ScaleLinear<number, number>
  y: ScaleLinear<number, number>
}

/**
 * Context handed to a `foregroundGraphics` / `backgroundGraphics` callback. The
 * function form receives the frame's **resolved scales** alongside `size` +
 * `margin`, so bespoke SVG overlays anchor to the same scales the chart drew
 * (instead of re-deriving them from extents by hand and risking drift). `scales`
 * is `null` before the first layout pass — fall back to your own mapping then.
 * This is the HOC analogue of what custom layouts get via `ctx.scales`.
 *
 * Generic over the scale shape: XY frames pass {@link StreamScales} (`{x, y}`),
 * the ordinal frame passes its `{o, r, projection}` scales.
 */
export interface FrameGraphicsContext<S = StreamScales> {
  size: number[]
  margin: { top: number; right: number; bottom: number; left: number }
  scales: S | null
}

/** A foreground/background graphics value: static SVG, or a function of the
 *  frame's geometry + resolved scales. */
export type FrameGraphicsProp<S = StreamScales> = ReactNode | ((ctx: FrameGraphicsContext<S>) => ReactNode)

export interface StreamLayout {
  width: number
  height: number
}

// ── Curve types ────────────────────────────────────────────────────────

export type CurveType =
  | "linear"
  | "monotoneX"
  | "monotoneY"
  | "step"
  | "stepAfter"
  | "stepBefore"
  | "basis"
  | "cardinal"
  | "catmullRom"
  | "natural"

// ── Band (asymmetric envelope) ─────────────────────────────────────────

/**
 * Asymmetric min/max envelope drawn under lines/areas. Data-driven cousin
 * of `boundsAccessor` (which takes a single symmetric ±offset). Use for
 * throughput min/max ribbons, percentile bands (p5–p95), SLO ranges, and
 * fan charts (pass an array of bands).
 *
 * Painted with the parent series color at 0.2 fillOpacity by default.
 * Override with `style`. Non-interactive by default; participates in
 * y-extent auto-derivation so it can't clip.
 */
export interface BandConfig<T = Datum> {
  /** Bottom of the band — field name or accessor function. */
  y0Accessor: string | ((d: T) => number)
  /** Top of the band — field name or accessor function. */
  y1Accessor: string | ((d: T) => number)
  /**
   * Style override. Defaults to the parent line/area color at 0.2
   * fillOpacity, matching the `boundsStyle` cascade.
   */
  style?: Style | ((d: T, group?: string) => Style)
  /**
   * When the parent chart groups by `lineBy` / `colorBy`:
   * - `true` (default): one band per group, colored to match the line
   * - `false`: a single band drawn across the whole dataset (e.g. an
   *   aggregate min/max across all series)
   */
  perSeries?: boolean
  /**
   * Whether the band area participates in hit testing. Defaults to
   * `false` — the band is decorative; hover/click pass through to the
   * line on top. Independent of the `datum.band` enrichment, which
   * happens whenever a band is configured.
   */
  interactive?: boolean
}

// ── XY frame per-axis config ───────────────────────────────────────────

/**
 * Per-axis configuration object for an XY frame's `axes: []` array.
 * Distinct from `AxisConfig` exported from the HOC layer (which is the
 * chart-level `xLabel` / `yLabel` / `xFormat` / `yFormat` bundle) —
 * this type describes one axis at a time and is what
 * `frameProps.axes[i]` consumes.
 *
 * Re-exported under the legacy name `AxisConfig` from `SVGOverlay.tsx`
 * for backwards-compatibility with internal callers; new code should
 * import this name directly.
 */
export interface XYFrameAxisConfig {
  orient: "left" | "right" | "top" | "bottom"
  label?: string
  ticks?: number
  /** Per-axis tick label formatter. ReactNode return is supported and
   *  renders inside a `<foreignObject>`. */
  tickFormat?: (d: any, index?: number, allTicks?: number[]) => string | ReactNode
  baseline?: boolean | "under"
  jaggedBase?: boolean
  /** Explicit tick values. When provided, bypasses both d3's "nice"
   *  generator and `axisExtent: "exact"` — the caller has hand-picked
   *  the positions. Pixel-distance filtering downstream still drops
   *  overlapping labels. Mirrors the ordinal frame's `rTickValues`. */
  tickValues?: Array<number | Date>
  /** Grid line stroke style: `"dashed"` (6,4), `"dotted"` (2,4), or a
   *  custom strokeDasharray string. Applied to grid lines extending
   *  from ticks across the chart area. */
  gridStyle?: "dashed" | "dotted" | string
  /** Always include the domain max as a tick, even if d3 omits it. */
  includeMax?: boolean
  /** Auto-rotate labels 45° when horizontal spacing is too tight. */
  autoRotate?: boolean
  /** Highlight ticks at time boundaries (new month, year, etc.) with
   *  semibold text. `true` auto-detects Date boundaries. A function
   *  receives (value, index) and returns true for landmark ticks. */
  landmarkTicks?: boolean | ((value: any, index: number) => boolean)
  /** Tick label anchoring strategy:
   *  - `"middle"` (default): all tick labels centered on the tick mark
   *  - `"edges"`: first tick label anchors to start, last to end,
   *    middles stay centered. Pairs naturally with `axisExtent: "exact"`
   *    — pins the domain to the data min/max AND keeps the extreme
   *    labels from overflowing the plot. */
  tickAnchor?: "middle" | "edges"
}

// ── StreamXYFrame props ────────────────────────────────────────────────

export interface StreamXYFrameProps<T = Datum> {
  // ── Chart type ───────────────────────────────────
  chartType: StreamChartType
  runtimeMode?: RuntimeMode

  // ── Data (bounded mode) ──────────────────────────
  data?: T[]

  // ── Chunking (progressive ingestion) ────────────
  /** Datasets larger than this are chunked for progressive rendering (default 5000) */
  chunkThreshold?: number
  /** Number of items per progressive chunk (default 5000) */
  chunkSize?: number

  // ── Accessors ────────────────────────────────────
  xAccessor?: string | ((d: T) => CoercibleNumber)
  yAccessor?: string | ((d: T) => CoercibleNumber)
  /**
   * Force domain/scene re-derivation when a stable function accessor's
   * external semantics changed without receiving a new function identity.
   * Prefer changing the accessor reference where possible.
   */
  accessorRevision?: number
  colorAccessor?: string | ((d: T) => string)
  sizeAccessor?: string | ((d: T) => CoercibleNumber)
  /** Categorical accessor → glyph shape (scatter/bubble). */
  symbolAccessor?: string | ((d: T) => string)
  /** Explicit `{category → shape}` map for `symbolAccessor`; unmapped auto-assign. */
  symbolMap?: Record<string, SymbolName>
  groupAccessor?: string | ((d: T) => string)

  // ── Line/area specifics ──────────────────────────
  lineDataAccessor?: string
  curve?: CurveType
  normalize?: boolean
  /**
   * Stacked area baseline. Only consulted by stackedarea chartType.
   * - "zero" (default): standard stack from y=0
   * - "wiggle": Byron–Wattenberg streamgraph offset (minimizes wiggle)
   * - "silhouette": center the stack symmetrically around y=0
   * - "diverging": positives stack above 0, negatives below 0 (signed values)
   *
   * Mutually exclusive with `normalize`: when `normalize` is `true`, the
   * stack is forced to a `"zero"` baseline (any other value is ignored)
   * because normalization assumes a fixed `[0, 1]` y-domain.
   */
  baseline?: "zero" | "wiggle" | "silhouette" | "diverging"
  /**
   * Stack order — controls which series sits at the top, middle, or bottom.
   * - "key" (default): alphabetical by group key
   * - "input": first-seen group order within the current data
   *   buffer/window; streaming eviction can change this order
   * - "insideOut": largest-total series in the middle, smaller alternating
   *   above/below. Combined with `baseline: "wiggle"` or `"silhouette"`,
   *   produces the canonical streamgraph look where a "central anchor"
   *   layer sits across y=0 and other layers stack outward.
   * - "asc" / "desc": by total ascending / descending
   */
  stackOrder?: "key" | "input" | "insideOut" | "asc" | "desc"

  // ── Bounds/uncertainty ─────────────────────────
  /**
   * Accessor returning a symmetric uncertainty offset per datum.
   * When set, an uncertainty band is drawn ± this offset from the line.
   */
  boundsAccessor?: string | ((d: T) => number)

  /**
   * Per-point area baseline accessor. When set, area charts fill between
   * yAccessor (top) and y0Accessor (bottom) instead of filling to the axis.
   * Use for percentile bands, confidence ribbons, or any band/ribbon chart.
   */
  y0Accessor?: string | ((d: T) => number)

  /**
   * Gradient fill for area charts. The fill fades from topOpacity at the line
   * to bottomOpacity at the baseline. Set to `true` for default (0.8 → 0.05)
   * or `{ topOpacity, bottomOpacity }` for custom values.
   */
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }

  /** Horizontal gradient for line strokes. Applied to all lines/area top-strokes. */
  lineGradient?: { colorStops: Array<{ offset: number; color: string }> }

  /** Series names (matching lineBy/colorBy group keys) that render as filled areas in "mixed" chartType */
  areaGroups?: string[]

  /**
   * Style for bounds/uncertainty areas.
   * If omitted, defaults to the line color at 0.2 opacity.
   */
  boundsStyle?: Style | ((d: T, group?: string) => Style)

  /**
   * Asymmetric min/max band(s) drawn under the line/area. Differs from
   * `boundsAccessor` (which is a symmetric ±offset) and from `y0Accessor`
   * (which replaces the area baseline). A band is a decorative envelope
   * — painted under the lines, above the grid, non-interactive by default
   * — driven by per-point `y0`/`y1` accessors.
   *
   * Pass an array for multi-band fan charts (e.g. p25/p75 inside p10/p90).
   * Outer bands first; inner bands stack on top.
   *
   * Participates in y-extent auto-derivation when `yExtent` is not pinned.
   */
  band?: BandConfig<T> | Array<BandConfig<T>>

  // ── Candlestick specifics ───────────────────────
  openAccessor?: string | ((d: T) => number)
  highAccessor?: string | ((d: T) => number)
  lowAccessor?: string | ((d: T) => number)
  closeAccessor?: string | ((d: T) => number)
  candlestickStyle?: CandlestickStyle

  // ── Bar/time-binned specifics ────────────────────
  binSize?: number

  // ── Heatmap specifics ────────────────────────────
  valueAccessor?: string | ((d: T) => number)

  // ── Streaming specifics ─────
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number
  timeAccessor?: string | ((d: T) => number)

  // ── Scale types ─────────────────────────────────
  xScaleType?: "linear" | "log" | "time"
  yScaleType?: "linear" | "log" | "symlog"

  // ── Extents ──────────────────────────────────────
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  extentPadding?: number
  /** Pixel inset on scale ranges to prevent glyph clipping at chart edges. Default 0. */
  scalePadding?: number
  sizeRange?: [number, number]

  // ── Layout ───────────────────────────────────────
  size?: [number, number]
  /** Auto-match width to container. Requires a sized parent element. */
  responsiveWidth?: boolean
  /** Auto-match height to container. Requires a parent with explicit height. */
  responsiveHeight?: boolean
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  background?: string

  // ── Style ────────────────────────────────────────
  lineStyle?: LineStyle | ((d: T, group?: string) => Style)
  pointStyle?: (d: T) => Style & { r?: number }
  areaStyle?: (d: T) => Style
  barStyle?: BarStyle
  waterfallStyle?: WaterfallStyle
  swarmStyle?: SwarmStyle
  barColors?: Record<string, string>
  colorScheme?: string | string[] | Record<string, string>

  // ── Axes ─────────────────────────────────────────
  showAxes?: boolean
  /**
   * Per-axis config array. See `XYFrameAxisConfig` for the full set of
   * fields — covers `tickValues`, `tickFormat`, `tickAnchor`,
   * `landmarkTicks`, `autoRotate`, `gridStyle`, `includeMax`,
   * `baseline`, `jaggedBase`, `label`, and `ticks`.
   */
  axes?: XYFrameAxisConfig[]
  xLabel?: string
  yLabel?: string
  /** Label for the right Y axis (dual-axis charts) */
  yLabelRight?: string
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | ReactNode
  yFormat?: (d: number | Date | string) => string | ReactNode
  /** Axis extent mode. `"nice"` (default) uses d3-scale's rounded
   *  tick generator — round tick labels at the cost of ticks not
   *  reaching the exact data min/max. `"exact"` pins the first
   *  and last tick to the data domain and spaces intermediate
   *  ticks equidistantly. Applies to both x and y axes. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
  tickFormatTime?: (value: number) => string
  tickFormatValue?: (value: number) => string

  // ── Interaction ──────────────────────────────────
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  customClickBehavior?: (d: HoverData | null) => void
  enableHover?: boolean
  /** Max pixel distance for hover/click hit testing. Default 30. */
  hoverRadius?: number
  /** Tooltip mode: "single" (default) shows one datum, "multi" shows all series at the hovered X. */
  tooltipMode?: "single" | "multi"

  // ── Brush ─────────────────────────────────────────
  /** Brush configuration — when provided, an SVG brush overlay is rendered */
  brush?: {
    /** Which dimension(s) to brush: "x", "y", or "xy" (default "xy") */
    dimension?: "x" | "y" | "xy"
    /** Snap mode: "continuous" (default) for pixel-precise, "bin" to snap to bin boundaries */
    snap?: "continuous" | "bin"
    /** Actual bin boundary values for data-driven snapping (overrides uniform grid math) */
    binBoundaries?: number[]
    /** When true, snap during drag (not just on release). Default false. */
    snapDuring?: boolean
  }
  /** Callback when brush selection changes. Called with data-space extent, or null when cleared. */
  onBrush?: (extent: { x: [number, number]; y: [number, number] } | null) => void

  // ── Point identification (for point-anchored annotations) ──
  /** Accessor for unique point IDs used by point-anchored annotations */
  pointIdAccessor?: string | ((d: T) => string)

  // ── Annotations ──────────────────────────────────
  annotations?: Datum[]
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // ── Grid / legend ────────────────────────────────
  showGrid?: boolean
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  legendLayout?: LegendLayout
  /** Accessor used to report the current legend category domain in push mode. */
  legendCategoryAccessor?: string | ((d: T) => string)
  /** Fires when the current legend category domain changes after scene rebuilds. */
  onCategoriesChange?: (categories: string[]) => void

  // ── Background / foreground graphics ───────────
  /** SVG elements rendered behind the canvas (in pixel space) */
  backgroundGraphics?: FrameGraphicsProp
  /** SVG elements rendered on top of everything (in SVG overlay) */
  foregroundGraphics?: FrameGraphicsProp

  // ── Custom canvas renderers ───────────────────
  /** Canvas renderers executed before the chart-type renderers (e.g. connecting lines under points) */
  canvasPreRenderers?: CanvasRendererFn[]
  /** SVG pre-renderers for SSR — SVG equivalent of canvasPreRenderers, rendered under data marks */
  svgPreRenderers?: SVGPreRendererFn[]

  // ── Title ────────────────────────────────────────
  title?: string | ReactNode

  // ── Category accessor (streaming bar/swarm) ──────
  categoryAccessor?: string | ((d: T) => string)

  // ── Realtime encoding ─────────────────────────────
  /** Configurable opacity decay for older data points */
  decay?: DecayConfig
  /** Flash effect on newly inserted data points */
  pulse?: PulseConfig
  /** Smooth position transitions on data change */
  transition?: TransitionConfig
  /** Declarative animation: `true` for defaults (300ms ease-out), or config object.
   *  When enabled, charts animate on first render (intro) and on data change.
   *  Set `{ intro: false }` to disable the intro animation. */
  animate?: AnimateProp
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig

  // ── Frame runtime policy ───────────────────────────
  /** Optional rAF seam for deterministic host scheduling. */
  frameScheduler?: import("./useFrame").FrameScheduler
  /** Monotonic wall-clock seam for deterministic replay, tests, or evidence capture. */
  clock?: import("./FrameRuntime").FrameClock
  /** Injectable random source for frame-local stochastic work. */
  random?: import("./FrameRuntime").FrameRandom
  /** Serializable deterministic random seed. Ignored when `random` is supplied. */
  seed?: number
  /** Freeze logical animation time and cancel queued work while paused. */
  paused?: boolean
  /** Freeze logical animation time while the page is hidden. Defaults to true for XY frames. */
  suspendWhenHidden?: boolean

  // ── Marginal graphics ────────────────────────────────
  /** Marginal distribution plots in axis margins (histogram, violin, ridgeline, boxplot) */
  marginalGraphics?: MarginalGraphicsConfig

  // ── Streaming heatmap ─────────────────────────────
  /** Aggregation mode for streaming heatmap (count, sum, mean) */
  heatmapAggregation?: "count" | "sum" | "mean"
  /** Number of x-axis bins for streaming heatmap (default: 20) */
  heatmapXBins?: number
  /** Number of y-axis bins for streaming heatmap (default: 20) */
  heatmapYBins?: number

  // ── Heatmap value labels ──────────────────────────
  /** Show numeric values inside heatmap cells (rendered natively on canvas) */
  showValues?: boolean
  /** Format function for heatmap cell value labels */
  heatmapValueFormat?: (v: number) => string

  // ── Accessibility ─────────────────────────────────
  /** Render a visually-hidden data table from the scene graph for screen readers */
  accessibleTable?: boolean
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string

  // ── Linked crosshair (coordinate-based hover sync) ─
  /** Name of the linked crosshair store entry — enables coordinate-based crosshair rendering */
  linkedCrosshairName?: string
  /** Source chart ID — crosshair is suppressed on the source chart to avoid double rendering */
  linkedCrosshairSourceId?: string

  // ── customLayout escape hatch ────────────────────
  /** Replaces chart-type scene dispatch with a user-supplied layout function.
   *  Receives a LayoutContext (scales, dimensions, theme, resolveColor) and
   *  returns SceneNode[] + optional overlays. See `semiotic/recipes` for
   *  reference layouts (waffle, calendar, horizon). */
  customLayout?: import("./customLayout").CustomLayout
  /** Called when `customLayout` throws. See `getLayoutFailure()` for the
   * latest structured failure diagnostic. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to LayoutContext.config.
   *  Typed as `object` so caller-defined interfaces (without an index
   *  signature) flow through without casts; layouts narrow via their
   *  own `CustomLayout<TConfig>` parameterization. */
  layoutConfig?: object
  /** Resolved shared selection projected into `LayoutContext.selection`. Kept off
   *  the rebuild path — a change restyles (if the layout returned `restyle`) or
   *  rebuilds, never re-ingests. */
  layoutSelection?: import("./customLayoutSelection").CustomLayoutSelection | null
}

// ── StreamXYFrame ref handle ───────────────────────────────────────────

export interface StreamXYFrameHandle<T = Datum> {
  push(datum: T): void
  pushMany(data: T[]): void
  /** Remove data points by ID. Requires pointIdAccessor. */
  remove(id: string | string[]): T[]
  /** Update data points by ID in place. Requires pointIdAccessor. Returns previous values. */
  update(id: string | string[], updater: (d: T) => T): T[]
  clear(): void
  getData(): T[]
  getScales(): StreamScales | null
  getExtents(): { x: [number, number]; y: [number, number] } | null
  /** The most recent custom layout result (nodes/overlays as returned by the
   *  `customLayout` function) — host readback so pages that need the computed
   *  placement don't re-run the layout. Null before the first layout or when
   *  no custom layout is configured. A failed retry retains the prior good
   *  result; inspect `getLayoutFailure()` to distinguish that recovery. */
  getCustomLayout(): import("./customLayout").LayoutResult | null
  /** The latest custom-layout failure, if any. Cleared by the next successful
   * layout, by removing the custom layout, or by `clear()`. */
  getLayoutFailure(): import("./customLayoutFailure").CustomLayoutFailureDiagnostic | null
}

// ── Canvas renderer function type ──────────────────────────────────────

export type CanvasRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  scales: StreamScales,
  layout: StreamLayout
) => void

/** SVG equivalent of CanvasRendererFn — returns React elements for SSR/SVG rendering */
export type SVGPreRendererFn = (
  nodes: SceneNode[],
  scales: StreamScales,
  layout: StreamLayout
) => ReactNode

// ── Re-exports for convenience ─────────────────────────────────────────
export type {
  ArrowOfTime,
  WindowMode,
  LineStyle,
  BarStyle,
  WaterfallStyle,
  SwarmStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  AnnotationAnchorMode
}
