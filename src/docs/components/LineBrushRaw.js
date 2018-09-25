import React from "react"
import { XYFrame } from "../../components"
import { scaleTime } from "d3-scale"
import ProcessViz from "./ProcessViz"

const chartScale = scaleTime()
const lineStyle = {
  fill: "none",
  stroke: "#007190",
  strokeWidth: 1
}

const margin = { left: 40, top: 0, bottom: 50, right: 20 }
const axes = [
  { orient: "left" },
  {
    orient: "bottom",
    ticks: 6,
    tickFormat: d => d.getFullYear()
  }
]

export default (data, startEvent, duringEvent, endEvent, extent) => {
  const lineBrushChart = {
    size: [700, 200],
    lines: [{ label: "Apple Stock", coordinates: data }],
    xAccessor: "date",
    yAccessor: "close",
    xScaleType: chartScale,
    lineStyle: lineStyle,
    axes,
    margin,
    interaction: {
      start: startEvent,
      during: duringEvent,
      end: endEvent,
      brush: "xBrush",
      extent: extent
    }
  }
  return (
    <div>
      <ProcessViz frameSettings={lineBrushChart} frameType="XYFrame" />
      <XYFrame {...lineBrushChart} />
      <XYFrame
        {...lineBrushChart}
        size={[700, 100]}
        lines={[
          {
            label: "somebrush",
            coordinates: [
              { date: new Date("1/1/1997"), close: 0 },
              { date: new Date("12/31/2003"), close: 0 }
            ]
          }
        ]}
      />
    </div>
  )
}
