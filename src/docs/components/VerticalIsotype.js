import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import DivergingStackedIsotypeRaw from "./VerticalIsotypeRaw"

const components = []

components.push({
  name: "ISOTYPE Chart (Vertical)"
})

export default class DivergingStackedBar extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: DivergingStackedIsotypeRaw,
      source: ``
    })

    return (
      <DocumentComponent
        name="ISOTYPE Chart (Vertical)"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          Vertical ISOTYPE chart. Currently, there's no sizing mechanism that
          maintains whole shapes, which improves ISOTYPE charts, so the designer
          is forced to tweak the size and margins to ensure whole shapes like
          this one. As demonstrated here, renderMode is honored by icon shapes.
        </p>
        <p>
          Based on a{" "}
          <a href="https://lisacharlotterost.github.io/2017/10/24/Frustrating-Data-Vis/">
            beautiful icon chart by Lisa Charlotte Rost
          </a>
          . I called her little icons Rostos in her honor.
        </p>
      </DocumentComponent>
    )
  }
}

DivergingStackedBar.title = "ISOTYPE Chart (Vertical)"
