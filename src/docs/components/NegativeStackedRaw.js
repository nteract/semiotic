import React from "react"
import { XYFrame } from "../../components"
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

export default (type = "stackedarea") => {
  const negativeChart = {
    size: [700, 700],
    lines: generatedData,
    lineType: { type, interpolator: curveMonotoneX },
    xAccessor: "step",
    yAccessor: "value",
    showLinePoints: "top",
    hoverAnnotation: true,
    lineStyle: d => ({ fill: d.label, stroke: d.label, fillOpacity: 0.75 }),
    axes: [
      { orient: "left" },
      {
        orient: "bottom",
        ticks: 6
      }
    ],
    lineRenderMode: "sketchy",
    margin: { left: 50, top: 10, bottom: 50, right: 20 }
  }
  return (
    <div>
      <iframe
        title="stacked-chart-video"
        width="560"
        height="315"
        src="https://www.youtube.com/embed/xiu3cuCio1w"
        frameBorder="0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
      <ProcessViz frameSettings={negativeChart} frameType="XYFrame" />
      <XYFrame {...negativeChart} />
    </div>
  )
}
