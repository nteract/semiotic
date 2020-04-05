import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame, ResponsiveXYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { scaleTime } from "d3-scale"
import { curveCatmullRom } from "d3-shape"

export const lines = [
  {
    title: "Ex Machina",
    coordinates: [
      {
        week: 1,
        grossWeekly: 327616,
        theaterCount: 4,
        theaterAvg: 81904,
        date: "2015-04-10",
        rank: 18
      },
      {
        week: 2,
        grossWeekly: 1150814,
        theaterCount: 39,
        theaterAvg: 29508,
        date: "2015-04-17",
        rank: 15
      },
      {
        week: 3,
        grossWeekly: 7156570,
        theaterCount: 1255,
        theaterAvg: 5702,
        date: "2015-04-24",
        rank: 6
      },
      {
        week: 4,
        grossWeekly: 3615000,
        theaterCount: 1279,
        theaterAvg: 2826,
        date: "2015-05-01",
        rank: 6
      },
      {
        week: 5,
        grossWeekly: 5212462,
        theaterCount: 2004,
        theaterAvg: 2601,
        date: "2015-05-08",
        rank: 6
      },
      {
        week: 6,
        grossWeekly: 3108609,
        theaterCount: 1718,
        theaterAvg: 1809,
        date: "2015-05-15",
        rank: 9
      },
      {
        week: 7,
        grossWeekly: 2248258,
        theaterCount: 896,
        theaterAvg: 2509,
        date: "2015-05-22",
        rank: 12
      },
      {
        week: 8,
        grossWeekly: 1122034,
        theaterCount: 506,
        theaterAvg: 2217,
        date: "2015-05-29",
        rank: 13
      },
      {
        week: 9,
        grossWeekly: 551552,
        theaterCount: 302,
        theaterAvg: 1826,
        date: "2015-06-05",
        rank: 19
      },
      {
        week: 10,
        grossWeekly: 316877,
        theaterCount: 194,
        theaterAvg: 1633,
        date: "2015-06-12",
        rank: 20
      },
      {
        week: 11,
        grossWeekly: 201345,
        theaterCount: 124,
        theaterAvg: 1624,
        date: "2015-06-19",
        rank: 29
      },
      {
        week: 12,
        grossWeekly: 153162,
        theaterCount: 81,
        theaterAvg: 1891,
        date: "2015-06-26",
        rank: 34
      },
      {
        week: 13,
        grossWeekly: 102114,
        theaterCount: 61,
        theaterAvg: 1674,
        date: "2015-07-03",
        rank: 36
      },
      {
        week: 14,
        grossWeekly: 64350,
        theaterCount: 39,
        theaterAvg: 1650,
        date: "2015-07-10",
        rank: 42
      },
      {
        week: 15,
        grossWeekly: 45344,
        theaterCount: 31,
        theaterAvg: 1463,
        date: "2015-07-17",
        rank: 47
      }
    ]
  },
  {
    title: "Far from the Madding Crowd",
    coordinates: [
      {
        week: 1,
        grossWeekly: 240160,
        theaterCount: 10,
        theaterAvg: 24016,
        date: "2015-05-01",
        rank: 24
      },
      {
        week: 2,
        grossWeekly: 1090487,
        theaterCount: 99,
        theaterAvg: 11015,
        date: "2015-05-08",
        rank: 15
      },
      {
        week: 3,
        grossWeekly: 1831958,
        theaterCount: 289,
        theaterAvg: 6339,
        date: "2015-05-15",
        rank: 10
      },
      {
        week: 4,
        grossWeekly: 3779833,
        theaterCount: 865,
        theaterAvg: 4370,
        date: "2015-05-22",
        rank: 7
      },
      {
        week: 5,
        grossWeekly: 2246233,
        theaterCount: 902,
        theaterAvg: 2490,
        date: "2015-05-29",
        rank: 9
      },
      {
        week: 6,
        grossWeekly: 1129007,
        theaterCount: 610,
        theaterAvg: 1851,
        date: "2015-06-05",
        rank: 14
      },
      {
        week: 7,
        grossWeekly: 701207,
        theaterCount: 366,
        theaterAvg: 1916,
        date: "2015-06-12",
        rank: 17
      },
      {
        week: 8,
        grossWeekly: 430870,
        theaterCount: 256,
        theaterAvg: 1683,
        date: "2015-06-19",
        rank: 20
      },
      {
        week: 9,
        grossWeekly: 270977,
        theaterCount: 122,
        theaterAvg: 2221,
        date: "2015-06-26",
        rank: 24
      },
      {
        week: 10,
        grossWeekly: 195483,
        theaterCount: 105,
        theaterAvg: 1862,
        date: "2015-07-03",
        rank: 28
      },
      {
        week: 11,
        grossWeekly: 138071,
        theaterCount: 98,
        theaterAvg: 1409,
        date: "2015-07-10",
        rank: 30
      },
      {
        week: 12,
        grossWeekly: 86393,
        theaterCount: 74,
        theaterAvg: 1167,
        date: "2015-07-17",
        rank: 39
      },
      {
        week: 13,
        grossWeekly: 52821,
        theaterCount: 47,
        theaterAvg: 1124,
        date: "2015-07-24",
        rank: 42
      },
      {
        week: 14,
        grossWeekly: 25708,
        theaterCount: 27,
        theaterAvg: 952,
        date: "2015-07-31",
        rank: 58
      },
      {
        week: 15,
        grossWeekly: 17292,
        theaterCount: 18,
        theaterAvg: 961,
        date: "2015-08-07",
        rank: 60
      }
    ]
  }
]

