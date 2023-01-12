import React from "react"

//All generic line constructors expect a projected coordinates array with x & y coordinates, if there are no y1 & x1 coordinates then it defaults to 0-width
function roundToTenth(number) {
  return Math.round(number * 10) / 10
}

export function pathStr({
  x,
  y,
  width,
  height,
  cx,
  cy,
  r
}: {
  x?: number
  y?: number
  width?: number
  height?: number
  cx?: number
  cy?: number
  r?: number
}) {
  if (cx !== undefined) {
    return (
      [
        "M",
        roundToTenth(cx - r),
        roundToTenth(cy),
        "a",
        r,
        r,
        0,
        1,
        0,
        r * 2,
        0,
        "a",
        r,
        r,
        0,
        1,
        0,
        -(r * 2),
        0
      ].join(" ") + "Z"
    )
  }
  return (
    [
      "M",
      roundToTenth(x),
      roundToTenth(y),
      "h",
      width,
      "v",
      height,
      "h",
      -width,
      "v",
      -height
    ].join(" ") + "Z"
  )
}

export function circlePath(cx, cy, r) {
  return pathStr({ cx, cy, r })
}

export function rectPath(x, y, width, height) {
  return pathStr({ x, y, width, height })
}

export function linePath(x1, x2, y1, y2) {
  return "M" + x1 + "," + y1 + "L" + x2 + "," + y2 + "L"
}

export function generateSVG(props, className) {
  let markType = props.markType
  let renderMode = props.renderMode

  let cloneProps = Object.assign({}, props)
  delete cloneProps.markType
  delete cloneProps.renderMode
  delete cloneProps.nid
  delete cloneProps.context
  delete cloneProps.updateContext
  delete cloneProps.parameters
  delete cloneProps.lineDataAccessor
  delete cloneProps.customAccessors
  delete cloneProps.interpolate
  delete cloneProps.forceUpdate
  delete cloneProps.searchIterations
  delete cloneProps.simpleInterpolate
  delete cloneProps.transitionDuration
  delete cloneProps.tx
  delete cloneProps.ty
  delete cloneProps.customTween
  delete cloneProps.sketchyGenerator

  cloneProps.className = className

  let actualSVG = null

  if (renderMode === "forcePath" && markType === "circle") {
    cloneProps.d = circlePath(
      cloneProps.cx || 0,
      cloneProps.cy || 0,
      cloneProps.r
    )
    markType = "path"
    actualSVG = React.createElement(markType, cloneProps)
  } else if (renderMode === "forcePath" && markType === "rect") {
    cloneProps.d = rectPath(
      cloneProps.x || 0,
      cloneProps.y || 0,
      cloneProps.width,
      cloneProps.height
    )
    markType = "path"
    actualSVG = React.createElement(markType, cloneProps)
  } else {
    if (props.markType === "text" && typeof cloneProps.children !== "object") {
      cloneProps.children = <tspan>{cloneProps.children}</tspan>
    }
    actualSVG = React.createElement(markType, cloneProps)
  }
  return actualSVG
}
