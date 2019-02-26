import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
import { scaleSqrt } from "d3-scale"

export const points = [
  { theaterCount: 4, rank: 18, grossWeekly: 327616, title: "Ex Machina" },
  { theaterCount: 39, rank: 15, grossWeekly: 1150814, title: "Ex Machina" },
  { theaterCount: 1255, rank: 6, grossWeekly: 7156570, title: "Ex Machina" },
  { theaterCount: 1279, rank: 6, grossWeekly: 3615000, title: "Ex Machina" },
  { theaterCount: 2004, rank: 6, grossWeekly: 5212462, title: "Ex Machina" },
  { theaterCount: 1718, rank: 9, grossWeekly: 3108609, title: "Ex Machina" },
  { theaterCount: 896, rank: 12, grossWeekly: 2248258, title: "Ex Machina" },
  { theaterCount: 506, rank: 13, grossWeekly: 1122034, title: "Ex Machina" },
  { theaterCount: 302, rank: 19, grossWeekly: 551552, title: "Ex Machina" },
  { theaterCount: 194, rank: 20, grossWeekly: 316877, title: "Ex Machina" },
  { theaterCount: 124, rank: 29, grossWeekly: 201345, title: "Ex Machina" },
  { theaterCount: 81, rank: 34, grossWeekly: 153162, title: "Ex Machina" },
  { theaterCount: 61, rank: 36, grossWeekly: 102114, title: "Ex Machina" },
  { theaterCount: 39, rank: 42, grossWeekly: 64350, title: "Ex Machina" },
  { theaterCount: 31, rank: 47, grossWeekly: 45344, title: "Ex Machina" },
  {
    theaterCount: 10,
    rank: 24,
    grossWeekly: 240160,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 99,
    rank: 15,
    grossWeekly: 1090487,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 289,
    rank: 10,
    grossWeekly: 1831958,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 865,
    rank: 7,
    grossWeekly: 3779833,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 902,
    rank: 9,
    grossWeekly: 2246233,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 610,
    rank: 14,
    grossWeekly: 1129007,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 366,
    rank: 17,
    grossWeekly: 701207,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 256,
    rank: 20,
    grossWeekly: 430870,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 122,
    rank: 24,
    grossWeekly: 270977,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 105,
    rank: 28,
    grossWeekly: 195483,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 98,
    rank: 30,
    grossWeekly: 138071,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 74,
    rank: 39,
    grossWeekly: 86393,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 47,
    rank: 42,
    grossWeekly: 52821,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 27,
    rank: 58,
    grossWeekly: 25708,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 18,
    rank: 60,
    grossWeekly: 17292,
    title: "Far from the Madding Crowd"
  },
  {
    theaterCount: 3366,
    rank: 3,
    grossWeekly: 16660516,
    title: "The Longest Ride"
  },
  {
    theaterCount: 3371,
    rank: 5,
    grossWeekly: 9372323,
    title: "The Longest Ride"
  },
  {
    theaterCount: 3140,
    rank: 7,
    grossWeekly: 5507604,
    title: "The Longest Ride"
  },
  {
    theaterCount: 2115,
    rank: 10,
    grossWeekly: 2369655,
    title: "The Longest Ride"
  },
  {
    theaterCount: 1464,
    rank: 11,
    grossWeekly: 1823683,
    title: "The Longest Ride"
  },
  {
    theaterCount: 803,
    rank: 14,
    grossWeekly: 780244,
    title: "The Longest Ride"
  },
  {
    theaterCount: 329,
    rank: 17,
    grossWeekly: 419930,
    title: "The Longest Ride"
  },
  {
    theaterCount: 230,
    rank: 21,
    grossWeekly: 226064,
    title: "The Longest Ride"
  },
  {
    theaterCount: 155,
    rank: 28,
    grossWeekly: 126320,
    title: "The Longest Ride"
  },
  {
    theaterCount: 116,
    rank: 31,
    grossWeekly: 101719,
    title: "The Longest Ride"
  },
  { theaterCount: 45, rank: 40, grossWeekly: 33808, title: "The Longest Ride" },
  { theaterCount: 24, rank: 56, grossWeekly: 17379, title: "The Longest Ride" },
  { theaterCount: 9, rank: 67, grossWeekly: 6872, title: "The Longest Ride" }
]

const rScale = scaleSqrt()
  .domain([0, 16660516])
  .range([0, 25])

const frameProps = {
  size: [700, 400],
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
    return {
      r: 5,
      fill:
        d.title === "Ex Machina"
          ? theme[0]
          : d.title === "Far from the Madding Crowd"
          ? theme[1]
          : theme[2]
    }
  }`,
  customPointMark: `({ d }) => {
    return (
      <g>
        <circle r={rScale(d.grossWeekly)} stroke="white" />
        <text>{d.week}</text>
      </g>
    )
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
Creating a scatterplot, and scatterplot using a custom point with \`XYFrame\` and hover behavior and styling.

This page uses box office data from [Box Office Mojo](https://www.boxofficemojo.com/).

## Scatterplot

The \`XYFrame\` takes \`points\` as an array of objects. Each object represents a point. 

In this example, we pass a \`xExtent={[0]}\` and \`yExtent={[0]}\` to set the lower bound of the xAxis and yAxis to zero, otherwise it would create an exent based on the minimum and maximum values on your  \`xAccessor\` and \`yAccessor\`. Your accessors can be a string key to access the property or a function.

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

XYFrame takes a \`customPointMark\` which allows you to render the points with custom logic. 

\`customPointMark={({ d }) => {
  return (
    <g>
      <circle r={rScale(d.grossWeekly)} stroke="white" />
      <text>{d.week}</text>
    </g>
  )
}}\`
`}
      />
      <DocumentFrame
        frameProps={customPointProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
        pre={`import { scaleSqrt } from "d3-scale"
        
const rScale = scaleSqrt()
  .domain([0, 16660516])
  .range([0, 25])`}
      />
      <MarkdownText
        text={`
## Scatterplot with Hover

Enabeling the \`hoverAnnotation={true}\` prop  gives you default tooltips based on the \`xAccessor\` and \`yAccessor\` values. You can override this default by passing a \`tooltipContent\` function, to learn more, see the [tooltips](/guides/tooltips) guide.
`}
      />
      <DocumentFrame
        frameProps={withHoverFrameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        startHidden
      />
    </div>
  )
}
