import * as React from "react"
import { XYFrame, DividedLine } from "../../components"
import { data } from "../sampledata/apple_stock"
import { scaleTime } from "d3-scale"

const chartAxes = [
  { orient: "left", tickFormat: d => `$${d}` },
  { orient: "bottom", ticks: 6, tickFormat: d => d.getFullYear() },
  {
    orient: "right",
    marginalSummaryType: {
      type: "boxplot"
    }
  }
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
  yExtent: [0],
  yAccessor: "close",
  lines: [{ label: "Apple Stock", coordinates: data }],
  customLineMark: thresholdLine,
  axes: chartAxes,
  margin: { top: 50, left: 40, right: 50, bottom: 40 },
  tooltipContent: customTooltip,
  additionalDefs: (
    <linearGradient id="bubbleGradient">
      <stop offset="5%" stopColor="#F60" />
      <stop offset="95%" stopColor="#FF6" />
    </linearGradient>
  )
}

export default (editMode, overridePosition, setNewPosition, annotationLabel) => {
  const onDragEnd = d => {
    setNewPosition(d)
  }

  const annotations = [
    {
      className: "dot-com-bubble",
      type: "bounds",
      bounds: [{ date: new Date("1/2/1997") }, { date: new Date("1/2/2001") }],
      label: annotationLabel,
      dx: 350
    },
    {
      type: "x",
      date: "7/9/1997",
      note: { label: annotationLabel, align: "middle" },
      color: "rgb(0, 162, 206)",
      dy: -10,
      dx: 0,
      connector: { end: "none" },
      editMode,
      onDragEnd
    },
    {
      type: "x",
      date: "8/15/1998",
      note: { label: "iMac Release", align: "middle" },
      color: "rgb(0, 162, 206)",
      dy: -10,
      dx: 0,
      connector: { end: "none" },
      /*      events: {
        onMouseEnter: (a, b, c) =>
          console.info("custom event onMouseEnter", a, b, c)
      },*/
      editMode,
      onDragEnd
    },
    {
      type: "x",
      date: "10/23/2001",
      note: { label: "iPod Release", align: "middle" },
      color: "rgb(0, 162, 206)",
      dy: -10,
      dx: 0,
      connector: { end: "none" },
      editMode,
      onDragEnd
    },
    {
      type: "y",
      close: 100,
      label: "Over $100",
      color: "rgb(182, 167, 86)",
      x: 350,
      dx: -15,
      editMode,
      onDragEnd
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
      ],
      editMode,
      onDragEnd
    }
  ]

  if (overridePosition) {
    annotations.forEach((d, i) => {
      if (overridePosition[i]) {
        d.dx = overridePosition[i].dx
        d.dy = overridePosition[i].dy
      }
    })
  }

  return (
    <div>
      <XYFrame
        {...appleChart}
        annotations={annotations}
        hoverAnnotation={!editMode}
        areaType={{
          type: "trendline",
          regressionType: "polynomial",
          order: 8
        }}
        areas={{ label: "Apple Stock", coordinates: data }}
        areaStyle={{
          fill: "none",
          stroke: "darkred",
          strokeWidth: 3,
          strokeOpacity: 0.5
        }}
      />
    </div>
  )
}
