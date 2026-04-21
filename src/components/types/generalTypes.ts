import type { JSX } from "react"
import { CustomHoverType, AnnotationHandling } from "./annotationTypes"
import { Interactivity, AdvancedInteractionSettings } from "./interactionTypes"

export type TitleType =
  | string
  | Element
  | { title?: string | Element; orient?: string }
import { LegendProps } from "./legendTypes"
import { AxisProps } from "./annotationTypes"

/** @deprecated Use Record<string, any> instead */
export type GenericObject = Record<string, any>

export interface MarginType {
  top: number
  bottom: number
  left: number
  right: number
}

export type ProjectionTypes = "vertical" | "horizontal" | "radial"

export type ExtentType =
  | number[]
  | { extent?: number[]; onChange?: ((...args: any[]) => any); includeAnnotations?: boolean }

export interface ProjectedPoint {
  x?: number
  y?: number
  xTop?: number
  xMiddle?: number
  xBottom?: number
  yTop?: number
  yMiddle?: number
  yBottom?: number
  parentSummary?: ProjectedSummary
  parentLine?: ProjectedLine
  percent?: number
  data?: object
  _XYFrameRank?: number
  style?: ((...args: any[]) => any) | object
  class?: ((...args: any[]) => any) | string
  coordinates?: object[]
}

export type PieceLayoutType = (args: {
  type: string | { type: string }
  data: Record<string, any>
  renderMode: (d?: Record<string, any>, i?: number) => string | Record<string, any>
  eventListenersGenerator: (d: object, i: number) => Record<string, ((...args: any[]) => any)>
  styleFn: (d: object) => object
  projection: string
  classFn: (d: object) => string
  adjustedSize: number[]
  chartSize: number[]
  margin: MarginType
  rScale?: ((...args: any[]) => any)
}) => Record<string, any>[]

export interface ProjectedLine {
  data: ProjectedPoint[]
  key: string | number
  __lineIndex?: number
  coordinates: object[]
}

export interface ProjectedSummary {
  _baseData: object[]
  _xyfCoordinates: [number | Date, number | Date][]
  coordinates: { x: number; y: number }[]
  data: object[]
  y: number
  x: number
  parentSummary?: Record<string, any>
  bounds: object[] | number[]
  customMark?: ((...args: any[]) => any)
  type?: string
  curve?: ((...args: any[]) => any)
  processedData?: boolean
  binMax?: number
}

export type RoughType = { canvas: ((...args: any[]) => any); generator: ((...args: any[]) => any) }

export type CanvasPostProcessTypes = ((...args: any[]) => any)

export type ExtentSettingsType = { extent?: Array<number>; onChange?: ((...args: any[]) => any) }

export type accessorType<ReturnValue> =
  | string
  | ((args?: unknown, index?: number) => ReturnValue)

export type DataAccessor<TDatum, ReturnValue> =
  | (keyof TDatum & string)
  | ((datum: TDatum, index?: number) => ReturnValue)

export interface AccessorFnType {
  <T>(arg: Record<string, any>): T
}

export type BasicLineTypes =
  | "line"
  | "area"
  | "summary"
  | "cumulative"
  | "cumulative-reverse"
  | "linepercent"
  | "stackedarea"
  | "stackedarea-invert"
  | "stackedpercent"
  | "bumparea"
  | "bumparea-invert"
  | "bumpline"
  | "stackedpercent-invert"
  | "difference"

export interface LineTypeSettings {
  type: BasicLineTypes | ((...args: any[]) => any)
  simpleLine?: boolean
  y1?: (d?: ProjectedPoint, index?: number) => number
  interpolator: string | ((...args: any[]) => any)
}

export type BasicSummaryTypes =
  | "basic"
  | "contour"
  | "hexbin"
  | "heatmap"
  | "trendline"
  | "linebounds"

export interface SummaryTypeSettings {
  showSlope?: boolean
  type: BasicSummaryTypes | ((...args: any[]) => any)
  label?: string | ((...args: any[]) => any)
  cellPx?: number
  xCellPx?: number
  yCellPx?: number
  bins?: number
  xBins?: number
  yBins?: number
  binValue?: ((...args: any[]) => any)
  binMax?: number
  customMark?: ((...args: any[]) => any)
}

export interface RawLine<TDatum = Record<string, any>> {
  coordinates?: TDatum[]
}

