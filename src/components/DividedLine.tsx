import * as React from "react"

import { line, curveLinear } from "d3-shape"

import { dividedLine, projectLineData } from "./geometry/lineDrawing"

// components

import { ProjectedLine } from "./types/generalTypes"

interface DividedLineProps {
  parameters: Function
  className: string
  customAccessors: { x: Function; y: Function }
  lineDataAccessor: Function
  data: ProjectedLine[]
  interpolate?: Function
  searchIterations?: number
}

const createLineSegments = (props: any) => {
  const {
    parameters,
    className,
    interpolate = curveLinear,
    customAccessors,
    lineDataAccessor,
    data,
    searchIterations,
    ...rest
  } = props

  const { x, y } = customAccessors

  const lineData = projectLineData({
    data: data,
    lineDataAccessor: [lineDataAccessor],
    xProp: "x",
    yProp: "y",
    xAccessor: [x],
    yAccessor: [y]
  })

  //Compatibility before Semiotic 2
  for (const projectedD of lineData) {
    projectedD.data = projectedD.data.map((d) => ({ ...d.data, ...d }))
  }

  const lines = dividedLine(parameters, lineData[0].data, searchIterations)

  const lineRender = line()
    .curve(interpolate)
    .x((d: any) => d.x)
    .y((d: any) => d.y)

  return lines.map((d, i) => (
    <path {...rest}
      className={className}
      
      key={`DividedLine-${i}`}
      style={d.key}
      d={lineRender(d.points)}
    />
  ))
}

export default function DividedLine(props: DividedLineProps) {
  const lines = createLineSegments(props)

  return <g>{lines}</g>
}
