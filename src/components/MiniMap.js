import React from "react"

import XYFrame from "./XYFrame"

// components

import PropTypes from "prop-types"

const MiniMap = props => {
  const interactivity = {
    start: props.brushStart,
    during: props.brush,
    end: props.brushEnd
  }

  if (props.xBrushable && props.yBrushable) {
    interactivity.brush = "xyBrush"

    if (props.xBrushExtent || props.yBrushExtent) {
      interactivity.extent = [[0, 0], [...props.size]]
    }
    if (props.xBrushExtent) {
      interactivity.extent[0] = props.xBrushExtent
    }
    if (props.yBrushExtent) {
      interactivity.extent[1] = props.yBrushExtent
    }
  } else if (props.xBrushable) {
    interactivity.brush = "xBrush"
    if (props.xBrushExtent) {
      interactivity.extent = props.xBrushExtent
    }
  } else if (props.yBrushable) {
    interactivity.brush = "yBrush"
    if (props.yBrushExtent) {
      interactivity.extent = props.yBrushExtent
    }
  }

  return <XYFrame {...props} interaction={interactivity} />
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
