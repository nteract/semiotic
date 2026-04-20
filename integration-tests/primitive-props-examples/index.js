// Primitive-props matrix for Phase B.
//
// Three representative chart types — BarChart (rect primitive), Scatterplot
// (circle primitive), LineChart (line primitive) — each in three states:
//   1. default — no primitive props set
//   2. stroked — `stroke="var(--semiotic-border)" strokeWidth={1}`
//   3. translucent — `opacity={0.4}`
//
// Nine fixtures total, one per (chart × state). The matrix proves that the
// top-level `stroke` / `strokeWidth` / `opacity` props on BaseChartProps
// reach every primitive consistently, and that CSS-var values flow through
// the merge chain to the canvas.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const { BarChart, Scatterplot, LineChart, ThemeProvider } = Semiotic

// ── Deterministic data ─────────────────────────────────────────────────────

const barData = [
  { cat: "A", value: 30 },
  { cat: "B", value: 45 },
  { cat: "C", value: 22 },
  { cat: "D", value: 38 },
  { cat: "E", value: 58 },
]

const scatterData = Array.from({ length: 24 }, (_, i) => ({
  x: ((i * 7 + 13) % 97),
  y: ((i * 11 + 23) % 89),
  cat: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
}))

const lineData = Array.from({ length: 12 }, (_, i) => ({ x: i, y: 20 + Math.sin(i * 0.6) * 10 }))

// ── Shared chart props ─────────────────────────────────────────────────────

const commonSize = { width: 420, height: 200 }

const barProps = {
  data: barData,
  categoryAccessor: "cat",
  valueAccessor: "value",
  showLegend: false,
  tooltip: false,
  ...commonSize,
}
const scatterProps = {
  data: scatterData,
  xAccessor: "x",
  yAccessor: "y",
  colorBy: "cat",
  colorScheme: ["#4e79a7", "#f28e2c", "#59a14f"],
  showLegend: false,
  tooltip: false,
  ...commonSize,
}
const lineProps = {
  data: lineData,
  xAccessor: "x",
  yAccessor: "y",
  showLegend: false,
  tooltip: false,
  ...commonSize,
}

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

// ThemeProvider so `var(--semiotic-border)` resolves (light preset by default).
function Themed({ children }) {
  return React.createElement(ThemeProvider, { theme: "light" }, children)
}

function App() {
  return React.createElement(
    "div",
    null,
    // ── Bars ──────────────────────────────────────────────────────────────
    React.createElement(
      TestCase,
      { title: "bar — default", testId: "bar-default" },
      React.createElement(Themed, null, React.createElement(BarChart, barProps))
    ),
    React.createElement(
      TestCase,
      { title: "bar — stroke + strokeWidth", testId: "bar-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(BarChart, {
          ...barProps,
          stroke: "var(--semiotic-border)",
          strokeWidth: 1,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "bar — opacity 0.4", testId: "bar-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(BarChart, { ...barProps, opacity: 0.4 })
      )
    ),

    // ── Scatter ───────────────────────────────────────────────────────────
    React.createElement(
      TestCase,
      { title: "scatter — default", testId: "scatter-default" },
      React.createElement(Themed, null, React.createElement(Scatterplot, scatterProps))
    ),
    React.createElement(
      TestCase,
      { title: "scatter — stroke + strokeWidth", testId: "scatter-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(Scatterplot, {
          ...scatterProps,
          stroke: "var(--semiotic-border)",
          strokeWidth: 1,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "scatter — opacity 0.4", testId: "scatter-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(Scatterplot, { ...scatterProps, opacity: 0.4 })
      )
    ),

    // ── Line ──────────────────────────────────────────────────────────────
    React.createElement(
      TestCase,
      { title: "line — default", testId: "line-default" },
      React.createElement(Themed, null, React.createElement(LineChart, lineProps))
    ),
    React.createElement(
      TestCase,
      { title: "line — strokeWidth override", testId: "line-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(LineChart, {
          ...lineProps,
          stroke: "var(--semiotic-danger)",
          strokeWidth: 3,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "line — opacity 0.4", testId: "line-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(LineChart, { ...lineProps, opacity: 0.4 })
      )
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
