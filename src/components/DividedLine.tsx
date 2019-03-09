import * as React from "react"

import { line, curveLinear } from "d3-shape"

import { dividedLine, projectLineData } from "./svg/lineDrawing"

// components

import { Mark } from "semiotic-mark"

interface DividedLineProps {
  parameters: { [key: string]: Function };
  className: string;
  interpolate: Function;
  customAccessors: { x: string, y: string };
  lineDataAccessor: Function;
  data: object[];
  searchIterations: number;
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

    const lineData = projectLineData({
      data: data,
      lineDataAccessor: [lineDataAccessor],
      xProp: "_x",
      yProp: "_y",
      xAccessor: [customAccessors.x],
      yAccessor: [customAccessors.y]
    })

    //Compatibility before Semiotic 2
    lineData.forEach(projectedD => {
      projectedD.data = projectedD.data.map(d => ({ ...d.data, ...d }))
    })

    const lines = dividedLine(parameters, lineData[0].data, searchIterations)

    const lineRender = line()
      .curve(interpolate)
      .x(d => d._x)
      .y(d => d._y)

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
