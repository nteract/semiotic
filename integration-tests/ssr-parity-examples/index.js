import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import { MotifBraidChart, DependencyForestChart, FlowCircuitChart } from "semiotic/atlas"
import { prepareMotifBraid } from "semiotic/atlas/core"
import { LinkedCharts } from "semiotic/ai"
import * as SemioticPhysics from "../../dist/physics.module.min.js"
import * as SemioticRecipes from "../../dist/semiotic-recipes.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { makeSsrParityCases } from "../ssr-parity-fixtures.js"
import { makeDependencyXRayParityCases } from "../dependency-xray-parity-fixtures"
import { makeFlowCircuitParityCases } from "../flow-circuit-parity-fixtures"
import { makeAtlasStoryParityCases } from "../atlas-story-parity-fixtures"
import { makeNetworkPerspectiveParityCases } from "../network-perspective-parity-fixtures"

const { ThemeProvider } = Semiotic
const COMPONENTS = { ...Semiotic, ...SemioticGeo, ...SemioticPhysics, MotifBraidChart, DependencyForestChart, FlowCircuitChart }

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: testId },
    React.createElement("h2", null, title),
    children,
  )

const requestedCase = new URLSearchParams(window.location.search).get("case")
const linkedNode = new URLSearchParams(window.location.search).get("linkedNode")
const parityCases = [
  ...makeAtlasStoryParityCases(),
  ...makeSsrParityCases(React, SemioticRecipes),
  ...makeDependencyXRayParityCases(),
  ...makeFlowCircuitParityCases(),
  ...makeNetworkPerspectiveParityCases(SemioticRecipes),
]
const selectedCases = requestedCase
  ? parityCases.filter((c) => c.id === requestedCase)
  : parityCases

if (requestedCase && selectedCases.length === 0) {
  throw new Error(`Unknown SSR/CSR parity fixture: ${requestedCase}`)
}

function ProjectedAtlasCase({ Component, fixture }) {
  const [width, setWidth] = React.useState(1100)
  const [camera, setCamera] = React.useState({ x: 0, y: 0, k: 1 })
  const [selected, setSelected] = React.useState("")
  const props = fixture.props
  const nodeId = fixture.component === "MotifBraidChart"
    ? (() => { const first = prepareMotifBraid(props.atlas).groups[0]; return `vertex:${first.partition ?? "all"}:${first.signature.split(">")[0]}` })()
    : fixture.component === "DependencyForestChart" ? "X" : "inventory"
  const frameProps = { viewTransform: camera }
  return React.createElement(React.Fragment, null,
    React.createElement("button", { onClick: () => setWidth(900) }, "Resize projected chart"),
    React.createElement("button", { onClick: () => setCamera({ x: -40, y: -20, k: 1.15 }) }, "Pan and zoom projected chart"),
    React.createElement("output", { "data-testid": "projected-selection" }, selected),
    React.createElement(Component, {
      ...props, width, perspective: "isometric",
      ...(fixture.component === "FlowCircuitChart" ? { networkFrameProps: frameProps } : { frameProps }),
      ...(fixture.component === "MotifBraidChart"
        ? { onClick: (datum) => setSelected(String(datum.id)) }
        : { onSelectNode: setSelected }),
      annotations: [{ type: "widget", nodeId, dx: 0, dy: 0, width: 1, height: 1,
        content: React.createElement("span", { "data-testid": "projected-node-anchor", style: { pointerEvents: "none" } }) }]
    })
  )
}

const projected = new URLSearchParams(window.location.search).has("projected")
const examples = selectedCases.map((c) => {
  const Component = COMPONENTS[c.component]
  if (!Component) {
    throw new Error(`Missing SSR parity component export: ${c.component}`)
  }

  // The sheet compares settled geometry, not an arbitrary canvas intro frame.
  // Apply the same explicit animation setting to every CSR fixture; the
  // server renderer receives it from the spec as well.
  const linkedHover = linkedNode ? { name: "atlas-hover", fields: ["nodeId"] } : undefined
  const chart = projected ? React.createElement(ProjectedAtlasCase, { Component, fixture: c }) : React.createElement(Component, {
    ...c.props, animate: false,
    ...(linkedHover && {
      linkedHover,
      chartId: "atlas-link-target",
      ...(c.component === "MotifBraidChart"
        ? { selection: { name: "atlas-hover" } }
        : { linkedSelection: { name: "atlas-hover" } })
    })
  })
  const child = c.theme
    ? React.createElement(ThemeProvider, { theme: c.theme }, chart)
    : chart

  const example = TestCase({
    title: `${c.component} (CSR)`,
    testId: `csr-${c.id}`,
    children: child,
  })
  if (!linkedNode) return example
  return React.createElement(LinkedCharts, { key: c.id },
    TestCase({
      title: "Hover the source vertex",
      testId: "atlas-link-source",
      children: React.createElement(Semiotic.Scatterplot, {
        data: [{ x: 0, y: 0, nodeId: linkedNode }],
        xAccessor: "x", yAccessor: "y", xExtent: [-1, 1], yExtent: [-1, 1],
        width: 300, height: 200, pointRadius: 12, showAxes: false,
        linkedHover, chartId: "atlas-link-source", tooltip: () => null,
        description: "One canonical vertex linked to the Atlas reader"
      })
    }),
    example
  )
})

// Server rendering installs perspective extras synchronously; load the same
// browser chunk before the first CSR paint so both sides draw ground chrome.
await Semiotic.preloadNetworkPerspectiveExtras()

createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null, ...examples),
)
