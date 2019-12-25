import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import NeighborhoodMapRaw from "./NeighborhoodMapRaw"

const components = []

components.push({
  name: "NeighborhoodMap"
})

export default class NeighborhoodMapDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: NeighborhoodMapRaw,
      source: `
      `
    })

    return (
      <DocumentComponent
        name="Neighborhood Map"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          A simple version of Hood Theory without the map background using the
          neighborhood feature of contour area types.
        </p>
      </DocumentComponent>
    )
  }
}

NeighborhoodMapDocs.title = "Neighborhood Map"
