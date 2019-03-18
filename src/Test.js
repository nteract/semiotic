import React from "react"
import XYFrame from "semiotic/lib/XYFrame"
const frameProps = {
  lines: [
    {
      title: "Curve A",
      forecast: undefined,
      data: [
        { month: 1, pct: 100 },
        { month: 2, pct: 30 },
        { month: 3, pct: 25 },
        { month: 4, pct: 23 },
        { month: 5, pct: 22 },
        { month: 6, pct: 20 },
        { month: 7, pct: 24 },
        { month: 8, pct: 23 },
        { month: 9, pct: 24 },
        { month: 10, pct: 25 },
        { month: 11, pct: 20 },
        { month: 12, pct: 22 },
        { month: 13, pct: 21 },
        { month: 14, pct: 23 },
        { month: 15, pct: 21 },
        { month: 16 },
        { month: 17 },
        { month: 18 }
      ]
    },
    {
      title: "Curve A",
      forecast: "lower",
      data: [
        { month: 1 },
        { month: 2 },
        { month: 3 },
        { month: 4 },
        { month: 5 },
        { month: 6 },
        { month: 7 },
        { month: 8 },
        { month: 9 },
        { month: 10 },
        { month: 11 },
        { month: 12 },
        { month: 13 },
        { month: 14 },
        { month: 15, pct: 21 },
        { month: 16, pct: 18 },
        { month: 17, pct: 15 },
        { month: 18, pct: 10 }
      ]
    },
    {
      title: "Curve A",
      forecast: "mean",
      data: [
        { month: 1 },
        { month: 2 },
        { month: 3 },
        { month: 4 },
        { month: 5 },
        { month: 6 },
        { month: 7 },
        { month: 8 },
        { month: 9 },
        { month: 10 },
        { month: 11 },
        { month: 12 },
        { month: 13 },
        { month: 14 },
        { month: 15, pct: 21 },
        { month: 16, pct: 22 },
        { month: 17, pct: 23 },
        { month: 18, pct: 25 }
      ]
    },
    {
      title: "Curve A",
      forecast: "upper",
      data: [
        { month: 1 },
        { month: 2 },
        { month: 3 },
        { month: 4 },
        { month: 5 },
        { month: 6 },
        { month: 7 },
        { month: 8 },
        { month: 9 },
        { month: 10 },
        { month: 11 },
        { month: 12 },
        { month: 13 },
        { month: 14 },
        { month: 15, pct: 21 },
        { month: 16, pct: 25 },
        { month: 17, pct: 30 },
        { month: 18, pct: 38 }
      ]
    }
  ],
  size: [700, 400],
  margin: { left: 80, bottom: 50, right: 10, top: 40 },
  defined: function defined(d) {
    return d.pct !== undefined
  },
  xAccessor: "month",
  yAccessor: "pct",
  yExtent: [0, 100],
  xExtent: [0, 20],
  lineDataAccessor: "data",
  pointStyle: { fill: "none", stroke: "none" },
  lineStyle: d => {
    let baseStyles = { stroke: "#E0488B", strokeWidth: "3px" }
    if (!d.forecast) {
      return baseStyles
    } else if (d.forecast === "mean") {
      return { ...baseStyles, strokeDasharray: "5px" }
    } else {
      return { strokeWidth: "0px" }
    }
  },
  title: (
    <text textAnchor="middle">Uncertainty Visualization (Time Series)</text>
  ),
  axes: [
    {
      orient: "left",
      tickFormat: function tickFormat(d, i) {
        return i === 0 ? null : d + "%"
      },
      label: {
        name: "Decay (%)",
        position: { anchor: "middle" },
        locationDistance: 55
      }
    },
    {
      orient: "bottom",
      ticks: 10,
      tickFormat: function tickFormat(d, i) {
        return i === 0 ? "Months" : d
      }
    }
  ],
  showLinePoints: true,
  hoverAnnotation: true,
  annotations: [
    {
      type: "area",
      className: "uncertainty_cone",
      coordinates: [
        { month: 15, pct: 21 },
        { month: 16, pct: 18 },
        { month: 17, pct: 15 },
        { month: 18, pct: 10 },
        { month: 18, pct: 38 },
        { month: 17, pct: 30 },
        { month: 16, pct: 25 },
        { month: 15, pct: 21 }
      ]
    }
  ],
  tooltipContent: d => {
    let projectionString = null
    if (d.parentLine.forecast) {
      projectionString = (
        <div
          style={{ color: "#E0488B", fontWeight: "bold", marginBottom: "5px" }}
        >{`* ${d.parentLine.forecast} forecast *`}</div>
      )
    }
    return (
      <div
        style={{
          border: `thin solid ${"#E0488B"}`,
          backgroundColor: "white",
          width: "100px",
          textAlign: "center",
          padding: "10px",
          verticalAlign: "middle"
        }}
      >
        {projectionString}
        <div>{`Month: ${d.month}`}</div>
        <div>{`Decay: ${d.pct}%`}</div>
      </div>
    )
  }
}

export default () => {
  return <XYFrame {...frameProps} />
}
