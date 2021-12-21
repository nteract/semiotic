import React from "react"
import DocumentFrame from "../DocumentFrame"
import { XYFrame } from "semiotic"
import theme from "../theme"
import MarkdownText from "../MarkdownText"

const linesData = [
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
      { month: 15, pct: 21 }
    ]
  },
  {
    title: "Curve A",
    forecast: "mean",
    data: [
      { month: 15, pct: 21, uncertainty: 0 },
      { month: 16, pct: 22, uncertainty: 3 },
      { month: 17, pct: 23, uncertainty: 7 },
      { month: 18, pct: 25, uncertainty: 13 }
    ]
  }
]

const frameProps = {
  title: (
    <text textAnchor="middle">Uncertainty Visualization (Time Series)</text>
  ),
  size: [700, 400],
  lines: linesData,
  lineDataAccessor: "data",
  lineStyle: d => {
    let baseStyles = { stroke: theme[1], strokeWidth: "3px" }
    if (!d.forecast) {
      return baseStyles
    } else if (d.forecast === "mean") {
      return { ...baseStyles, strokeDasharray: "5px" }
    } else {
      return { strokeWidth: "0px" }
    }
  },
  summaryType: { type: "linebounds", boundingAccessor: d => d.uncertainty || 0 },
  summaryDataAccessor: "data",
  summaryClass: "uncertainty_cone",
  showLinePoints: true,
  pointStyle: { fill: "none", stroke: "none" },
  hoverAnnotation: true,
  xAccessor: "month",
  yAccessor: "pct",
  yExtent: [0, 100],
  defined: d => d.pct !== undefined,
  xExtent: [0, 20],
  margin: { left: 80, bottom: 50, right: 10, top: 40 },
  axes: [
    {
      orient: "left",
      tickFormat: (d, i) => {
        return i === 0 ? null : `${d}%`
      },
      label: {
        name: "Decay (%)",
        position: {
          anchor: "middle"
        },
        locationDistance: 55
      }
    },
    {
      orient: "bottom",
      ticks: 10,
      tickFormat: (d, i) => {
        return i === 0 ? "Months" : d
      }
    }
  ],
  tooltipContent: d => {
    let projectionString = null
    if (d.parentLine.forecast) {
      projectionString = (
        <div
          style={{ color: theme[1], fontWeight: "bold", marginBottom: "5px" }}
        >{`* ${d.parentLine.forecast} forecast *`}</div>
      )
    }
    return (
      <div
        style={{
          border: `thin solid ${theme[1]}`,
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

const overrideProps = {
  lineStyle: `d => {
    let baseStyles = { stroke: theme[1], strokeWidth: "3px" }
    if (!d.forecast) {
      return baseStyles
    } else if (d.forecast === "mean") {
      return { ...baseStyles, strokeDasharray: "5px" }
    } else {
      return { strokeWidth: "0px" }
    }
  }`,
  title: `(
    <text textAnchor="middle">Uncertainty Visualization (Time Series)</text>
  )`,
  tooltipContent: ` d => {
    let projectionString = null
    if (d.parentLine.forecast) {
      projectionString = (
        <div
          style={{ color: theme[1], fontWeight: "bold", marginBottom: "5px" }}
        >{\`* \${d.parentLine.forecast} forecast *\`}</div>
      )
    }
    return (
      <div
        style={{
          border: \`thin solid \${theme[1]}\`,
          backgroundColor: "white",
          width: "100px",
          textAlign: "center",
          padding: "10px",
          verticalAlign: "middle"
        }}
      >
        {projectionString}
        <div>{\`Month: \${d.month}\`}</div>
        <div>{\`Decay: \${d.pct}%\`}</div>
      </div>
    )
  }`
}

const UncertaintyViz = () => {
  return (
    <div>
      <MarkdownText
        text={`If you find yourself visualizing forecasts for time series data, the below example can help you communicate the \`forecast\`, as well as it's \`confidence interval\`
        
This example stitches together two separate lines
        - Actual (Observed) Values
        - Mean Forecast +3 Months with certainty values

... and uses the linebounds summaryType to create the uncertainty cone, communicating the \`confidence interval\`
        `}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={XYFrame}
        overrideProps={overrideProps}
        useExpanded
        pre={``}
      />
    </div>
  )
}

export default UncertaintyViz