export const threeTitles = lines.concat([
  {
    title: "The Longest Ride",

    coordinates: [
      {
        week: 1,
        grossWeekly: 16660516,
        theaterCount: 3366,
        theaterAvg: 4950,
        date: "2015-04-10",
        rank: 3
      },
      {
        week: 2,
        grossWeekly: 9372323,
        theaterCount: 3371,
        theaterAvg: 2780,
        date: "2015-04-17",
        rank: 5
      },
      {
        week: 3,
        grossWeekly: 5507604,
        theaterCount: 3140,
        theaterAvg: 1754,
        date: "2015-04-24",
        rank: 7
      },
      {
        week: 4,
        grossWeekly: 2369655,
        theaterCount: 2115,
        theaterAvg: 1120,
        date: "2015-05-01",
        rank: 10
      },
      {
        week: 5,
        grossWeekly: 1823683,
        theaterCount: 1464,
        theaterAvg: 1246,
        date: "2015-05-08",
        rank: 11
      },
      {
        week: 6,
        grossWeekly: 780244,
        theaterCount: 803,
        theaterAvg: 972,
        date: "2015-05-15",
        rank: 14
      },
      {
        week: 7,
        grossWeekly: 419930,
        theaterCount: 329,
        theaterAvg: 1276,
        date: "2015-05-22",
        rank: 17
      },
      {
        week: 8,
        grossWeekly: 226064,
        theaterCount: 230,
        theaterAvg: 983,
        date: "2015-05-29",
        rank: 21
      },
      {
        week: 9,
        grossWeekly: 126320,
        theaterCount: 155,
        theaterAvg: 815,
        date: "2015-06-05",
        rank: 28
      },
      {
        week: 10,
        grossWeekly: 101719,
        theaterCount: 116,
        theaterAvg: 877,
        date: "2015-06-12",
        rank: 31
      },
      {
        week: 11,
        grossWeekly: 33808,
        theaterCount: 45,
        theaterAvg: 751,
        date: "2015-06-19",
        rank: 40
      },
      {
        week: 12,
        grossWeekly: 17379,
        theaterCount: 24,
        theaterAvg: 724,
        date: "2015-06-26",
        rank: 56
      },
      {
        week: 13,
        grossWeekly: 6872,
        theaterCount: 9,
        theaterAvg: 764,
        date: "2015-07-03",
        rank: 67
      }
    ]
  }
])

export const frameProps = {
  size: [700, 400],
  xAccessor: "week",
  yAccessor: "theaterCount",
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
  lineStyle: d => ({
    stroke: theme[d.key],
    strokeWidth: 2,
    fill: "none"
  }),
  // hoverAnnotation: true,
  margin: { left: 80, bottom: 90, right: 10, top: 40 },
  lines
}

