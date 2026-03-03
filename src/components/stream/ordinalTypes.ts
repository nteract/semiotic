import type { ReactNode } from "react"
import type { ScaleLinear, ScaleBand } from "d3-scale"
import type {
  ArrowOfTime,
  WindowMode,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext
} from "../realtime/types"
import type { Style, Changeset } from "./types"
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
  stats: { min: number; q1: number; median: number; q3: number; max: number }
  style: Style
  datum: any
  category?: string
  outliers?: { px: number; py: number; value: number; datum: any }[]
}

export interface ViolinSceneNode {
  type: "violin"
  /** Pre-computed SVG path string for Path2D */
  pathString: string
  /** Translation for the path */
  translateX: number
  translateY: number
  /** Optional IQR line overlay */
  iqrLine?: { q1Pos: number; medianPos: number; q3Pos: number }
  style: Style
  datum: any
  category?: string
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

  // Accessors
  oAccessor?: string | ((d: any) => string)
  rAccessor?: string | ((d: any) => number)
  colorAccessor?: string | ((d: any) => string)
  stackBy?: string | ((d: any) => string)
  groupBy?: string | ((d: any) => string)

  // Streaming accessors (aliases)
  timeAccessor?: string | ((d: any) => number)
  valueAccessor?: string | ((d: any) => number)
  categoryAccessor?: string | ((d: any) => string)

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]

  // Layout
  barPadding?: number
  innerRadius?: number
  normalize?: boolean
  startAngle?: number

  // Summary config
  bins?: number
  showOutliers?: boolean
  showIQR?: boolean

  // Sort
  oSort?: ((a: string, b: string) => number) | boolean | "asc" | "desc"

  // Style
  pieceStyle?: (d: any, category?: string) => Style
  summaryStyle?: (d: any, category?: string) => Style
  colorScheme?: string | string[]
  barColors?: Record<string, string>
}

// ── Component props ────────────────────────────────────────────────────

export interface StreamOrdinalFrameProps<T = Record<string, any>> {
  chartType: OrdinalChartType
  runtimeMode?: "bounded" | "streaming"
  data?: T[]

  // Accessors
  oAccessor?: string | ((d: T) => string)
  rAccessor?: string | ((d: T) => number)
  colorAccessor?: string | ((d: T) => string)
  stackBy?: string | ((d: T) => string)
  groupBy?: string | ((d: T) => string)

  // Streaming accessors
  timeAccessor?: string | ((d: T) => number)
  valueAccessor?: string | ((d: T) => number)
  categoryAccessor?: string | ((d: T) => string)

  // Projection
  projection?: "vertical" | "horizontal" | "radial"

  // Layout
  size?: [number, number]
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  barPadding?: number
  innerRadius?: number
  normalize?: boolean
  startAngle?: number

  // Summary config
  bins?: number
  showOutliers?: boolean
  showIQR?: boolean

  // Extents
  rExtent?: [number?, number?]
  oExtent?: string[]
  extentPadding?: number

  // Sort
  oSort?: ((a: string, b: string) => number) | boolean | "asc" | "desc"

  // Streaming
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number

  // Style
  pieceStyle?: (d: any, category?: string) => Style
  summaryStyle?: (d: any, category?: string) => Style
  colorScheme?: string | string[]
  barColors?: Record<string, string>

  // Axes
  showAxes?: boolean
  oLabel?: string
  rLabel?: string
  oFormat?: (d: string) => string
  rFormat?: (d: number) => string

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
  legend?: ReactNode | { legendGroups: LegendGroup[] }
  backgroundGraphics?: ReactNode
  foregroundGraphics?: ReactNode
  title?: string | ReactNode
  className?: string
  background?: string

  // Donut center content
  centerContent?: ReactNode
}

// ── Ref handle ─────────────────────────────────────────────────────────

export interface StreamOrdinalFrameHandle<T = Record<string, any>> {
  push(datum: T): void
  pushMany(data: T[]): void
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
