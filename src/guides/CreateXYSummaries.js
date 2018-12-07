import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { scaleSqrt, scaleThreshold } from "d3-scale"
import { points } from "./CreateAScatterplot"

const rScale = scaleSqrt()
  .domain([0, points[0].grossWeekly])
  .range([0, 25])

const steps = ["none", "#FBEEEC", "#f3c8c2", "#e39787", "#ce6751", "#b3331d"]
const thresholds = scaleThreshold()
  .domain([0.01, 0.25, 0.5, 0.75, 1])
  .range(steps)

const frameProps = {
  size: [700, 400],
  summaries: [{ coordinates: points }],
  summaryType: { type: "heatmap", yBins: 10, xCellPx: 50 },
  xAccessor: "theaterCount",
  yAccessor: "rank",
  yExtent: [0],
  xExtent: [0],
  title: (
    <text textAnchor="middle">
      Theaters showing <tspan fill={theme[0]}>Ex Machina</tspan> vs{" "}
      <tspan fill={theme[1]}>Far from the Madding Crowd</tspan> vs{" "}
      <tspan fill={theme[2]}>The Longest Ride</tspan>
    </text>
  ),
  axes: [
    {
      orient: "left",
      label: "Rank"
    },
    {
      orient: "bottom",
      label: { name: "Theaters", locationDistance: 55 }
    }
  ],
  summaryStyle: d => ({
    fill: thresholds(d.percent),
    stroke: "black"
  }),
  pointStyle: d => {
    return {
      r: 5,
      fill:
        d.title === "Ex Machina"
          ? theme[0]
          : d.title === "Far from the Madding Crowd"
          ? theme[1]
          : theme[2]
    }
  },

  margin: { left: 60, bottom: 90, right: 10, top: 40 },
  points
}

const overrideProps = {
  lineStyle: `(d, i) => ({
    stroke: theme[i],
    strokeWidth: 2,
    fill: theme[i]
  })`,
  title: `(
    <text textAnchor="middle">
      Theaters showing <tspan fill={"${theme[0]}"}>Ex Machina</tspan> vs{" "}
      <tspan fill={"${theme[1]}"}>Far from the Madding Crowd</tspan>
    </text>
  )`,
  pointStyle: `d => {
    return { fill: theme[d.parentLine.key], r: 4 }
  }`
}

const customPointProps = {
  ...frameProps,
  customPointMark: ({ d }) => {
    return (
      <g>
        <circle r={rScale(d.grossWeekly)} stroke="white" />
        <text>{d.week}</text>
      </g>
    )
  }
}

//Add in multi-line accessor example
//Add in marginalia labelling example?
//Explain xAccesor and yAccessor
//Add percent value into the tooltip example
//Add in cumulative-revers?

const withHoverFrameProps = {
  ...frameProps,
  // lineType: "stackedarea"
  hoverAnnotation: true
}

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Creating a scatterplot, and scatterplot using a custom point with XYFrame and hover behavior and styling.

## Scatterplot

The XYFrame takes \`points\` as an array of objects. Each object represents a point. 

In this example, we pass a \`xExtent={[0]}\` and \`yExtent={[0]}\` to set the lower bound of the xAxis and yAxis to zero, otherwise it would create an exent based on the minimum and maximum values on your  \`xAccessor\` and \`yAccessor\`.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        useExpanded
      />
      <MarkdownText
        text={`
## Scatterplot with Custom Points

XYFrame takes a \`customPointMark\` which allows you to render the points with a custom function. 
`}
      />
      <DocumentFrame
        frameProps={customPointProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Scatterplot with Hover

Enabeling the \`hoverAnnotation\` prop to true gives you default tooltips based on the \`xAccessor\` and \`yAccessor\` values. You can override this default by passing a \`tooltipContent\` function 

`}
      />
      <DocumentFrame
        frameProps={withHoverFrameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## What next?

For technical specifications on all of XYFrame's features, reference the [XYFrame API](#api/xyframe) docs.

`}
      />
    </div>
  )
}
