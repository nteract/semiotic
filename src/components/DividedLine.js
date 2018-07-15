import React from "react"

import { line, curveLinear } from "d3-shape"

import { dividedLine, projectLineData } from "./svg/lineDrawing"

// components

import { Mark } from "semiotic-mark"

import PropTypes from "prop-types"

class DividedLine extends React.Component {
  constructor(props) {
    super(props)
    this.createLineSegments = this.createLineSegments.bind(this)
  }

  createLineSegments() {
    const params = this.props.parameters
    const className = this.props.className
    const interpolate = this.props.interpolate || curveLinear

    const data = projectLineData({
      data: this.props.data,
      lineDataAccessor: [this.props.lineDataAccessor],
      xProp: "_x",
      yProp: "_y",
      xAccessor: [this.props.customAccessors.x],
      yAccessor: [this.props.customAccessors.y]
    })

    //Compatibility before Semiotic 2
    data.forEach(projectedD => {
      projectedD.data = projectedD.data.map(d => ({ ...d.data, ...d }))
    })

    const lines = dividedLine(params, data[0].data, this.props.searchIterations)

    const lineRender = line()
      .curve(interpolate)
      .x(d => d._x)
      .y(d => d._y)

    return lines.map((d, i) => (
      <Mark
        {...this.props}
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

DividedLine.propTypes = {
  parameters: PropTypes.func,
  className: PropTypes.string,
  interpolate: PropTypes.func,
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  lineDataAccessor: PropTypes.func,
  customAccessors: PropTypes.object,
  searchIterations: PropTypes.number
}

export default DividedLine