export const overrideProps = {
  lineStyle: `(d, i) => ({
    stroke: theme[i],
    strokeWidth: 2,
    fill: "none"
  })`,
  title: `(
    <text textAnchor="middle">
      Theaters showing <tspan fill={"${theme[0]}"}>Ex Machina</tspan> vs{" "}
      <tspan fill={"${theme[1]}"}>Far from the Madding Crowd</tspan>
    </text>
  )`,
  pointStyle: `d => {
    return { fill: theme[d.parentLine.key], r: 4 }
  }`,
  xScaleType: `scaleTime()`
}

//Add in multi-line accessor example
//Add in marginalia labelling example?
//Explain xAccesor and yAccessor
//Add percent value into the tooltip example
//Add in cumulative-revers?

const dateChart = {
  ...frameProps,
  xScaleType: scaleTime(),
  xAccessor: d => new Date(d.date),
  axes: [
    {
      orient: "left",
      label: "Number of Theaters",
      tickFormat: d => d / 1000 + "k"
    },
    {
      orient: "bottom",
      tickFormat: d => d.getMonth() + 1 + "/" + d.getDate(),

      label: { name: "Weeks from Opening Day", locationDistance: 55 }
    }
  ]
}

export const linePercent = {
  ...frameProps,
  lines: threeTitles,
  lineType: "linepercent",
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
      label: "Number of Theaters",
      tickFormat: d => d * 100 + "%"
    },
    {
      orient: "bottom",
      label: { name: "Weeks from Opening Day", locationDistance: 55 }
    }
  ]
}

const bumpLine = {
  ...linePercent,
  lineType: "bumpline",
  size: [700, 200],
  axes: [
    {
      orient: "left",
      label: "Rank",
      tickFormat: d => d,
      tickValues: [2, 1, 0]
    },
    {
      orient: "bottom",
      label: { name: "Weeks from Opening Day", locationDistance: 55 }
    }
  ]
}

export const cumulativeLine = {
  ...frameProps,
  lines: threeTitles,
  title: linePercent.title,
  lineType: "cumulative",
  yAccessor: "grossWeekly"
}

const withHoverFrameProps = {
  ...frameProps,
  // lineType: "stackedarea"
  hoverAnnotation: true
}

const withLineBoundingFrameProps = {
  ...frameProps,
  summaryType: { type: "linebounds", boundingAccessor: d => d.theaterCount / 10 },
  summaryStyle: (d, i) => {
    return {
      stroke: theme[i],
      strokeWidth: 0.5,
      strokeDasharray: "4 4",
      fill: theme[i],
      fillOpacity: 0.5
    }
  },
}
export default function CreateALineChart() {
  return (
    <div>
      <MarkdownText
        text={`
A guide for creating a line chart, timeseries, difference line, and line percents using \`XYFrame\` along with hover behavior, responsive dimensions, and styling.

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Line Chart

\`XYFrame\` takes \`lines\` as an object or an array of objects. Each object represents a line. 

Every object needs a \`coordinates\` property with the array of points for that line. The points will be rendered in the order of that array.

You can use a key other than \`coordinates\` by chaging the \`lineDataAccessor\` props.

In this example, we also pass \`yExtent={[0]}\` to set the lower bound of the yAxis to zero, otherwise it would create an exent based on the minimum and maximum values derived from your \`yAccessor\`.

Your accessors can be a string key to access the property or a function.

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
## Line Chart with Points

Set the \`showLinePoints={true}\` to automatically display the underlying points in each line.

`}
      />
      <DocumentFrame
        frameProps={{
          ...frameProps,
          showLinePoints: true,
          pointStyle: d => {
            return { fill: theme[d.parentLine.key], r: 4 }
          }
        }}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Curvy Line Chart

By default the line uses a linear interpolation between the points, but you can change the \`lineType\` to an object and pass a custom interpolator to override the default behavior, \`lineType: { type: "line", interpolator: curveCatmullRom }\`.

`}
      />
      <DocumentFrame
        frameProps={{
          ...frameProps,
          lineType: { type: "line", interpolator: curveCatmullRom }
        }}
        type={XYFrame}
        overrideProps={{
          ...overrideProps,
          lineType: `{ type: "line", interpolator: curveCatmullRom }`
        }}
        pre={`import {curveCatmullRom} from "d3-shape"`}
        startHidden
      />
      <MarkdownText
        text={`
## Line Chart by Date

You can also change the xScaleType to be a \`scaleTime()\` from \`d3-scale\` if you want to show time series data. Below we've changed:
- \`xScaleType={scaleTime()}\`
- \`xAccessor: d => new Date(d.date)\`
- \`tickFormat: d => d.getMonth() + 1 + "/" + d.getDate()\` 

`}
      />
      <DocumentFrame
        frameProps={dateChart}
        type={XYFrame}
        overrideProps={overrideProps}
        pre={`import { scaleTime } from "d3-scale"`}
        startHidden
      />

      <MarkdownText
        text={`
## Difference Line Chart

This only works if you have two lines in your XYFrame. Change your 
- \`lineType="difference"\` 
- \`lineStyle\` to return a fill color

and XYFrame will automatically create cutout regions between the two lines colored by the line that is on top.

`}
      />
      <DocumentFrame
        frameProps={{
          ...frameProps,
          lineType: "difference",
          lineStyle: (d, i) => ({
            stroke: theme[i],
            strokeWidth: 2,
            fill: theme[i]
          })
        }}
        type={XYFrame}
        overrideProps={{
          ...overrideProps,
          lineStyle: `(d, i) => ({
          stroke: theme[i],
          strokeWidth: 2,
          fill: theme[i]
        })`
        }}
        startHidden
      />
      <MarkdownText
        text={`
## Line Percent Chart

Changing the \`lineType="linepercent"\` and XYFrame will automatically sum each data point as a % of the total for each \`xAccessor\` value as the y data position instead of using the raw values.

`}
      />
      <DocumentFrame
        frameProps={linePercent}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Cumulative Line Chart

Automatically adds each following day to the sum of the previous days. Create this by setting \`lineType"cumulative"\`.

`}
      />
      <DocumentFrame
        frameProps={cumulativeLine}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Bump Line Chart

