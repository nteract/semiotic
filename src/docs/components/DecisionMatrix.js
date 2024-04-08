import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DecisionMatrixRaw from "./DecisionMatrixRaw"

import { extent, mean } from "d3-array"
import { scaleLinear } from "d3-scale"
import { format } from "d3-format"
import AnnotationCalloutCircle from "react-annotation/lib/Types/AnnotationCalloutCircle"

import { MATRIX_DATA } from "../sampledata/matrixData"

const components = []
const MIN_RADIUS = 10
const MAX_RADIUS = 35

components.push({
  name: "Decision Matrix Example"
})

const decisionMatrixCode = `
`

export default class DecisionMatrixExample extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      sizeBy: "Previous Contracts"
    }
  }

  render() {
    const decisionMatrixFrame = DecisionMatrixRaw(this.state.sizeBy)
    const examples = []
    examples.push({
      name: `Vendor Evaluation`,
      demo: decisionMatrixFrame,
      source: decisionMatrixCode
    })

    const toolTipOptions = [
      "Previous Contracts",
      "Number of Employees",
      "None"
    ].map((d) => (
      <option key={`size-by-option-${d}`} value={d}>
        {d}
      </option>
    ))

    let legend = null

    if (this.state.sizeBy !== "None") {
      const ext = extent(
        MATRIX_DATA.map((d) => {
          return +d[this.state.sizeBy]
        })
      )

      const scale = scaleLinear().domain(ext).range([MIN_RADIUS, MAX_RADIUS])

      function fetchLabel(val, sizeBy) {
        let label = val
        switch (sizeBy) {
          case "Number of Employees":
            label = `${val} Employees`
            break
          case "Previous Contracts":
            label = `${val} Contracts`
            break
        }
        return label
      }

      const radiusArray = [
        {
          r: scale(ext[0]),
          val: format(",.0f")(ext[0])
        },
        {
          r: scale(mean(ext)),
          val: format(",.0f")(mean(ext))
        },
        {
          r: scale(ext[1]),
          val: format(",.0f")(ext[1])
        }
      ]

      const legendCircles = radiusArray.map((d, i) => {
        return (
          <AnnotationCalloutCircle
            x={40}
            y={90 - i * ((MAX_RADIUS - MIN_RADIUS) / 2)}
            dy={-(d.r + d.r * 0.15)}
            dx={MAX_RADIUS + 20}
            key={`circle_annotation_${i}`}
            color={"black"}
            note={{
              label: fetchLabel(d.val, this.state.sizeBy),
              lineType: "horizontal",
              align: "left"
            }}
            connector={{ type: "elbow" }}
            subject={{ radius: d.r, radiusPadding: 0 }}
          />
        )
      })

      legend = (
        <div style={{ marginTop: "20px" }}>
          <svg className="decisionMatrixLegend" width="210px">
            {legendCircles}
          </svg>
        </div>
      )
    }

    const buttons = [
      <form key="button-1">
        <label htmlFor="hover-behavior-input">Size Nodes By</label>
        <select
          id="tooltip-selection-option"
          value={this.state.sizeBy}
          onChange={(e) => this.setState({ sizeBy: e.target.value })}
        >
          {toolTipOptions}
        </select>
      </form>,
      legend
    ]

    return (
      <DocumentComponent
        name="Decision Matrix Example"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          As a visual metaphor, decision matrices reside in the space between a
          traditional scatterplot and an ordinal layout. They still take
          advantage of xy positioning, but are purposefully constrained to
          ordinal buckets along the x and y axes. This leads to the marker in a
          cell view seen below.
          <br />
          <br />
          Decision matrices are commonly sourced by manually generated, small
          data (less than 100 rows) and are used to compare two or three metrics
          within the data set.
          <br />
          <br />
          Below we’ve highlighted the potential use case of vendor evaluation.
          Delivery speed and price can be compared by position in the matrix,
          with an optional radius sizing for other, less critical, metrics.
        </p>
      </DocumentComponent>
    )
  }
}

DecisionMatrixExample.title = "Decision Matrix"
