import React from "react"
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
      <XYFrame
      points={parsedDiamonds}
      size={[700, 700]}
      xAccessor="x"
      yAccessor="y"
      pointStyle={d => ({ fill: d.color })}
      canvasPoints={true}
      axes={[
        { orient: "left" },
        {
          orient: "bottom",
          tickFormat: d => <text transform="rotate(45)">{d}</text>
        }
      ]}
      margin={50}
      hoverAnnotation={true}
      tooltipContent={d => (
        <div className="tooltip-content">
          <p>Price: {d.x}</p>
          <p>Carat: {d.y}</p>
          <p>
            {d.coincidentPoints.length}
          </p>
        </div>
      )}
    />
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
