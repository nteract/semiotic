import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { lines, threeTitles } from "./LineChart"

const frameProps = {
  size: [700, 400],
  xAccessor: "week",
  yAccessor: "theaterCount",
  lineDataAccessor: "coordinates",
  yExtent: [0],
  title: (
    <text textAnchor="middle">
      Theaters showing <tspan fill={theme[0]}>Ex Machina</tspan> vs{" "}
      <tspan fill={theme[1]}>Far from the Madding Crowd</tspan>
    </text>
  ),
  axes: [
    {
      orient: "left",
      label: "Number of Theaters",
      tickFormat: d => d / 1000 + "k"
    },
    {
      orient: "bottom",
      label: { name: "Weeks from Opening Day", locationDistance: 55 }
    }
  ],
  margin: { left: 80, bottom: 90, right: 10, top: 40 },
  lines,
  lineStyle: (d, i) => ({
    stroke: theme[i],
    strokeWidth: 2,
    fill: theme[i],
    fillOpacity: 0.6
  }),
  lineType: "area"
}

const overrideProps = {
  lineStyle: `(d, i) => ({
    stroke: theme[i],
    strokeWidth: 2,
    fill: theme[i],
    fillOpacity: 0.6
  })`,
  title: `(
    <text textAnchor="middle">
      Theaters showing <tspan fill={theme[0]}>Ex Machina</tspan> vs{" "}
      <tspan fill={theme[1]}>Far from the Madding Crowd</tspan>
    </text>
  )`
}

const linePercent = {
  ...frameProps,
  lines: threeTitles,
  lineType: "linepercent",
  axes: [
    {
      orient: "left",
      label: "Number of Theaters",
      tickFormat: d => d * 100 + "%"
    },
    {
      orient: "bottom",
      label: { name: "Weeks from Opening Day", locationDistance: 55 }
    }
  ]
}

const withHoverFrameProps = {
  ...frameProps,
  lineType: "stackedarea"
  // hoverAnnotation: true
}

const stackedpercent = {
  ...frameProps,
  lineType: "stackedpercent",
  axes: linePercent.axes,
  lines: threeTitles
}
const bumparea = {
  ...frameProps,
  lines: threeTitles,
  lineType: "bumparea"
  // axes: linePercent.axes
}

//add in curve example
//and in bump area example

export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
## Area Chart

The default setting for XYFrame when you send it lines is to show them as a line chart. You can change this by adding in the prop \`lineType: "area"\` to turn your chart in to areas.

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
      />
      <MarkdownText
        text={`
## Stacked Area Chart

Similarly, you can change \`lineType: "stackedarea"\` to turn your chart into a stacked area.

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
## Bump Area Percent Chart

The default setting for XYFrame when you send it lines is to show them as a line chart. You can change this by adding in the prop \`lineType: "stackedarea"\` to turn your chart in to a stacked area.

`}
      />
      <DocumentFrame
        frameProps={bumparea}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Stacked Area Percent Chart

The default setting for XYFrame when you send it lines is to show them as a line chart. You can change this by adding in the prop \`lineType: "stackedarea"\` to turn your chart in to a stacked area.

`}
      />
      <DocumentFrame
        frameProps={stackedpercent}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />{" "}
    </div>
  )
}
