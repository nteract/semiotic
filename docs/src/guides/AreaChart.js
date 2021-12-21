import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame, ResponsiveXYFrame } from "semiotic"
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
A guide for creating an area, stacked area, bump area, and stacked percent chart using \`XYFrame\`.

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Area Chart

\`XYFrame\` takes \`lines\` as an object or an array of objects. Each object represents a line. 

Every object needs a \`coordinates\` property with the array of points for that line. The points will be rendered in the order of that array.

You can use a key other than \`coordinates\` by chaging the \`lineDataAccessor\` props.

The default setting for XYFrame when you send it lines is to show them as a line chart. You can override this by adding in the prop \`lineType="area"\` to turn your chart in to areas.

In this example, we also pass \`yExtent={[0]}\` to set the lower bound of the yAxis to zero, otherwise it would create an exent based on the minimum and maximum values derived from your \`yAccessor\`.

Your accessors can be a string key to access the property or a function.

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

Similarly, you can change \`lineType="stackedarea"\` to turn your chart into a stacked area.

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

If you want to emphasize change in rank with your area chart you can use the \`lineType="bumparea"\` to re-rank the areas when they change.

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

Changing the \`lineType="stackedpercent"\` and XYFrame will automatically sum each data point as a % of the total for each \`xAccessor\` value as the y data position instead of using the raw values.

`}
      />
      <DocumentFrame
        frameProps={stackedpercent}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Area Chart with Hover

To add tooltips, you simply set \`hoverAnnotation={true}\`. By default the tooltips show the x and y values, but you can customize this with the \`tooltipContent\` prop. To learn more, see the [tooltips](/guides/tooltips) guide.

`}
      />
      <DocumentFrame
        frameProps={{ ...frameProps, hoverAnnotation: true }}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Area Chart with Responsive Width

To make your chart responsive, instead of using \`XYFrame\` use \`ResponsiveXYFrame\` and set the \`responsiveWidth={true}\`.
`}
      />
      <DocumentFrame
        frameProps={{
          ...frameProps,
          hoverAnnotation: true,
          responsiveWidth: true
        }}
        type={ResponsiveXYFrame}
        overrideProps={overrideProps}
        startHidden
      />
    </div>
  )
}
