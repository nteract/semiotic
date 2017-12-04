import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import BulletChartRaw from "./BulletChartRaw"
const components = []

components.push({
  name: "BulletChart"
})

export default class BulletChart extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: BulletChartRaw,
      source: `
      `
    })

    return (
      <DocumentComponent
        name="Bullet Chart"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          This demonstrates a custom type which uses multiple ORFrames to create
          a bullet chart. The bullet chart has multiple bar-like elements as
          well as a single line element to relay different information.
        </p>
        <p>
          A custom type function in ORFrame returns a structured object for each
          element to be displayed on the frame. That object has a an "o"
          attribute that takes the name of the column, a "piece" attribute that
          holds the original data associated with the graphical object, a
          "renderElement" which is either an object with properties suitable to
          be spread onto a Mark or SVG JSX, and an "xy" which has the "x" and
          "y" value for hover annotations when pieceHoverAnnotation is turned
          on. In this way you can create a bullet chart like the one above that
          has interactive tooltips on all elements. The main reason for using
          multiple ORFrames is the custom scale in each frame.
        </p>
      </DocumentComponent>
    )
  }
}

BulletChart.title = "Bullet Chart"
