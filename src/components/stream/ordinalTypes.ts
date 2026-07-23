import type { ReactNode } from "react"
import type { ScaleLinear, ScaleBand } from "d3-scale"
import type {
  WindowMode,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext
} from "../realtime/types"
import type { AutoPlaceAnnotations } from "../recipes/annotationLayout"
import type { SymbolName } from "./symbolPath"
import type {
  Style,
  SceneDatum,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  ThemeSemanticColors,
  FrameGraphicsProp,
  SceneAccessibilityMetadata,
  SceneRenderMode
} from "./types"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import type { Datum } from "../charts/shared/datumTypes"
import type { OnObservationCallback } from "../store/ObservationStore"
import type {
  SemanticClickBehavior,
  SemanticHoverBehavior
} from "../charts/shared/semanticInteractions"
import type { OnAnnotationActivateCallback } from "../charts/shared/annotationActivation"

// ── Chart types ────────────────────────────────────────────────────────

export type OrdinalChartType =
  | "bar"
  | "clusterbar"
  | "point"
  | "swarm"
  | "pie"
  | "donut"
  | "boxplot"
  | "violin"
  | "histogram"
  | "ridgeline"
  | "timeline"
  | "funnel"
  | "bar-funnel"
  | "swimlane"
  | "custom"

// ── Scales ─────────────────────────────────────────────────────────────

export interface OrdinalScales {
  o: ScaleBand<string>
  r: ScaleLinear<number, number>
  projection: "vertical" | "horizontal" | "radial"
}

// ── Scene nodes ────────────────────────────────────────────────────────
//
// Angle convention: all scene node angles use **canvas convention**
// (0 = 3 o'clock / east, positive = clockwise). This matches
// CanvasRenderingContext2D.arc(). The SVG renderer (SceneToSVG.tsx)
// adds π/2 when passing to d3-shape's arc() generator, which uses
// 0 = 12 o'clock / north.

export interface WedgeSceneNode {
  type: "wedge"
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  /** Start angle in radians, canvas convention (0 = 3 o'clock, positive = clockwise) */
  startAngle: number
  /** End angle in radians, canvas convention */
  endAngle: number
  /** Corner radius for rounded wedge arcs (d3-shape arc.cornerRadius).
   *  When set on its own, rounds ALL FOUR corners (the d3-shape default).
   *  Pair with `roundedEnds` to round only the gauge's outer endpoints —
   *  the swimlane analogue for radial sectors: first wedge's start side
   *  + last wedge's end side rounded, internal zone seams stay square. */
  cornerRadius?: number
  /** Selective per-end rounding. When omitted, `cornerRadius` rounds all
   *  four corners. When provided, `cornerRadius` rounds ONLY the sides
   *  marked `true` — `{ start: true }` rounds the wedge's startAngle
   *  side (both inner and outer corners at that angle), `{ end: true }`
   *  rounds the endAngle side. The gauge scene builder uses this to
   *  paint outer endpoints rounded but internal zone seams square. */
  roundedEnds?: { start?: boolean; end?: boolean }
  /** Render the wedge's interior as N equal angular slices, each filled
   *  with the corresponding color from `colors`. The wedge's own shape
   *  (incl. `cornerRadius` + `roundedEnds`) is used as a clip mask so
   *  only the slice geometry shows through the rounded outline. Used by
   *  GaugeChart's gradient-fill mode: the band reads as one continuous
   *  rounded arc with a gradient sampled along its length, without any
   *  individual slice (which would be far too narrow to host its own
   *  rounded corners) needing to round. Slices are an internal
   *  rendering detail — they do not appear as separate scene nodes,
   *  participate in hit testing, or transition independently. */
  _gradientBand?: { colors: string[] }
  style: Style
  datum: SceneDatum
  accessibleDatum?: SceneAccessibilityMetadata["accessibleDatum"]
  accessibility?: SceneAccessibilityMetadata["accessibility"]
  category?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _targetStartAngle?: number
  _targetEndAngle?: number
  _transitionKey?: string
}

