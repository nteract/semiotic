// @flow

export type MarginType = {
  top: number,
  bottom: number,
  left: number,
  right: number
}

export type ProjectionTypes = "vertical" | "horizontal" | "radial"

export type ProjectedPoint = {
  x: string,
  y: string,
  yTop?: string,
  yMiddle?: string,
  yBottom?: string,
  parentArea?: Object,
  parentLine?: Object,
  percent?: number
}

export type CanvasPostProcessTypes = Function | "chuckClose"
