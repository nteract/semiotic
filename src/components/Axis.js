'use strict';

// modules
import React from 'react'
import { axisTop, axisBottom, axisLeft, axisRight } from 'd3-axis'
import { select } from 'd3-selection'

import numeral from "numeral";
import { wrap } from "../svg/SvgHelper";

// components

let PropTypes = React.PropTypes;

class Axis extends React.Component {
    constructor(props){
        super(props);
        this.drawAxis = this.drawAxis.bind(this);

    }

    componentDidMount() {
      this.drawAxis()
    }

    componentDidUpdate() {
      this.drawAxis()
    }

    drawAxis() {
      let axisGenerator = axisTop
      let node = this.node
//      let position = this.props.position || [ 0,0 ]
      let width = this.props.size ? this.props.size[0] : 0
      let height = this.props.size ? this.props.size[1] : 0

      if (this.props.orient === "left") {
        axisGenerator = axisLeft
      }
      else if (this.props.orient === "right") {
        axisGenerator = axisRight
      }
      else if (this.props.orient === "bottom") {
        axisGenerator = axisBottom
      }

      let tickSize = height;

      if (this.props.orient === "left" || this.props.orient === "right" || this.props.orient === "midvert") {
        tickSize = width;
      }

      if (this.props.tickSize) {
        tickSize = this.props.tickSize;
      }

      let format = this.props.format;

      let axis = axisGenerator()
        .scale(this.props.scale)
        .tickSize(tickSize);

      if (this.props.ticks) {
        axis.ticks(this.props.ticks)
      }

      if (this.props.tickValues) {
        axis.tickValues(this.props.tickValues)
      }

      if (this.props.tickFormat){
        axis.tickFormat(this.props.tickFormat);
      } else if (format) {
        axis.tickFormat(function (d) {return numeral(d).format(format)});
      }

      select(node)
        .call(axis)

      if (this.props.textWrap){
        select(node)
          .selectAll('.tick text')
          .call(wrap, this.props.wrapWidth || 100)
      }

      if (this.props.rotate) {
        select(node)
          .selectAll("text")
          .style("text-anchor", "start")
          .attr("dx", "-.8em")
          .attr("dy", ".15em")
          .attr("transform", "translate(180,120) rotate(" + this.props.rotate + ")")
      }

    }

    render(){

      let position = this.props.position || [ 0,0 ];
      const width = this.props.size[0] || 0
      const height =this.props.size[1] || 0

      if (this.props.orient === "left") {
        position = [ width + position[0], position[1] ];
      }

      if (this.props.orient === "right") {
        position = [ position[0], position[1] ];
      }

      if (this.props.orient === "top") {
        position = [ position[0], height + position[1] ];
      }

      if (this.props.orient === "bottom") {
        position = [ position[0], position[1] ];
      }

      return <g ref={node => this.node = node} className={this.props.className} transform={"translate(" + position +")"} ></g>;
    }
}


Axis.propTypes = {
    name: PropTypes.string,
    scale: PropTypes.func,
    orient: PropTypes.string,
    title: PropTypes.string,
    format: PropTypes.string,
    values: PropTypes.array,
    properties: PropTypes.object,
    position: PropTypes.array
  };

module.exports = Axis;
