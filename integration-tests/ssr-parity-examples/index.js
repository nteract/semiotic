import * as Semiotic from "../../dist/semiotic.module.min.js"
import * as SemioticGeo from "../../dist/geo.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { makeSsrParityCases } from "../ssr-parity-fixtures.js"

const { ThemeProvider } = Semiotic
const COMPONENTS = { ...Semiotic, ...SemioticGeo }

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: testId },
    React.createElement("h2", null, title),
    children,
  )

const requestedCase = new URLSearchParams(window.location.search).get("case")
const parityCases = makeSsrParityCases(React)
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
  const chart = React.createElement(Component, { ...c.props, animate: false })
  const child = c.theme
    ? React.createElement(ThemeProvider, { theme: c.theme }, chart)
    : chart

  return TestCase({
    title: `${c.component} (CSR)`,
    testId: `csr-${c.id}`,
    children: child,
  })
})

createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null, ...examples),
)
