import { CustomHoverType, AnnotationHandling } from "./annotationTypes"
import { TitleType } from "../svg/frameFunctions"
import { Interactivity, AdvancedInteractionSettings } from "./interactionTypes"
import { LegendProps } from "./legendTypes"
import { AxisProps } from "./annotationTypes"

export type GenericObject = { [key: string]: any }

export interface MarginType {
  top: number
  bottom: number
  left: number
  right: number
}

export type ProjectionTypes = "vertical" | "horizontal" | "radial"

export type ExtentType =
  | number[]
  | { extent?: number[]; onChange?: Function; includeAnnotations?: boolean }

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
  style?: Function | object
  class?: Function | string
  coordinates?: object[]
}

export type PieceLayoutType = (args: {
  type: string | { type: string }
  data: any
  renderMode: (d?: GenericObject, i?: number) => string | GenericObject
  eventListenersGenerator: any
  styleFn: (d: object) => object
  projection: string
  classFn: (d: object) => string
  adjustedSize: number[]
  chartSize: number[]
  margin: MarginType
  rScale?: Function
  baseMarkProps: object
}) => GenericObject[]

export interface ProjectedLine {
  data: ProjectedPoint[]
  key: string | number
  coordinates: object[]
}

export interface ProjectedSummary {
  _baseData: object[]
  _xyfCoordinates: [number | Date, number | Date][]
  coordinates: { x: number; y: number }[]
  data: object[]
  y: number
  x: number
  parentSummary?: GenericObject
  bounds: object[] | number[]
  customMark?: Function
  type?: string
  curve?: Function
  processedData?: boolean
  binMax?: number
}

export type RoughType = { canvas: Function; generator: Function }

export type CanvasPostProcessTypes = Function

export type ExtentSettingsType = { extent?: Array<number>; onChange?: Function }

export type accessorType<ReturnValue> =
  | string
  | ((args?: unknown, index?: number) => ReturnValue)

export interface AccessorFnType {
  <T>(arg: GenericObject): T
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
  type: BasicLineTypes | Function
  simpleLine?: boolean
  y1?: (d?: ProjectedPoint, index?: number) => number
  interpolator: string | Function
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
  type: BasicSummaryTypes | Function
  label?: string | Function
  cellPx?: number
  xCellPx?: number
  yCellPx?: number
  bins?: number
  xBins?: number
  yBins?: number
  binValue?: Function
  binMax?: number
  customMark?: Function
}

export interface RawLine {
  coordinates?: object[]
}

export interface RawSummary {
  processedData?: object[]
  coordinates?: object[]
  preprocess?: boolean
}

export interface RawPoint {}

export interface CustomAreaMarkProps {
  d: object
  baseMarkProps: object
  margin: object
  styleFn: Function
  classFn: Function
  renderFn: Function
  chartSize: Function
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
  args?: GenericObject,
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
    data?: any
    ariaLabel?: { chart?: string; items?: string }
    behavior?: Function
    styleFn?: Function
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
  eventListenersGenerator?: Function
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
  filter?: Function
}

export interface GeneralFrameProps {
  useSpans?: boolean
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
  customHoverBehavior?: Function
  customClickBehavior?: Function
  customDoubleClickBehavior?: Function
  hoverAnnotation?: CustomHoverType
  disableContext?: boolean
  interaction?: Interactivity
  svgAnnotationRules?: Function
  htmlAnnotationRules?: Function
  tooltipContent?: Function
  optimizeCustomTooltipPosition?: boolean
  annotations?: object[]
  baseMarkProps?: object
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  beforeElements?: React.ReactNode
  afterElements?: React.ReactNode
  annotationSettings?: AnnotationHandling
  renderKey?: string | GenericAccessor<string>
  legend?: object | boolean
  matte?: object
  onUnmount?: Function
  sketchyRenderingEngine?: RoughType
  frameRenderOrder?: Array<string>
  disableCanvasInteraction?: boolean
  interactionSettings?: AdvancedInteractionSettings
  disableProgressiveRendering?: boolean
}

export interface GeneralFrameState {
  dataVersion?: string
  adjustedPosition: number[]
  adjustedSize: number[]
  backgroundGraphics?: React.ReactNode | Function
  foregroundGraphics?: React.ReactNode | Function
  title: TitleType
  margin: MarginType
  legendSettings?: LegendProps
  renderNumber: number
}
