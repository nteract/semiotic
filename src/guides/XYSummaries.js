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
    return { fill: theme[d.parentLine.key], r: 4 }
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
      stroke: colors[d.parentArea.title],
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

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Summaries allow you to pass individual data points and visualize them in an aggregated form. The built in types are \`heatmap\`, \`hexbin\`, and \`contour\`

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Heatmap

XYFrame takes \`summaries\` as an array of objects. Each object takes an array of \`coordinates\` to summarize. 

In this example, we pass a single summary object, and set to \`summaryType: "heatmap" \`.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
### Heatmap Settings

Instead of sending just a string \`summaryType="heatmap"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "heatmap", 
  xBins: 0.05 // Number, <1 = percent of space for a rectangle
    // >1 the number of rectangles,
  yBins: 0.05, //same as xBins
  // xCellPx: integer (default undefined) Pixel width of cells,
  // yCellPx: same as xCellPx,
  binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a rectangle),
  // binMax: function (default undefined) the max value for a binned hex to allow for clamping,
  // customMark: function (default undefined) which if set will be passed the attributes of a hex { binItems, percent, value, gx, gy, gw, gh, x, y, parentArea, _xyfCoordinates }  
}\`\`\`
`}
      />
      <MarkdownText
        text={`
## Hexbin

This example is the same as the heatmap except we are passing \`"hexbin"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={hexbinProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
### Hexbin Settings

Instead of sending just a string \`summaryType="hexbin"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "hexbin", 
  bins: 0.05 // Number, <1 = percent of space for a hexbin
  // >1 the number of hexes,
  // cellPx: integer (default undefined) Pixel width of hexes, 
  binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a rectangle),
  // binMax: function (default undefined) the max value for a binned hex to allow for clamping,
  // customMark: function (default undefined) which if defined is sent: { x, y, binItems (an array of items in the hex), percent, value, radius, hexCoordinates } 
}\`\`\`
`}
      />

      <MarkdownText
        text={`
## Contours

This example is the same as the heatmap except we are passing \`"contour"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={contourProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />

      <MarkdownText
        text={`
### Contour Settings

Instead of sending just a string \`summaryType="contour"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "contour", 
  resolution: 500 // Integer, the “pixel resolution” of the contour. Higher values will make the resulting rings more granular
  thresholds: 10, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your contour
  bandwidth:  20, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold
  neighborhood: false // boolean as a convenience this only renders the bottom threshold to allow you to show simple regionality without relying on using 1 threshold (which, remember, is a hint and hard to tune)
}\`\`\`
`}
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
