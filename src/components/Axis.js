import React from "react";

import {
  axisLabels,
  axisPieces,
  axisLines
} from "./visualizationLayerBehavior/axis";

// components

import PropTypes from "prop-types";

function formatValue(value, props) {
  if (props.tickFormat) {
    return props.tickFormat(value);
  }
  if (value.toString) {
    return value.toString();
  }
  return value;
}

class Axis extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hoverAnnotation: 0 };
  }

  render() {
    let position = this.props.position || [0, 0];
    const {
      rotate,
      label,
      orient = "left",
      tickFormat = d => d,
      size,
      width = size[0] || 0,
      height = size[1] || 0,
      margin = { left: 0, right: 0, top: 0, bottom: 0 },
      className,
      padding,
      tickValues,
      scale,
      ticks,
      footer,
      tickSize,
      tickLineGenerator
    } = this.props;

    if (this.props.format) {
      console.error("axis `format` has been deprecated use `tickFormat`");
    }

    let axisTickLines;
    let axisParts = this.props.axisParts;

    if (!axisParts) {
      axisParts = axisPieces({
        padding: padding,
        tickValues,
        scale,
        ticks,
        orient,
        size,
        margin,
        footer,
        tickSize
      });
      axisTickLines = (
        <g className={`axis ${className}`}>
          {axisLines({ axisParts, orient, tickLineGenerator })}
        </g>
      );
    }
    if (axisParts.length === 0) {
      return null;
    }

    let hoverWidth = 50;
    let hoverHeight = height;
    let hoverX = 0;
    let hoverY = margin.top;
    let hoverFunction = e =>
      this.setState({ hoverAnnotation: e.nativeEvent.offsetY - margin.top });
    let circleX = 25;
    let textX = -25;
    let textY = 18;
    let lineWidth = width + 25;
    let lineHeight = 0;
    let circleY = this.state.hoverAnnotation;
    let annotationOffset = margin.left;
    let annotationType = "y";

    switch (orient) {
      case "right":
        position = [position[0], position[1]];
        hoverX = width;
        annotationOffset = margin.top;
        lineWidth = -width - 25;
        textX = 5;
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          });
        break;
      case "top":
        position = [position[0], 0];
        hoverWidth = width;
        hoverHeight = 50;
        hoverY = 0;
        annotationType = "x";
        hoverX = margin.left;
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
          });
        circleX = this.state.hoverAnnotation;
        circleY = 25;
        textX = 0;
        textY = -10;
        lineWidth = 0;
        lineHeight = height + 25;
        break;
      case "bottom":
        position = [position[0], position[1] - margin.top];
        position = [position[0], 0];
        hoverWidth = width;
        hoverHeight = 50;
        hoverY = height + margin.top;
        hoverX = margin.left;
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetX - annotationOffset
          });
        circleX = this.state.hoverAnnotation;
        circleY = 25;
        textX = 0;
        textY = 15;
        lineWidth = 0;
        lineHeight = -height - 25;
        annotationType = "x";
        break;
      default:
        position = [position[0] - margin.left, position[1]];
        annotationOffset = margin.top;
        hoverFunction = e =>
          this.setState({
            hoverAnnotation: e.nativeEvent.offsetY - annotationOffset
          });
    }

    let annotationBrush;

    if (this.props.annotationFunction) {
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
          <text x={textX} y={textY}>
            {formatValue(
              this.props.scale.invert(
                this.state.hoverAnnotation + annotationOffset
              ),
              this.props
            )}
          </text>
          <circle r={5} />
          <line x1={lineWidth} y1={lineHeight} style={{ stroke: "black" }} />
        </g>
      );
      const annotationSymbol = this.state.hoverAnnotation ? (
        <g
          style={{ pointerEvents: "none" }}
          transform={`translate(${circleX},${circleY})`}
        >
          {hoverGlyph}
        </g>
      ) : null;
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
              })}
            onMouseOut={() => this.setState({ hoverAnnotation: undefined })}
          />
          {annotationSymbol}
        </g>
      );
    }

    let axisTitle;

    const axisTickLabels = axisLabels({
      tickFormat,
      axisParts,
      orient,
      rotate
    });
    if (label) {
      const labelName = label.name || label;
      const labelPosition = label.position || {};
      const locationMod = labelPosition.location || "outside";
      let anchorMod = labelPosition.anchor || "middle";
      const distance = label.locationDistance;

      const rotateHash = {
        left: -90,
        right: 90,
        top: 0,
        bottom: 0
      };

      const rotation = labelPosition.rotation || rotateHash[orient];

      const positionHash = {
        left: {
          start: [margin.left, size[1] + margin.top],
          middle: [margin.left, size[1] / 2 + margin.top],
          end: [margin.left, margin.top],
          inside: [distance || 15, 0],
          outside: [-(distance || 45), 0]
        },
        right: {
          start: [size[0] + margin.left, size[1] + margin.top],
          middle: [size[0] + margin.left, size[1] / 2 + margin.top],
          end: [size[0] + margin.left, margin.top],
          inside: [-(distance || 15), 0],
          outside: [distance || 45, 0]
        },
        top: {
          start: [margin.left, margin.top],
          middle: [margin.left + size[0] / 2, margin.top],
          end: [margin.left + size[0], margin.top],
          inside: [0, distance || 15],
          outside: [0, -(distance || 40)]
        },
        bottom: {
          start: [margin.left, size[1] + margin.top],
          middle: [margin.left + size[0] / 2, size[1] + margin.top],
          end: [margin.left + size[0], size[1] + margin.top],
          inside: [0, -(distance || 5)],
          outside: [0, distance || 50]
        }
      };

      const translation = positionHash[orient][anchorMod];
      const location = positionHash[orient][locationMod];

      translation[0] = translation[0] + location[0];
      translation[1] = translation[1] + location[1];

      if (anchorMod === "start" && orient === "right") {
        anchorMod = "end";
      } else if (anchorMod === "end" && orient === "right") {
        anchorMod = "start";
      }

      axisTitle = (
        <g
          className="axis-title"
          transform={`translate(${[
            translation[0] + position[0],
            translation[1] + position[1]
          ]}) rotate(${rotation})`}
        >
          <text textAnchor={anchorMod}>{labelName}</text>
        </g>
      );
    }
    return (
      <g className={className}>
        {annotationBrush}
        {axisTickLabels}
        {axisTickLines}
        {axisTitle}
      </g>
    );
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
  margin: PropTypes.object,
  annotationFunction: PropTypes.func,
  format: PropTypes.string,
  tickFormat: PropTypes.func,
  tickValues: PropTypes.array,
  padding: PropTypes.number,
  ticks: PropTypes.oneOfType([PropTypes.array, PropTypes.number]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object
  ])
};

export default Axis;
