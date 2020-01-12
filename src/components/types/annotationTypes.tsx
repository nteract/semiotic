import {
  RawPoint,
  GenericObject,
  MarginType,
  AxisSummaryTypeSettings,
  OrdinalSummaryTypes
} from "./generalTypes"
import { NodeType } from "./networkTypes"
import { ScaleLinear } from "d3-scale"

//import { object } from "./generalTypes"

export type AnnotationType = {
  type?: string | Function
  column?: { name: string }
  facetColumn?: string
  bounds?: RawPoint[]
  x?: number
  y?: number
  yTop?: number
  yBottom?: number
  yMiddle?: number
  coordinates?: object[]
  key?: string
  percent?: number
  style?:
  | GenericObject
  | ((arg?: GenericObject, index?: number) => GenericObject)
  ids?: string[]
  edge?: boolean
  source?: NodeType
  target?: NodeType
  id?: string
  element?: Element
  label?: string | Element
  neighbors?: object[]
}

export type CustomHoverType =
  | boolean
  | Array<AnnotationType | Function>
  | object
  | Function

export type AnnotationTypes = "marginalia" | "bump" | false

interface AnnotationLayout {
  type: AnnotationTypes
  orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>
  characterWidth?: number
  noteHeight?: Function | number
  noteWidth?: Function | number
  lineWidth?: number
  lineHeight?: number
  padding?: number
  iterations?: number
  pointSizeFunction?: Function
  labelSizeFunction?: Function
  marginOffset?: number
  axisMarginOverride?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
}

export interface AnnotationHandling {
  dataVersion?: string
  layout: AnnotationLayout
}


export interface AnnotationProps {
  noteData: {
    eventListeners?: object
    events?: object
    onDragEnd?: Function
    onDragStart?: Function
    onDrag?: Function
    type: any
    editMode?: boolean
    screenCoordinates?: Array<Array<number>>
    // What is this type supposed to be? It gets used only in a boolean context
    // I mostly assume this is used to indicate the presence of `nx`, `ny`, `dx`, `dy`
    coordinates?: boolean
    noteHeight?: Function | number
    noteWidth?: Function | number
    x: number | number[]
    y: number | number[]
    nx?: number
    ny?: number
    dx?: number
    dy?: number
    // TODO: What should this be typed as?
    note: object
    i?: number
    fixedPosition?: boolean
  }
}

type GlyphProps = {
  lineHeight: number
  lineWidth: number
  value: number
}

type AxisPart = {
  value: number
}

export interface AxisProps {
  orient: "left" | "right" | "top" | "bottom"
  label: {
    position?: { anchor?: string; location?: string; rotation?: string }
    name: string
    locationDistance: number
  }
  dynamicLabelPosition?: boolean
  position?: number[]
  rotate?: number
  tickFormat?: Function
  size?: number[]
  width?: number
  height?: number
  className?: string
  padding?: number
  tickValues?: number[] | Function
  scale?: ScaleLinear<number, number>
  ticks?: number
  footer?: boolean
  tickSize: number
  tickLineGenerator?: ({
    xy,
    orient,
    i,
    baseMarkProps,
    className
  }: {
    xy?: any
    orient?: any
    i?: any
    baseMarkProps?: any
    className?: string
  }) => SVGElement
  baseline?: boolean | "under"
  jaggedBase?: boolean
  margin?: MarginType
  center?: boolean
  axisParts?: AxisPart[]
  annotationFunction?: (args) => void
  glyphFunction?: (args: GlyphProps) => SVGElement
  axis?: any
  extentOverride?: number[]
  key?: string | number
  axisAnnotationFunction?: (args: any) => void
  xyPoints?: object[]
  marginalSummaryType?: AxisSummaryTypeSettings | OrdinalSummaryTypes
}

export type AxisGeneratingFunction = (args: object) => AxisProps
