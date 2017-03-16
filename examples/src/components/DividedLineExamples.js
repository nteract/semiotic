import React from 'react'
import { DividedLine } from 'abacus-viz-framework';
import { curveBasis } from 'd3-shape'

class DividedLineExample extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        function randomLineGenerator(width, height, points) {
          const pointDataSet = []
          let curY = 0.5
          for (let x = 0; x< points; x++) {
            curY += Math.random() * 0.3 - 0.15;
            curY = Math.max(curY, 0.05)
            curY = Math.min(curY, 0.95)
            pointDataSet.push({ x: x / points * width, y: curY * height })
          }
          return pointDataSet
        }

        function parameters(point) {
          if (point.x < 100) {
            return { fill: "none", stroke: "#b3331d", strokeWidth: 6, strokeOpacity: 0.5 }
          }
          if (point.x > 400) {
            return { fill: "none", stroke: "#b3331d", strokeWidth: 1, strokeDasharray: "5 5" }
          }
          if (point.y < 150) {
            return { fill: "none", strokeWidth: 1, stroke: "#00a2ce" }
          }
          if (point.y > 350) {
            return { fill: "none", strokeWidth: 2, stroke: "#b6a756" }
          }
          return { fill: "none", stroke: "black", strokeWidth: 1 }
        }

        const data = randomLineGenerator(500,500,100)

        return <svg height="500" width="500">
        <DividedLine
            parameters={parameters}
            data={[ data ]}
            lineDataAccessor={d => d}
            customAccessors={{ x: d => d.x, y: d => d.y }}
            interpolate={curveBasis}
            searchIterations={20}
            />
        </svg>
    }
}

module.exports = DividedLineExample;
