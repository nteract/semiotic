import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { NetworkFrame } from "../../components"
import SunburstRaw from "./SunburstRaw"
import { MenuItem } from "material-ui/Menu"
import Input, { InputLabel } from "material-ui/Input"
import { FormControl, FormHelperText } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "Sunburst"
})

export default class Sunburst extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "partition",
      projection: "radial"
    }
  }
  render() {
    const typeOptions = [
      "sankey",
      "force",
      "tree",
      "cluster",
      "circlepack",
      "treemap",
      "partition"
    ].map(d => (
      <MenuItem key={"type-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ))

    const projectionOptions = ["vertical", "horizontal", "radial"].map(d => (
      <MenuItem key={"type-option-" + d} label={d} value={d}>
        {d}
      </MenuItem>
    ))
    const buttons = [
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Chart Type</InputLabel>
        <Select
          value={this.state.type}
          onChange={e => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>,
      <FormControl key="button-2-0-0">
        <InputLabel htmlFor="chart-projection-input">Projection</InputLabel>
        <Select
          value={this.state.projection}
          onChange={e => this.setState({ projection: e.target.value })}
        >
          {projectionOptions}
        </Select>
      </FormControl>
    ]

    const annotations = []

    const examples = []

    examples.push({
      name: "Basic",
      demo: SunburstRaw({
        annotations,
        type: this.state.type,
        projection: this.state.projection
      }),
      source: `
`
    })

    return (
      <DocumentComponent
        name="Sunburst"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>.</p>
      </DocumentComponent>
    )
  }
}

Sunburst.title = "Sunburst"
