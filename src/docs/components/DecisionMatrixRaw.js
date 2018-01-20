import React from "react"
import { scaleLinear } from "d3-scale"
import { extent } from "d3-array"
import { forceSimulation, forceX, forceY, forceCollide } from "d3-force"
import { Mark } from "semiotic-mark"
import { MATRIX_DATA } from "../sampledata/matrixData"
import { XYFrame } from "../../components"
import ProcessViz from "./ProcessViz"
/*
  <div>
    <ProcessViz frameSettings={regionatedLineChart} frameType="XYFrame" />
    <XYFrame {...regionatedLineChart} />
  </div>
*/

const speedLabels = ["6 Weeks", "3 Months", "6 Months", "1 Year", "2 Years"]
const expenseLabels = ["$1K", "$10K", "$100K", "$1M", "$10M"]
const MIN_RADIUS = 10
const MAX_RADIUS = 35

//Define dpilicate axes, visible on non-integer values, hidden (with labels) on integer values
const axes = [
  {
    key: "yAxis",
    orient: "left",
    className: "showingTickLine",
    label: {
      name: "←  Expense  →",
      position: {
        anchor: "middle"
      },
      locationDistance: 70
    },
    tickValues: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
    tickFormat: d => {
      return ""
    }
  },
  {
    key: "xAxis",
    orient: "bottom",
    className: "showingTickLine",
    label: {
      name: "←  Delivery Speed  →",
      position: {
        anchor: "middle"
      },
      locationDistance: 60
    },
    tickValues: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
    tickFormat: (d, i) => {
      return ""
    }
  },
  {
    key: "yAxis_labs",
    orient: "left",
    className: "hiddenTickLine",
    tickValues: [1, 2, 3, 4, 5],
    tickFormat: d => {
      return expenseLabels[d - 1]
    }
  },
  {
    key: "xAxis_labs",
    orient: "bottom",
    className: "hiddenTickLine",
    tickValues: [1, 2, 3, 4, 5],
    tickFormat: d => {
      return speedLabels[d - 1]
    }
  }
]

function processData(data, sizeBy) {
  //Augment data with radius size, subject to scale
  const scale = scaleLinear()
    .domain(
      extent(
        data.map(d => {
          return +d[sizeBy]
        })
      )
    )
    .range([MIN_RADIUS, MAX_RADIUS])

  data = data.map((d, i) => {
    d.radius = sizeBy === "None" ? 10 : scale(+d[sizeBy])
    return d
  })

  //Jitter the points so they dont collide with one another when xy values are similar
  //Copied From: https://bl.ocks.org/mbostock/6526445e2b44303eebf21da3b6627320
  const simulation = forceSimulation(data)
    .force(
      "x",
      forceX(d => {
        return +d.Timeline
      }).strength(1)
    )
    .force(
      "y",
      forceY(d => {
        return +d.Cost
      }).strength(1)
    )
    .force(
      "collide",
      forceCollide(d => {
        return d.radius / 100
      })
    )
    .stop()

  for (var i = 0; i < 120; ++i) simulation.tick()

  return data
}

function fetchTooltipContent(d) {
  return [
    <div key={"title"} id="tooltip_title">{`Vendor: ${d.Vendor}`}</div>,
    <div key={"metrics"} id="tooltip_metrics">
      <div>
        <b>Previous Contracts: </b>
        <span>{d["Previous Contracts"]}</span>
      </div>
      <div>
        <b>Number Of Employees: </b>
        <span>{d["Number of Employees"]}</span>
      </div>
    </div>
  ]
}

export default function DecisionMatrixRaw(sizeBy) {
  return (
    <div className="matrixWrapper">
      <XYFrame
        size={[750, 550]}
        margin={{ top: 10, right: 80, bottom: 80, left: 100 }}
        name={"Decision Matrix"}
        className="decisionMatrix"
        points={processData(MATRIX_DATA, sizeBy)}
        pointStyle={d => {
          return { fill: "white", stroke: "black", strokeWidth: "3px" }
        }}
        customPointMark={({ d }) => {
          return <Mark markType="circle" r={d.radius} />
        }}
        renderKey={d => {
          return d["Index"]
        }}
        axes={axes}
        xAccessor={d => d.x}
        yAccessor={d => d.y}
        xExtent={[0.5, 5.5]}
        yExtent={[0.5, 5.5]}
        backgroundGraphics={
          <rect
            fill={"url(#gradient)"}
            x={100}
            y={10}
            width={570}
            height={460}
          />
        }
        additionalDefs={
          //Linear Gradient gives stoplight color zones to encode desirability
          <linearGradient id="gradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="10%" stopColor="green" stopOpacity={0.3} />
            <stop offset="50%" stopColor="gold" stopOpacity={0.3} />
            <stop offset="90%" stopColor="red" stopOpacity={0.3} />
          </linearGradient>
        }
        hoverAnnotation={true}
        tooltipContent={d => {
          return fetchTooltipContent(d)
        }}
      />
    </div>
  )
}
