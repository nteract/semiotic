import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import boxofficeData from "../../public/data/boxofficetotals.json"

const frameProps = {
  size: [700, 450],
  data: boxofficeData,
  projection: "horizontal",
  oAccessor: "none",
  rAccessor: "total",
  rExtent: [0, undefined],
  margin: { left: 20, top: 50, bottom: 75, right: 20 },
  title: "Weekly(1-52) Box Office Totals from 2016 - mid 2017",
  showAxes: true,
  chartType: "swarm",
  tooltipContent: d => {
    const datum = d.data || d
    return (
      <div className="tooltip-content">
        {datum.date} - {Math.round(datum.total / 1000000)}m
      </div>
    )
  },
  enableHover: true
}

const overrideProps = {
  tooltipContent: `d => (
    <div className="tooltip-content">
      {d.date} - {Math.round(d.total / 1000000)}m
    </div>
  )
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
        type={StreamOrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default SwarmPlot
