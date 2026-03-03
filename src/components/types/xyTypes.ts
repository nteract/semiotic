import {
  SummaryTypeSettings,
  MarginType
} from "./generalTypes"
import { ScaleLinear } from "d3-scale"

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
