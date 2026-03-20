import React from "react"
import DocumentFrame from "../DocumentFrame"
import { StreamXYFrame } from "semiotic"
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

// Flatten line data, carrying parent line fields onto each datum
const flatData = linesData.flatMap((line) =>
  line.data.map(d => ({
    ...d,
    lineGroup: `${line.title}_${line.forecast || "actual"}`,
    forecast: line.forecast
  }))
)

const frameProps = {
  chartType: "line",
  title: "Uncertainty Visualization (Time Series)",
  size: [700, 400],
  data: flatData,
  groupAccessor: "lineGroup",
  xAccessor: "month",
  yAccessor: "pct",
  yExtent: [0, 100],
  xExtent: [0, 20],
  boundsAccessor: d => d.uncertainty || 0,
  boundsStyle: {
    fill: theme[1],
    fillOpacity: 0.15,
    stroke: "none"
  },
  lineStyle: (d) => {
    const baseStyles = { stroke: theme[1], strokeWidth: 3 }
    if (!d.forecast) {
      return baseStyles
    } else if (d.forecast === "mean") {
      return { ...baseStyles, strokeDasharray: "5" }
    } else {
      return { stroke: "none", strokeWidth: 0 }
    }
  },
  showAxes: true,
  enableHover: true,
  xLabel: "Months",
  yLabel: "Decay (%)",
  yFormat: d => `${d}%`,
  margin: { left: 80, bottom: 50, right: 10, top: 40 },
  tooltipContent: d => {
    const datum = d.data || {}
    const isForecast = datum.forecast === "mean"
    return (
      <div
        style={{
          border: `thin solid ${theme[1]}`,
          backgroundColor: "var(--surface-1, #f8f9fa)",
          color: "var(--text-primary, #1a1a2e)",
          width: "100px",
          textAlign: "center",
          padding: "10px",
          verticalAlign: "middle"
        }}
      >
        {isForecast && (
          <div
            style={{ color: theme[1], fontWeight: "bold", marginBottom: "5px" }}
          >{`* mean forecast *`}</div>
        )}
        <div>{`Month: ${datum.month}`}</div>
        <div>{`Decay: ${datum.pct}%`}</div>
      </div>
    )
  }
}

const overrideProps = {
  lineStyle: `(d) => {
    const baseStyles = { stroke: theme[1], strokeWidth: 3 }
    if (!d.forecast) {
      return baseStyles
    } else if (d.forecast === "mean") {
      return { ...baseStyles, strokeDasharray: "5" }
    } else {
      return { stroke: "none", strokeWidth: 0 }
    }
  }`,
  title: `"Uncertainty Visualization (Time Series)"`,
  boundsAccessor: `d => d.uncertainty || 0`,
  boundsStyle: `{
    fill: theme[1],
    fillOpacity: 0.15,
    stroke: "none"
  }`,
  tooltipContent: `d => {
    const datum = d.data || {}
    const isForecast = datum.forecast === "mean"
    return (
      <div
        style={{
          border: \`thin solid \${theme[1]}\`,
          backgroundColor: "var(--surface-1, #f8f9fa)",
          color: "var(--text-primary, #1a1a2e)",
          width: "100px",
          textAlign: "center",
          padding: "10px"
        }}
      >
        {isForecast && (
          <div style={{ color: theme[1], fontWeight: "bold", marginBottom: "5px" }}>
            * mean forecast *
          </div>
        )}
        <div>{\`Month: \${datum.month}\`}</div>
        <div>{\`Decay: \${datum.pct}%\`}</div>
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

... and uses the \`boundsAccessor\` prop to create the uncertainty cone, communicating the \`confidence interval\`
        `}
      />
      <DocumentFrame
        frameProps={frameProps}
        type={StreamXYFrame}
        overrideProps={overrideProps}
        useExpanded
        pre={``}
      />
    </div>
  )
}

export default UncertaintyViz
