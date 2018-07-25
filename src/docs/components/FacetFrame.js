import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import { FacetFrame } from "../../components"

const components = []

components.push({
  name: "Faceting"
})

export default class FacetFrameDemo extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      type: "partition",
      projection: "radial"
    }
  }
  render() {
    const buttons = []

    const examples = []

    examples.push({
      name: "Basic",
      demo: <FacetFrame settings="something" />,
      source: ``
    })

    return (
      <DocumentComponent
        name="Faceting"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>Faceting is super useful</p>
      </DocumentComponent>
    )
  }
}

FacetFrameDemo.title = "Faceting"
