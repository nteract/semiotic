import React from "react"
import { scaleLinear } from "d3-scale"
import { OrdinalFrame } from "../../components"
import ProcessViz from "./ProcessViz"
/*
  <div>
    <ProcessViz frameSettings={regionatedLineChart} frameType="XYFrame" />
    <XYFrame {...regionatedLineChart} />
  </div>
*/

let startSeed = 0.5

const heatScale = scaleLinear()
  .domain([-10, -5, 0, 5, 10])
  .range(["#007190", "#00a2ce", "white", "#d38779", "#b3331d"])
  .clamp(true)

const tiles = Array(84)
  .fill()
  .map((d, i) => ({ step: i % 12, value: (startSeed += 0.5 - Math.random()) }))

const daysOfTheWeek = {
  7: "Monday",
  6: "Tuesday",
  5: "Wednesday",
  4: "Thursday",
  3: "Friday",
  2: "Saturday",
  1: "Sunday"
}
const daysAxis = {
  orient: "left",
  tickFormat: d =>
    daysOfTheWeek[d] ? (
      <text style={{ textAnchor: "end" }} y={20}>
        {daysOfTheWeek[d]}
      </text>
    ) : (
      ""
    )
}

export default (
  <OrdinalFrame
    size={[700, 400]}
    data={tiles}
    rAccessor={() => 1}
    oAccessor={d => d.step}
    style={d => ({
      fill: heatScale(d.value),
      stroke: "darkgray",
      strokeWidth: 1
    })}
    type={"bar"}
    axis={daysAxis}
    oLabel={d => <text transform="rotate(90)">Week {d}</text>}
    margin={{ left: 100, top: 10, bottom: 80, right: 50 }}
    oPadding={0}
  />
)
