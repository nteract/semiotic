import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { lineData, scatterData, areaData, colors } from "../test-data.js"

const {
  LineChart,
  AreaChart,
  Scatterplot,
  BubbleChart
} = Semiotic

const TestCase = ({ title, children, testId, key }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: key || testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Basic Line Chart
  TestCase({
    title: "Line Chart",
    testId: "xy-line",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 2. Line Chart with Points
  TestCase({
    title: "Line Chart with Points",
    testId: "xy-line-points",
    children: React.createElement(LineChart, {
      data: lineData,
      xAccessor: "x",
      yAccessor: "value",
      lineBy: "series",
      colorBy: "series",
      showPoints: true,
      pointRadius: 4,
      curve: "monotoneX",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 3. Area Chart
  TestCase({
    title: "Area Chart",
    testId: "xy-area",
    children: React.createElement(AreaChart, {
      data: areaData,
      xAccessor: "x",
      yAccessor: "y",
      areaBy: "series",
      colorBy: "series",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 4. Scatter Plot
  TestCase({
    title: "Scatter Plot",
    testId: "xy-scatter",
    children: React.createElement(Scatterplot, {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 5,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 5. Bubble Chart
  TestCase({
    title: "Bubble Chart",
    testId: "xy-bubble",
    children: React.createElement(BubbleChart, {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      sizeBy: "size",
      colorBy: "category",
      sizeRange: [3, 20],
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 6. Line Chart with Fill Area
  TestCase({
    title: "Line with Fill Area",
    testId: "xy-line-fill",
    children: React.createElement(LineChart, {
      data: lineData.filter((d) => d.series === "A"),
      xAccessor: "x",
      yAccessor: "value",
      fillArea: true,
      areaOpacity: 0.3,
      curve: "monotoneX",
      width: 400,
      height: 300,
      colorScheme: colors
    })
  }),

  // 7. Scatter Plot with Hover
  TestCase({
    title: "Scatter with Hover",
    testId: "xy-scatter-hover",
    children: React.createElement(Scatterplot, {
      data: scatterData.slice(0, 20),
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "category",
      pointRadius: 6,
      enableHover: true,
      width: 400,
      height: 300,
      colorScheme: colors
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
