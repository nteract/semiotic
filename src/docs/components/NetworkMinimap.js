import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import MinimapRaw from "./NetworkMinimapRaw"
import { MenuItem } from "material-ui/Menu"
import Input, { InputLabel } from "material-ui/Input"
import { FormControl, FormHelperText } from "material-ui/Form"
import Select from "material-ui/Select"

const components = []

components.push({
  name: "Network Minimap Basics"
})

export default class MinimapBasics extends React.Component {
  constructor(props) {
    super(props)
    this.state = { resetExtent: [0, 40], selectedExtent: [0, 40] }
    this.randomizeExtent = this.randomizeExtent.bind(this)
    this.changeExtent = this.changeExtent.bind(this)
  }
  randomizeExtent() {
    const randomStart = parseInt(Math.random() * 25)
    this.setState({ resetExtent: [randomStart, randomStart + 15] })
  }

  changeExtent(e) {
    this.setState({ selectedExtent: [Math.floor(e[0]), Math.ceil(e[1])] })
  }

  render() {
    const examples = []

    const buttons = [
      <button key="buon" onClick={this.randomizeExtent}>
        Random Extent
      </button>
    ]

    examples.push({
      name: "Basic",
      demo: MinimapRaw(
        this.changeExtent,
        this.state.resetExtent,
        this.state.selectedExtent
      ),
      source: ``
    })

    return (
      <DocumentComponent
        name="Network Minimap Basics"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>MinimapNetworkFrame</p>
      </DocumentComponent>
    )
  }
}

MinimapBasics.title = "Network Minimap Basics"