export interface BoxplotSceneNode {
  type: "boxplot"
  /** Pixel x position of the column center */
  x: number
  /** Pixel y of the value axis origin */
  y: number
  projection: "vertical" | "horizontal"
  columnWidth: number
  /** Pre-projected pixel positions for each quantile */
  minPos: number
  q1Pos: number
  medianPos: number
  q3Pos: number
  maxPos: number
  stats: DistributionStats
  style: Style
  datum: Datum
  category?: string
  outliers?: { px: number; py: number; value: number; datum: Datum }[]
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _transitionKey?: string
}

export interface DistributionStats {
  n: number
  min: number
  q1: number
  median: number
  q3: number
  max: number
  mean: number
}

export interface ViolinSceneNode {
  type: "violin"
  /** Pre-computed SVG path string for Path2D */
  pathString: string
  /** Translation for the path */
  translateX: number
  translateY: number
  /** Bounding box for hit testing */
  bounds?: { x: number; y: number; width: number; height: number }
  /** Optional IQR line overlay */
  iqrLine?: { q1Pos: number; medianPos: number; q3Pos: number; centerPos: number; isVertical: boolean }
  /** Pre-computed distribution statistics for tooltips */
  stats?: DistributionStats
  style: Style
  datum: Datum
  category?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _transitionKey?: string
}

export interface ConnectorSceneNode {
  type: "connector"
  x1: number
  y1: number
  x2: number
  y2: number
  style: Style
  datum: Datum
  group?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _transitionKey?: string
}

export interface TrapezoidSceneNode {
  type: "trapezoid"
  /** Four corners: [top-left, top-right, bottom-right, bottom-left] */
  points: [number, number][]
  style: Style
  datum: Datum
  category?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _transitionKey?: string
}

// Re-export scene node types from XY that we reuse
export type { Style, PointSceneNode, RectSceneNode, SymbolSceneNode, GlyphSceneNode } from "./types"
import type { PointSceneNode, RectSceneNode, SymbolSceneNode, GlyphSceneNode } from "./types"

export type OrdinalSceneNode =
  | RectSceneNode
  | PointSceneNode
  | SymbolSceneNode
  | GlyphSceneNode
  | WedgeSceneNode
  | BoxplotSceneNode
  | ViolinSceneNode
  | ConnectorSceneNode
  | TrapezoidSceneNode

// ── Projected column ───────────────────────────────────────────────────

export interface OrdinalColumn {
  name: string
  x: number
  y: number
  width: number
  middle: number
  padding: number
  pieceData: Datum[]
  /** For radial: proportion of total (0-1) */
  pct: number
  /** For radial: cumulative start proportion */
  pctStart: number
}

// ── Pipeline config ────────────────────────────────────────────────────

export interface OrdinalPipelineConfig {
  chartType: OrdinalChartType
  runtimeMode?: "bounded" | "streaming"
  windowSize: number
  windowMode: WindowMode
  extentPadding: number
  /** When `"exact"`, the value-axis domain is pinned to the literal data
   *  min/max — `extentPadding` is skipped so the first and last ticks
   *  land on the actual data bounds. Default `"nice"` keeps the existing
   *  padded domain so symbols at the extremes don't clip the plot edge. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
  projection: "vertical" | "horizontal" | "radial"

  // Primary accessors
  categoryAccessor?: string | ((d: Datum) => string)
  valueAccessor?: string | ((d: Datum) => number) | Array<string | ((d: Datum) => number)>
  colorAccessor?: string | ((d: Datum) => string)
  /** Categorical accessor → glyph shape (swarm/dot). Emits SymbolSceneNodes. */
  symbolAccessor?: string | ((d: Datum) => string)
  /** Explicit `{category → shape}` map; unmapped categories auto-assign. */
  symbolMap?: Record<string, SymbolName>
  stackBy?: string | ((d: Datum) => string)
  groupBy?: string | ((d: Datum) => string)
  timeAccessor?: string | ((d: Datum) => number)

  /** @deprecated Use categoryAccessor */
  oAccessor?: string | ((d: Datum) => string)
  /** @deprecated Use valueAccessor */
  rAccessor?: string | ((d: Datum) => number) | Array<string | ((d: Datum) => number)>

