import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SparklineRaw from "./SparklineRaw"
import MenuItem from "@material-ui/core/MenuItem"
import InputLabel from "@material-ui/core/InputLabel"
import FormControl from "@material-ui/core/FormControl"
import Select from "@material-ui/core/Select"

const components = []

components.push({
  name: "Sparklines"
})

const typeOptions = ["stackedarea", "line", "difference"].map((d) => (
  <MenuItem key={`type-option-${d}`} label={d} value={d}>
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
          onChange={(e) => this.setState({ type: e.target.value })}
        >
          {typeOptions}
        </Select>
      </FormControl>
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
