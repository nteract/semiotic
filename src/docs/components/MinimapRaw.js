import * as React from "react"
import { MinimapXYFrame } from "../../components"
import { curveMonotoneX } from "d3-shape"
import ProcessViz from "./ProcessViz"

const dataSeeds = [20, 10, -10, -20]
const colors = ["4d430c", "#d38779", "#b3331d", "#00a2ce", "#007190", "#b6a756"]

function generatePoints(start, number) {
  const arrayOfPoints = []
  let currentValue = start
  for (let x = 0; x <= number; x++) {
    arrayOfPoints.push({ step: x, value: currentValue })
    currentValue += Math.random() * 10 - 5
  }
  return arrayOfPoints
}

const generatedData = dataSeeds.map((s, i) => {
  return {
    label: colors[i],
    coordinates: generatePoints(s, 40)
  }
})

const xyFrameSettings = {
  lines: generatedData,
  lineType: { type: "line", interpolator: curveMonotoneX },
  xAccessor: "step",
  yAccessor: "value",
  lineStyle: d => ({ fill: "none", stroke: d.label, fillOpacity: 0.75 }),
  axes: [
    { orient: "left" },
    {
      orient: "bottom",
      ticks: 6
    }
  ]
}

export default (brushFunction, extent, selectedExtent) => {
  const minimapChart = {
    size: [700, 700],
    ...xyFrameSettings,
    xExtent: selectedExtent,
    matte: true,
    margin: { left: 50, top: 10, bottom: 50, right: 20 },
    filterRenderedLines: (d, i) => d.label !== "4d430c" && i < 10,
    minimap: {
      margin: { top: 20, bottom: 35, left: 20, right: 20 },
      brushEnd: brushFunction,
      yBrushable: false,
      xBrushExtent: extent,
      size: [700, 150]
    }
  }
  return (
    <div>
      <ProcessViz frameSettings={minimapChart} frameType="MinimapXYFrame" />
      <MinimapXYFrame {...minimapChart} />
    </div>
  )
}