  /**
   * Escape hatch for a *stable* function accessor whose captured semantics
   * change without its identity changing. Accessor equality is identity-based,
   * so such a change is otherwise invisible. Bump this number to force the
   * store to re-resolve accessors, rebuild the category domain, and reset value
   * extents. Prefer changing the accessor identity where you can. */
  accessorRevision?: number

  multiAxis?: boolean

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]

  // Layout
  barPadding?: number
  /** Rounded top corner radius for bar charts. Only the end away from the baseline is rounded. For stacked bars, only the topmost segment gets rounded. */
  roundedTop?: number
  /** Gradient fill for bar rects. `{ topOpacity, bottomOpacity }` fades the
   *  resolved fill color from tip (opposite the baseline) to base; `{ colorStops }`
   *  renders a multi-color gradient along the same axis. Direction follows the
   *  bar's orientation (tip → base). Same shape as AreaChart.gradientFill
   *  sans the `boolean` case — the HOC resolves `true` to default opacities. */
  gradientFill?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** Swimlane "track" fill — a rect drawn behind each lane spanning the
   *  full value-axis range, sized to the lane's bandwidth. Used to make
   *  budget/progress lanes read as filled vs. empty. Pass a color (CSS
   *  var supported) or `{ color, opacity }`. Honored by `chartType="swimlane"` only. */
  trackFill?: string | { color: string; opacity?: number }
  /** When true, adds padding below the 0 baseline. When false (default), bars are flush with the axis line. */
  baselinePadding?: boolean
  innerRadius?: number
  /** Corner radius for rounded wedge arcs (pie/donut) */
  cornerRadius?: number
  normalize?: boolean
  startAngle?: number
  /** Total arc sweep in degrees (default 360 = full circle). Used by GaugeChart for partial arcs. */
  sweepAngle?: number

  // Summary config
  bins?: number
  showOutliers?: boolean
  showIQR?: boolean
  amplitude?: number

  // Funnel
  connectorOpacity?: number
  showLabels?: boolean

  // Sort — comparator receives category names (strings).
  //   • `"auto"` / `undefined` — preserve insertion order while streaming,
  //     fall through to value-desc on static data.
  //   • `"asc"` / `"desc"` — sort by total value, ascending / descending.
  //   • `true` — legacy alias for value-desc regardless of source (used
  //     as the default on some HOCs pre-"auto"; new HOCs should prefer
  //     `"auto"`).
  //   • `false` — insertion order always.
  //   • function — custom category comparator; receives the two category
  //     name strings, returns a negative/positive number for ordering.
  oSort?: ((a: string, b: string) => number) | boolean | "asc" | "desc" | "auto"

  // Connectors
  connectorAccessor?: string | ((d: Datum) => string)
  connectorStyle?: Style | ((d: Datum) => Style)

  // Dynamic column width
  dynamicColumnWidth?: string | ((data: Datum[]) => number)

  // Style
  pieceStyle?: (d: Datum, category?: string) => Style
  summaryStyle?: (d: Datum, category?: string) => Style
  colorScheme?: string | string[] | Record<string, string>
  themeCategorical?: string[]
  /** Theme-resolved semantic role colors — default fallback before hardcoded hex. See `ThemeSemanticColors` in ./types. */
  themeSemantic?: ThemeSemanticColors
  /** Theme sequential scheme name — fallback for magnitude encodings. */
  themeSequential?: string
  /** Theme diverging scheme name — fallback for midpoint encodings (LikertChart). */
  themeDiverging?: string
  barColors?: Record<string, string>

  /** ID accessor for remove() — extracts a unique identifier from each datum */
  dataIdAccessor?: string | ((d: Datum) => string)

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render (bars grow from baseline, wedges sweep in) */
  introAnimation?: boolean
  staleness?: StalenessConfig
  /** Frame-owned logical clock for ingest, pulse, staleness, and transitions. */
  clock?: import("./FrameRuntime").FrameClock

  // ── customLayout escape hatch ────────────────────
  /** When provided, replaces chart-type dispatch in scene building.
   *  Receives an OrdinalLayoutContext (scales, dimensions, theme,
   *  resolveColor) and returns scene nodes plus optional overlays. */
  customLayout?: import("./ordinalCustomLayout").OrdinalCustomLayout
  /** Called when `customLayout` throws. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to OrdinalLayoutContext.config. */
  layoutConfig?: object
  /** Resolved margin — passed through so OrdinalLayoutContext.dimensions.margin
   *  reflects what the frame actually used. */
  layoutMargin?: import("../types/marginType").MarginType
  /** Resolved shared selection projected into OrdinalLayoutContext.selection.
   *  Owned by a dedicated frame effect (kept off the rebuild path). */
  layoutSelection?: import("./customLayoutSelection").CustomLayoutSelection | null
}

