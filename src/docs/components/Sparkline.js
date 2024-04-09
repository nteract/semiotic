import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SparklineRaw from "./SparklineRaw"

const components = []

components.push({
  name: "Sparklines"
})

const typeOptions = ["stackedarea", "line", "difference"].map((d) => (
  <option key={`type-option-${d}`} label={d} value={d}>
    {d}
  </option>
))

export default class Sparkline extends React.Component {
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
      demo: SparklineRaw(this.state.type),
      source: ``
    })

    return (
      <DocumentComponent
        name="Sparklines"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Sparklines in Semiotic are accomplished with the SparkXYFrame,
          SparkOrdinalFrame and SparkNetworkFrame. They create frames using
          spans instead of divs so can be embedded in paragraphs, and gain their
          height from the line-height property of the line their are in.
        </p>
      </DocumentComponent>
    )
  }
}

Sparkline.title = "Sparklines"
