import {
  RawPoint,
  MarginType,
  AxisSummaryTypeSettings,
  OrdinalSummaryTypes
} from "./generalTypes"
import { NodeType, EdgeType } from "./networkTypes"
import { ScaleLinear } from "d3-scale"

//import { object } from "./generalTypes"

export type AnnotationType = {
  type?: string
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
    | Record<string, any>
    | ((arg?: Record<string, any>, index?: number) => Record<string, any>)
  ids?: string[]
  edge?: EdgeType
  source?: NodeType
  target?: NodeType
  id?: string
  element?: Element
  label?: string | Element
  neighbors?: object[]
  isColumnAnnotation?: boolean
}

export type CustomHoverType =
  | boolean
  | Array<AnnotationType | ((...args: any[]) => any)>
  | object
  | ((...args: any[]) => any)
  | "all"
  | "edge"
  | "node"
  | "area"

export type AnnotationTypes = "marginalia" | "bump" | false

interface AnnotationLayout {
  type: AnnotationTypes
  orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>
  characterWidth?: number
  noteHeight?: ((...args: any[]) => any) | number
  noteWidth?: ((...args: any[]) => any) | number
  lineWidth?: number
  lineHeight?: number
  padding?: number
  iterations?: number
  pointSizeFunction?: ((...args: any[]) => any)
  labelSizeFunction?: ((...args: any[]) => any)
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
    type: string
    screenCoordinates?: Array<Array<number>>
    // What is this type supposed to be? It gets used only in a boolean context
    // I mostly assume this is used to indicate the presence of `nx`, `ny`, `dx`, `dy`
    coordinates?: boolean
    noteHeight?: ((...args: any[]) => any) | number
    noteWidth?: ((...args: any[]) => any) | number
    x: number | number[]
    y: number | number[]
    nx?: number
    ny?: number
    dx?: number
    dy?: number
    note: { label?: string; title?: string; wrap?: number; orientation?: string; align?: string; noWrap?: boolean }
    i?: number
    fixedPosition?: boolean
    label?: string
    // Annotation renderer fields passed through via spread
    connector?: any
    subject?: any
    color?: string
    className?: string
    disable?: string[]
    [key: string]: any
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
  label?: {
    position?: { anchor?: string; location?: string; rotation?: string }
    name: string
    locationDistance: number
  }
  dynamicLabelPosition?: boolean
  position?: number[]
  rotate?: number
  tickFormat?: ((...args: any[]) => any)
  size?: number[]
  width?: number
  height?: number
  className?: string
  padding?: number
  tickValues?: number[] | ((...args: any[]) => any)
  scale?: ScaleLinear<number, number>
  ticks?: number
  footer?: boolean
  tickSize?: number
  tickLineGenerator?: ({
    xy,
    orient,
    i,
    className
  }: {
    xy?: object
    orient?: string
    i?: number
    className?: string
  }) => SVGElement
  baseline?: boolean | "under"
  jaggedBase?: boolean
  margin?: MarginType
  center?: boolean
  axisParts?: AxisPart[]
  annotationFunction?: (args: any) => void
  glyphFunction?: (args: GlyphProps) => SVGElement
  axis?: object
  extentOverride?: number[]
  key?: string | number
  axisAnnotationFunction?: (args: object) => void
  xyPoints?: object[]
  marginalSummaryType?: AxisSummaryTypeSettings | OrdinalSummaryTypes
  showOutboundTickLines?: boolean
}

export type AxisGeneratingFunction = (args: object) => AxisProps
