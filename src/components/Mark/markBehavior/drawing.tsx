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

export function generateSVG(props, className, markType, renderMode) {
  const cloneProps = props

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
