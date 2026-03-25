import type { ReactNode } from "react"
import type { ScaleLinear } from "d3-scale"
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
  /** ms without data before "stale" (default: 5000) */
  threshold?: number
  /** Canvas alpha when stale (default: 0.5) */
  dimOpacity?: number
  /** Render LIVE/STALE badge (default: false) */
  showBadge?: boolean
  /** Badge position (default: "top-right") */
  badgePosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
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
  | "scatter"
  | "bubble"
  | "heatmap"
  | "bar"
  | "swarm"
  | "waterfall"
  | "candlestick"

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
}

export type SceneNode =
  | LineSceneNode
  | AreaSceneNode
  | PointSceneNode
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
  datum: any
  group?: string
  /** Curve interpolation type (default: linear / straight segments) */
  curve?: CurveType
  /** Per-vertex decay opacities (oldest→newest = minOpacity→1.0). Set by PipelineStore.applyDecay. */
  _decayOpacities?: number[]
  /** Animation target opacity (set during enter/exit transitions) */
  _targetOpacity?: number
  /** Stable identity key for transition tracking */
  _transitionKey?: string
  /** Previous path coordinates for interpolation during transitions */
  _prevPath?: [number, number][]
  /** Target path coordinates for interpolation during transitions */
  _targetPath?: [number, number][]
}

export interface AreaSceneNode {
  type: "area"
  topPath: [number, number][]
  bottomPath: [number, number][]
  style: Style
  datum: any
  group?: string
  /** Vertical gradient fill: opacity fades from topOpacity at the line to bottomOpacity at the baseline */
  fillGradient?: { topOpacity: number; bottomOpacity: number }
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
}

export interface PointSceneNode {
  type: "point"
  x: number
  y: number
  r: number
  style: Style
  datum: any
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

export interface RectSceneNode {
  type: "rect"
  x: number
  y: number
  w: number
  h: number
  style: Style
  datum: any
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
  datum: any
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
  datum: any
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
}

// ── Candlestick style ──────────────────────────────────────────────────

export interface CandlestickStyle {
  upColor?: string
  downColor?: string
  wickColor?: string
  bodyWidth?: number
  wickWidth?: number
}

// ── Changeset ──────────────────────────────────────────────────────────

export interface Changeset<T = Record<string, any>> {
  inserts: T[]
  bounded: boolean
  /** Hint: total dataset size when progressively chunking bounded data */
  totalSize?: number
}

// ── Scales ─────────────────────────────────────────────────────────────

export interface StreamScales {
  x: ScaleLinear<number, number>
  y: ScaleLinear<number, number>
}

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

// ── StreamXYFrame props ────────────────────────────────────────────────

export interface StreamXYFrameProps<T = Record<string, any>> {
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
  xAccessor?: string | ((d: T) => number)
  yAccessor?: string | ((d: T) => number)
  colorAccessor?: string | ((d: T) => string)
  sizeAccessor?: string | ((d: T) => number)
  groupAccessor?: string | ((d: T) => string)

  // ── Line/area specifics ──────────────────────────
  lineDataAccessor?: string
  curve?: CurveType
  normalize?: boolean

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
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number }

  /**
   * Style for bounds/uncertainty areas.
   * If omitted, defaults to the line color at 0.2 opacity.
   */
  boundsStyle?: Style | ((d: T, group?: string) => Style)

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
  xScaleType?: "linear" | "log"
  yScaleType?: "linear" | "log"

  // ── Extents ──────────────────────────────────────
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  extentPadding?: number
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
  colorScheme?: string | string[]

  // ── Axes ─────────────────────────────────────────
  showAxes?: boolean
  axes?: Array<{
    orient: "left" | "right" | "top" | "bottom"
    label?: string
    ticks?: number
    tickFormat?: (d: any, index?: number, allTicks?: number[]) => string
    baseline?: boolean | "under"
    jaggedBase?: boolean
  }>
  xLabel?: string
  yLabel?: string
  /** Label for the right Y axis (dual-axis charts) */
  yLabelRight?: string
  xFormat?: (d: any, index?: number, allTicks?: number[]) => string
  yFormat?: (d: any) => string
  tickFormatTime?: (value: number) => string
  tickFormatValue?: (value: number) => string

  // ── Interaction ──────────────────────────────────
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  enableHover?: boolean

  // ── Brush ─────────────────────────────────────────
  /** Brush configuration — when provided, an SVG brush overlay is rendered */
  brush?: {
    /** Which dimension(s) to brush: "x", "y", or "xy" (default "xy") */
    dimension?: "x" | "y" | "xy"
  }
  /** Callback when brush selection changes. Called with data-space extent, or null when cleared. */
  onBrush?: (extent: { x: [number, number]; y: [number, number] } | null) => void

  // ── Point identification (for point-anchored annotations) ──
  /** Accessor for unique point IDs used by point-anchored annotations */
  pointIdAccessor?: string | ((d: T) => string)

  // ── Annotations ──────────────────────────────────
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // ── Grid / legend ────────────────────────────────
  showGrid?: boolean
  legend?: ReactNode | { legendGroups: any[] } | { gradient: import("../types/legendTypes").GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"

  // ── Background / foreground graphics ───────────
  /** SVG elements rendered behind the canvas (in pixel space) */
  backgroundGraphics?: ReactNode
  /** SVG elements rendered on top of everything (in SVG overlay) */
  foregroundGraphics?: ReactNode

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
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig

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
  /** Render a visually-hidden data table from the scene graph for screen readers (first 50 rows) */
  accessibleTable?: boolean
}

// ── StreamXYFrame ref handle ───────────────────────────────────────────

export interface StreamXYFrameHandle<T = Record<string, any>> {
  push(datum: T): void
  pushMany(data: T[]): void
  clear(): void
  getData(): T[]
  getScales(): StreamScales | null
  getExtents(): { x: [number, number]; y: [number, number] } | null
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
