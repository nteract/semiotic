import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SparklineRaw from "./SparklineRaw"
import { MenuItem } from "material-ui/Menu"
import Input, { InputLabel } from "material-ui/Input"
import { FormControl, FormHelperText } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "Sparkline"
})

const typeOptions = ["stackedarea", "line", "difference"].map(d => (
  <MenuItem key={"type-option-" + d} label={d} value={d}>
    {d}
  </MenuItem>
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
      <FormControl key="button-1-0-0">
        <InputLabel htmlFor="chart-type-input">Chart Type</InputLabel>
        <Select
          value={this.state.type}
          onChange={e => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>
    ]

    examples.push({
      name: "Basic",
      demo: SparklineRaw(this.state.type),
      source: `  `
    })

    return (
      <DocumentComponent
        name="Sparkline"
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

Sparkline.title = "Sparkline"
