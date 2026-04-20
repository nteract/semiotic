// Primitive-theme matrix: Ordinal / Network / Geo under light + dark.
//
// Complements histogram-theme-stroke.spec.ts (which covers the XY frame)
// by proving milestone 2 plumbing: `themeSemantic` reaches each of the
// three remaining Stream Frames and changes default fallback colors
// without the user setting an explicit color prop.
//
// Each test case renders a chart with NO user-supplied color/stroke props,
// so everything the chart paints comes from the theme's resolved defaults.
// Light vs dark snapshots diverge: in dark theme, default borders/grids/
// surfaces are darker and fills are brighter than in light.

import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  FunnelChart,
  TreeDiagram,
  ThemeProvider,
} = Semiotic
const { ChoroplethMap } = SemioticGeo

// ── Deterministic data ─────────────────────────────────────────────────────

const funnelData = [
  { step: "Visit", value: 100 },
  { step: "Signup", value: 65 },
  { step: "Activate", value: 40 },
  { step: "Convert", value: 18 },
]

// TreeDiagram needs a hierarchy root
const treeData = {
  id: "root",
  children: [
    { id: "A", children: [{ id: "A1" }, { id: "A2" }] },
    { id: "B", children: [{ id: "B1" }] },
    { id: "C" },
  ],
}

// Small hand-crafted GeoJSON for a deterministic choropleth.
const choroplethAreas = [
  {
    type: "Feature",
    properties: { id: "one", value: 12 },
    geometry: {
      type: "Polygon",
      coordinates: [[[-40, -10], [40, -10], [40, 30], [-40, 30], [-40, -10]]],
    },
  },
  {
    type: "Feature",
    properties: { id: "two", value: 28 },
    geometry: {
      type: "Polygon",
      coordinates: [[[60, -20], [120, -20], [120, 40], [60, 40], [60, -20]]],
    },
  },
]

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

function ThemedCase({ testIdPrefix, themeName, children }) {
  return React.createElement(
    ThemeProvider,
    { theme: themeName },
    React.createElement(
      TestCase,
      { title: `${testIdPrefix} — ${themeName}`, testId: `${testIdPrefix}-${themeName}` },
      children
    )
  )
}

function App() {
  // Common props that avoid layout nondeterminism.
  const funnelProps = {
    data: funnelData,
    stepAccessor: "step",
    valueAccessor: "value",
    width: 420,
    height: 220,
    showLegend: false,
  }
  const treeProps = {
    data: treeData,
    childrenAccessor: "children",
    nodeIDAccessor: "id",
    width: 420,
    height: 220,
    showLabels: false,
  }
  const choroplethProps = {
    areas: choroplethAreas,
    valueAccessor: "value",
    width: 420,
    height: 220,
    showLegend: false,
    tooltip: false,
  }

  return React.createElement(
    "div",
    null,
    // ── Funnel (Ordinal frame; exercises funnelScene + connectorScene) ────
    React.createElement(
      ThemedCase,
      { testIdPrefix: "funnel", themeName: "light" },
      React.createElement(FunnelChart, funnelProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "funnel", themeName: "dark" },
      React.createElement(FunnelChart, funnelProps)
    ),

    // ── Tree (Network frame; exercises hierarchySceneBuilders) ────────────
    React.createElement(
      ThemedCase,
      { testIdPrefix: "tree", themeName: "light" },
      React.createElement(TreeDiagram, treeProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "tree", themeName: "dark" },
      React.createElement(TreeDiagram, treeProps)
    ),

    // ── Choropleth (Geo frame; exercises themedDefaultArea in store) ──────
    React.createElement(
      ThemedCase,
      { testIdPrefix: "choropleth", themeName: "light" },
      React.createElement(ChoroplethMap, choroplethProps)
    ),
    React.createElement(
      ThemedCase,
      { testIdPrefix: "choropleth", themeName: "dark" },
      React.createElement(ChoroplethMap, choroplethProps)
    )
  )
}

const root = createRoot(document.getElementById("root"))
root.render(React.createElement(App))
