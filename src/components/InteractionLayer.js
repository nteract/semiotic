'use strict';

// modules
import React from 'react'
import { brushX ,brushY/*, brush*/ } from 'd3-brush'
import { event } from 'd3-selection'

// components
import Brush from './Brush'

let PropTypes = React.PropTypes;

class InteractionLayer extends React.Component {
    constructor(props){
        super(props);

        this.createBrush = this.createBrush.bind(this)
        this.createColumnsBrush = this.createColumnsBrush.bind(this)
        this.brushStart = this.brushStart.bind(this)
        this.brush = this.brush.bind(this)
        this.brushEnd = this.brushEnd.bind(this)

    }

    brushStart(e,c) {
        if (this.props.interaction.start) {
            this.props.interaction.start(e,c)
        }
    }

    brush(e,c) {
        if (this.props.interaction.during) {
            this.props.interaction.during(e,c)
        }
    }

    brushEnd(e,c) {
        if (this.props.interaction.end) {
            this.props.interaction.end(e,c)
        }
    }

    createBrush() {
        let semioticBrush/* = brush() */
        let mappingFn = d => !d ? null : [ [ this.props.xScale.invert(d[0][0]),this.props.yScale.invert(d[0][1]) ],[ this.props.xScale.invert(d[1][0]),this.props.yScale.invert(d[1][1]) ] ]
/*       
        if (this.props.xScale && !this.props.yScale) {
*/
            mappingFn = d => !d ? null : [ this.props.xScale.invert(d[0]),this.props.xScale.invert(d[1]) ]
            semioticBrush = brushX()
/*        }
        else if (!this.props.xScale && this.props.yScale) {
            mappingFn = d => !d ? null : [ this.props.yScale.invert(d[0]),this.props.yScale.invert(d[1]) ]
            semioticBrush = brushY()
        }
*/
        semioticBrush
            .extent([ [ this.props.margin.left, this.props.margin.top ], [ this.props.size[0] + this.props.margin.left, this.props.size[1] + this.props.margin.top ] ])
            .on("start", () => {this.brushStart(mappingFn(event.selection))})
            .on("brush", () => {this.brush(mappingFn(event.selection))})
            .on("end", () => {this.brushEnd(mappingFn(event.selection))})

        const selectedExtent = this.props.interaction.extent.map(d => this.props.xScale(d))

        return <Brush selectedExtent={selectedExtent} svgBrush={semioticBrush} size={this.props.size} />
    }

    createColumnsBrush() {
        let semioticBrush
        const max = this.props.rScale.domain()[1]
        const mappingFn = d => !d ? null : [ Math.abs(this.props.rScale.invert(d[0]) - max),Math.abs(this.props.rScale.invert(d[1]) - max) ]

        const rRange = this.props.rScale.range()

        const columnHash = this.props.oColumns
        const brushes = Object.keys(columnHash).map(c => {
            semioticBrush = brushY()
            semioticBrush
                .extent([ [ 0,rRange[0] ],[ columnHash[c].width, rRange[1] ] ])
                .on("start", () => {this.brushStart(mappingFn(event.selection), c)})
                .on("brush", () => {this.brush(mappingFn(event.selection), c)})
                .on("end", () => {this.brushEnd(mappingFn(event.selection), c)})

//            const selectedExtent = this.props.interaction.extent[c] ? this.props.interaction.extent[c].map(d => this.props.rScale(d)) : this.props.rScale.domain()
            const selectedExtent = this.props.interaction.extent[c] ? this.props.interaction.extent[c].map(d => this.props.rScale(d)) : rRange

            return <Brush position={[ columnHash[c].x,0 ]} key={"orbrush" + c} selectedExtent={selectedExtent} svgBrush={semioticBrush} size={this.props.size} />
        })
        return brushes
    }
    render() {
        let semioticBrush = null;
        let enabled = this.props.enabled

        if (this.props.interaction && this.props.interaction.brush) {
            enabled = true;
            semioticBrush = this.createBrush();
        }
        if (this.props.interaction && this.props.interaction.columnsBrush) {
            enabled = true;
            semioticBrush = this.createColumnsBrush();
        }

      return <div className="xyframe-interaction-layer" style={{ position: "absolute", background: "none", pointerEvents: "none" }}>
        <svg height={this.props.svgSize[1]} width={this.props.svgSize[0]} style={{ background: "none", pointerEvents: "none" }}>
            <g transform={"translate(" + this.props.position + ")"} style={{ pointerEvents: enabled ? "all" : "none" }} >
            {this.props.overlay}
            {semioticBrush}
            </g>
        </svg>
      </div>

    }
}


InteractionLayer.propTypes = {
    name: PropTypes.string,
    scale: PropTypes.func,
    orient: PropTypes.string,
    title: PropTypes.string,
    format: PropTypes.string,
    values: PropTypes.array,
    properties: PropTypes.object,
    position: PropTypes.array
  };

module.exports = InteractionLayer;
