import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SunburstRaw from "./SunburstRaw"
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
    const buttons = [
      <button
        key="button"
        onClick={() => this.setState({ zoom: !this.state.zoom })}
      >
        Zoom
      </button>
    ]

    const examples = []

    examples.push({
      name: "Basic",
      demo: SunburstRaw(this.state.zoom),
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
        <p>
          In Semiotic, a Sunburst Chart is not a separate chart type, it is a
          Partition layout with a radial projection in a NetworkFrame.
        </p>
      </DocumentComponent>
    )
  }
}

Sunburst.title = "Sunburst"
