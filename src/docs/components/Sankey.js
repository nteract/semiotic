import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SankeyRaw from "./SankeyRaw"

const components = []

components.push({
  name: "Sankey"
})

export default class Sankey extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "sankey",
      orient: "center",
      cycle: "no cycles",
      direction: "horizontal"
    }
  }

  render() {
    const typeOptions = ["sankey", "force", "chord"].map((d) => (
      <option key={`type-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const directionOptions = ["horizontal", "vertical"].map((d) => (
      <option key={`direction-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const orientOptions = ["justify", "left", "right", "center"].map((d) => (
      <option key={`orient-option-${d}`} label={d} value={d}>
        {d}
      </option>
    ))

    const buttons = [
      <form key="button-1-0-0">
        <label htmlFor="chart-type-input">Chart Type</label>
        <select
          value={this.state.type}
          onChange={(e) => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </select>
      </form>,
      <form key="button-2-0-0">
        <label htmlFor="orient-input">orient</label>
        <select
          value={this.state.orient}
          onChange={(e) => this.setState({ orient: e.target.value })}
        >
          {orientOptions}
        </select>
      </form>,
      <form key="button-3-0-0">
        <label htmlFor="orient-input">direction</label>
        <select
          value={this.state.direction}
          onChange={(e) => this.setState({ direction: e.target.value })}
        >
          {directionOptions}
        </select>
      </form>
    ]

    const annotations = [
      {
        type: "node",
        id: "International aviation",
        label: "Energy spent on international aviation",
        ny: 250,
        nx: 600
      },
      { type: "node", dy: -50, dx: -50, id: "Oil", label: "Big Oil" }
    ]

    const size = this.state.orient === "center" ? [600, 500] : [300, 400]

    const examples = []
    examples.push({
      name: "Without Cycles",
      demo: SankeyRaw({
        annotations,
        type: this.state.type,
        orient: this.state.orient,
        cyclical: false,
        direction: this.state.direction,
        size
      }),
      source: ""
    })

    examples.push({
      name: "With Cycles",
      demo: SankeyRaw({
        direction: "off"
      }),
      source: ``
    })
    examples.push({
      name: "downward",
      demo: SankeyRaw({
        annotations,
        type: this.state.type,
        orient: this.state.orient,
        cyclical: true,
        direction: "down",
        size: [700, 800]
      }),
      source: ``
    })
    return (
      <DocumentComponent
        name="Sankey"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          The Sankey diagram is used for representing directed acyclic graphs so
          if you send it a network with cycles, it will default to a
          force-directed network.
        </p>
      </DocumentComponent>
    )
  }
}

Sankey.title = "Sankey"
