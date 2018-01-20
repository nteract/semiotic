import React from "react"
import { data } from "../sampledata/verticality"
import { csvParse } from "d3-dsv"
import { XYFrame } from "../../components"
import { Mark } from "semiotic-mark"
import ProcessViz from "./ProcessViz"

const groupedData = []
const groupHash = {}
const colors = [
  "#007190",
  "#00a2ce",
  "#d38779",
  "#b3331d",
  "rgb(77, 67, 12)",
  "rgb(182, 167, 86)"
]

csvParse(data).forEach(d => {
  const point = {
    x: +d.x,
    y: +d.y,
    show_title_id: d.show_title_id,
    hood: +d.hood
  }
  if (!groupHash[d.hood]) {
    groupHash[d.hood] = {
      key: d.hood,
      coordinates: [],
      color: colors[+d.hood % 6]
    }
    groupedData.push(groupHash[d.hood])
  }
  groupHash[d.hood].coordinates.push(point)
})

const neighborhoodMapChart = {
  areas: groupedData,
  lineDataAccessor: "d",
  showLinePoints: true,
  xAccessor: "x",
  yAccessor: "y",
  areaStyle: d => ({
    stroke: "none",
    fill: d.parentArea.color,
    opacity: 0.25
  }),
  pointStyle: d => ({
    stroke: colors[d.hood % 6],
    strokeOpacity: 0,
    fill: colors[d.hood % 6]
  }),
  customPointMark: () => <Mark markType="circle" r="1" />,
  canvasPoints: true,
  hoverAnnotation: true,
  tooltipContent: d => <div className="tooltip-content">{d.hood}</div>,
  areaType: {
    type: "contour",
    thresholds: 4,
    bandwidth: 5,
    neighborhood: true
  }
}

export default (
  <div>
    <ProcessViz frameSettings={neighborhoodMapChart} frameType="XYFrame" />
    <XYFrame {...neighborhoodMapChart} />
  </div>
)
