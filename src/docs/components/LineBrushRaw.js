import React from "react"
import { XYFrame } from "../../components"
import { scaleTime } from "d3-scale"
import ProcessViz from "./ProcessViz"

const chartScale = scaleTime()
const lineStyle = {
  fill: "#007190",
  stroke: "#007190",
  strokeWidth: 1
}

export default (data, startEvent, duringEvent, endEvent, extent) => {
  const lineBrushChart = {
    size: [700, 200],
    lines: [{ label: "Apple Stock", coordinates: data }],
    xAccessor: "date",
    yAccessor: "close",
    xScaleType: chartScale,
    lineStyle: lineStyle,
    axes: [
      { orient: "left" },
      {
        orient: "bottom",
        ticks: 6,
        tickFormat: d => d.getFullYear()
      }
    ],
    margin: { left: 40, top: 0, bottom: 50, right: 20 },
    interaction: {
      start: startEvent,
      during: duringEvent,
      end: endEvent,
      brush: "xBrush",
      extent: extent
    }
  }
  return (
    <div style={{ marginTop: "50px" }}>
      <ProcessViz frameSettings={lineBrushChart} frameType="XYFrame" />
      <XYFrame {...lineBrushChart} />
    </div>
  )
}
