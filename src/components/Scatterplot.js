'use strict';
import Mark from './Mark'
import MarkContext from './MarkContext'

// modules
import React from 'react'

import { difference } from 'lodash'

class Scatterplot extends React.Component {
    constructor(props){
        super(props);

        this.generatePoints = this.generatePoints.bind(this);

    }

    shouldComponentUpdate(lastprops) {
      if (difference(lastprops.data, this.props.data).length === 0) {
        return false
      }
      return true
    }

    generatePoints() {

      let points = this.props.data.map((d,i) => {

        let point;
          if (!this.props.customSymbol) {
            point = <Mark markType = "circle" r="5" style={{ fill: "blue", stroke: "white" }} />
          }
          else {
            point = this.props.customSymbol(d)
          }

          return <g key={"scatterpoint" + i} transform={"translate(" + this.props.xScale(d.x) + "," + this.props.yScale(d.y) + ")"}>{point}</g>
       })

      return points
    }

    render() {
      let points = this.generatePoints();

      return <div>
        <svg height={this.props.size[1]} width={this.props.size[0]} >
          <MarkContext
            name="Scatterplot"
            position={[ 0,0 ]}
            size={this.props.size}
            scene={{}} >
            {points}
          </MarkContext>
        </svg>
      </div>

    }
}

module.exports = Scatterplot;
