'use strict';

// modules
import React from 'react'
import { select } from 'd3-selection'

// components

// let PropTypes = React.PropTypes;

class Brush extends React.Component {
    constructor(props){
        super(props);

        this.createBrush = this.createBrush.bind(this)
    }

    componentDidMount() {
      this.createBrush()
    }

    createBrush() {
        let node = this.node
        let brush = this.props.svgBrush;
        select(node).call(brush)
        if (this.props.selectedExtent) {
            select(node)
            .call(brush.move, this.props.selectedExtent)
        }
        select(node).selectAll("rect")
            .attr("height", this.props.size[1])

        select(node).selectAll("g.resize > rect")
            .style("visibility", "visible")

    }


    render() {
        return <g ref={node => this.node = node} transform={"translate(" + (this.props.position || [ 0,0 ]) + ")"} className="xybrush">
        </g>
    }
}

Brush.propTypes = {
};

export default Brush;
