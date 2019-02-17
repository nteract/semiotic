// @flow

import Axis from "../Axis"

import type { Element } from "react"

export type CustomHoverType =
  | boolean
  | Array<Object | Function>
  | Object
  | Function

export type AnnotationTypes = "marginalia" | "bump" | false

export type AnnotationHandling = {
  dataVersion?: string,
  layout: {
    type: AnnotationTypes,
    orient?: "nearest" | "left" | "right" | "top" | "bottom" | Array<string>,
    characterWidth?: number,
    lineWidth?: number,
    lineHeight?: number,
    padding?: number,
    iterations?: number,
    pointSizeFunction?: Function,
    labelSizeFunction?: Function,
    marginOffset?: number,
    axisMarginOverride?: {
      top?:number,
      right?:number,
      bottom?:number,
      left?:number
    }
  }
}

export type AxisType = Element<typeof Axis> | Element<"g">
