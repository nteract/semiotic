import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

import { data } from "./stanton"

const frameProps = {
  points: data,

  xAccessor: "distance",
  yAccessor: "exit_velocity",
  pointStyle: {
    fill: theme[1],
    r: 4
  },
  hoverAnnotation: true,
  margin: { left: 55, right: 15, top: 50, bottom: 75 },
  axes: [
    {
      orient: "top",
      baseline: false,
      marginalSummaryType: {
        type: "ridgeline",
        bins: 8,
        summaryStyle: { fill: theme[3], fillOpacity: 0.5, stroke: theme[3] },
        showPoints: true,
        pointStyle: { stroke: theme[3], strokeOpacity: 0.75, fill: "none" }
      }
    },
    {
      orient: "right",
      baseline: false,
      marginalSummaryType: {
        type: "heatmap",
        summaryStyle: { fill: theme[3] }
      }
    },
    { orient: "left", label: "Exit Velocity" },
    { orient: "bottom", label: "Distance" }
  ]
}

const overrideProps = {}

const HomerunMap = () => {
  return (
    <div>
      <MarkdownText
        text={`
Marginal Graphics (enabled in v1.19.1) are useful for visualizing the density of datapoints along an axis. You can enable them by passing a \`marginalSummaryGraphics\` property to your axis with a string corresponding to any of the existing summary types as seen on the [Ordinal Summary Type Guide](/guides/ordinal-summaries). Like Ordinal Summaries, you can also send an object with a \`type\` equal to one of those strings and settings seen in the guide. In additional, the \`marginalSummaryGraphics\` object will also accept: \`showPoints\` if you want a circle shown for each point and a style object for \`summaryStyle\` and/or \`pointStyle\`. This chart shows the distance and exit velocity of hits by Giancarlo Stanton.
`}
      />

      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        useExpanded
      />
    </div>
  )
}

export default HomerunMap
