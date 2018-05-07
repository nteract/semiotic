import React from "react"
import { XYFrame, OrdinalFrame } from "../../components"
import { curveBasis } from "d3-shape"

const testData = [
  {
    id: "linedata-1",
    color: "#00a2ce",
    coordinates: [
      { sales: 5, leads: 150, x: 1 },
      { sales: 7, leads: 100, x: 2 },
      { sales: 7, leads: 112, x: 3 },
      { sales: 4, leads: 40, x: 4 },
      { sales: 2, leads: 200, x: 5 },
      { sales: 3, leads: 180, x: 6 },
      { sales: 5, leads: 165, x: 7 }
    ]
  }
]

const displayData = testData.map(d => {
  const moreData = [
    ...d.coordinates,
    ...d.coordinates.map(p => ({
      sales: p.sales + Math.random() * 5,
      leads: p.leads + Math.random() * 100,
      x: p.x + 7
    }))
  ]
  return Object.assign(d, { coordinates: moreData })
})

const axes = [
  {
    key: "yAxis",
    orient: "left",
    className: "yscale",
    name: "CountAxis",
    tickValues: [3, 6, 9],
    tickFormat: d => `${d}%`
  },
  {
    key: "xAxis",
    orient: "bottom",
    className: "xscale",
    name: "TimeAxis",
    tickValues: [2, 4, 6, 8, 10, 12],
    tickFormat: d => `day ${d}`
  }
]
const axis3 = {
  key: "yAxis",
  orient: "right",
  className: "yscale",
  name: "CountAxis",
  ticks: 3,
  tickFormat: d => d
}
const sharedProps = {
  size: [500, 300],
  margin: { top: 5, bottom: 25, left: 55, right: 55 }
}

export default (
  <div style={{ height: "300px" }}>
    <div style={{ position: "absolute" }}>
      <OrdinalFrame
        {...sharedProps}
        className="bar-line-or"
        data={displayData[0].coordinates}
        type={"bar"}
        renderMode={"sketchy"}
        oAccessor={d => d.x}
        rAccessor={d => d.leads}
        style={() => ({ fill: "#b3331d", opacity: 1, stroke: "white" })}
        axis={axis3}
      />
    </div>
    <div style={{ position: "absolute" }}>
      <XYFrame
        {...sharedProps}
        className="bar-line-xy"
        axes={axes}
        lines={displayData}
        lineRenderMode={"sketchy"}
        xAccessor={"x"}
        yAccessor={"sales"}
        lineStyle={{ stroke: "#00a2ce", strokeWidth: "3px" }}
        lineType={{ type: "line", interpolator: curveBasis }}
      />
    </div>
  </div>
)