// ── Component props ────────────────────────────────────────────────────

export interface StreamOrdinalFrameProps<T = Datum> {
  chartType: OrdinalChartType
  runtimeMode?: "bounded" | "streaming"
  data?: T[]

  // Primary accessors (HOC-style naming)
  /** Category field — the ordinal dimension (replaces oAccessor) */
  categoryAccessor?: string | ((d: T) => string)
  /** Value field — the quantitative dimension (replaces rAccessor). Can be array for multiAxis. */
  valueAccessor?: string | ((d: T) => number) | Array<string | ((d: T) => number)>
  colorAccessor?: string | ((d: T) => string)
  /** Categorical accessor → glyph shape (swarm/dot). */
  symbolAccessor?: string | ((d: T) => string)
  /** Explicit `{category → shape}` map for `symbolAccessor`; unmapped auto-assign. */
  symbolMap?: Record<string, SymbolName>
  stackBy?: string | ((d: T) => string)
  groupBy?: string | ((d: T) => string)
  timeAccessor?: string | ((d: T) => number)

  /** @deprecated Use categoryAccessor instead */
  oAccessor?: string | ((d: T) => string)
  /** @deprecated Use valueAccessor instead */
  rAccessor?: string | ((d: T) => number) | Array<string | ((d: T) => number)>

  /**
   * Force category/value re-derivation when a stable accessor's external
   * semantics changed without a new function identity. Prefer changing the
   * accessor reference where possible.
   */
  accessorRevision?: number

  // Multi-axis: each valueAccessor entry gets an independent scale
  multiAxis?: boolean

  // Projection
  projection?: "vertical" | "horizontal" | "radial"

  // Layout
  size?: [number, number]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  barPadding?: number
  roundedTop?: number
  /** Gradient fill for bar rects. Same shape as AreaChart.gradientFill sans
   *  the boolean case — resolve booleans at the HOC layer. */
  gradientFill?: { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** Swimlane "track" fill — see OrdinalPipelineConfig.trackFill */
  trackFill?: string | { color: string; opacity?: number }
  baselinePadding?: boolean
  innerRadius?: number
  cornerRadius?: number
  normalize?: boolean
  startAngle?: number
  sweepAngle?: number
  dynamicColumnWidth?: string | ((data: T[]) => number)

  // Summary config
  bins?: number
  showOutliers?: boolean
  showIQR?: boolean
  amplitude?: number
  connectorOpacity?: number
  showLabels?: boolean

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]
  extentPadding?: number

  // Sort — comparator receives category names (strings).
  //   • `"auto"` / `undefined` — preserve insertion order while streaming,
  //     fall through to value-desc on static data.
  //   • `"asc"` / `"desc"` — sort by total value, ascending / descending.
  //   • `true` — legacy alias for value-desc regardless of source (used
  //     as the default on some HOCs pre-"auto"; new HOCs should prefer
  //     `"auto"`).
  //   • `false` — insertion order always.
  //   • function — custom category comparator; receives the two category
  //     name strings, returns a negative/positive number for ordering.
  oSort?: ((a: string, b: string) => number) | boolean | "asc" | "desc" | "auto"

  // Streaming
  windowMode?: WindowMode
  windowSize?: number

  // Connectors
  connectorAccessor?: string | ((d: T) => string)
  connectorStyle?: Style | ((d: Datum) => Style)

