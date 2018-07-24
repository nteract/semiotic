import React from "react"
import { XYFrame } from "../../components"
import lines from "../sampledata/sharedTooltipData"
import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"
import ProcessViz from "./ProcessViz"

const chartAxes = [
  { orient: "left" },
  { orient: "bottom", ticks: 6, tickFormat: d => timeFormat("%m/%d")(d) }
]

const tooltipStyles = {
  header: {
    fontWeight: "bold",
    borderBottom: "thin solid black",
    marginBottom: "10px",
    textAlign: "center"
  },
  lineItem: { position: "relative", display: "block", textAlign: "left" },
  title: { display: "inline-block", margin: "0 5px 0 15px" },
  value: { display: "inline-block", fontWeight: "bold", margin: "0" },
  wrapper: {
    background: "rgba(255,255,255,0.8)",
    minWidth: "max-content",
    whiteSpace: "nowrap"
  }
}

function fetchSharedTooltipContent(passedData) {
  const points = lines
    .map(point => {
      return {
        id: point.id,
        color: point.color,
        data: point.data.find(i => {
          // Search the lines for a similar x value for vertical shared tooltip
          // Can implement a 'close enough' conditional here too (fuzzy equality)
          return i.x.getTime() === passedData.x.getTime()
        })
      }
    })
    .sort((a, b) => b.data.y - a.data.y)

  const returnArray = [
    <div key={"header_multi"} style={tooltipStyles.header}>
      {`Records for: ${timeFormat("%m/%d/%Y")(new Date(passedData.x))}`}
    </div>
  ]

  points.forEach((point, i) => {
    const title = point.id
    const valString = `${point.data.y} units`

    returnArray.push([
      <div key={`tooltip_line_${i}`} style={tooltipStyles.lineItem}>
        <p
          key={`tooltip_color_${i}`}
          style={{
            width: "10px",
            height: "10px",
            backgroundColor: point.color,
            display: "inline-block",
            position: "absolute",
            top: "8px",
            left: "0",
            margin: "0"
          }}
        />
        <p key={`tooltip_p_${i}`} style={tooltipStyles.title}>{`${title} =`}</p>
        <p key={`tooltip_p_val_${i}`} style={tooltipStyles.value}>
          {valString}
        </p>
      </div>
    ])
  })

  return (
    <div className="tooltip-content" style={tooltipStyles.wrapper}>
      {returnArray}
    </div>
  )
}

function fetchSingletonTooltip(d) {
  const title = d.parentLine.id
  const valString = `${d.y} units`

  const returnArray = [
    <div key={"header_singleton"} style={tooltipStyles.header}>
      {`Records for: ${timeFormat("%m/%d/%Y")(new Date(d.x))}`}
    </div>,
    <div key={"tooltip_singleton_line"} style={tooltipStyles.lineItem}>
      <p
        key={"tooltip_singelton_color"}
        style={{
          width: "10px",
          height: "10px",
          backgroundColor: d.parentLine.color,
          display: "inline-block",
          position: "absolute",
          top: "8px",
          left: "0",
          margin: "0"
        }}
      />
      <p key={"tooltip_singleton_p"} style={tooltipStyles.title}>
        {`${title} =`}
      </p>
      <p key={"tooltip_singelton_p_val"} style={tooltipStyles.value}>
        {valString}
      </p>
    </div>
  ]

  return (
    <div className="tooltip-content" style={tooltipStyles.wrapper}>
      {returnArray}
    </div>
  )
}

export default function generateSharedTooltipFrame(isShared) {
  const sharedTooltipChart = {
    size: [700, 300],
    className: "sharedTooltip",
    xScaleType: scaleTime(),
    lineDataAccessor: "data",
    xAccessor: "x",
    yAccessor: "y",
    lines: lines,
    lineStyle: d => {
      return { stroke: d.color, strokeWidth: "2px", fill: "none" }
    },
    axes: chartAxes,
    margin: { top: 50, left: 40, right: 10, bottom: 40 },
    pointStyle: () => {
      return {
        fill: "none",
        stroke: "black",
        strokeWidth: "1.5px"
      }
    },
    hoverAnnotation:
      isShared === "Shared"
        ? [
            { type: "x", disable: ["connector", "note"] },
            { type: "frame-hover" },
            { type: "vertical-points", threshold: 0.1, r: () => 5 }
          ]
        : true,
    tooltipContent: d => {
      return isShared === "Shared"
        ? fetchSharedTooltipContent(d)
        : fetchSingletonTooltip(d)
    }
  }
  return (
    <div>
      <ProcessViz frameSettings={sharedTooltipChart} frameType="XYFrame" />
      <XYFrame {...sharedTooltipChart} />
    </div>
  )
}
