'use strict';

import React from 'react'

// components
import XYFrame from './XYFrame'
import MiniMap from './MiniMap'

class MinimapXYFrame extends XYFrame {
    constructor(props){
        super(props);

        this.generateMinimap = this.generateMinimap.bind(this)

    }

    generateMinimap() {

      let miniDefaults = {
        title: "",
        position: [ 0,0 ],
        size: [ this.props.size[0], this.props.size[1] * 0.25 ],
        xAccessor: this.props.xAccessor,
        yAccessor: this.props.yAccessor,
        points: this.props.points,
        lines: this.props.lines,
        areas: this.props.areas,
        lineDataAccessor: this.props.lineDataAccessor,
        pointDataAccessor: this.props.pointDataAccessor,
        xBrushable: true,
        yBrushable: true,
        brushStart: () => {},
        brush: () => {},
        brushEnd: () => {},
        customLineType: this.props.customLineType
      }

      let combinedOptions = Object.assign(miniDefaults, this.props.minimap)

      combinedOptions.hoverAnnotation = false;

      return <MiniMap {...combinedOptions} />
    }


    render() {
      let miniMap = this.generateMinimap()
      const options = {}
      if (this.props.renderBefore) {
        options.beforeElements = miniMap
      }
      else {
        options.afterElements = miniMap
      }

      return this.renderBody(options)
      }

}

module.exports = MinimapXYFrame;
