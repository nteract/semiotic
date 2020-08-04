import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import BarLineRaw from "./BarLineRaw"

const components = []
// Add your component proptype data here
// multiple component proptype documentation supported

components.push({
  name: "BarLine"
})

export default class BarLineDocs extends React.Component {
  render() {
    const buttons = []

    const examples = []
    examples.push({
      name: "Basic",
      demo: BarLineRaw,
      source: ``
    })

    return (
      <DocumentComponent
        name="Dual Axis Bar & Line Chart"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          ORFrame has a multiAxis prop that, if set to true, will calculate
          separate extents for each of the rAccessor props (meaning you need to
          pass more than one to see any effect) as well as decorating sent axes
          in an order matching the sent rAccessor props so that it renders axes
          with the data extent. You can use the rIndex props of the data to then
          adjust the display and tooltips to show the proper data and render it,
          for instance here using customMark, as a bar/line chart.
        </p>
      </DocumentComponent>
    )
  }
}

BarLineDocs.title = "Dual Axis"
