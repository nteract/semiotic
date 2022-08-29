import * as React from "react"

import { Mark } from "semiotic-mark"
import { GenericObject } from "../types/generalTypes"
import { ScaleLinear } from "d3-scale"

type RenderModeFnType = (d: number, i: number) => string | GenericObject

type AxisPiecesFnType = {
  renderMode?: RenderModeFnType
  padding: number
  scale: ScaleLinear<number, number>
  ticks: number
  tickValues: number[] | Function
  orient: "left" | "right" | "top" | "bottom"
  size: number[]
  footer: boolean
  tickSize: number
  baseline?: boolean | "under"
  jaggedBase?: boolean
}

const horizontalTornTickGenerator = (width, ticks, y, orient) => {
  const step = width / ticks
  let currentStep = 0
  let tickPath = `M0,${y}`
  const mod = orient === "right" ? -1 : 1
  while (currentStep <= width) {
    tickPath += `L${currentStep},${y}`
    if (currentStep < width) {
      tickPath += `L${currentStep + step / 2},${y + 10 * mod}`
    }
    currentStep += step
  }
  return tickPath
}

const verticalTornTickGenerator = (height, ticks, x, orient) => {
  const step = height / ticks
  let currentStep = 0
  let tickPath = `M${x},0`
  const mod = orient === "bottom" ? -1 : 1
  while (currentStep <= height) {
    tickPath += `L${x},${currentStep}`
    if (currentStep < height) {
      tickPath += `L${x + 10 * mod},${currentStep + step / 2}`
    }
    currentStep += step
  }
  return tickPath
}

const generateTornBaseline = (orient, baselineSettings) => {
  let tornD = ""
  const { x1, x2, y1, y2 } = baselineSettings
  if (orient === "left" || orient === "right") {
    const calcWidth = Math.abs(x2 - x1)
    const ticks = Math.ceil(calcWidth / 40)
    tornD = horizontalTornTickGenerator(
      calcWidth,
      ticks,
      orient === "right" ? 0 : y1,
      orient
    )
  } else {
    const calcHeight = Math.abs(y2 - y1)
    const ticks = Math.ceil(calcHeight / 40)
    tornD = verticalTornTickGenerator(calcHeight, ticks, x1, orient)
  }
  return tornD
}

const defaultTickLineGenerator = ({
  xy,
  orient,
  i,
  baseMarkProps,
  className = "",
  jaggedBase
}) => {
  let genD = `M${xy.x1},${xy.y1}L${xy.x2},${xy.y2}`
  if (jaggedBase && i === 0) {
    genD = generateTornBaseline(orient, xy)
  }
  return (
    <Mark
      key={i}
      markType="path"
      renderMode={xy.renderMode}
      fill="none"
      stroke="black"
      strokeWidth="1px"
      simpleInterpolate={true}
      d={genD}
      className={`tick-line tick ${orient} ${className}`}
      {...baseMarkProps}
    />
  )
}

const outboundTickLineGenerator = ({ xy, orient, i, className = "" }) => {
  const tickLength = 8
  let genD = `M-4,${xy.y1}L${xy.x1},${xy.y2}`
  if (orient === "left") {
    genD = `M${xy.x1 - tickLength},${xy.y1}L${xy.x1},${xy.y2}`
  } else if (orient === "right") {
    genD = `M${xy.x2},${xy.y1}L${xy.x2 + tickLength},${xy.y2}`
  } else if (orient === "top") {
    genD = `M${xy.x1},${xy.y1 - tickLength}L${xy.x1},${xy.y1}`
  } else if (orient === "bottom") {
    genD = `M${xy.x1},${xy.y2}L${xy.x1},${xy.y2 + tickLength}`
  }
  return (
    <Mark
      key={i}
      markType="path"
      renderMode={xy.renderMode}
      fill="none"
      stroke="black"
      strokeWidth="1px"
      simpleInterpolate={true}
      d={genD}
      className={`outbound-tick-line tick ${orient} ${className}`}
    />
  )
}

export function generateTickValues(tickValues, ticks, scale) {
  const axisSize = Math.abs(scale.range()[1] - scale.range()[0])

  if (!tickValues) {
    if (!ticks) {
      ticks = Math.max(1, Math.floor(axisSize / 40))
    }
    tickValues = (scale.ticks && scale.ticks(ticks)) || scale.domain()
  }

  return tickValues
}

