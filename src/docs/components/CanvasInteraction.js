import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import CanvasInteractionRaw from "./CanvasInteractionRaw"

const components = []

components.push({
  name: "CanvasInteraction"
})

export default class CanvasInteractionDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: <CanvasInteractionRaw />,
      source: `
      `
    })

    return (
      <DocumentComponent
        name="Canvas Interaction Layer Map"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          In XYFrame if you have points or lines rendered with canvas then the
          interaction voronoi will also be rendered with canvas, allowing for
          large-scale viz like this scatterplot of 50,000+ points. Canvas
          interaction layers aren't currently supported in OrdinalFrame and
          NetworkFrame.
        </p>
      </DocumentComponent>
    )
  }
}

CanvasInteractionDocs.title = "Canvas Interaction"
