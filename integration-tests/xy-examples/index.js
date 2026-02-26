import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { lineData, scatterData, areaData, colors } from "../test-data.js"

const { XYFrame } = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Basic Line Chart - SVG
  TestCase({
    title: "Line Chart - SVG",
    testId: "xy-line-svg",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      lines: [
        { coordinates: lineData.filter((d) => d.series === "A") },
        { coordinates: lineData.filter((d) => d.series === "B") }
      ],
      lineType: "line",
      xAccessor: "x",
      yAccessor: "value",
      lineStyle: (d, i) => ({ stroke: colors[i], strokeWidth: 2, fill: "none" }),
      axes: [
        { orient: "left" },
        { orient: "bottom" }
      ],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 2. Line Chart - Canvas
  TestCase({
    title: "Line Chart - Canvas",
    testId: "xy-line-canvas",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      lines: [
        { coordinates: lineData.filter((d) => d.series === "A") },
        { coordinates: lineData.filter((d) => d.series === "B") }
      ],
      lineType: "line",
      xAccessor: "x",
      yAccessor: "value",
      lineStyle: (d, i) => ({ stroke: colors[i], strokeWidth: 2, fill: "none" }),
      canvasLines: true,
      axes: [
        { orient: "left" },
        { orient: "bottom", tickFormat: (d) => d }
      ],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 3. Area Chart - SVG
  TestCase({
    title: "Area Chart - SVG",
    testId: "xy-area-svg",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      lines: [{ coordinates: areaData }],
      lineType: { type: "area", y1: (d) => d.y2 },
      xAccessor: "x",
      yAccessor: "y",
      lineStyle: { fill: colors[0], fillOpacity: 0.5, stroke: colors[1] },
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 4. Scatter Plot - SVG
  TestCase({
    title: "Scatter Plot - SVG",
    testId: "xy-scatter-svg",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      points: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      pointStyle: (d) => ({
        fill: colors[d.category === "A" ? 0 : d.category === "B" ? 1 : 2],
        r: 5
      }),
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 },
      hoverAnnotation: true
    })
  }),

  // 5. Scatter Plot - Canvas
  TestCase({
    title: "Scatter Plot - Canvas",
    testId: "xy-scatter-canvas",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      points: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      pointStyle: (d) => ({
        fill: colors[d.category === "A" ? 0 : d.category === "B" ? 1 : 2],
        r: 5
      }),
      canvasPoints: true,
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 6. Combo: Lines + Points - SVG
  TestCase({
    title: "Lines + Points - SVG",
    testId: "xy-combo-svg",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      lines: [{ coordinates: lineData.filter((d) => d.series === "A") }],
      points: lineData.filter((d) => d.series === "A"),
      lineType: "line",
      xAccessor: "x",
      yAccessor: "value",
      lineStyle: { stroke: colors[0], strokeWidth: 2, fill: "none" },
      pointStyle: { fill: colors[1], r: 4 },
      showLinePoints: true,
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 7. With Hover Interaction
  TestCase({
    title: "Scatter with Hover",
    testId: "xy-scatter-hover",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      points: scatterData.slice(0, 20),
      xAccessor: "x",
      yAccessor: "y",
      pointStyle: (d) => ({
        fill: colors[d.category === "A" ? 0 : d.category === "B" ? 1 : 2],
        r: 6
      }),
      hoverAnnotation: true,
      tooltipContent: (d) =>
        React.createElement(
          "div",
          { className: "tooltip-content", "data-testid": "tooltip-content" },
          `X: ${d.x.toFixed(1)}, Y: ${d.y.toFixed(1)}`
        ),
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  }),

  // 8. With Annotations
  TestCase({
    title: "Line with Annotations",
    testId: "xy-line-annotations",
    children: React.createElement(XYFrame, {
      size: [400, 300],
      lines: [{ coordinates: lineData.filter((d) => d.series === "A") }],
      lineType: "line",
      xAccessor: "x",
      yAccessor: "value",
      lineStyle: { stroke: colors[0], strokeWidth: 2, fill: "none" },
      annotations: [
        {
          type: "xy",
          x: 2,
          value: 12,
          note: { label: "Important Point" }
        }
      ],
      axes: [{ orient: "left" }, { orient: "bottom" }],
      margin: { left: 50, bottom: 50, right: 10, top: 10 }
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
