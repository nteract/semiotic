import React from "react"
import { XYFrame, DividedLine } from "../../components"
import { data } from "../sampledata/apple_stock"
import { scaleTime } from "d3-scale"
import ProcessViz from "./ProcessViz"

const chartAxes = [
  { orient: "left", tickFormat: d => `$${d}` },
  { orient: "bottom", ticks: 6, tickFormat: d => d.getFullYear() }
]

const thresholdLine = ({ d, i, xScale, yScale }) => {
  return (
    <DividedLine
      key={`threshold-${i}`}
      data={[d]}
      parameters={p => {
        if (p.close > 100) {
          return { stroke: "rgb(182, 167, 86)", fill: "none" }
        }
        return { stroke: "rgb(77, 67, 12)", fill: "none" }
      }}
      customAccessors={{ x: d => xScale(d.x), y: d => yScale(d.y) }}
      lineDataAccessor={d => d.data}
    />
  )
}

const annotations = [
  {
    className: "dot-com-bubble",
    type: "bounds",
    bounds: [{ date: new Date("1/2/1997") }, { date: new Date("1/2/2001") }],
    label: "The dot-com bubble",
    dx: 350
  },
  {
    type: "x",
    date: "7/9/1997",
    note: { label: "Steve Jobs Returns", align: "middle" },
    color: "rgb(0, 162, 206)",
    dy: -10,
    dx: 0,
    connector: { end: "none" }
  },
  {
    type: "x",
    date: "8/15/1998",
    note: { label: "iMac Release", align: "middle" },
    color: "rgb(0, 162, 206)",
    dy: -10,
    dx: 0,
    connector: { end: "none" },
    events: {
      onMouseEnter: (a, b, c) => console.log("a,b,c", a, b, c)
    }
  },
  {
    type: "x",
    date: "10/23/2001",
    note: { label: "iPod Release", align: "middle" },
    color: "rgb(0, 162, 206)",
    dy: -10,
    dx: 0,
    connector: { end: "none" }
  },
  {
    type: "y",
    close: 100,
    label: "Over $100",
    color: "rgb(182, 167, 86)",
    x: 350,
    dx: -15
  },
  {
    type: "enclose",
    label: "Stock Split",
    dy: 0,
    dx: 50,
    color: "rgba(179, 51, 29, 0.75)",
    connector: { end: "none" },
    coordinates: [
      {
        date: "6/21/2000",
        close: 55.62
      },
      {
        date: "6/20/2000",
        close: 101.25
      }
    ]
  }
]

const customTooltip = d => (
  <div className="tooltip-content">
    <p>
      Date: {`${d.date.getMonth()}-${d.date.getDate()}-${d.date.getYear()}`}
    </p>
    <p>Closing Price: ${d.close}</p>
  </div>
)

const appleChart = {
  size: [700, 300],
  xScaleType: scaleTime(),
  xAccessor: d => new Date(d.date),
  yAccessor: "close",
  lines: [{ label: "Apple Stock", coordinates: data }],
  customLineMark: thresholdLine,
  axes: chartAxes,
  annotations: annotations,
  margin: { top: 50, left: 40, right: 10, bottom: 40 },
  hoverAnnotation: true,
  tooltipContent: customTooltip,
  additionalDefs: (
    <linearGradient id="bubbleGradient">
      <stop offset="5%" stopColor="#F60" />
      <stop offset="95%" stopColor="#FF6" />
    </linearGradient>
  )
}

export default (
  <div>
    <ProcessViz frameSettings={appleChart} frameType="XYFrame" />
    <XYFrame {...appleChart} />
  </div>
)
