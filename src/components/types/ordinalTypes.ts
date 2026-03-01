import { CustomHoverType } from "./annotationTypes"

import {
  CanvasPostProcessTypes,
  ProjectionTypes,
  accessorType,
  DataAccessor,
  GenericAccessor,
  RenderPipelineType,
  OrdinalSummaryTypeSettings,
  GeneralFrameState,
  GeneralFrameProps
} from "./generalTypes"

import { ScaleLinear, ScaleBand } from "d3-scale"

import { AxisProps, AxisGeneratingFunction } from "./annotationTypes"

export type OExtentObject = { extent?: Array<string>; onChange?: Function }

type OExtentSettingsType = Array<string> | OExtentObject

interface RExtentObject {
  extent?: Array<number>
  onChange?: Function
  includeAnnotations?: boolean
}

export type PieceTypes =
  | "none"
  | "bar"
  | "clusterbar"
  | "point"
  | "swarm"
  | "timeline"
  | "barpercent"

export interface PieceTypeSettings {
  type: PieceTypes
  offsetAngle?: number
  angleRange?: number[]
  innerRadius?: number
}

export interface ProjectedOrdinalSummary {
  originalData?: { x?: number; y?: number }
  xyPoints?: object[]
  marks?: object[]
  thresholds?: number[]
}

export interface OrdinalFrameProps<TDatum = Record<string, any>> extends GeneralFrameProps {
  type?: PieceTypes | PieceTypeSettings
  summaryType?: OrdinalSummaryTypeSettings
  connectorType?: Function
  rAccessor?: DataAccessor<TDatum, number> | DataAccessor<TDatum, number>[]
  oAccessor?: DataAccessor<TDatum, string | number> | DataAccessor<TDatum, string | number>[]
  oExtent?: OExtentSettingsType
  rExtent?: RExtentObject | number[]
  invertR?: boolean
  projection?: ProjectionTypes
  summaryHoverAnnotation?: CustomHoverType
  pieceHoverAnnotation?: CustomHoverType
  hoverAnnotation?: CustomHoverType
  canvasPostProcess?: CanvasPostProcessTypes
  canvasPieces?: boolean | accessorType<boolean>
  canvasSummaries?: boolean | accessorType<boolean>
  connectorClass?: string | accessorType<string>
  pieceClass?: string | accessorType<string>
  summaryClass?: string | accessorType<string>
  connectorRenderMode?: string | accessorType<string | Record<string, any>>
  connectorStyle?: object | accessorType<Record<string, any>>
  canvasConnectors?: boolean | accessorType<boolean>
  summaryStyle?: object | accessorType<object>
  style?: object | accessorType<object>
  oSort?: (a: string, b: string, c: object[], d: object[]) => number
  dynamicColumnWidth?: string | accessorType<number>
  pieceIDAccessor?: string | accessorType<string>
  ordinalAlign?: string
  oLabel?:
    | boolean
    | ((
        labelValue: string,
        columnData: object[],
        index: number,
        column: { name: string; pieceData: object[]; x: number; y: number; middle: number; width: number; padding: number; pieces: object[] }
      ) => string | Element)
  renderMode?: object | string | accessorType<string | object>
  summaryRenderMode?: object | string | accessorType<string | object>
  pixelColumnWidth?: number
  oScaleType?: ScaleBand<string>
  rScaleType?: () => ScaleLinear<number, number>
  data: TDatum[]
  oPadding?: number
  axes?:
    | AxisGeneratingFunction
    | AxisProps
    | Array<AxisProps | AxisGeneratingFunction>
  renderOrder?: ReadonlyArray<"pieces" | "summaries" | "connectors">
  multiAxis?: boolean
}

export interface OrdinalFrameState<TDatum = Record<string, any>> extends GeneralFrameState {
  pieceDataXY: Array<object>
  axisData?: AxisProps[]
  axes?: React.ReactNode[]
  axesTickLines?: Object[]
  oLabels: { labels: React.ReactNode }
  columnOverlays: Array<object>
  oAccessor: Array<Function>
  rAccessor: Array<Function>
  oScaleType: ScaleBand<string>
  rScaleType: ScaleLinear<number, number>
  oExtent: Array<string>
  rExtent: Array<number>
  oScale: ScaleBand<string>
  rScale: ScaleLinear<number, number>
  calculatedOExtent: Array<string>
  calculatedRExtent: Array<number>
  projectedColumns: object
  orFrameRender: RenderPipelineType
  pieceIDAccessor: GenericAccessor<string>
  type: object
  summaryType: object
  props: OrdinalFrameProps<TDatum>
}

export interface LabelSettingsType {
  orient?: string
  padding?: number
  label?: boolean | Function
  labelFormatter?: Function
}
