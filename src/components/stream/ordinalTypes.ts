import type { ReactNode } from "react"
import type { ScaleLinear, ScaleBand } from "d3-scale"
import type {
  ArrowOfTime,
  WindowMode,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext
} from "../realtime/types"
import type {
  Style,
  Changeset,
  DecayConfig,
  PulseConfig,
  TransitionConfig,
  StalenessConfig,
  ThemeSemanticColors
} from "./types"
import type { AnimateProp } from "./pipelineTransitionUtils"
import type { LegendGroup } from "../types/legendTypes"

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
  /** Corner radius for rounded wedge arcs (d3-shape arc.cornerRadius) */
  cornerRadius?: number
  style: Style
  datum: any
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
  datum: any
  category?: string
  outliers?: { px: number; py: number; value: number; datum: any }[]
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
  datum: any
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
  datum: any
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
  datum: any
  category?: string
  _pulseIntensity?: number
  _pulseColor?: string
  _pulseGlowRadius?: number
  _targetOpacity?: number
  _transitionKey?: string
}

// Re-export scene node types from XY that we reuse
export type { Style, PointSceneNode, RectSceneNode } from "./types"
import type { PointSceneNode, RectSceneNode } from "./types"

export type OrdinalSceneNode =
  | RectSceneNode
  | PointSceneNode
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
  pieceData: Record<string, any>[]
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
  projection: "vertical" | "horizontal" | "radial"

  // Primary accessors
  categoryAccessor?: string | ((d: any) => string)
  valueAccessor?: string | ((d: any) => number) | Array<string | ((d: any) => number)>
  colorAccessor?: string | ((d: any) => string)
  stackBy?: string | ((d: any) => string)
  groupBy?: string | ((d: any) => string)
  timeAccessor?: string | ((d: any) => number)

  /** @deprecated Use categoryAccessor */
  oAccessor?: string | ((d: any) => string)
  /** @deprecated Use valueAccessor */
  rAccessor?: string | ((d: any) => number) | Array<string | ((d: any) => number)>

  multiAxis?: boolean

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]

  // Layout
  barPadding?: number
  /** Rounded top corner radius for bar charts. Only the end away from the baseline is rounded. For stacked bars, only the topmost segment gets rounded. */
  roundedTop?: number
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
  connectorAccessor?: string | ((d: any) => string)
  connectorStyle?: Style | ((d: any) => Style)

  // Dynamic column width
  dynamicColumnWidth?: string | ((data: any[]) => number)

  // Style
  pieceStyle?: (d: any, category?: string) => Style
  summaryStyle?: (d: any, category?: string) => Style
  colorScheme?: string | string[]
  themeCategorical?: string[]
  /** Theme-resolved semantic role colors — default fallback before hardcoded hex. See `ThemeSemanticColors` in ./types. */
  themeSemantic?: ThemeSemanticColors
  barColors?: Record<string, string>

  /** ID accessor for remove() — extracts a unique identifier from each datum */
  dataIdAccessor?: string | ((d: any) => string)

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  /** Whether to animate elements on first render (bars grow from baseline, wedges sweep in) */
  introAnimation?: boolean
  staleness?: StalenessConfig
}

// ── Component props ────────────────────────────────────────────────────

export interface StreamOrdinalFrameProps<T = Record<string, any>> {
  chartType: OrdinalChartType
  runtimeMode?: "bounded" | "streaming"
  data?: T[]

  // Primary accessors (HOC-style naming)
  /** Category field — the ordinal dimension (replaces oAccessor) */
  categoryAccessor?: string | ((d: T) => string)
  /** Value field — the quantitative dimension (replaces rAccessor). Can be array for multiAxis. */
  valueAccessor?: string | ((d: T) => number) | Array<string | ((d: T) => number)>
  colorAccessor?: string | ((d: T) => string)
  stackBy?: string | ((d: T) => string)
  groupBy?: string | ((d: T) => string)
  timeAccessor?: string | ((d: T) => number)

  /** @deprecated Use categoryAccessor instead */
  oAccessor?: string | ((d: T) => string)
  /** @deprecated Use valueAccessor instead */
  rAccessor?: string | ((d: T) => number) | Array<string | ((d: T) => number)>

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
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number

  // Connectors
  connectorAccessor?: string | ((d: T) => string)
  connectorStyle?: Style | ((d: any) => Style)

  /** ID accessor for remove()/update() — extracts a unique identifier from each datum */
  dataIdAccessor?: string | ((d: any) => string)

  /** Custom tick values for the value (r) axis. Overrides the default d3 ticks. */
  rTickValues?: number[]
  /** Align first tick label to start and last tick label to end. Default false. */
  tickLabelEdgeAlign?: boolean

  // Style
  pieceStyle?: (d: any, category?: string) => Style
  summaryStyle?: (d: any, category?: string) => Style
  colorScheme?: string | string[]
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
  customHoverBehavior?: (d: HoverData | null) => void

  // Annotations
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // Visual extras
  showGrid?: boolean
  legend?: ReactNode | { legendGroups: LegendGroup[] } | { gradient: import("../types/legendTypes").GradientLegendConfig }
  legendHoverBehavior?: (item: { label: string } | null) => void
  legendClickBehavior?: (item: { label: string }) => void
  legendHighlightedCategory?: string | null
  legendIsolatedCategories?: Set<string>
  legendPosition?: "right" | "left" | "top" | "bottom"
  backgroundGraphics?: ReactNode
  foregroundGraphics?: ReactNode
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

  // ── Accessibility ─────────────────────────────────
  /** Render a visually-hidden data table from the scene graph for screen readers */
  accessibleTable?: boolean
  /** Accessible description overriding the auto-generated aria-label on the chart container */
  description?: string
  /** Accessible summary rendered as a screen-reader-only note */
  summary?: string
}

// ── Ref handle ─────────────────────────────────────────────────────────

export interface StreamOrdinalFrameHandle<T = Record<string, any>> {
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
export type { HoverData, HoverAnnotationConfig, AnnotationContext, ArrowOfTime, WindowMode }
