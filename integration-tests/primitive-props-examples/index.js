// Primitive-props matrix for Phase B.
//
// Six representative chart types covering each primitive family:
//   • BarChart          — rect primitive (XY)
//   • Scatterplot       — circle primitive (XY)
//   • LineChart         — line primitive (XY)
//   • BoxPlot           — summary primitive (ordinal)
//   • SankeyDiagram     — node rect + edge bezier (network)
//   • RealtimeLineChart — streaming line with lineStyle.opacity (realtime)
//
// Each chart is rendered in three states:
//   1. default — no primitive props set
//   2. stroked — `stroke="var(--semiotic-border)" strokeWidth={1}`
//   3. translucent — `opacity={0.4}`
//
// Eighteen fixtures total. Proves the top-level `stroke` / `strokeWidth` /
// `opacity` props on BaseChartProps reach every primitive consistently, and
// that CSS-var values flow through the merge chain to the canvas.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  BarChart,
  Scatterplot,
  LineChart,
  BoxPlot,
  SankeyDiagram,
  RealtimeLineChart,
  ThemeProvider,
} = Semiotic

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

// Deterministic boxplot: three categories with hand-picked values so Q1/median/Q3 are stable.
const boxData = [
  ...[10, 14, 18, 22, 26, 30, 34, 38, 42, 46].map(v => ({ cat: "A", value: v })),
  ...[20, 24, 28, 32, 36, 40, 44, 48, 52, 56].map(v => ({ cat: "B", value: v })),
  ...[ 5,  9, 13, 17, 21, 25, 29, 33, 37, 41].map(v => ({ cat: "C", value: v })),
]

// Sankey with a deterministic three-node chain: A→B→C plus A→C.
const sankeyEdges = [
  { source: "A", target: "B", value: 10 },
  { source: "B", target: "C", value: 6 },
  { source: "A", target: "C", value: 4 },
]
const sankeyNodes = [{ id: "A" }, { id: "B" }, { id: "C" }]

// Realtime line fixture — seed with a static dataset so we can snapshot without
// exercising the push API mid-test.
const realtimeLineData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 30 + Math.cos(i * 0.5) * 12,
}))

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
const boxProps = {
  data: boxData,
  categoryAccessor: "cat",
  valueAccessor: "value",
  showLegend: false,
  tooltip: false,
  ...commonSize,
}
const sankeyProps = {
  nodes: sankeyNodes,
  edges: sankeyEdges,
  nodeIdAccessor: "id",
  sourceAccessor: "source",
  targetAccessor: "target",
  valueAccessor: "value",
  showLabels: false,
  tooltip: false,
  ...commonSize,
}
const realtimeLineProps = {
  data: realtimeLineData,
  timeAccessor: "time",
  valueAccessor: "value",
  showLegend: false,
  enableHover: false,
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
    ),

    // ── BoxPlot (ordinal summary primitive) ────────────────────────────────
    React.createElement(
      TestCase,
      { title: "boxplot — default", testId: "boxplot-default" },
      React.createElement(Themed, null, React.createElement(BoxPlot, boxProps))
    ),
    React.createElement(
      TestCase,
      { title: "boxplot — stroke + strokeWidth", testId: "boxplot-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(BoxPlot, {
          ...boxProps,
          stroke: "var(--semiotic-border)",
          strokeWidth: 1,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "boxplot — opacity 0.4", testId: "boxplot-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(BoxPlot, { ...boxProps, opacity: 0.4 })
      )
    ),

    // ── SankeyDiagram (network nodes + edges) ──────────────────────────────
    React.createElement(
      TestCase,
      { title: "sankey — default", testId: "sankey-default" },
      React.createElement(Themed, null, React.createElement(SankeyDiagram, sankeyProps))
    ),
    React.createElement(
      TestCase,
      { title: "sankey — stroke + strokeWidth", testId: "sankey-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(SankeyDiagram, {
          ...sankeyProps,
          stroke: "var(--semiotic-border)",
          strokeWidth: 1,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "sankey — opacity 0.4", testId: "sankey-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(SankeyDiagram, { ...sankeyProps, opacity: 0.4 })
      )
    ),

    // ── RealtimeLineChart (realtime lineStyle.opacity) ─────────────────────
    React.createElement(
      TestCase,
      { title: "realtime-line — default", testId: "realtime-line-default" },
      React.createElement(Themed, null, React.createElement(RealtimeLineChart, realtimeLineProps))
    ),
    React.createElement(
      TestCase,
      { title: "realtime-line — stroke override", testId: "realtime-line-stroked" },
      React.createElement(
        Themed,
        null,
        React.createElement(RealtimeLineChart, {
          ...realtimeLineProps,
          stroke: "var(--semiotic-danger)",
          strokeWidth: 3,
        })
      )
    ),
    React.createElement(
      TestCase,
      { title: "realtime-line — opacity 0.4", testId: "realtime-line-translucent" },
      React.createElement(
        Themed,
        null,
        React.createElement(RealtimeLineChart, { ...realtimeLineProps, opacity: 0.4 })
      )
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