  /** ID accessor for remove()/update() — extracts a unique identifier from each datum */
  dataIdAccessor?: string | ((d: Datum) => string)

  /** Custom tick values for the value (r) axis. Overrides the default d3 ticks. */
  rTickValues?: number[]
  /** Align first tick label to start and last tick label to end. Default false. */
  tickLabelEdgeAlign?: boolean
  /** Axis extent mode for the value (r) axis. `"nice"` (default) uses
   *  d3-scale's rounded tick generator. `"exact"` pins the first and
   *  last tick to the actual data min and max with equidistant
   *  intermediate ticks. The categorical (o) axis is unaffected since
   *  it's a band scale, not a continuous one. Ignored when explicit
   *  `rTickValues` are provided — caller has hand-picked positions. */
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode

  // Style
  /** Optional scene paint backend. Exact scene geometry remains interactive. */
  renderMode?: SceneRenderMode<OrdinalSceneNode>
  pieceStyle?: (d: Datum, category?: string) => Style
  summaryStyle?: (d: Datum, category?: string) => Style
  colorScheme?: string | string[] | Record<string, string>
  barColors?: Record<string, string>

  // Axes
  showAxes?: boolean
  showCategoryTicks?: boolean
  /** Category axis label */
  categoryLabel?: string
  /** Value axis label */
  valueLabel?: string
  /** Category tick formatter */
  categoryFormat?: (d: string, index?: number) => string | ReactNode
  /** Value tick formatter */
  valueFormat?: (d: number | string) => string
  /** @deprecated Use categoryLabel */
  oLabel?: string
  /** @deprecated Use valueLabel */
  rLabel?: string
  /** @deprecated Use categoryFormat */
  oFormat?: (d: string, index?: number) => string | ReactNode
  /** @deprecated Use valueFormat */
  rFormat?: (d: number | string) => string

  // Interaction
  enableHover?: boolean
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: SemanticHoverBehavior<HoverData>
  customClickBehavior?: SemanticClickBehavior<HoverData>
  /** Structured interaction observations, including semantic focus/activate. */
  onObservation?: OnObservationCallback
  /** @internal HOC observation callback forwarded only to annotation widgets. */
  annotationObservationCallback?: OnObservationCallback
  /** Chart instance identifier included in observation events. */
  chartId?: string

  // Annotations
  annotations?: Datum[]
  /** Observe activation of widget annotations without replacing widget behavior. */
  onAnnotationActivate?: OnAnnotationActivateCallback
  autoPlaceAnnotations?: AutoPlaceAnnotations
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // Visual extras
  showGrid?: boolean
  legend?: LegendValue
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
  /** SVG behind the canvas. Function form receives `{ size, margin, scales }`
   *  with the frame's resolved `{o, r, projection}` scales (null pre-layout). */
  backgroundGraphics?: FrameGraphicsProp<OrdinalScales>
  /** SVG on top (in the overlay). Function form receives `{ size, margin, scales }`
   *  with the frame's resolved `{o, r, projection}` scales (null pre-layout). */
  foregroundGraphics?: FrameGraphicsProp<OrdinalScales>
  title?: string | ReactNode
  className?: string
  background?: string

  // Donut center content
  centerContent?: ReactNode

  // ── Brush ─────────────────────────────────────
  /** Brush configuration. "r" brushes the value axis. */
  brush?: boolean | "r" | {
    dimension?: "r"
  }
  /** Callback when brush selection changes. Extent is in data coordinates, or null when cleared. */
  onBrush?: (extent: { r: [number, number] } | null) => void

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Declarative animation: `true` for defaults (300ms ease-out), or config object.
   *  When enabled, charts animate on first render (intro) and on data change.
   *  Set `{ intro: false }` to disable the intro animation. */
  animate?: AnimateProp
  staleness?: StalenessConfig

