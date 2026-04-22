// Chart-mode visual regression matrix.
//
// Five HOCs exercised across all three modes (`primary`/`context`/`sparkline`):
//   • DonutChart         — innerRadius previously hardcoded at 60, inverting the
//                          ring at sparkline 120×24. Now scales with size.
//   • GaugeChart         — `width: props.width ?? 300` previously swallowed the
//                          mode-default size. Now threaded via primaryDefaults.
//   • SwimlaneChart      — axes stayed on in sparkline mode; fix threads showAxes
//                          through useChartMode.
//   • RealtimeHistogram  — only dimensions were mode-driven; full axis chrome
//                          crowded the 120×24 canvas. Now showAxes participates
//                          in mode resolution. (showLegend isn't wired because
//                          the HOC doesn't build a legend prop for the frame.)
//   • CandlestickChart   — new HOC over `chartType="candlestick"`. Same mode
//                          plumbing as the other XY HOCs. Degrades to a range
//                          chart when open/close are omitted; here we render the
//                          OHLC form for the visual baseline.
//
// Each chart is rendered in all three modes. 15 fixtures total; each snapshot
// proves the chart stays legible at the mode's chosen size.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  DonutChart,
  GaugeChart,
  SwimlaneChart,
  RealtimeHistogram,
  CandlestickChart,
  ThemeProvider,
} = Semiotic

// ── Deterministic fixtures ─────────────────────────────────────────────────

const donutData = [
  { category: "A", value: 30 },
  { category: "B", value: 20 },
  { category: "C", value: 50 },
]

const swimlaneData = [
  { category: "Lane A", task: "Design", value: 3 },
  { category: "Lane A", task: "Dev", value: 5 },
  { category: "Lane B", task: "Design", value: 2 },
  { category: "Lane B", task: "Dev", value: 4 },
  { category: "Lane C", task: "QA", value: 6 },
]

const histogramData = Array.from({ length: 20 }, (_, i) => ({
  time: i * 100,
  value: 10 + Math.round(Math.sin(i * 0.5) * 5),
}))

// Deterministic OHLC — a gentle up-then-down sine ensures both green and red
// bars appear, and every bar has a non-zero body/wick for the snapshot.
const candlestickData = Array.from({ length: 12 }, (_, i) => {
  const base = 50 + Math.sin(i * 0.6) * 8
  const o = base
  const c = base + (i % 2 === 0 ? 3 : -3)
  const h = Math.max(o, c) + 2
  const l = Math.min(o, c) - 2
  return { t: i, o, h, l, c }
})

// Range-only fixture: derived from the OHLC data by keeping only high/low.
// Covers the renderer's dot-radius cap (layout.height * 0.12) — without it,
// sparkline rows (24px tall) render disproportionate dots.
const candlestickRangeData = candlestickData.map(d => ({ t: d.t, h: d.h, l: d.l }))

const MODES = ["primary", "context", "sparkline"]

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function Themed({ children }) {
  return React.createElement(ThemeProvider, { theme: "light" }, children)
}

function App() {
  const donutCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `donut-${mode}`, title: `donut — ${mode}`, testId: `donut-${mode}` },
      React.createElement(Themed, null, React.createElement(DonutChart, {
        data: donutData,
        categoryAccessor: "category",
        valueAccessor: "value",
        mode,
        tooltip: false,
      }))
    )
  )

  const gaugeCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `gauge-${mode}`, title: `gauge — ${mode}`, testId: `gauge-${mode}` },
      React.createElement(Themed, null, React.createElement(GaugeChart, {
        value: 65,
        min: 0,
        max: 100,
        thresholds: [
          { value: 40, color: "#22c55e", label: "Good" },
          { value: 80, color: "#eab308", label: "Warn" },
          { value: 100, color: "#ef4444", label: "Danger" },
        ],
        mode,
      }))
    )
  )

  const swimlaneCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `swimlane-${mode}`, title: `swimlane — ${mode}`, testId: `swimlane-${mode}` },
      React.createElement(Themed, null, React.createElement(SwimlaneChart, {
        data: swimlaneData,
        categoryAccessor: "category",
        subcategoryAccessor: "task",
        valueAccessor: "value",
        mode,
        tooltip: false,
      }))
    )
  )

  const histogramCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `histogram-${mode}`, title: `histogram — ${mode}`, testId: `histogram-${mode}` },
      React.createElement(Themed, null, React.createElement(RealtimeHistogram, {
        data: histogramData,
        timeAccessor: "time",
        valueAccessor: "value",
        binSize: 200,
        mode,
        enableHover: false,
      }))
    )
  )

  const candlestickCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `candlestick-${mode}`, title: `candlestick — ${mode}`, testId: `candlestick-${mode}` },
      React.createElement(Themed, null, React.createElement(CandlestickChart, {
        data: candlestickData,
        xAccessor: "t",
        openAccessor: "o",
        highAccessor: "h",
        lowAccessor: "l",
        closeAccessor: "c",
        mode,
        tooltip: false,
      }))
    )
  )

  const candlestickRangeCases = MODES.map(mode =>
    React.createElement(
      TestCase,
      { key: `candlestick-range-${mode}`, title: `candlestick-range — ${mode}`, testId: `candlestick-range-${mode}` },
      React.createElement(Themed, null, React.createElement(CandlestickChart, {
        data: candlestickRangeData,
        xAccessor: "t",
        highAccessor: "h",
        lowAccessor: "l",
        candlestickStyle: { rangeColor: "#6366f1" },
        mode,
        tooltip: false,
      }))
    )
  )

  return React.createElement(
    "div",
    null,
    ...donutCases,
    ...gaugeCases,
    ...swimlaneCases,
    ...histogramCases,
    ...candlestickCases,
    ...candlestickRangeCases
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
