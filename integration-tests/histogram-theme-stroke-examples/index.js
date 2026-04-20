// RealtimeHistogram theme-aware stroke regression harness.
//
// The three test cases below exercise the end-to-end plumbing added in
// Phase A of the primitive-theming cleanup:
//   1. LIGHT_THEME — stroke resolves to --semiotic-border from the active
//      ThemeProvider.
//   2. DARK_THEME — same prop, different cascaded value.
//   3. Scoped override — a parent <div style={{ "--semiotic-danger": "#c00" }}>
//      overrides the role on a single subtree, proving CSS cascade reach
//      into canvas rendering.
//
// Regression surface: if `barStyle.stroke` stops routing through
// StreamXYFrame → PipelineConfig → barScene, the strokes disappear and
// the snapshots diverge. If CSS var resolution drifts in the canvas
// bridge, the scoped-override test fails first.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const { RealtimeHistogram, ThemeProvider } = Semiotic

// Deterministic temporal data — 20 bins × 2 categories so stacking is visible
// and strokes delineate each segment clearly.
const baseTime = new Date("2026-04-01T10:00:00Z").getTime()
const errorValues = [2, 4, 3, 6, 5, 7, 4, 8, 6, 5]
const warningValues = [9, 12, 15, 18, 14, 20, 17, 22, 19, 16]
const stackedData = Array.from({ length: 20 }, (_, idx) => [
  {
    timestamp: baseTime + idx * 60_000,
    value: errorValues[idx % errorValues.length],
    category: "errors",
  },
  {
    timestamp: baseTime + idx * 60_000,
    value: warningValues[idx % warningValues.length],
    category: "warnings",
  },
]).flat()

const chartProps = {
  data: stackedData,
  binSize: 60_000,
  timeAccessor: "timestamp",
  valueAccessor: "value",
  categoryAccessor: "category",
  colors: { errors: "#C43B42", warnings: "#E8A838" },
  width: 520,
  height: 200,
  margin: { top: 20, right: 20, bottom: 30, left: 50 },
  // The prop we're exercising: theme-var stroke with width
  stroke: "var(--semiotic-border)",
  strokeWidth: 1,
  windowSize: stackedData.length,
  gap: 2,
}

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function App() {
  return React.createElement(
    "div",
    null,
    // Light theme — stroke reads --semiotic-border ("#ccc" per preset)
    React.createElement(
      TestCase,
      { title: "Light theme — stroke=var(--semiotic-border)", testId: "histogram-stroke-light" },
      React.createElement(
        ThemeProvider,
        { theme: "light" },
        React.createElement(RealtimeHistogram, chartProps)
      )
    ),
    // Dark theme — same prop, cascaded --semiotic-border is "#555"
    React.createElement(
      TestCase,
      { title: "Dark theme — stroke=var(--semiotic-border)", testId: "histogram-stroke-dark" },
      React.createElement(
        ThemeProvider,
        { theme: "dark" },
        React.createElement(RealtimeHistogram, chartProps)
      )
    ),
    // Scoped override — parent div re-defines --semiotic-border; canvas
    // resolves via getComputedStyle on the chart's DOM ancestor, so the
    // CSS cascade is honored even though bar rendering is canvas-based.
    React.createElement(
      TestCase,
      { title: "Scoped override — inline CSS var overrides the role", testId: "histogram-stroke-scoped" },
      React.createElement(
        ThemeProvider,
        { theme: "light" },
        React.createElement(
          "div",
          { style: { "--semiotic-border": "#c00" } },
          React.createElement(RealtimeHistogram, chartProps)
        )
      )
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
