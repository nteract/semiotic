import React from "react"

import {
  axisLabels,
  axisPieces,
  axisLines
} from "./visualizationLayerBehavior/axis"

// components

import PropTypes from "prop-types"

function formatValue(value, props) {
  if (props.tickFormat) {
    return props.tickFormat(value)
  }
  if (value.toString) {
    return value.toString()
  }
  return value
}

class Axis extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hoverAnnotation: 0 }
  }

  render() {
    let position = this.props.position || [0, 0]
    const {
      rotate,
      label,
      orient = "left",
      tickFormat = d => d,
      size,
      width = size[0] || 0,
      height = size[1] || 0,
      className,
      padding,
      tickValues,
      scale,
      ticks,
      footer,
      tickSize,
      tickLineGenerator,
      baseline = true
    } = this.props

    if (this.props.format) {
      console.error("axis `format` has been deprecated use `tickFormat`")
    }

    let axisTickLines
    let axisParts = this.props.axisParts

    if (!axisParts) {
      axisParts = axisPieces({
        padding: padding,
        tickValues,
        scale,
        ticks,
        orient,
        size,
        footer,
        tickSize
      })
      axisTickLines = (
        <g className={`axis ${className}`}>
          {axisLines({ axisParts, orient, tickLineGenerator })}
        </g>
      )
    }
    if (axisParts.length === 0) {
      return null
    }

    let hoverWidth = 50
    let hoverHeight = height
    let hoverX = 0
    let hoverY = 0
    let baselineX = 0
    let baselineY = 0
    let baselineX2 = 0
    let baselineY2 = height

    let hoverFunction = e =>
      this.setState({ hoverAnnotation: e.nativeEvent.offsetY })
    let circleX = 25
    let textX = -25
    let textY = 18
    let lineWidth = width + 25
    let lineHeight = 0
    let circleY = this.state.hoverAnnotation
    let annotationOffset = 0
    let annotationType = "y"

    switch (orient) {
      case "right":
        position = [position[0], position[1]]
        hoverX = width
        baselineX2 = baselineX = width
        annotationOffset = 0
        lineWidth = -width - 25
        textX = 5
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          })
        break
      case "top":
        position = [position[0], 0]
        hoverWidth = width
        hoverHeight = 50
        annotationType = "x"
        baselineX2 = width
        baselineY2 = 0
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
          })
        circleX = this.state.hoverAnnotation
        circleY = 25
        textX = 0
        textY = -10
        lineWidth = 0
        lineHeight = height + 25
        break
      case "bottom":
        position = [position[0], position[1]]
        position = [position[0], 0]
        hoverWidth = width
        hoverHeight = 50
        baselineY = baselineY2 = hoverY = height
        baselineX = hoverX = 0
        baselineX2 = width

        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
          })
        circleX = this.state.hoverAnnotation
        circleY = 25
        textX = 0
        textY = 15
        lineWidth = 0
        lineHeight = -height - 25
        annotationType = "x"
        break
      default:
        position = [position[0], position[1]]
        annotationOffset = 0
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          })
    }

    let annotationBrush

    if (this.props.annotationFunction) {
      const formattedValue = formatValue(
        this.props.scale.invert(this.state.hoverAnnotation + annotationOffset),
        this.props
      )
      const hoverGlyph = this.props.glyphFunction ? (
        this.props.glyphFunction({
          lineHeight,
          lineWidth,
          value: this.props.scale.invert(
            this.state.hoverAnnotation + annotationOffset
          )
        })
      ) : (
        <g>
          {React.isValidElement(formattedValue) ? (
            <g transform={`translate(${textX},${textY})`}>{formattedValue}</g>
          ) : (
            <text x={textX} y={textY}>
              {formattedValue}
            </text>
          )}
          <circle r={5} />
          <line x1={lineWidth} y1={lineHeight} style={{ stroke: "black" }} />
        </g>
      )
      const annotationSymbol = this.state.hoverAnnotation ? (
        <g
          style={{ pointerEvents: "none" }}
          transform={`translate(${circleX},${circleY})`}
        >
          {hoverGlyph}
        </g>
      ) : null
      annotationBrush = (
        <g
          className="annotation-brush"
          transform={`translate(${hoverX},${hoverY})`}
        >
          <rect
            style={{ fillOpacity: 0 }}
            height={hoverHeight}
            width={hoverWidth}
            onMouseMove={hoverFunction}
            onClick={() =>
              this.props.annotationFunction({
                className: "dynamic-axis-annotation",
                type: annotationType,
                value: this.props.scale.invert(
                  this.state.hoverAnnotation + annotationOffset
                )
              })
            }
            onMouseOut={() => this.setState({ hoverAnnotation: undefined })}
          />
          {annotationSymbol}
        </g>
      )
    }

    let axisTitle

    const axisTickLabels = axisLabels({
      tickFormat,
      axisParts,
      orient,
      rotate
    })
    if (label) {
      const labelName = label.name || label
      const labelPosition = label.position || {}
      const locationMod = labelPosition.location || "outside"
      let anchorMod = labelPosition.anchor || "middle"
      const distance = label.locationDistance

      const rotateHash = {
        left: -90,
        right: 90,
        top: 0,
        bottom: 0
      }

      const rotation = labelPosition.rotation || rotateHash[orient]

      const positionHash = {
        left: {
          start: [0, size[1]],
          middle: [0, size[1] / 2],
          end: [0, 0],
          inside: [distance || 15, 0],
          outside: [-(distance || 45), 0]
        },
        right: {
          start: [size[0] + 0, size[1]],
          middle: [size[0] + 0, size[1] / 2],
          end: [size[0] + 0, 0],
          inside: [-(distance || 15), 0],
          outside: [distance || 45, 0]
        },
        top: {
          start: [0, 0],
          middle: [0 + size[0] / 2, 0],
          end: [0 + size[0], 0],
          inside: [0, distance || 15],
          outside: [0, -(distance || 40)]
        },
        bottom: {
          start: [0, size[1]],
          middle: [0 + size[0] / 2, size[1]],
          end: [0 + size[0], size[1]],
          inside: [0, -(distance || 5)],
          outside: [0, distance || 50]
        }
      }

      const translation = positionHash[orient][anchorMod]
      const location = positionHash[orient][locationMod]

      translation[0] = translation[0] + location[0]
      translation[1] = translation[1] + location[1]

      if (anchorMod === "start" && orient === "right") {
        anchorMod = "end"
      } else if (anchorMod === "end" && orient === "right") {
        anchorMod = "start"
      }

      axisTitle = (
        <g
          className="axis-title"
          transform={`translate(${[
            translation[0] + position[0],
            translation[1] + position[1]
          ]}) rotate(${rotation})`}
        >
          {React.isValidElement(labelName) ? (
            labelName
          ) : (
            <text textAnchor={anchorMod}>{labelName}</text>
          )}
        </g>
      )
    }

    return (
      <g className={className}>
        {annotationBrush}
        {axisTickLabels}
        {axisTickLines}
        {baseline ? (
          <line
            key="baseline"
            className="axis-baseline"
            stroke="black"
            strokeLinecap="square"
            x1={baselineX}
            x2={baselineX2}
            y1={baselineY}
            y2={baselineY2}
          />
        ) : null}
        {axisTitle}
      </g>
    )
  }
}

Axis.propTypes = {
  name: PropTypes.string,
  className: PropTypes.string,
  orient: PropTypes.string,
  position: PropTypes.array,
  size: PropTypes.array,
  rotate: PropTypes.number,
  scale: PropTypes.func,
  annotationFunction: PropTypes.func,
  format: PropTypes.string,
  tickFormat: PropTypes.func,
  tickValues: PropTypes.array,
  padding: PropTypes.number,
  baseline: PropTypes.bool,
  ticks: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object
  ])
}

export default Axis
