import * as React from "react"

import XYFrame from "../Frame/XYFrame"

import { XYFrameProps } from "../types/xyTypes"

import { Interactivity } from "../types/interactionTypes"

export interface MinimapProps extends XYFrameProps {
  brushStart: Function
  brush: Function
  brushEnd: Function
  xBrushable: boolean
  yBrushable: boolean
  yBrushExtent?: number[]
  xBrushExtent?: number[]
  size: number[]
}

function MiniMap(props: MinimapProps) {
  const {
    brushStart,
    brush,
    brushEnd,
    xBrushable,
    yBrushable,
    yBrushExtent,
    xBrushExtent,
    ...rest
  } = props
  const interactivity: Interactivity = {
    start: brushStart,
    during: brush,
    end: brushEnd
  }

  if (xBrushable && yBrushable) {
    interactivity.brush = "xyBrush"

    if (xBrushExtent || yBrushExtent) {
      interactivity.extent = [[0, 0], [...props.size]]
    }
    if (xBrushExtent) {
      interactivity.extent[0] = xBrushExtent
    }
    if (yBrushExtent) {
      interactivity.extent[1] = yBrushExtent
    }
  } else if (xBrushable) {
    interactivity.brush = "xBrush"
    if (xBrushExtent) {
      interactivity.extent = xBrushExtent
    }
  } else if (yBrushable) {
    interactivity.brush = "yBrush"
    if (yBrushExtent) {
      interactivity.extent = yBrushExtent
    }
  }

  return <XYFrame {...rest} interaction={interactivity} />
}

export default MiniMap
