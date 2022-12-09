import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DataSketchesPlotRaw from "./DataSketchesPlotRaw"

const components = []

components.push({
  name: "DataSketchesPlot"
})

export default class DataSketchesPlotDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: DataSketchesPlotRaw,
      source: ``
    })

    return (
      <DocumentComponent
        name="Data Sketches Plot"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          An interactive scatterplot of all the projects from{" "}
          <a target="_blank" href="http://www.datasketch.es/">
            the Information is Beautiful Gold Medal-winning Data Sketches by
            Shirley Wu & Nadieh Bremer
          </a>{" "}
          showing how to use backgroundGraphics to place an image and guide
          lines, as well as axis labeling and tick formatting functions to
          create a quadrant view.
        </p>
      </DocumentComponent>
    )
  }
}

DataSketchesPlotDocs.title = "Data Sketches"
