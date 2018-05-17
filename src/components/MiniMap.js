import React from "react"

import XYFrame from "./XYFrame"

// components

import PropTypes from "prop-types"

const MiniMap = props => {
  const { brushStart, brush, brushEnd, xBrushable, yBrushable, yBrushExtent, xBrushExtent, ...rest } = props
  const interactivity = {
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

MiniMap.propTypes = {
  brushStart: PropTypes.func,
  brush: PropTypes.func,
  brushEnd: PropTypes.func,
  xBrushExtent: PropTypes.array,
  yBrushExtent: PropTypes.array,
  xBrushable: PropTypes.bool,
  yBrushable: PropTypes.bool
}

export default MiniMap
