import * as React from "react"
import { data } from "../sampledata/verticality"
import { csvParse } from "d3-dsv"
import { XYFrame } from "../../components"
import Mark from "../../components/Mark/Mark"

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

const parsedPoints = []
const annotationData = []
csvParse(data).forEach((d, i) => {
  const point = {
    posx: +d.x,
    posy: +d.y,
    hood: +d.hood
  }
  parsedPoints.push(point)
  if (!groupHash[d.hood]) {
    groupHash[d.hood] = {
      key: d.hood,
      coordinates: [],
      color: colors[+d.hood % 6]
    }
    groupedData.push(groupHash[d.hood])
  }
  groupHash[d.hood].coordinates.push(point)
  if (i % 4 === 0) {
    annotationData.push(
      Object.assign({}, point, {
        type: "react-annotation",
        dx: 0,
        dy: 0,
        note: (
          <g>
            <circle r={5} />
            <text fill="purple">annotationData.length + 1</text>
          </g>
        ),
        label: `Note ${annotationData.length + 1}`,
        color: colors[+d.hood % 6],
        noteHeight: (d) => {
          return d.hood === 98 || d.hood === 113 ? 50 : 20
        },
        noteWidth: (d) => {
          return d.hood === 98 || d.hood === 113 ? 100 : 200
        }
      })
    )
  }
})

annotationData.push({
  type: "enclose-hull",
  coordinates: parsedPoints.filter((d) => d.hood === 98),
  label: "Hull Annotation"
})

const neighborhoodMapChart = {
  size: [700, 700],
  summaries: groupedData,
  lineDataAccessor: "d",
  showLinePoints: true,
  xAccessor: "posx",
  yAccessor: "posy",
  summaryStyle: (d) => ({
    stroke: "none",
    fill: d.parentSummary.color,
    opacity: 0.25
  }),
  pointStyle: (d) => ({
    stroke: colors[d.hood % 6],
    strokeOpacity: 1,
    fill: colors[d.hood % 6]
  }),
  annotationSettings: {
    layout: {
      type: "marginalia",
      orient: "nearest",
      characterWidth: 8,
      lineWidth: 20,
      padding: 2,
      iterations: 1000,
      pointSizeFunction: () => 2,
      noteHeight: 100,
      noteWidth: 200
    }
  },
  customPointMark: () => <Mark markType="circle" r="1" />,
  hoverAnnotation: true,
  annotations: annotationData,
  tooltipContent: (d) => <div className="tooltip-content">{d.hood}</div>,
  summaryType: {
    type: "contour",
    thresholds: 4,
    bandwidth: 5,
    neighborhood: true
  },
  margin: 150,
  axes: [
    { orient: "bottom", marginalSummaryType: "violin" },
    { orient: "left", marginalSummaryType: "ridgeline" },
    { orient: "right", marginalSummaryType: "boxplot" },
    { orient: "top", marginalSummaryType: "histogram" }
  ]
}

export default <XYFrame {...neighborhoodMapChart} />
