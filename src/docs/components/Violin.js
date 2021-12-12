import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import ViolinRaw from "./ViolinRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "Violin Chart"
})

export default class ViolinPlot extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: ViolinRaw,
      source: ``
    })

    return (
      <DocumentComponent
        name="Violin"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>The Violin Plot.</p>
      </DocumentComponent>
    )
  }
}

ViolinPlot.title = "Violin"
