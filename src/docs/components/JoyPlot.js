import React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import JoyPlotRaw from "./JoyPlotRaw"

const components = []

components.push({
  name: "Joy Plot"
})

export default class JoyPlotDocs extends React.Component {
  render() {
    const examples = []

    const buttons = []

    examples.push({
      name: "Basic",
      demo: JoyPlotRaw,
      source: `
<div style={{ background: "black" }}>
<ORFrame
    size={[ 700,500 ]}
    data={individualData}
    projection={"horizontal"}
    type={"none"}
    summaryType={{ type: "joy", amplitude: 40, curve: curveMonotoneX, binValue: d => sum(d.map( p => p.value)) }}
    summaryStyle={d => ({ fill: "black", stroke: "white", strokeWidth: 1, opacity: 1 })}
    oAccessor={d => d.year}
    rAccessor={d => d.month}
    oLabel={d => parseInt(d)%10 === 0 ? <text style={{ textAnchor: "end" }}>{d}</text> : null}
    margin={{ left: 0, top: 50, bottom: 10, right: 10 }}
    oPadding={2}
/></div>
      `
    })

    return (
      <DocumentComponent
        name="Joy Plot"
        components={components}
        examples={examples}
        buttons={buttons}
      >
        <p>
          Joy Plots show variation across values and allow overflowing of the
          plot into adjoining columns by adjusting the amplitude property of the
          summaryType. This example also uses dynamicColumnWidth to set column
          width to be based on the maximum value of each column, normalizing the
          variation.
        </p>
      </DocumentComponent>
    )
  }
}

JoyPlotDocs.title = "Joy Plot"
