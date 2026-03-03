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
  AnnotationContext
} from "../realtime/types"

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

export type RuntimeMode = "bounded" | "streaming"

// ── Scene graph ────────────────────────────────────────────────────────

export interface Style {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
  fill?: string
  fillOpacity?: number
  opacity?: number
}

export type SceneNode =
  | LineSceneNode
  | AreaSceneNode
  | PointSceneNode
  | RectSceneNode
  | HeatcellSceneNode

export interface LineSceneNode {
  type: "line"
  path: [number, number][]
  style: Style
  datum: any
  group?: string
}

export interface AreaSceneNode {
  type: "area"
  topPath: [number, number][]
  bottomPath: [number, number][]
  style: Style
  datum: any
  group?: string
}

export interface PointSceneNode {
  type: "point"
  x: number
  y: number
  r: number
  style: Style
  datum: any
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
}

export interface HeatcellSceneNode {
  type: "heatcell"
  x: number
  y: number
  w: number
  h: number
  fill: string
  datum: any
}

// ── Changeset ──────────────────────────────────────────────────────────

export interface Changeset<T = Record<string, any>> {
  inserts: T[]
  bounded: boolean
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

// ── StreamXYFrame props ────────────────────────────────────────────────

export interface StreamXYFrameProps<T = Record<string, any>> {
  // ── Chart type ───────────────────────────────────
  chartType: StreamChartType
  runtimeMode?: RuntimeMode

  // ── Data (bounded mode) ──────────────────────────
  data?: T[]

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

  // ── Bar/time-binned specifics ────────────────────
  binSize?: number

  // ── Heatmap specifics ────────────────────────────
  valueAccessor?: string | ((d: T) => number)

  // ── Streaming specifics (from RealtimeFrame) ─────
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number
  timeAccessor?: string | ((d: T) => number)

  // ── Extents ──────────────────────────────────────
  xExtent?: [number, number]
  yExtent?: [number, number]
  extentPadding?: number
  sizeRange?: [number, number]

  // ── Layout ───────────────────────────────────────
  size?: [number, number]
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
  xLabel?: string
  yLabel?: string
  xFormat?: (d: any) => string
  yFormat?: (d: any) => string
  tickFormatTime?: (value: number) => string
  tickFormatValue?: (value: number) => string

  // ── Interaction ──────────────────────────────────
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  enableHover?: boolean

  // ── Annotations ──────────────────────────────────
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (
    annotation: Record<string, any>,
    index: number,
    context: AnnotationContext
  ) => ReactNode

  // ── Grid / legend ────────────────────────────────
  showGrid?: boolean
  legend?: ReactNode

  // ── Title ────────────────────────────────────────
  title?: string | ReactNode

  // ── Category accessor (streaming bar/swarm) ──────
  categoryAccessor?: string | ((d: T) => string)
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
  AnnotationContext
}
