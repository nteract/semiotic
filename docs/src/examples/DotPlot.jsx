import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamOrdinalFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

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

const color1990 = theme[0]
const color2013 = theme[5]

const frameProps = {
  size: [700, 500],
  rAccessor: ["y1990", "y2013"],
  oAccessor: "region",
  projection: "horizontal",
  showAxes: true,
  chartType: "point",
  multiAxis: false,
  rExtent: [0, undefined],
  oLabel: true,
  margin: { left: 235, top: 50, bottom: 40, right: 10 },
  barPadding: 10,
  data,
  title: "Neonatal Mortality Rate by Region from 1990 to 2013",
  connectorAccessor: d => d.region,
  connectorStyle: d => ({
    stroke: d.y1990 > d.y2013 ? "#28a745" : "#dc3545",
    strokeWidth: 2,
    opacity: 0.4
  }),
  pieceStyle: d => ({
    fill: d.__rIndex === 0 ? color1990 : color2013,
    r: 8,
  }),
  enableHover: true,
  tooltipContent: d => {
    const datum = d.data || d
    const year = datum.__rIndex === 0 ? "1990" : "2013"
    const value = datum.__rValue != null ? datum.__rValue : ""
    return (
      <div className="tooltip-content" style={{ background: "rgba(0,0,0,0.85)", color: "white", padding: "6px 10px", borderRadius: 4, fontSize: 13 }}>
        <div style={{ fontWeight: "bold" }}>{datum.region}</div>
        <div>{year}: {typeof value === "number" ? value.toFixed(1) : value}%</div>
      </div>
    )
  }
}

const overrideProps = {
  pieceStyle: `d => ({
    fill: d.__rIndex === 0 ? "${color1990}" : "${color2013}",
    r: 8,
  })`,
  connectorStyle: `d => ({
    stroke: d.y1990 > d.y2013 ? "#28a745" : "#dc3545",
    strokeWidth: 2,
    opacity: 0.4
  })`,
  tooltipContent: `d => {
    const datum = d.data || d
    const year = datum.__rIndex === 0 ? "1990" : "2013"
    const value = datum.__rValue
    return (
      <div className="tooltip-content">
        <div>{datum.region}</div>
        <div>{year}: {value?.toFixed(1)}%</div>
      </div>
    )
  }`
}

const DotPlot = () => {
  return (
    <div>
      <MarkdownText
        text={`

The Dot Plot compares changes between two values across categories. Each region has two dots — <span style="color: ${color1990}">●</span> 1990 and <span style="color: ${color2013}">●</span> 2013 — connected by a line colored by whether the rate improved (green) or worsened (red).

This data is from [Unicef](https://data.unicef.org/topic/child-survival/neonatal-mortality/).

`}
      />
      <DocumentFrame
        frameProps={frameProps}
        overrideProps={overrideProps}
        type={StreamOrdinalFrame}
        useExpanded
      />
    </div>
  )
}

export default DotPlot
