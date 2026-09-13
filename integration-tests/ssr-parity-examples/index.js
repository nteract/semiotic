import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import { MotifBraidChart, DependencyForestChart, FlowCircuitChart } from "semiotic/atlas"
import { LinkedCharts } from "semiotic/ai"
import * as SemioticPhysics from "../../dist/physics.module.min.js"
import * as SemioticRecipes from "../../dist/semiotic-recipes.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { makeSsrParityCases } from "../ssr-parity-fixtures.js"
import { makeDependencyXRayParityCases } from "../dependency-xray-parity-fixtures"
import { makeFlowCircuitParityCases } from "../flow-circuit-parity-fixtures"
import { makeAtlasStoryParityCases } from "../atlas-story-parity-fixtures"

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
]
const selectedCases = requestedCase
  ? parityCases.filter((c) => c.id === requestedCase)
  : parityCases

if (requestedCase && selectedCases.length === 0) {
  throw new Error(`Unknown SSR/CSR parity fixture: ${requestedCase}`)
}

const examples = selectedCases.map((c) => {
  const Component = COMPONENTS[c.component]
  if (!Component) {
    throw new Error(`Missing SSR parity component export: ${c.component}`)
  }

  // The sheet compares settled geometry, not an arbitrary canvas intro frame.
  // Apply the same explicit animation setting to every CSR fixture; the
  // server renderer receives it from the spec as well.
  const linkedHover = linkedNode ? { name: "atlas-hover", fields: ["nodeId"] } : undefined
  const chart = React.createElement(Component, {
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

createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null, ...examples),
)
