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
]

let annotations = [
  {
    type: "area",
    className: "uncertainty_cone",
    coordinates: linesData
      //Take only upper and lower datasets
      .filter(d => d.forecast && d.forecast !== "mean")
      //ensure lower data set comes before upper data set
      .sort((a, b) => {
        return ("" + a.forecast).localeCompare(b.forecast)
      })
      .map((d, i) => {
        //Ensure sorted month order (desc) and drop all non-forecasted values
        let tmpArr = d.data
          .sort((a, b) => a.month - b.month)
          .filter(x => x.pct !== undefined)
        //If we're switching from lower to upper, reverse the coordinates orders to close the uncertainty polygon
        if (i % 2 === 1) {
          tmpArr = tmpArr.reverse()
        }
        return tmpArr
        //Merge the two coordinate arrays into one to create final polygon
      })
      .flat()
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
  showLinePoints: true,
  pointStyle: { fill: "none", stroke: "none" },
  hoverAnnotation: true,
  xAccessor: "month",
  yAccessor: "pct",
  yExtent: [0, 100],
  defined: d => d.pct !== undefined,
  xExtent: [0, 20],
  margin: { left: 80, bottom: 50, right: 10, top: 40 },
  annotations: annotations,
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
        
This example stitches together four separate lines
        - Actual (Observed) Values
        - Mean Forecast +3 Months
        - Upper Forecast +σ
        - Lower Forecast -σ

... and uses [react-annotation](https://react-annotation.susielu.com/)'s [area](guides/annotations#xyframe) type to create the uncertainty cone, communicating the \`confidence interval\`
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
