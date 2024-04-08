import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import NegativeStackedRaw from "./NegativeStackedRaw"

const components = []

components.push({
  name: "Negative Stacked Chart"
})

const typeOptions = ["stackedarea", "stackedpercent", "bumparea"].map((d) => (
  <option key={`type-option-${d}`} label={d} value={d}>
    {d}
  </option>
))

export default class NegativeStacked extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      type: "stackedarea"
    }
  }

  render() {
    const examples = []

    const buttons = [
      <form key="button-1-0-0">
        <label htmlFor="chart-type-input">Chart Type</label>
        <select
          value={this.state.type}
          onChange={(e) => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </select>
      </form>
    ]

    examples.push({
      name: "Basic",
      demo: NegativeStackedRaw(this.state.type),
      source: `const chartSettings = {
        size: [700, 700],
        lines: generatedData,
        lineType: { type, interpolator: curveMonotoneX },
        xAccessor: "step",
        yAccessor: "value",
        lineStyle: d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
        axes: [
          { orient: "left" },
          {
            orient: "bottom",
            ticks: 6
          }
        ],
        margin: { left: 50, top: 10, bottom: 50, right: 20 }
      }

      <XYFrame
        {...chartSettings}
      />
  `
    })

    return (
      <DocumentComponent
        name="Negative Stacked Chart"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          How to use the interactivity property of XYFrame to wire up a simple
          brush over your time series data.
        </p>
      </DocumentComponent>
    )
  }
}

NegativeStacked.title = "Negative Stacked Chart"
