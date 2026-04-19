import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const { StreamXYFrame, BarChart, LineChart } = Semiotic

// Two charts exercise the bug surface:
//   • StreamXYFrame directly with a function-form backgroundGraphics
//     (mirrors cookbook/homerun-map + /theming/styling live example).
//   • BarChart (HOC over StreamOrdinalFrame) with static backgroundGraphics
//     passed through frameProps.
//
// Each background includes a distinctive magenta rectangle + a <text>
// marker the spec checks for. Before the fix, the canvas painted
// `--semiotic-bg` across its full area, hiding both. After the fix,
// canvas clears to transparent when backgroundGraphics is set, so the
// SVG shows through.

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

const xyData = [
  { id: "line", coordinates: Array.from({ length: 12 }, (_, i) => ({ x: i, y: 10 + Math.sin(i * 0.5) * 4 })) },
]
const barData = [
  { cat: "A", value: 30 },
  { cat: "B", value: 45 },
  { cat: "C", value: 22 },
  { cat: "D", value: 38 },
]

const xyBg = ({ size, margin }) => {
  const w = size[0] - margin.left - margin.right
  const h = size[1] - margin.top - margin.bottom
  return React.createElement(
    "g",
    null,
    React.createElement("rect", {
      "data-testid": "bg-marker-xy",
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "#ff00aa",
    }),
    React.createElement(
      "text",
      { x: 10, y: 20, fill: "#ffffff", fontSize: 12, "data-testid": "bg-text-xy" },
      "XY-BG-OK"
    )
  )
}

const barBg = ({ size, margin }) => {
  const w = size[0] - margin.left - margin.right
  const h = size[1] - margin.top - margin.bottom
  return React.createElement(
    "g",
    null,
    React.createElement("rect", {
      "data-testid": "bg-marker-bar",
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill: "#00ff88",
    }),
    React.createElement(
      "text",
      { x: 10, y: 20, fill: "#000000", fontSize: 12, "data-testid": "bg-text-bar" },
      "BAR-BG-OK"
    )
  )
}

function App() {
  return React.createElement(
    "div",
    { className: "test-grid" },
    React.createElement(
      TestCase,
      { title: "StreamXYFrame line with backgroundGraphics", testId: "xy-background" },
      React.createElement(StreamXYFrame, {
        lines: xyData,
        lineDataAccessor: "coordinates",
        chartType: "line",
        xAccessor: "x",
        yAccessor: "y",
        size: [400, 260],
        margin: { top: 30, bottom: 40, left: 50, right: 20 },
        lineStyle: () => ({ stroke: "#222", strokeWidth: 2 }),
        backgroundGraphics: xyBg,
        showAxes: true,
      })
    ),
    React.createElement(
      TestCase,
      { title: "BarChart with frameProps.backgroundGraphics", testId: "bar-background" },
      React.createElement(BarChart, {
        data: barData,
        categoryAccessor: "cat",
        valueAccessor: "value",
        width: 400,
        height: 260,
        margin: { top: 30, bottom: 40, left: 50, right: 20 },
        frameProps: {
          backgroundGraphics: barBg,
        },
      })
    ),
    React.createElement(
      TestCase,
      { title: "LineChart HOC with frameProps.backgroundGraphics", testId: "linechart-background" },
      React.createElement(LineChart, {
        data: [
          { month: 1, value: 10 },
          { month: 2, value: 18 },
          { month: 3, value: 12 },
          { month: 4, value: 22 },
          { month: 5, value: 19 },
          { month: 6, value: 28 },
        ],
        xAccessor: "month",
        yAccessor: "value",
        width: 400,
        height: 260,
        margin: { top: 30, bottom: 40, left: 50, right: 20 },
        frameProps: {
          backgroundGraphics: xyBg,
        },
      })
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