  // ── Frame runtime policy ───────────────────────────
  /** Optional rAF seam for deterministic host scheduling. */
  frameScheduler?: import("./useFrame").FrameScheduler
  /** Monotonic wall-clock seam used to derive logical frame time. */
  clock?: import("./FrameRuntime").FrameClock
  /** Injectable frame-local random source. Ordinal rendering currently has no stochastic layout. */
  random?: import("./FrameRuntime").FrameRandom
  /** Serializable deterministic random seed for future ordinal stochastic work. */
  seed?: number
  /** Freeze logical animation time and cancel queued work while paused. */
  paused?: boolean
  /** Freeze logical animation time while the document is hidden. Defaults to true. */
  suspendWhenHidden?: boolean

  // ── Accessibility ─────────────────────────────────
  /** Render a visually-hidden data table from the scene graph for screen readers */
  accessibleTable?: boolean
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string

  // ── customLayout escape hatch ────────────────────
  /** Replaces ordinal scene dispatch with a user-supplied function.
   *  Receives an OrdinalLayoutContext (scales, dimensions, theme,
   *  resolveColor), returns scene nodes + optional overlays. See
   *  `semiotic/recipes` for reference layouts (marimekko, parallel
   *  coordinates, bullet). */
  customLayout?: import("./ordinalCustomLayout").OrdinalCustomLayout
  /** Called when `customLayout` throws. */
  onLayoutError?: (
    diagnostic: import("./customLayoutFailure").CustomLayoutFailureDiagnostic
  ) => void
  /** User-supplied config blob threaded through to OrdinalLayoutContext.config. */
  layoutConfig?: object
  /** Resolved shared selection projected into `OrdinalLayoutContext.selection`.
   *  Kept off the rebuild path — restyles (if the layout returned `restyle`) or
   *  rebuilds, never re-ingests. */
  layoutSelection?: import("./customLayoutSelection").CustomLayoutSelection | null
}

// ── Ref handle ─────────────────────────────────────────────────────────

export interface StreamOrdinalFrameHandle<T = Datum> {
  push(datum: T): void
  pushMany(data: T[]): void
  /** Replace all data. Unlike `clear() + pushMany()`, `replace()` preserves
   *  the previous scene's position snapshot so data-change transitions fire.
   *  Use when you need to swap in a full new dataset (e.g. re-aggregated
   *  values from streaming input) and want the bars/points/etc. to animate
   *  between the old and new positions.
   *
   *  Note: for datasets within the DataSourceAdapter chunk threshold (the
   *  common case for aggregator HOCs like LikertChart) the replacement
   *  lands in a single changeset. Larger datasets fall through to the
   *  progressive-chunked path used by the `data` prop — the first chunk
   *  resets + seeds the buffer, subsequent chunks append on successive
   *  animation frames, so replacement is not instantaneous for large N. */
  replace(data: T[]): void
  /** Remove data items by ID. Requires dataIdAccessor. */
  remove(id: string | string[]): T[]
  /** Update data items by ID in place. Requires dataIdAccessor. Returns previous values. */
  update(id: string | string[], updater: (d: T) => T): T[]
  clear(): void
  getData(): T[]
  getScales(): OrdinalScales | null
  /** The most recent custom layout result — host readback so pages that need
   *  the computed placement don't re-run the layout. Null before the first
   *  layout or when no custom layout is configured. A failed retry retains the
   *  prior good result; inspect `getLayoutFailure()` to distinguish recovery. */
  getCustomLayout(): import("./ordinalCustomLayout").OrdinalLayoutResult | null
  /** The latest custom-layout failure, if any. Cleared by a successful layout,
   * removing the custom layout, or `clear()`. */
  getLayoutFailure(): import("./customLayoutFailure").CustomLayoutFailureDiagnostic | null
}

// ── Layout ─────────────────────────────────────────────────────────────

export interface OrdinalLayout {
  width: number
  height: number
}

// ── Renderer function ──────────────────────────────────────────────────

export type OrdinalRendererFn = (
  ctx: CanvasRenderingContext2D,
  nodes: OrdinalSceneNode[],
  scales: OrdinalScales,
  layout: OrdinalLayout
) => void

// Re-export shared types
export type { HoverData, HoverAnnotationConfig, AnnotationContext, WindowMode }
export type { ArrowOfTime } from "../realtime/types"
