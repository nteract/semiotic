import React from "react"
import DocumentFrame from "../DocumentFrame"
import { OrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"
const dotRadius = 8

const data = [
  { region: "Developed regions", y1990: 7.6, y2013: 3.4 },
  { region: "Developing regions", y1990: 36.4, y2013: 22 },
  { region: "Eastern Asia excluding China", y1990: 11.6, y2013: 7.5 },
  { region: "Eastern Asia", y1990: 24.5, y2013: 7.7 },
  { region: "Latin America and the Caribbean", y1990: 22.1, y2013: 9.2 },
  { region: "Northern Africa", y1990: 30, y2013: 13.3 },
  { region: "Western Asia", y1990: 27.5, y2013: 13.7 },
  { region: "South-eastern Asia", y1990: 27.4, y2013: 14.4 },
  { region: "Caucasus and Central Asia", y1990: 25.7, y2013: 14.8 },
  { region: "World", y1990: 33.3, y2013: 20 },
  { region: "Oceania", y1990: 26.3, y2013: 21.3 },
  { region: "Southern Asia", y1990: 50.6, y2013: 29.5 },
  { region: "Southern Asia excluding India", y1990: 49.3, y2013: 30.1 },
  { region: "Sub-Saharan Africa", y1990: 45.5, y2013: 31.1 }
]

const lineAnnotations = data.map(d => Object.assign({ type: "range" }, d))

function drawRange({ d, rScale, orFrameState }) {
  if (d.type === "range") {
    const start = rScale(d.y1990) + dotRadius
    const end = rScale(d.y2013) - dotRadius
    const y = orFrameState.projectedColumns[d.region].middle
    return (
      <line
        x1={start}
        x2={end}
        y1={y}
        y2={y}
        style={{ stroke: "black", strokeWidth: 2 }}
      />
    )
  }
  return null
}

const frameProps = {
  size: [700, 500],
  rAccessor: ["y1990", "y2013"],
  oAccessor: "region",
  projection: "horizontal",
  axis: { orient: "bottom", tickFormat: d => `${d}%` },
  type: { type: "point", r: dotRadius },
  rExtent: [0],
  invertR: true,
  oLabel: true,
  margin: { left: 235, top: 50, bottom: 40, right: 10 },
  oPadding: 10,
  data,
  annotations: lineAnnotations,
  svgAnnotationRules: drawRange,
  title: (
    <text textAnchor="middle">
      Neonatal Mortality Rate by Region from <tspan fill={theme[0]}>1990</tspan>{" "}
      to <tspan fill={theme[5]}>2013</tspan>
    </text>
  ),
  style: (d, i) => {
    return {
      fill: (i > 1 && (d.rIndex === 0 ? theme[0] : theme[5])) || "white",
      stroke: (i <= 1 && (d.rIndex === 0 ? theme[0] : theme[5])) || "white",
      strokeWidth: i <= 1 ? 3 : 1
    }
  }
}

const overrideProps = {
  style: `(d, i) => {
    return {
      fill: (i > 1 && (d.rIndex === 0 ? theme[0] : theme[5])) || "white",
      stroke: (i <= 1 && (d.rIndex === 0 ? theme[0] : theme[5])) || "white",
      strokeWidth: i <= 1 ? 3 : 1
    }
  }`,
  title: `(
    <text textAnchor="middle">
      Neonatal Mortality Rate by Region from <tspan fill={theme[0]}>1990</tspan>{" "}
      to <tspan fill={theme[5]}>2013</tspan>
    </text>
  )`,
  svgAnnotationRules: `({ d, rScale, orFrameState }) => {
    if (d.type === "range") {
      const start = rScale(d.y1990) + dotRadius
      const end = rScale(d.y2013) - dotRadius
      const y = orFrameState.projectedColumns[d.region].middle
      return (
        <line
          x1={start}
          x2={end}
          y1={y}
          y2={y}
          style={{ stroke: "black", strokeWidth: 2 }}
        />
      )
    }
    return null
  }
  `
}

const DotPlot = () => {
  return (
    <div>
      <MarkdownText
        text={`

The Dot Plot compares changes between two values across categories. The initial data array was converted into an array of points with a start and end value, which are connected with a custom \`svgAnnotationRules\`, go to [custom annotation rules](/guides/annotations#custom-annotation-rules) for details.

Because annotations are drawn on top of the visualization layer, we need to account for the size of each dot in where we draw the lines so they don't overlap. We also adjust the labels to line up with the dots.

This data is from [Unicef](https://data.unicef.org/topic/child-survival/neonatal-mortality/).

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={OrdinalFrame}
        pre={`const dotRadius = 8`}
        useExpanded
      />
    </div>
  )
}

export default DotPlot
