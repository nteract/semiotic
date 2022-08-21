import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SankeyRaw from "./SankeyRaw"
import Select from "@material-ui/core/Select"
import MenuItem from "@material-ui/core/MenuItem"
import InputLabel from "@material-ui/core/InputLabel"
import FormControl from "@material-ui/core/FormControl"

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
      <MenuItem key={`type-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const directionOptions = ["horizontal", "vertical"].map((d) => (
      <MenuItem key={`direction-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const orientOptions = ["justify", "left", "right", "center"].map((d) => (
      <MenuItem key={`orient-option-${d}`} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Chart Type</InputLabel>
        <Select
          value={this.state.type}
          onChange={(e) => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-2-0-0">
        <InputLabel htmlFor="orient-input">orient</InputLabel>
        <Select
          value={this.state.orient}
          onChange={(e) => this.setState({ orient: e.target.value })}
        >
          {orientOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-3-0-0">
        <InputLabel htmlFor="orient-input">direction</InputLabel>
        <Select
          value={this.state.direction}
          onChange={(e) => this.setState({ direction: e.target.value })}
        >
          {directionOptions}
        </Select>
      </FormControl>
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

    const examples = []
    examples.push({
      name: "Without Cycles",
      demo: SankeyRaw({
        annotations,
        type: this.state.type,
        orient: this.state.orient,
        cyclical: false,
        direction: this.state.direction
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
