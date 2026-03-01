import { AxisProps, AxisGeneratingFunction } from "./annotationTypes"
import { TitleType } from "../svg/frameFunctions"
import {
  GenericAccessor,
  DataAccessor,
  RawLine,
  RawPoint,
  RawSummary,
  ExtentType,
  accessorType,
  LineTypeSettings,
  SummaryTypeSettings,
  ProjectedPoint,
  ProjectedBin,
  ProjectedSummary,
  ProjectedLine,
  RenderPipelineType,
  GeneralFrameState,
  GeneralFrameProps,
  MarginType
} from "./generalTypes"
import { ScaleLinear } from "d3-scale"

export interface XYFrameProps<TDatum = Record<string, any>> extends GeneralFrameProps {
  lines?: RawLine<TDatum>[] | RawLine<TDatum>
  points?: TDatum[]
  summaries?: RawSummary<TDatum>[] | RawSummary<TDatum>
  axes?: Array<AxisProps | AxisGeneratingFunction>
  xScaleType?: ScaleLinear<number, number>
  yScaleType?: ScaleLinear<number, number>
  xExtent?: ExtentType
  yExtent?: ExtentType
  invertX?: boolean
  invertY?: boolean
  xAccessor?: DataAccessor<TDatum, number> | DataAccessor<TDatum, number>[]
  yAccessor?: DataAccessor<TDatum, number> | DataAccessor<TDatum, number>[]
  lineDataAccessor?: accessorType<RawPoint[]>
  summaryDataAccessor?: accessorType<RawPoint[]>
  lineType?: LineTypeSettings | string
  summaryType?: SummaryTypeSettings
  lineRenderMode?: string | object | Function
  pointRenderMode?: string | object | Function
  summaryRenderMode?: string | object | Function
  showLinePoints?: boolean | string
  showSummaryPoints?: boolean
  defined?: Function
  lineStyle?: GenericAccessor<object> | object
  pointStyle?: GenericAccessor<object> | object
  summaryStyle?: GenericAccessor<object> | object
  lineClass?: GenericAccessor<string> | string
  pointClass?: GenericAccessor<string> | string
  summaryClass?: GenericAccessor<string> | string
  canvasPoints?: GenericAccessor<boolean> | boolean
  canvasLines?: GenericAccessor<boolean> | boolean
  canvasSummaries?: GenericAccessor<boolean> | boolean
  customPointMark?: Function | object
  customLineMark?: Function
  customSummaryMark?: Function
  lineIDAccessor?: GenericAccessor<string> | string
  minimap?: object
  fullDataset?: Array<ProjectedPoint | ProjectedBin | ProjectedSummary>
  projectedLines?: ProjectedLine[]
  projectedSummaries?: Array<ProjectedSummary>
  projectedPoints?: ProjectedPoint[]
  renderOrder?: ReadonlyArray<"lines" | "points" | "summaries">
  useSummariesAsInteractionLayer?: boolean
  filterRenderedLines?: (
    value: ProjectedLine,
    index: number,
    array: ProjectedLine[]
  ) => any
  filterRenderedSummaries?: (
    value: ProjectedSummary,
    index: number,
    array: ProjectedSummary[]
  ) => any
  filterRenderedPoints?: (
    value: ProjectedPoint | ProjectedBin | ProjectedSummary,
    index: number,
    array: (ProjectedPoint | ProjectedBin | ProjectedSummary)[]
  ) => any
}

export type AnnotatedSettingsProps = {
  xAccessor?: GenericAccessor<number>[]
  yAccessor?: GenericAccessor<number>[]
  summaryDataAccessor?: GenericAccessor<RawPoint[]>[]
  lineDataAccessor?: GenericAccessor<RawPoint[]>[]
  renderKeyFn?: GenericAccessor<string>
  lineType?: LineTypeSettings
  summaryType?: SummaryTypeSettings
  lineIDAccessor?: GenericAccessor<string>
  summaries?: object[]
  lines?: object[]
  title?: TitleType
  xExtent?: number[]
  yExtent?: number[]
}

export interface XYFrameState<TDatum = Record<string, any>> extends GeneralFrameState {
  lineData?: RawLine<TDatum>[] | RawLine<TDatum>
  pointData?: RawPoint<TDatum>[] | RawPoint<TDatum>
  summaryData?: RawSummary<TDatum>[] | RawSummary<TDatum>
  projectedLines?: ProjectedLine[]
  projectedPoints?: ProjectedPoint[]
  projectedSummaries?: ProjectedSummary[]
  fullDataset: Array<ProjectedPoint | ProjectedBin | ProjectedSummary>
  axesData?: AxisProps[]
  axes?: React.ReactNode[]
  axesTickLines?: React.ReactNode
  calculatedXExtent: number[]
  calculatedYExtent: number[]
  xAccessor: GenericAccessor<number>[]
  yAccessor: GenericAccessor<number>[]
  xScale: ScaleLinear<number, number>
  yScale: ScaleLinear<number, number>
  xExtent: number[]
  yExtent: number[]
  areaAnnotations: object[]
  xyFrameRender: RenderPipelineType
  canvasDrawing: object[]
  size: number[]
  annotatedSettings: AnnotatedSettingsProps
  overlay?: object[]
  props: XYFrameProps<TDatum>
}

export interface SummaryLayoutType {
  preprocess?: boolean
  processedData?: boolean
  summaryType: SummaryTypeSettings
  data: {
    _xyfCoordinates?: [number | Date, number | Date][]
    coordinates: { x: number; y: number }[]
  }
  finalXExtent?: number[]
  finalYExtent?: number[]
  size?: number[]
  xScaleType?: ScaleLinear<Number, Number>
  yScaleType?: ScaleLinear<Number, Number>
  margin?: MarginType
  styleFn?: Function
  classFn?: Function
  renderFn?: Function
  chartSize?: number[]
}
