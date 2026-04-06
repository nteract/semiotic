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
  StalenessConfig
} from "./types"
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

export interface WedgeSceneNode {
  type: "wedge"
  cx: number
  cy: number
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  style: Style
  datum: any
  category?: string
  /** Pulse intensity 0–1 (set when aggregated category value changes) */
  _pulseIntensity?: number
  /** Pulse color */
  _pulseColor?: string
  /** Animation target opacity (set during enter/exit transitions) */
  _targetOpacity?: number
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
  _targetOpacity?: number
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
  _targetOpacity?: number
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
  _targetOpacity?: number
}

export interface TrapezoidSceneNode {
  type: "trapezoid"
  /** Four corners: [top-left, top-right, bottom-right, bottom-left] */
  points: [number, number][]
  style: Style
  datum: any
  category?: string
  _targetOpacity?: number
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

  // Accessors — rAccessor can be an array for multiAxis support
  oAccessor?: string | ((d: any) => string)
  rAccessor?: string | ((d: any) => number) | Array<string | ((d: any) => number)>
  colorAccessor?: string | ((d: any) => string)
  stackBy?: string | ((d: any) => string)
  groupBy?: string | ((d: any) => string)

  // Multi-axis: each rAccessor gets an independent scale
  multiAxis?: boolean

  // Streaming accessors (aliases)
  timeAccessor?: string | ((d: any) => number)
  valueAccessor?: string | ((d: any) => number)
  categoryAccessor?: string | ((d: any) => string)

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]

  // Layout
  barPadding?: number
  /** When true, adds padding below the 0 baseline. When false (default), bars are flush with the axis line. */
  baselinePadding?: boolean
  innerRadius?: number
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

  // Sort — comparator receives category names (strings)
  oSort?: ((a: any, b: any) => number) | boolean | "asc" | "desc"

  // Connectors
  connectorAccessor?: string | ((d: any) => string)
  connectorStyle?: Style | ((d: any) => Style)

  // Dynamic column width
  dynamicColumnWidth?: string | ((data: any[]) => number)

  // Style
  pieceStyle?: (d: any, category?: string) => Style
  summaryStyle?: (d: any, category?: string) => Style
  colorScheme?: string | string[]
  barColors?: Record<string, string>

  /** ID accessor for remove() — extracts a unique identifier from each datum */
  dataIdAccessor?: string | ((d: any) => string)

  // Realtime encoding
  decay?: DecayConfig
  pulse?: PulseConfig
  transition?: TransitionConfig
  staleness?: StalenessConfig
}

// ── Component props ────────────────────────────────────────────────────

export interface StreamOrdinalFrameProps<T = Record<string, any>> {
  chartType: OrdinalChartType
  runtimeMode?: "bounded" | "streaming"
  data?: T[]

  // Accessors — rAccessor can be an array for multiAxis
  oAccessor?: string | ((d: T) => string)
  rAccessor?: string | ((d: T) => number) | Array<string | ((d: T) => number)>
  colorAccessor?: string | ((d: T) => string)
  stackBy?: string | ((d: T) => string)
  groupBy?: string | ((d: T) => string)

  // Multi-axis: each rAccessor gets an independent scale
  multiAxis?: boolean

  // Streaming accessors
  timeAccessor?: string | ((d: T) => number)
  valueAccessor?: string | ((d: T) => number)
  categoryAccessor?: string | ((d: T) => string)

  // Projection
  projection?: "vertical" | "horizontal" | "radial"

  // Layout
  size?: [number, number]
  responsiveWidth?: boolean
  responsiveHeight?: boolean
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  barPadding?: number
  baselinePadding?: boolean
  innerRadius?: number
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

  // Sort — comparator receives category names (strings)
  oSort?: ((a: any, b: any) => number) | boolean | "asc" | "desc"

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
  oLabel?: string
  rLabel?: string
  oFormat?: (d: string, index?: number) => string | ReactNode
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
