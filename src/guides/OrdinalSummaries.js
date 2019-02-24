import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { points } from "./Scatterplot"

const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}

const frameProps = {
  size: [700, 400],
  data: points,
  type: "point",
  projection: "horizontal",
  summaryType: "violin",
  oAccessor: "title",
  rAccessor: "rank",
  oLabel: true,
  rExtent: [0],
  title: "Box Office Movies by Rank",
  axis: {
    orient: "bottom",
    label: "Rank"
  },
  summaryStyle: d => ({
    fill: d && colors[d.title],
    fillOpacity: 0.2,
    stroke: d && colors[d.title],
    strokeWidth: 0.5
  }),
  style: d => {
    return {
      r: 2,
      fill: d && colors[d.title]
    }
  },

  margin: { left: 160, bottom: 90, right: 10, top: 40 }
}

const overrideProps = {
  summaryStyle: `d => ({
    fill: d && colors[d.title],
    fillOpacity: 0.2,
    stroke: d && colors[d.title],
    strokeWidth: 0.5
  })`,

  style: `d => {
    return {
      r: 2,
      fill: d && colors[d.title]
    }
  }`
}

const pre = `const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
}`

const heatmapProps = {
  ...frameProps,
  summaryType: "heatmap"
}

const contour = {
  ...frameProps,
  summaryType: "contour"
}

const histogram = {
  ...frameProps,
  summaryType: "histogram"
}

const ridgeline = {
  ...frameProps,
  summaryType: "ridgeline"
}

const boxplot = {
  ...frameProps,
  oPadding: 20,
  summaryType: "boxplot"
}

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Summaries allow you to pass individual data points and visualize them in an aggregated form. The built in types are \`violin\`, \`heatmap\`, \`boxplot\`, \`histogram\`, \`contour\`, and \`ridgeline\`

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Violin

OrdinalFrame takes \`points\` as an array of objects. 

In this example, we pass those points and set \`summaryType: "violin" \`.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        pre={pre}
      />

      <MarkdownText
        text={`
### Violin Settings

Instead of sending just a string \`summaryType="violin"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "violin", 
    bins: 25 // Number, Bins ito bin the values into,
    binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a bin),
    useBins: true //Boolean, If set to false, bins will have a one-to-one correspondence with the points passed to the column, allowing you to create your own samples without trying to wrangle bin numbers,
    curve: curveCatmullRom //d3-shape-like curve function,
    relative: false //Boolean, Whether or not the scale of each individual plot is relative to the maximum of all plots or only to its own plot (you can combine a relative={true} with,
    // axis: Object, Uses the same axis settings from everywhere else but makes an axis for each column

}\`\`\`
`}
      />
      <MarkdownText
        text={`
## Heatmap

This example is the same as the heatmap except we are passing \`"heatmap"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={heatmapProps}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
        pre={pre}
      />
      <MarkdownText
        text={`
### Heatmap Settings

Instead of sending just a string \`summaryType="heatmap"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "heatmap", 
    bins: 25 // Number, Bins ito bin the values into,
    binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a bin),
    useBins: true //Boolean, If set to false, bins will have a one-to-one correspondence with the points passed to the column, allowing you to create your own samples without trying to wrangle bin numbers,
    relative: false //Boolean, Whether or not the scale of each individual plot is relative to the maximum of all plots or only to its own plot (you can combine a relative={true} with,
    // axis: Object, Uses the same axis settings from everywhere else but makes an axis for each column   
}\`\`\`

`}
      />

      <MarkdownText
        text={`
## Boxplot

This example is the same as the heatmap except we are passing \`"boxplot"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={boxplot}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
        pre={pre}
      />

      <MarkdownText
        text={`
### Boxplot Settings

Instead of sending just a string \`summaryType="boxplot"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "boxplot", 
    // elementStyleFn: Function, takes a string and returns an object that determines the style of the corresponding boxplot elements:
        //“whisker” - The line running from the minimum to the maximum value
        //“max” - The line (perpendicular to the whisker) indicating the maximum value
        //“min” - The line (perpendicular to the whisker) indicating the minimum value
        //“median” - The line (perpendicular to the whisker) indicating the minimum value
        //“iqrarea” - The rectangle (or angle in radial projection) indicating the interquartile range
        //“q3area” - The rectangle (or angle in radial projection) indicating the 3rd Quartile range
        //“q1area” - The rectangle (or angle in radial projection) indicating the 1st Quartile range
  }\`\`\`

`}
      />
      <MarkdownText
        text={`
## Histogram

This example is the same as the heatmap except we are passing \`"histogram"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={histogram}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
        pre={pre}
      />

      <MarkdownText
        text={`
### Histogram Settings

Instead of sending just a string \`summaryType="histogram"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "histogram", 
    bins: 25 // Number, Bins ito bin the values into,
    binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a bin),
    useBins: true //Boolean, If set to false, bins will have a one-to-one correspondence with the points passed to the column, allowing you to create your own samples without trying to wrangle bin numbers,
    relative: false //Boolean, Whether or not the scale of each individual plot is relative to the maximum of all plots or only to its own plot (you can combine a relative={true} with,
    // axis: Object, Uses the same axis settings from everywhere else but makes an axis for each column
  }\`\`\`

`}
      />
      <MarkdownText
        text={`
## Contour

This example is the same as the heatmap except we are passing \`"contour"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={contour}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
        pre={pre}
      />

      <MarkdownText
        text={`
### Contour Settings

Instead of sending just a string \`summaryType="contour"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "contour", 
    resolution: 100 // Integer, the “pixel resolution” of the contour. Higher values will make the resulting rings more granular
    thresholds: 8, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your contour
    bandwidth: 12, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold

  }\`\`\`

`}
      />
      <MarkdownText
        text={`
## Ridgeline

This example is the same as the heatmap except we are passing \`"ridgeline"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={ridgeline}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
        pre={pre}
      />

      <MarkdownText
        text={`
### Ridgeline Settings

Instead of sending just a string \`summaryType="ridgeline"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "ridgeline", 
    bins: 25 // Number, Bins ito bin the values into,
    binValue: d => d.length, //Function that determines the summarized value (by default it’s the number of items in a bin),
    useBins: true //Boolean, If set to false, bins will have a one-to-one correspondence with the points passed to the column, allowing you to create your own samples without trying to wrangle bin numbers,
    curve: curveCatmullRom //d3-shape-like curve function,
    amplitude: 0 //Number, pixels the plot is allowed to overflow into the above (or left) column.
    relative: false //Boolean, Whether or not the scale of each individual plot is relative to the maximum of all plots or only to its own plot (you can combine a relative={true} with,
    // axis: Object, Uses the same axis settings from everywhere else but makes an axis for each column
  }\`\`\`

`}
      />

      <MarkdownText
        text={`
## What next?

For technical specifications on all of OrdinalFrame's features, reference the [OrdinalFrame API](#api/OrdinalFrame) docs.

`}
      />
    </div>
  )
}