export function axisPieces({
  renderMode = () => undefined,
  padding = 5,
  scale,
  ticks,
  tickValues = generateTickValues(undefined, ticks, scale),
  orient = "left",
  size,
  footer = false,
  tickSize = footer
    ? -10
    : ["top", "bottom"].find((d) => d === orient)
    ? size[1]
    : size[0],
  jaggedBase
}: AxisPiecesFnType) {
  //returns x1 (start of line), x2 (end of line) associated with the value of the tick
  let axisDomain = [],
    position1,
    position2,
    domain1,
    domain2,
    tposition1,
    tposition2,
    textPositionMod = 0,
    textPositionMod2 = 0,
    defaultAnchor = "middle"

  switch (orient) {
    case "top":
      position1 = "x1"
      position2 = "x2"
      domain1 = "y1"
      domain2 = "y2"
      axisDomain = [0, tickSize]
      tposition1 = "tx"
      tposition2 = "ty"
      textPositionMod -= 20 - padding
      break
    case "bottom":
      position1 = "x1"
      position2 = "x2"
      domain1 = "y2"
      domain2 = "y1"
      axisDomain = [size[1], size[1] - tickSize]
      tposition1 = "tx"
      tposition2 = "ty"
      textPositionMod += 20 + padding
      break
    case "right":
      position1 = "y2"
      position2 = "y1"
      domain1 = "x2"
      domain2 = "x1"
      axisDomain = [size[0], size[0] - tickSize]
      tposition1 = "ty"
      tposition2 = "tx"
      textPositionMod += 5 + padding
      textPositionMod2 += 5
      defaultAnchor = "start"
      break
    //left
    default:
      position1 = "y1"
      position2 = "y2"
      domain1 = "x1"
      domain2 = "x2"
      axisDomain = [0, tickSize]
      tposition1 = "ty"
      tposition2 = "tx"
      textPositionMod -= 5 + padding
      textPositionMod2 += 5
      defaultAnchor = "end"
      break
  }
  let generatedTicks =
    tickValues instanceof Function ? tickValues({ orient }) : tickValues

  if (
    jaggedBase &&
    generatedTicks.find((t) => t === scale.domain()[0]) === undefined
  ) {
    generatedTicks = [scale.domain()[0], ...generatedTicks]
  }

  return generatedTicks.map((tick, i) => {
    const tickPosition = scale(tick)

    return {
      [position1]: tickPosition,
      [position2]: tickPosition,
      [domain1]: axisDomain[0],
      [domain2]: axisDomain[1],
      [tposition1]: tickPosition + textPositionMod2,
      [tposition2]: axisDomain[0] + textPositionMod,
      defaultAnchor,
      renderMode: renderMode(tick, i),
      value: tick
    }
  })
}

export const axisLabels = ({
  axisParts,
  tickFormat,
  rotate = 0,
  center = false,
  orient
}) => {
  return axisParts.map((axisPart, i) => {
    let renderedValue = tickFormat(axisPart.value, i)
    if (typeof renderedValue !== "object" || renderedValue instanceof Date) {
      renderedValue = (
        <text textAnchor={axisPart.defaultAnchor} className="axis-label">
          {renderedValue.toString ? renderedValue.toString() : renderedValue}
        </text>
      )
    }

    let textX = axisPart.tx
    let textY = axisPart.ty
    if (center) {
      switch (orient) {
        case "right":
          textX -= (axisPart.x2 - axisPart.x1) / 2
          break
        case "left":
          textX += (axisPart.x2 - axisPart.x1) / 2
          break
        case "top":
          textY += (axisPart.y2 - axisPart.y1) / 2
          break
        case "bottom":
          textY -= (axisPart.y2 - axisPart.y1) / 2
          break
      }
    }

    return (
      <g
        key={i}
        pointerEvents="none"
        transform={`translate(${textX},${textY}) rotate(${rotate})`}
        className="axis-label"
      >
        {renderedValue}
      </g>
    )
  })
}

export const baselineGenerator = (orient, size, className) => {
  const offsets = {
    left: { x: 0, y: 0, width: 0, height: size[1] },
    right: { x: size[0], y: 0, width: 0, height: size[1] },
    top: { x: 0, y: 0, width: size[0], height: 0 },
    bottom: { x: 0, y: size[1], width: size[0], height: 0 }
  }

  const orientOffset = offsets[orient]

  return (
    <line
      key="baseline"
      className={`axis-baseline ${className}`}
      stroke="black"
      strokeLinecap="square"
      x1={orientOffset.x}
      x2={orientOffset.x + orientOffset.width}
      y1={orientOffset.y}
      y2={orientOffset.y + orientOffset.height}
    />
  )
}

export const axisLines = ({
  axisParts,
  orient,
  tickLineGenerator = defaultTickLineGenerator,
  baseMarkProps,
  className,
  jaggedBase,
  scale,
  showOutboundTickLines = false
}: {
  axisParts: object[]
  orient: string
  tickLineGenerator: Function
  baseMarkProps?: GenericObject
  className: string
  jaggedBase?: boolean
  scale: ScaleLinear<number, number>
  showOutboundTickLines?: boolean
}) => {
  const axisLines = axisParts.map((axisPart, i) =>
    tickLineGenerator({
      xy: axisPart,
      orient,
      i,
      baseMarkProps,
      className,
      jaggedBase,
      scale
    })
  ) as React.ReactNode[]

  const outboundAxisLines = showOutboundTickLines
    ? (axisParts.map((axisPart, i) =>
        outboundTickLineGenerator({
          xy: axisPart,
          orient,
          i,
          className
        })
      ) as React.ReactNode)
    : []

  return [...axisLines, outboundAxisLines]
}
