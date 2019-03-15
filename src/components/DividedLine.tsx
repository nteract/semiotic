import * as React from "react"

import { line, curveLinear } from "d3-shape"

import { dividedLine, projectLineData } from "./svg/lineDrawing"

// components

import { Mark } from "semiotic-mark"
import { ProjectedLine } from "./types/generalTypes"

interface DividedLineProps {
  parameters: Function
  className: string
  interpolate: Function
  customAccessors: { x: Function; y: Function }
  lineDataAccessor: Function
  data: ProjectedLine[]
  searchIterations: number
}

class DividedLine extends React.Component<DividedLineProps, null> {
  constructor(props) {
    super(props)
    this.createLineSegments = this.createLineSegments.bind(this)
  }

  createLineSegments() {
    const {
      parameters,
      className,
      interpolate = curveLinear,
      customAccessors,
      lineDataAccessor,
      data,
      searchIterations,
      ...rest
    } = this.props

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
    lineData.forEach(projectedD => {
      projectedD.data = projectedD.data.map(d => ({ ...d.data, ...d }))
    })

    const lines = dividedLine(parameters, lineData[0].data, searchIterations)

    const lineRender = line()
      .curve(interpolate)
      .x(d => d.x)
      .y(d => d.y)

    return lines.map((d, i) => (
      <Mark
        {...rest}
        className={className}
        markType="path"
        key={`DividedLine-${i}`}
        style={d.key}
        d={lineRender(d.points)}
      />
    ))
  }

  render() {
    const lines = this.createLineSegments()

    return <g>{lines}</g>
  }
}

export default DividedLine
