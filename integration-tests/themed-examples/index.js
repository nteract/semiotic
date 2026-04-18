// Themed visual regression harness.
//
// Mounts a small canonical chart per family inside a ThemeProvider with each
// of a curated set of theme presets. The accompanying spec snapshots each
// (chart × theme) cell so theme-level regressions (palette, typography,
// background, selectionOpacity, gridline color, etc.) are caught visually.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LineChart,
  Scatterplot,
  BarChart,
  PieChart,
  SankeyDiagram,
  ThemeProvider,
} = Semiotic
const { ChoroplethMap } = SemioticGeo

// ── Deterministic data ─────────────────────────────────────────────────────

const lineData = [
  { x: 0, y: 10, series: "A" }, { x: 1, y: 14, series: "A" },
  { x: 2, y: 12, series: "A" }, { x: 3, y: 18, series: "A" },
  { x: 4, y: 16, series: "A" },
  { x: 0, y: 4, series: "B" }, { x: 1, y: 9, series: "B" },
  { x: 2, y: 11, series: "B" }, { x: 3, y: 7, series: "B" },
  { x: 4, y: 13, series: "B" },
]

const scatterData = Array.from({ length: 30 }, (_, i) => ({
  x: ((i * 7 + 13) % 97) + Math.sin(i) * 3,
  y: ((i * 11 + 23) % 89) + Math.cos(i) * 3,
  size: ((i * 13 + 7) % 25) + 5,
  category: i % 3 === 0 ? "A" : i % 3 === 1 ? "B" : "C",
}))

const barData = [
  { category: "Alpha", value: 25 },
  { category: "Beta", value: 45 },
  { category: "Gamma", value: 30 },
  { category: "Delta", value: 60 },
  { category: "Epsilon", value: 18 },
]

const pieData = [
  { label: "Cats", value: 38 },
  { label: "Dogs", value: 27 },
  { label: "Birds", value: 19 },
  { label: "Fish", value: 16 },
]

// Sankey edges form a small DAG with deterministic d3-sankey layout (no
// random initialization, no iteration-count sensitivity). ForceDirectedGraph
// was originally here but force layouts converge to different local minima
// across JS engines — webkit and chromium produced visually different
// outputs even at high iteration counts, breaking the cross-browser
// regression gate. Sankey exercises the same theme dimensions (categorical
// node fills, edge colors, labels) without the floating-point drift.
const sankeyEdges = [
  { source: "Source A", target: "Hub", value: 10 },
  { source: "Source B", target: "Hub", value: 6 },
  { source: "Hub", target: "Sink X", value: 8 },
  { source: "Hub", target: "Sink Y", value: 5 },
  { source: "Source C", target: "Sink Y", value: 4 },
]

const geoAreas = [
  {
    type: "Feature", properties: { name: "A", value: 100 },
    geometry: { type: "Polygon", coordinates: [[[-10, 40], [10, 40], [10, 50], [-10, 50], [-10, 40]]] },
  },
  {
    type: "Feature", properties: { name: "B", value: 200 },
    geometry: { type: "Polygon", coordinates: [[[10, 40], [30, 40], [30, 50], [10, 50], [10, 40]]] },
  },
  {
    type: "Feature", properties: { name: "C", value: 150 },
    geometry: { type: "Polygon", coordinates: [[[-10, 50], [10, 50], [10, 60], [-10, 60], [-10, 50]]] },
  },
  {
    type: "Feature", properties: { name: "D", value: 75 },
    geometry: { type: "Polygon", coordinates: [[[10, 50], [30, 50], [30, 60], [10, 60], [10, 50]]] },
  },
]

// ── Charts to snapshot per theme ──────────────────────────────────────────

const CHART_BUILDERS = [
  {
    id: "line",
    label: "LineChart",
    el: () => React.createElement(LineChart, {
      data: lineData, xAccessor: "x", yAccessor: "y",
      lineBy: "series", colorBy: "series", showLegend: true,
      width: 360, height: 240,
    }),
  },
  {
    id: "scatter",
    label: "Scatterplot",
    el: () => React.createElement(Scatterplot, {
      data: scatterData, xAccessor: "x", yAccessor: "y",
      colorBy: "category", sizeBy: "size", sizeRange: [4, 14],
      showLegend: true, width: 360, height: 240,
    }),
  },
  {
    id: "bar",
    label: "BarChart",
    el: () => React.createElement(BarChart, {
      data: barData, categoryAccessor: "category", valueAccessor: "value",
      showGrid: true, width: 360, height: 240,
    }),
  },
  {
    id: "pie",
    label: "PieChart",
    el: () => React.createElement(PieChart, {
      data: pieData, categoryAccessor: "label", valueAccessor: "value",
      showLegend: true, width: 360, height: 240,
    }),
  },
  {
    id: "sankey",
    label: "SankeyDiagram",
    el: () => React.createElement(SankeyDiagram, {
      edges: sankeyEdges, valueAccessor: "value",
      showLabels: true, width: 360, height: 240,
    }),
  },
  {
    id: "choropleth",
    label: "ChoroplethMap",
    el: () => React.createElement(ChoroplethMap, {
      areas: geoAreas, valueAccessor: (d) => d.properties.value,
      colorScheme: "blues", width: 360, height: 240,
    }),
  },
]

// Themes covered. Picked to exercise: light/dark axis, tufte's chrome
// minimalism, an alternative categorical palette (pastels), and a corporate
// dark variant. Adding a theme here = N new baselines (one per chart).
const THEMES = ["light", "dark", "tufte", "pastels", "bi-tool-dark"]

// ── Render grid ────────────────────────────────────────────────────────────

const TestCase = ({ testId, label, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, label),
    children,
  )

const App = () =>
  React.createElement(
    "div",
    null,
    THEMES.flatMap((themeName) =>
      CHART_BUILDERS.map((chart) =>
        React.createElement(
          ThemeProvider,
          { key: `${themeName}-${chart.id}`, theme: themeName },
          TestCase({
            testId: `themed-${chart.id}-${themeName}`,
            label: `${chart.label} · ${themeName}`,
            children: chart.el(),
          }),
        ),
      ),
    ),
  )

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))

// Exposed for ad-hoc inspection in devtools (e.g. listing all rendered
// test-ids on this page). Not the source of truth for the spec — the spec
// hard-codes its own CHARTS/THEMES arrays so test discovery happens
// statically before the page loads.
window.__SEMIOTIC_THEME_MATRIX__ = THEMES.flatMap((t) =>
  CHART_BUILDERS.map((c) => `themed-${c.id}-${t}`),
)
