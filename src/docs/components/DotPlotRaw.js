import * as React from "react"
import { OrdinalFrame, XYFrame } from "../../components"

const dotRadius = 8

const baseData = [
  { region: "Developed regions", y1990: 7.6, y2013: 3.4 },
  { region: "Developing regions", y1990: 36.4, y2013: 22 },
  { region: "Northern Africa", y1990: 30, y2013: 13.3 },
  { region: "Sub-Saharan Africa", y1990: 45.5, y2013: 31.1 },
  { region: "Latin America and the Caribbean", y1990: 22.1, y2013: 9.2 },
  { region: "Caucasus and Central Asia", y1990: 25.7, y2013: 14.8 },
  { region: "Eastern Asia", y1990: 24.5, y2013: 7.7 },
  { region: "Eastern Asia excluding China", y1990: 11.6, y2013: 7.5 },
  { region: "Southern Asia", y1990: 50.6, y2013: 29.5 },
  { region: "Southern Asia excluding India", y1990: 49.3, y2013: 30.1 },
  { region: "South-eastern Asia", y1990: 27.4, y2013: 14.4 },
  { region: "Western Asia", y1990: 27.5, y2013: 13.7 },
  { region: "Oceania", y1990: 26.3, y2013: 21.3 },
  { region: "World", y1990: 33.3, y2013: 20 }
]

const lineAnnotations = baseData.map((d) => Object.assign({ type: "range" }, d))
lineAnnotations.push({
  type: "category",
  categories: [
    "Caucasus and Central Asia",
    "Eastern Asia",
    "Eastern Asia excluding China",
    "Southern Asia",
    "Southern Asia excluding India",
    "South-eastern Asia",
    "Western Asia"
  ],
  label: "Asia",
  position: "right",
  offset: 15,
  depth: 10,
  padding: 0
})
function drawRange({ d, rScale, orFrameState }) {
  if (d.type === "range") {
    const start = rScale(d.y1990) - dotRadius
    const end = rScale(d.y2013) + dotRadius
    const y = orFrameState.projectedColumns[d.region].middle
    return (
      <line
        key={`connector-${d.region}`}
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
const data = [
  ...baseData.map((d) => ({ region: d.region, type: "y1990", value: d.y1990 })),
  ...baseData.map((d) => ({ region: d.region, type: "y2013", value: d.y2013 }))
]

const colors = {
  y1990: "#00a2ce",
  y2013: "#4d430c"
}

const dotPlotChart = {
  title: "Neonatal Mortality Rate by Region",
  size: [700, 200],
  data: data,
  rAccessor: "value",
  oAccessor: "region",
  style: (d) => ({ fill: colors[d.type], stroke: "white", strokeWidth: 1 }),
  type: { type: "point", r: dotRadius },
  projection: "horizontal",
  axes: {
    orient: "bottom",
    tickFormat: (d) => `${d}%`,
    marginalSummaryType: "ridgeline"
  },
  margin: { left: 215, top: 50, bottom: 40, right: 70 },
  oPadding: 10,
  pixelColumnWidth: 30,
  svgAnnotationRules: drawRange,
  annotations: lineAnnotations,
  pieceHoverAnnotation: true,
  oLabel: (d) => (
    <text style={{ textAnchor: "end" }} transform="translate(-15,6)">
      {d}
    </text>
  )
}

const somePointData = [
  { day: 1, date: "2017-01-01", value: 180 },
  { day: 2, date: "2017-02-01", value: 80 },
  { day: 3, date: "2017-03-14", value: 0 },
  { day: 4, date: "2017-06-20", value: 20 }
]

export default (
  <div>
    <XYFrame
      title={"test title"}
      points={somePointData}
      lines={[
        { label: "points", coordinates: somePointData },
        { label: "otherpoints", coordinates: somePointData }
      ]}
      summaries={[{ label: "summaries", coordinates: somePointData }]}
      xExtent={{
        onChange: (d) => {
          returnedExtent = d
        }
      }}
      xAccessor="day"
      yAccessor="value"
      disableContext={true}
      showLinePoints={true}
      showSummaryPoints={true}
      hoverAnnotation={true}
      axes={[{ orient: "left" }, { orient: "bottom" }]}
    />
    <OrdinalFrame {...dotPlotChart} />
    <OrdinalFrame {...dotPlotChart} margin={200} />
  </div>
)
