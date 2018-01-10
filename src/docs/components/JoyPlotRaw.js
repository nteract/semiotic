import React from "react"
import { ORFrame } from "../../components"
import { xyframe_data } from "../sampledata/nyc_temp"
import { scaleLinear } from "d3-scale"
import { sum, max } from "d3-array"
import { curveMonotoneX } from "d3-shape"

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
const components = []
const individualData = []
xyframe_data.filter(d => parseInt(d.year) > 1800).forEach(d => {
  individualData.push({ month: 0, value: 0.1, year: d.year })
  months.forEach((m, mi) => {
    individualData.push({ month: mi + 1, value: d[m] - 19.9, year: d.year })
  })
  individualData.push({ month: 13, value: 0.1, year: d.year })
})

export default (
  <div style={{ background: "black" }}>
    <ORFrame
      size={[700, 500]}
      data={individualData}
      projection={"horizontal"}
      type={"none"}
      summaryType={{
        type: "joy",
        amplitude: 40,
        curve: curveMonotoneX,
        binValue: d => sum(d.map(p => p.value)),
        useBins: false
      }}
      summaryStyle={d => ({
        fill: "black",
        stroke: "white",
        strokeWidth: 1,
        opacity: 1
      })}
      oAccessor={d => d.year}
      rAccessor={d => d.month}
      dynamicColumnWidth={d => max(d.map(p => p.month))}
      oLabel={d =>
        parseInt(d) % 10 === 0 ? (
          <text style={{ textAnchor: "end" }}>{d}</text>
        ) : null
      }
      margin={{ left: 20, top: 50, bottom: 10, right: 10 }}
      oPadding={2}
    />
  </div>
)
