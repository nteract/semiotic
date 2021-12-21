import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { scaleLinear } from "d3-scale"
import { points } from "./Scatterplot"

const steps = ["white", theme[3]]

const thresholds = scaleLinear().range(steps)

const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}

const frameProps = {
  size: [700, 400],
  summaries: [{ coordinates: points }],
  summaryType: "heatmap",
  xAccessor: "theaterCount",
  yAccessor: "rank",
  yExtent: [0],
  xExtent: [0],
  showSummaryPoints: true,
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
    stroke: "#ccc",
    strokeWidth: 0.5
  }),
  pointStyle: d => {
    return {
      r: 2,
      fill: d && colors[d.title]
    }
  },

  margin: { left: 60, bottom: 90, right: 10, top: 40 },
  showLinePoints: true
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
    return {
      r: 2,
      fill: d && colors[d.title]
    }
  }`
}

const hexbinProps = {
  ...frameProps,
  summaryType: "hexbin"
}

const contourProps = {
  ...frameProps,
  summaryStyle: d => {
    return {
      fill: "none",
      stroke: colors[d.parentSummary.title],
      strokeWidth: 0.5
    }
  },
  summaries: [
    {
      coordinates: points.filter(d => d.title === "Ex Machina"),
      title: "Ex Machina"
    },
    {
      coordinates: points.filter(d => d.title === "Far from the Madding Crowd"),
      title: "Far from the Madding Crowd"
    },
    {
      coordinates: points.filter(d => d.title === "The Longest Ride"),
      title: "The Longest Ride"
    }
  ],

  summaryType: { type: "contour", threshold: 1, bandwidth: 15 }
}

const trendlineProps = {
  ...frameProps,
  summaryStyle: {
    fill: "none",
    stroke: theme[0],
    strokeWidth: 2
  },
  title: "Theaters showing Ex Machina by Rank",
  summaries: [
    {
      coordinates: points.filter(d => d.title === "Ex Machina"),
      title: "Ex Machina"
    }
  ],

  summaryType: { type: "trendline" }
}

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Summaries allow you to pass individual data points and visualize them in an aggregated form. The built-in types are \`heatmap\`, \`hexbin\`, and \`contour\`

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Heatmap

\`XYFrame\` takes \`summaries\` as an array of objects. Each object takes an array of \`coordinates\` to summarize. 

In this example, we pass a single summary object, and set to \`summaryType: "heatmap" \`.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        pre={`import { scaleLinear } from "d3-scale"
const steps = ["white", "${theme[3]}"]
const thresholds = scaleLinear().range(steps)

const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}`}
      />

      <MarkdownText
        text={`
### Heatmap Settings

Instead of sending just a string \`summaryType="heatmap"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={{ type: "heatmap", 
  xBins: 0.05, // Number, <1 = percent of space for a rectangle
    // >1 the number of rectangles,
  yBins: 0.05, //same as xBins for y space
  binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a rectangle),
  // xCellPx: integer (default undefined) Pixel width of cells,
  // yCellPx: same as xCellPx for y space,
  // binMax: function (default undefined) the max value for a binned hex to allow for clamping,
  // customMark: function (default undefined) passed the following 
  //   exposed as an object in the first parameter
  //     d has the following parameters: { binItems, percent, value, gx, gy, gw, gh, x, y, parentSummary, _xyfCoordinates } 
  //     baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
  //     margin, 
  //     styleFn: a function for determining the style object given \`d\` (passed through from the Frame from your summaryStyle)
  //     classFn: a function for determining the className given \`d\` (passed through from the Frame from your summaryClass)
  //     chartSize: size of the chart without margins
  //     adjustedSize: size of the overall frame, helpful for ResponsiveFrames

}}\`\`\`
`}
      />
      <MarkdownText
        text={`
## Hexbin

This example is the same as the heatmap except we are passing \`"hexbin"\` as the \`summaryType="hexbin"\`.

`}
      />
      <DocumentFrame
        frameProps={hexbinProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
        pre={`import { scaleLinear } from "d3-scale"
const steps = ["white", "${theme[3]}"]
const thresholds = scaleLinear().range(steps)

const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}`}
      />
      <MarkdownText
        text={`
### Hexbin Settings

Instead of sending just a string \`summaryType="hexbin"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={{ type: "hexbin", 
  bins: 0.05 // Number, <1 = percent of space for a hexbin
  // >1 the number of hexes,
  binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a rectangle),
  // cellPx: integer (default undefined) Pixel width of hexes, 
  // binMax: function (default undefined) the max value for a binned hex to allow for clamping,
  // customMark: function (default undefined) passed the following 
  //   exposed as an object in the first parameter
  //     d has the following parameters: { x, y, binItems (an array of items in the hex), percent, value, radius, hexCoordinates } 
  //     baseMarkProps: an object from the Frame’s baseMarkProps property that is meant to be spread to all generated marks, like this edge
  //     margin, 
  //     styleFn: a function for determining the style object given \`d\` (passed through from the Frame from your summaryStyle)
  //     classFn: a function for determining the className given \`d\` (passed through from the Frame from your summaryClass)
  //     chartSize: size of the chart without margins
  //     adjustedSize: size of the overall frame, helpful for ResponsiveFrames
}}\`\`\`
`}
      />

      <MarkdownText
        text={`
## Contours

This example is the same as the heatmap except we are passing \`"contour"\` as the \`summaryType="contour"\`.

`}
      />
      <DocumentFrame
        frameProps={contourProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
        pre={`const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}`}
      />

      <MarkdownText
        text={`
### Contour Settings

Instead of sending just a string \`summaryType="contour"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={{ type: "contour", 
  resolution: 500 // Integer, the “pixel resolution” of the contour. Higher values will make the resulting rings more granular
  thresholds: 10, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your contour
  bandwidth:  20, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold
  neighborhood: false // Boolean as a convenience this only renders the bottom threshold to allow you to show simple regionality without relying on using 1 threshold (which, remember, is a hint and hard to tune)
}}\`\`\`
`}
      />

      <MarkdownText
        text={`
## Trend Lines

You can draw a trend line using the \`trendline\` summary type.

`}
      />
      <DocumentFrame
        frameProps={trendlineProps}
        type={XYFrame}
        overrideProps={{ ...overrideProps, title: null }}
        startHidden
        pre={`const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}`}
      />

      <MarkdownText
        text={`
### Trend Line Settings

Instead of sending just a string \`summaryType="trendline"\` you can send an object with additional options to specify the type of trend line and its settings.
\`\`\`jsx
summaryType={{ type: "contour", 
  regressionType: "linear" // String, accepts one of the following options: "linear", "polynomial", "exponential", "logarithmic", "power"
  order: 2 // Integer, How many degrees to solve for
  precision: 4 // Integer, the decimal precision used to calculate the trend, if your data is particularly small you'll need to increase this to match
  controlPoints: 20 // Integer, for non-linear projections the line itself is drawn based on control points, you can increase this value if you feel your resulting trend line is too low-resolution in appearance
  curve: curveCardinal // d3-shape curve, used for drawing the line based on the calculated control points
}}\`\`\`
`}
      />
    </div>
  )
}
