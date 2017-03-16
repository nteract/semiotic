'use strict';

import React from 'react'

import { line, curveLinear } from 'd3-shape'

import { dividedLine, projectLineData } from '../svg/lineDrawing'

// components

import Mark from './Mark'

let PropTypes = React.PropTypes;

class DividedLine extends React.Component {
    constructor(props){
        super(props);
        this.createLineSegments = this.createLineSegments.bind(this);
    }

    createLineSegments() {

      let params = this.props.parameters;
      let className = this.props.className;
      let interpolate = this.props.interpolate || curveLinear

      let data = projectLineData({ data: this.props.data, lineDataAccessor: this.props.lineDataAccessor, xProp: "_x", yProp: "_y", xAccessor: this.props.customAccessors.x, yAccessor: this.props.customAccessors.y })

      let lines = dividedLine(params, data[0].data, this.props.searchIterations)

      let lineRender = line()
        .curve(interpolate)
        .x(d => d._x)
        .y(d => d._y)

      return lines.map((d,i) => <Mark {...this.props} className={className} markType="path" key={"DividedLine" + i} style={d.key} d={lineRender(d.points)} />)
    }

    render() {
      let lines = this.createLineSegments();

      return <g>{lines}</g>

    }
}


DividedLine.propTypes = {
    name: PropTypes.string,
    scale: PropTypes.func,
    orient: PropTypes.string,
    title: PropTypes.string,
    format: PropTypes.string,
    values: PropTypes.array,
    properties: PropTypes.object,
    position: PropTypes.array
  };

module.exports = DividedLine;
