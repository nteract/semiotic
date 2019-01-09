import React from "react";
import DocumentFrame from "../DocumentFrame";
import { OrdinalFrame } from "semiotic";
import theme from "../theme";
import MarkdownText from "../MarkdownText";
import { points } from "./CreateAScatterplot";

const colors = {
  "Ex Machina": theme[0],
  "Far from the Madding Crowd": theme[1],
  "The Longest Ride": theme[2]
};

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
    };
  },

  margin: { left: 160, bottom: 90, right: 10, top: 40 }
};

const overrideProps = {
  summaryStyle: `d => ({
    fill: d && colors[d.title],
    fillOpacity: 0.2,
    stroke: d && colors[d.title],
    strokeWidth: 0.5
  })`,

  style: `d => {
    return { fill: theme[d.parentLine.key], r: 4 }
  }`
};

const heatmapProps = {
  ...frameProps,
  summaryType: "heatmap"
};

const contour = {
  ...frameProps,
  summaryType: "contour"
};

const histogram = {
  ...frameProps,
  summaryType: "histogram"
};

const ridgeline = {
  ...frameProps,
  summaryType: "ridgeline"
};

const boxplot = {
  ...frameProps,
  oPadding: 20,
  summaryType: "boxplot"
};

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
Summaries allow you to pass individual data points and visualize them in an aggregated form. The built in types are \`violin\`, \`heatmap\`, \`boxplot\`, \`histogram\`, \`contour\`, and \`ridgeline\`

## Violin

OrdinalFrame takes \`points\` as an array of objects. 

In this example, we pass those points and set \`summaryType: "violin" \`.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={OrdinalFrame}
        overrideProps={overrideProps}
      />

      <MarkdownText
        text={`
### Violin Settings

Instead of sending just a string \`summaryType="violin"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "violin", 
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
## Heatmap

This example is the same as the heatmap except we are passing \`"heatmap"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={heatmapProps}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
### Heatmap Settings

Instead of sending just a string \`summaryType="heatmap"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "heatmap", 
    bins: 0.05 // Number, <1 = percent of space for a heatmap
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
## Boxplot

This example is the same as the heatmap except we are passing \`"boxplot"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={boxplot}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
      />

      <MarkdownText
        text={`
### Boxplot Settings

Instead of sending just a string \`summaryType="boxplot"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "boxplot", 
    resolution: 500 // Integer, the “pixel resolution” of the boxplot. Higher values will make the resulting rings more granular
    thresholds: 10, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your boxplot
    bandwidth:  20, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold
    neighborhood: false // boolean as a convenience this only renders the bottom threshold to allow you to show simple regionality without relying on using 1 threshold (which, remember, is a hint and hard to tune)

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
      />

      <MarkdownText
        text={`
### Histogram Settings

Instead of sending just a string \`summaryType="histogram"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "histogram", 
    resolution: 500 // Integer, the “pixel resolution” of the histogram. Higher values will make the resulting rings more granular
    thresholds: 10, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your histogram
    bandwidth:  20, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold
    neighborhood: false // boolean as a convenience this only renders the bottom threshold to allow you to show simple regionality without relying on using 1 threshold (which, remember, is a hint and hard to tune)

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
## Ridgeline

This example is the same as the heatmap except we are passing \`"ridgeline"\` as the \`summaryType\`.

`}
      />
      <DocumentFrame
        frameProps={ridgeline}
        type={OrdinalFrame}
        overrideProps={overrideProps}
        startHidden
      />

      <MarkdownText
        text={`
### Ridgeline Settings

Instead of sending just a string \`summaryType="ridgeline"\` you can send an object with additional options to specify the bin sizes and behavior.
\`\`\`jsx
summaryType={ type: "ridgeline", 
    resolution: 500 // Integer, the “pixel resolution” of the ridgeline. Higher values will make the resulting rings more granular
    thresholds: 10, // Integer, more of a hint than a setting but it tries to give you this number of “steps” to your ridgeline
    bandwidth:  20, // Integer, width in pixels (in the native resolution, so 4% if your resolution is set to the default of 500) that determines the size of each threshold
    neighborhood: false // boolean as a convenience this only renders the bottom threshold to allow you to show simple regionality without relying on using 1 threshold (which, remember, is a hint and hard to tune)

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
  );
}
