import * as React from "react"
import { XYFrame } from "../../components"
import { curveMonotoneX } from "d3-shape"

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
    coordinates: generatePoints(s, 40 - i)
  }
})

export default (type = "stackedarea") => {
  const negativeChart = {
    size: [700, 700],
    lines: generatedData,
    lineType: { type, interpolator: curveMonotoneX },
    xAccessor: "step",
    yAccessor: "value",
    showLinePoints: "top",
    hoverAnnotation: true,
    lineStyle: (d) => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
    annotations: [
      {
        type: "area",
        coordinates: [
          { step: 5, value: -15 },
          { step: 10, value: 10 },
          { step: 8, value: 20 }
        ],
        label: "test-area"
      }
    ],
    axes: [
      { orient: "left" },
      {
        orient: "bottom",
        ticks: 6
      }
    ],
    margin: { left: 50, top: 10, bottom: 50, right: 20 }
  }
  return (
    <div>
      <XYFrame {...negativeChart} />
    </div>
  )
}
