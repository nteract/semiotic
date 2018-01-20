import React from "react"
import { OrdinalFrame } from "../../components"
import probsRaw from "../sampledata/probly"
import { csvParse } from "d3-dsv"
import { sum, max } from "d3-array"
import { curveMonotoneX, curveStep } from "d3-shape"
import ProcessViz from "./ProcessViz"

const probsData = csvParse(probsRaw)

const colors = ["#4d430c", "#00a2ce", "#b6a756", "#b3331d"]

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "October",
  "November",
  "September",
  "December"
]
const probsPoints = []
probsData.forEach((d, i) => {
  Object.keys(d).forEach(key => {
    probsPoints.push({ term: key, value: +d[key] })
  })
})

const joyChartSettings = {
  size: [700, 500],
  data: probsPoints,
  projection: "horizontal",
  summaryType: {
    type: "joy",
    bins: 10,
    amplitude: 50,
    curve: curveMonotoneX
    //        binValue: d => sum(d.map(p => p.value))
  },
  summaryStyle: (d, i) => ({
    fill: colors[i % 4],
    stroke: "black",
    strokeWidth: 2,
    fillOpacity: 0.5,
    strokeOpacity: 0.25
  }),
  oAccessor: "term",
  rAccessor: "value",
  oLabel: d => <text style={{ textAnchor: "end" }}>{d}</text>,
  margin: { left: 150, top: 50, bottom: 55, right: 15 },
  axis: { orient: "bottom", label: "Percent" },
  oLabel: d => (
    <text style={{ textAnchor: "end", fill: "grey" }} x={-10} y={5}>
      {d}
    </text>
  )
}

export default (
  <div>
    <ProcessViz frameSettings={joyChartSettings} frameType="XYFrame" />
    <OrdinalFrame {...joyChartSettings} />
  </div>
)
