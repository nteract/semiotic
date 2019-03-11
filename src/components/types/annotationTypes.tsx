import Axis from "../Axis"
import { RawPoint, GenericObject } from "./generalTypes"
import { NodeType } from "./networkTypes"
import { element } from "prop-types"

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
  label: string | Element
  neighbors: object[]
}

export type CustomHoverType =
  | boolean
  | Array<AnnotationType | Function>
  | object
  | Function

export type AnnotationTypes = "marginalia" | "bump" | false

export interface AnnotationHandling {
  dataVersion?: string
  layout: {
    type: AnnotationTypes
    orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>
    characterWidth?: number
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
}

export interface AnnotationProps {
  noteData: {
    eventListeners: object
    events: object
    onDragEnd?: Function
    onDragStart?: Function
    onDrag?: Function
    type: any
    editMode?: boolean
    screenCoordinates: Array<Array<number>>
    // What is this type supposed to be? It gets used only in a boolean context
    // I mostly assume this is used to indicate the presence of `nx`, `ny`, `dx`, `dy`
    coordinates: boolean
    x: number | number[]
    y: number | number[]
    nx: number
    ny: number
    dx: number
    dy: number
    // TODO: What should this be typed as?
    note: object
    i: number
    fixedPosition?: boolean
  }
}

export type AxisType = JSX.element<typeof Axis> | JSX.element<"g">
