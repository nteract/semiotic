import * as React from "react"

import {
  axisLabels,
  axisPieces,
  axisLines
} from "./visualizationLayerBehavior/axis"

import { AxisProps } from "./types/annotationTypes"

// components

function formatValue(value, props) {
  if (props.tickFormat) {
    return props.tickFormat(value)
  }
  if (value.toString) {
    return value.toString()
  }
  return value
}

interface AxisState {
  hoverAnnotation: number
  calculatedLabelPosition?: number
}

class Axis extends React.Component<AxisProps, AxisState> {
  constructor(props) {
    super(props)
    this.state = { hoverAnnotation: 0 }
  }
  axisRef?: { querySelectorAll: Function } = null

  boundingBoxMax = () => {
    // && this.props.dynamicLabel ???
    if (!this.axisRef) return 30
    const { orient = "left" } = this.props

    const positionType =
      orient === "left" || orient === "right" ? "width" : "height"

    const axisLabelMax =
      Math.max(
        ...[...this.axisRef.querySelectorAll(".axis-label")]
          .map(
            (l: { getBBox: Function }) =>
              (l.getBBox && l.getBBox()) || { height: 30, width: 30 }
          )
          .map(d => d[positionType])
      ) + 25

    return axisLabelMax
  }

  componentDidUpdate() {
    const { label = { position: false } } = this.props
    if (!label.position && this.props.dynamicLabelPosition) {
      const newBBMax = this.boundingBoxMax()
      if (newBBMax !== this.state.calculatedLabelPosition) {
        this.setState({ calculatedLabelPosition: newBBMax })
      }
    }
  }

  componentDidMount() {
    const { label = { position: false } } = this.props
    if (!label.position && this.props.dynamicLabelPosition) {
      const newBBMax = this.boundingBoxMax()
      this.setState({ calculatedLabelPosition: newBBMax })
    }
  }

  render() {
    let position = this.props.position || [0, 0]
    const {
      rotate,
      label,
      orient = "left",
      tickFormat = d => d,
      size,
      width = (size && size[0]) || 0,
      height = (size && size[1]) || 0,
      className,
      padding,
      tickValues,
      scale,
      ticks,
      footer,
      tickSize,
      tickLineGenerator,
      baseline = true,
      margin = { top: 0, bottom: 0, left: 0, right: 0 },
      center = false
    } = this.props

    let axisTickLines
    let axisParts = this.props.axisParts

    if (!axisParts) {
      axisParts = axisPieces({
        padding: padding,
        tickValues,
        scale,
        ticks,
        orient,
        size: [width, height],
        footer,
        tickSize
      })
      axisTickLines = (
        <g className={`axis ${className}`}>
          {axisLines({ axisParts, orient, tickLineGenerator, className })}
        </g>
      )
    }
    if (axisParts.length === 0) {
      return null
    }

    let hoverWidth = 50
    let hoverHeight = height
    let hoverX = -50
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
        annotationOffset = margin.top
        lineWidth = -width - 25
        textX = 5
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          })
        if (center === true) {
          baselineX2 = baselineX = width / 2
        }
        break
      case "top":
        position = [position[0], 0]
        hoverWidth = width
        hoverHeight = 50
        hoverY = -50
        hoverX = 0
        annotationOffset = margin.left
        annotationType = "x"
        baselineX2 = width
        baselineY2 = 0
        if (center === true) {
          baselineY2 = baselineY = height / 2
        }
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
        position = [position[0], 0]
        hoverWidth = width
        hoverHeight = 50
        baselineY = baselineY2 = hoverY = height
        baselineX = hoverX = 0
        baselineX2 = width
        annotationOffset = margin.left

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
        if (center === true) {
          baselineY2 = baselineY = height / 2
        }
        break
      default:
        position = [position[0], position[1]]
        annotationOffset = margin.top
        if (center === true) {
          baselineX2 = baselineX = width / 2
        }
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          })
    }

    let annotationBrush

    if (this.props.annotationFunction) {
      const formattedValue = formatValue(
        this.props.scale.invert(this.state.hoverAnnotation),
        this.props
      )
      const hoverGlyph = this.props.glyphFunction ? (
        this.props.glyphFunction({
          lineHeight,
          lineWidth,
          value: this.props.scale.invert(this.state.hoverAnnotation)
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
                value: this.props.scale.invert(this.state.hoverAnnotation)
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
      rotate,
      center
    })
    if (label) {
      const labelName = label.name || label
      const labelPosition = label.position || {}
      const locationMod = labelPosition.location || "outside"
      let anchorMod = labelPosition.anchor || "middle"
      const distance =
        label.locationDistance || this.state.calculatedLabelPosition

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
          className={`axis-title ${className}`}
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

    const axisAriaLabel = `${orient} axis ${(axisParts &&
      axisParts.length > 0 &&
      `from ${tickFormat(axisParts[0].value, 0)} to ${tickFormat(
        axisParts[axisParts.length - 1].value,
        axisParts.length - 1
      )}`) ||
      "without ticks"}`

    return (
      <g
        className={className}
        aria-label={axisAriaLabel}
        ref={node => (this.axisRef = node)}
      >
        {annotationBrush}
        {axisTickLabels}
        {axisTickLines}
        {baseline ? (
          <line
            key="baseline"
            className={`axis-baseline ${className}`}
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

export default Axis
