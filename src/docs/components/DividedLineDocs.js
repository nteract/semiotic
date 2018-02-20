import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { DividedLine } from "../../components"
import { curveBasis } from "d3-shape"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "DividedLine",
  proptypes: `
    {
    parameters: PropTypes.func,
    className: PropTypes.string,
    interpolate: PropTypes.func, 
    data: PropTypes.oneOfType([
      PropTypes.array,
      PropTypes.object
    ]),
    lineDataAccessor: PropTypes.func,
    customAccessors: PropTypes.object,
    searchIterations: PropTypes.number
    }
  `
})

export default class DividedLineDocs extends React.Component {
  render() {
    function randomLineGenerator(width, height, points) {
      const pointDataSet = []
      let curY = 0.5
      for (let x = 0; x < points; x++) {
        curY += Math.random() * 0.3 - 0.15
        curY = Math.max(curY, 0.05)
        curY = Math.min(curY, 0.95)
        pointDataSet.push({ x: x / points * width, y: curY * height })
      }
      return pointDataSet
    }

    function parameters(point) {
      if (point.x < 100)
        return {
          fill: "none",
          stroke: "#b3331d",
          strokeWidth: 6,
          strokeOpacity: 1
        }

      if (point.x > 400)
        return {
          fill: "none",
          stroke: "#b3331d",
          strokeWidth: 2,
          strokeDasharray: "5 5"
        }

      if (point.y < 150)
        return { fill: "none", strokeWidth: 2, stroke: "#00a2ce" }

      if (point.y > 350)
        return { fill: "none", strokeWidth: 2, stroke: "#b6a756" }

      return { fill: "none", stroke: "black", strokeWidth: 1 }
    }

    const data = randomLineGenerator(500, 500, 100)

    const buttons = []

    const examples = []
    examples.push({
      name: "Basic",
      demo: (
        <svg height="500" width="500">
          <DividedLine
            parameters={parameters}
            data={[data]}
            lineDataAccessor={d => d}
            customAccessors={{ x: d => d.x, y: d => d.y }}
            interpolate={curveBasis}
            searchIterations={20}
          />
        </svg>
      ),
      source: `
      import { DividedLine } from 'semiotic';

        <svg height='500' width='500'>
          <DividedLine
            parameters={parameters}
            data={[ data ]}
            lineDataAccessor={d => d}
            customAccessors={{ x: d => d.x, y: d => d.y }}
            interpolate={curveBasis}
            searchIterations={20}
          />
        </svg>
      `
    })

    return (
      <DocumentComponent
        name="DividedLine"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The DividedLine lets you create a line that is split based on a
          parameters function, which checks each point and applies a different
          style object to line segments that fall into the declared parameters.
        </p>

        <p>
          Line data accessors are placed in a customAccessors object declaring x
          and y accessor functions. SearchIterations is a parameter used to
          improve the accuracy of the interpolated cut between the parameterized
          sections of the line at a cost of performance.
        </p>
      </DocumentComponent>
    )
  }
}

DividedLineDocs.title = "DividedLine"
