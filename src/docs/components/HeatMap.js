import * as React from "react"
import DocumentComponent from "../layout/DocumentComponent"
import HeatMapRaw from "./HeatMapRaw"

const components = []

components.push({
  name: "HeatMap"
})

export default class HeatMapDocs extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Basic",
      demo: HeatMapRaw,
      source: `
let startSeed = 0.5

const heatScale = scaleLinear().domain([-10,-5,0,5,10]).range(["darkblue", "steelblue", "white", "red", "darkred"]).clamp(true)

const tiles = Array(84)
    .fill()
    .map((d,i) => ({ step: i%12, value: startSeed += (0.5 - Math.random()) }))

const daysOfTheWeek = {
    7: "Monday",
    6: "Tuesday",
    5: "Wednesday",
    4: "Thursday",
    3: "Friday",
    2: "Saturday",
    1: "Sunday",
}

const daysAxis = { orient: 'left',
    tickFormat: d => daysOfTheWeek[d] ? 
    <text style={{ textAnchor: "end" }} y={20}>{daysOfTheWeek[d]}</text> : "" }

<OrdinalFrame
    size={[ 700,400 ]}
    data={tiles}
    rAccessor={() => 1}
    oAccessor={"step"}
    style={d => ({ fill: heatScale(d.value), stroke: "darkgray", strokeWidth: 1 })}
    type={"bar"}
    axis={daysAxis}
    oLabel={d => <text transform="rotate(90)">Week {d}</text>}
    margin={{ left: 100, top: 10, bottom: 80, right: 50 }}
    oPadding={0}
/>
      `
    })

    return (
      <DocumentComponent
        name="Heat Map"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          A heatmap relies on the stacking functionality and a fixed-value
          rAccessor to create tiles and uses the style of the tiles to encode
          the value. By using a matrix dataset (meaning that there are an equal
          number of entries for each column) you can create a heatmap easily.
        </p>
      </DocumentComponent>
    )
  }
}

HeatMapDocs.title = "Heat Map"