export interface RawSummary<TDatum = Record<string, any>> {
  processedData?: TDatum[]
  coordinates?: TDatum[]
  preprocess?: boolean
}

export type RawPoint<TDatum = Record<string, any>> = TDatum

export interface CustomAreaMarkProps {
  d: object
  margin: object
  styleFn: ((...args: any[]) => any)
  classFn: ((...args: any[]) => any)
  renderFn: ((...args: any[]) => any)
  chartSize: ((...args: any[]) => any)
  adjustedSize: number[]
}

export interface ProjectedBin {
  x: number
  y: number
  binItems: object[]
  customMark?: (props: CustomAreaMarkProps) => JSX.Element
  _xyfCoordinates: Array<number[]>
  value: number
  percent: number
  data: object
  parentSummary: object
  centroid: boolean
}

export type GenericAccessor<GenericValue> = (
  args?: Record<string, any>,
  index?: number
) => GenericValue

export type VizLayerTypes =
  | "pieces"
  | "summaries"
  | "connectors"
  | "edges"
  | "nodes"
  | "lines"
  | "points"

export type RenderPipelineType = {
  [key in VizLayerTypes]?: {
    data?: object[]
    ariaLabel?: { chart?: string; items?: string }
    behavior?: ((...args: any[]) => any)
    styleFn?: ((...args: any[]) => any)
  }
}

export type OrdinalSummaryTypes =
  | "none"
  | "histogram"
  | "heatmap"
  | "violin"
  | "joy"
  | "ridgeline"
  | "boxplot"
  | "contour"

export type OrdinalSummaryTypeSettings = {
  type: OrdinalSummaryTypes
  amplitude?: number
  eventListenersGenerator?: ((...args: any[]) => any)
  flip?: boolean
  bins?: number
  axis?: AxisProps
}

export interface AxisSummaryTypeSettings extends OrdinalSummaryTypeSettings {
  summaryStyle?: object
  pointStyle?: object
  renderMode?: object | string
  summaryClass?: string
  r?: number
  showPoints?: boolean
  filter?: ((...args: any[]) => any)
}

export interface TransitionConfig {
  /** Duration in milliseconds. @default 300 */
  duration?: number
  /** CSS easing function. @default "ease" */
  ease?: string
}

export interface GeneralFrameProps {
  title?: string | object
  margin?:
    | number
    | { top?: number; bottom?: number; left?: number; right?: number }
    | ((
        args: object
      ) =>
        | number
        | { top?: number; left?: number; right?: number; bottom?: number })
  name?: string
  dataVersion?: string
  frameKey?: string
  size?: number[]
  canvasPostProcess?: CanvasPostProcessTypes
  additionalDefs?: React.ReactNode
  className?: string
  customHoverBehavior?: ((...args: any[]) => any)
  customClickBehavior?: ((...args: any[]) => any)
  customDoubleClickBehavior?: ((...args: any[]) => any)
  hoverAnnotation?: CustomHoverType
  disableContext?: boolean
  interaction?: Interactivity
  svgAnnotationRules?: ((...args: any[]) => any)
  htmlAnnotationRules?: ((...args: any[]) => any)
  tooltipContent?: ((...args: any[]) => any)
  optimizeCustomTooltipPosition?: boolean
  annotations?: object[]
  backgroundGraphics?: React.ReactNode | ((...args: any[]) => any)
  foregroundGraphics?: React.ReactNode | ((...args: any[]) => any)
  beforeElements?: React.ReactNode
  afterElements?: React.ReactNode
  annotationSettings?: AnnotationHandling
  renderKey?: string | GenericAccessor<string>
  legend?: object | boolean
  matte?: object
  onUnmount?: ((...args: any[]) => any)
  sketchyRenderingEngine?: RoughType
  frameRenderOrder?: Array<string>
  disableCanvasInteraction?: boolean
  interactionSettings?: AdvancedInteractionSettings
  disableProgressiveRendering?: boolean
  transition?: boolean | TransitionConfig
}

export interface GeneralFrameState {
  dataVersion?: string
  adjustedPosition: number[]
  adjustedSize: number[]
  backgroundGraphics?: React.ReactNode | ((...args: any[]) => any)
  foregroundGraphics?: React.ReactNode | ((...args: any[]) => any)
  title: TitleType
  margin: MarginType
  legendSettings?: LegendProps
  renderNumber: number
}
