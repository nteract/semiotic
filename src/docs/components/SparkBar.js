import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import SparkBarRaw from "./SparkBarRaw"
import { answers } from "../sampledata/questions"

const components = []

components.push({
  name: "Sparkbars!"
})

export default class SparkBar extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: SparkBarRaw,
      source: ``
    })

    return (
      <DocumentComponent
        name="Sparkbars!"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Sparkbars!are made via negative piece value. They will also naturally
          make negative stacked bar charts.
        </p>
      </DocumentComponent>
    )
  }
}

SparkBar.title = "Sparkbars!"
