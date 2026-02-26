import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import boxofficeData from "../../public/data/boxofficetotals.json"

const frameProps = {
  size: [700, 450],
  data: boxofficeData,
  projection: "horizontal",
  oAccessor: "none",
  rAccessor: "total",
  rExtent: [0],
  margin: { left: 20, top: 50, bottom: 75, right: 20 },
  title: (
    <text textAnchor="middle">
      Weekly(1-52) Box Office Totals from <tspan fill={theme[0]}>2016</tspan> -
      mid <tspan fill={theme[2]}>2017</tspan>
    </text>
  ),
  axes: [
    {
      orient: "bottom",
      label: "Box office total",
      ticks: 8,
      tickFormat: d => d / 1000000 + "m"
    }
  ],
  type: {
    type: "swarm",
    r: 14,
    customMark: d => {
      const [year, week] = d.date.split("-")
      return (
        <g>
          <circle
            r={11}
            stroke={year === "2016" ? theme[0] : theme[2]}
            fill={year === "2016" ? theme[0] : theme[2]}
          />
          <text
            fill={year === "2016" ? "white" : "black"}
            fontWeight="bold"
            textAnchor="middle"
            y=".4em"
          >
            {week}
          </text>
        </g>
      )
    }
  },
  tooltipContent: d => (
    <div className="tooltip-content">
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  ),
  pieceHoverAnnotation: true
}

const overrideProps = {
  title: `(
    <text textAnchor="middle">
      Weekly(1-52) Box Office Totals from <tspan fill={
        theme[0]}
      >2016</tspan> -
      mid <tspan fill={theme[2]}>2017</tspan>
    </text>
  )`,
  tooltipContent: `d => (
    <div className="tooltip-content">
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  )
  `,
  type: `{
    type: "swarm",
    r: 14,
    customMark: d => {
      const [year, week] = d.date.split("-");
      return (
        <g>
          <circle
            r={11}
            stroke={year === "2016" ? theme[0] : theme[2]}
            fill={year === "2016" ? theme[0] : theme[2]}
          />
          <text
            fill={year === "2016" ? "white" : "black"}
            fontWeight="bold"
            textAnchor="middle"
            y=".4em"
          >
            {week}
          </text>
        </g>
      );
    }
  }
  `
}

const SwarmPlot = () => {
  return (
    <div>
      <MarkdownText
        text={`

Swarm plots allow you to position your data based on a numerical value but apply a collision force to prevent overlapping.

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).
`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default SwarmPlot
