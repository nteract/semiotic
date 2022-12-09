import * as React from "react"
import { data, fieldGraphic } from "../sampledata/stanton"
import { XYFrame } from "../../components"
import { scaleLinear } from "d3-scale"
import { extent } from "d3-array"
import Mark from "../../components/Mark/Mark"

const velocityExtent = extent(data.map((d) => d.exit_velocity))
const velocityScale = scaleLinear()
  .domain(velocityExtent)
  .range(["#00a2ce", "#b3331d"])

const baseSettings = {
  points: data,
  xAccessor: (d) => d.bx,
  yAccessor: (d) => d.by,
  yExtent: [-50],
  customPointMark: () => <Mark markType="circle" r={5} />,
  pointStyle: (d) => ({
    stroke: "black",
    fill: velocityScale(d.exit_velocity)
  }),
  summaries: [{ label: "stanton", coordinates: data }],
  hoverAnnotation: true,
  tooltipContent: (d) => (
    <div className="tooltip-content">
      <p>Date: {d.game_date}</p>
      <p>Distance: {d.distance}</p>
      <p>Velocity: {d.exit_velocity}</p>
    </div>
  ),
  margin: { left: 25, right: 25, top: 25, bottom: 25 },
  backgroundGraphics: fieldGraphic
}

export default (mode) => {
  const baseballChart = {
    ...baseSettings,
    ...mode
  }

  return (
    <XYFrame
      {...baseballChart}
      interactionSettings={{
        voronoiFilter: (d) => d.distance < 400,
        voronoiClipping: 100
      }}
    />
  )
}