Instead of using the raw values from the \`yAccessor\` this chart type is based on rank, \`lineType"bumpline"\`.

`}
      />
      <DocumentFrame
        frameProps={bumpLine}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
      <MarkdownText
        text={`
## Line Chart with Hover

To add tooltips, you simply set \`hoverAnnotation={true}\`. By default the tooltips show the x and y values, but you can customize this with the \`tooltipContent\` prop. To learn more, see the [tooltips](/guides/tooltips) guide.

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
## Line Chart with Simple Lines

By default the line rendered by \`linetype: "line"\` is actually two-sided so that it can easily transition in an animated way from a line into a filled area (like those found in stacked area charts). This can cause some issues with styling, especially when using \`stroke-dasharray\` so you can pass a \`simpleLine: true\` prop to \`lineType\` to force it to render as a normal line if you see any styling issues.
`}
      />
      <DocumentFrame
        frameProps={{
          ...withHoverFrameProps,
          lineType: { type: "line", simpleLine: true },
          lineStyle: (d, i) => ({
            stroke: theme[d.key],
            strokeWidth: 2,
            strokeDasharray: i === 0 ? "10 10" : "5 5"
          })
        }}
        type={XYFrame}
        overrideProps={{
          ...overrideProps,
          lineType: `(d, i) => ({
        stroke: theme[d.key],
        strokeWidth: 2,
        strokeDasharray: i === 0 ? "10 10" : "5 5"
      })`
        }}
        startHidden
      />

      <MarkdownText
        text={`
## Line Chart with Responsive Width

To make your chart responsive, instead of using \`XYFrame\` use \`ResponsiveXYFrame\` and set the \`responsiveWidth={true}\`.

`}
      />
      <DocumentFrame
        frameProps={{ ...withHoverFrameProps, responsiveWidth: true }}
        type={ResponsiveXYFrame}
        overrideProps={overrideProps}
        startHidden
      />

      <MarkdownText
        text={`
## Line Chart with Uncertainty Bounds

When you send the \`linebounds\` type of \`summaryType\` and you have not sent any data to \`summaries\` it will default to the data you send to \`lines\`. This allows you to easily draw bounding regions (often used for uncertainty) around your lines.

`}
      />
      <DocumentFrame
        frameProps={{ ...withLineBoundingFrameProps }}
        type={ResponsiveXYFrame}
        overrideProps={overrideProps}
        startHidden
      />

    </div>
  )
}
