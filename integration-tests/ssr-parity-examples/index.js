import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LineChart,
  BarChart,
  PieChart,
  SankeyDiagram,
  Treemap,
} = Semiotic

// Same fixture data used by the spec when calling renderChart on the
// SSR side. Keeping these inline (not in test-data.js) so the parity
// invariant is "what the spec sends to renderChart === what the
// fixture renders client-side" with no indirection.
const xyData = [
  { x: 0, y: 1 },
  { x: 1, y: 4 },
  { x: 2, y: 2 },
  { x: 3, y: 5 },
  { x: 4, y: 3 },
]

const categoryData = [
  { region: "AMER", value: 42 },
  { region: "EMEA", value: 33 },
  { region: "APAC", value: 51 },
]

const networkNodes = [{ id: "a" }, { id: "b" }, { id: "c" }]
const networkEdges = [
  { source: "a", target: "b", value: 5 },
  { source: "b", target: "c", value: 3 },
]

const hierarchy = {
  name: "root",
  children: [
    { name: "alpha", value: 10 },
    { name: "beta", value: 7 },
    { name: "gamma", value: 4 },
  ],
}

const TestCase = ({ title, testId, children }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId, key: testId },
    React.createElement("h2", null, title),
    children,
  )

const examples = [
  TestCase({
    title: "LineChart (CSR)",
    testId: "csr-line",
    children: React.createElement(LineChart, {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 200,
    }),
  }),
  TestCase({
    title: "BarChart (CSR)",
    testId: "csr-bar",
    children: React.createElement(BarChart, {
      data: categoryData,
      categoryAccessor: "region",
      valueAccessor: "value",
      width: 400,
      height: 200,
    }),
  }),
  TestCase({
    title: "PieChart (CSR)",
    testId: "csr-pie",
    children: React.createElement(PieChart, {
      data: categoryData,
      categoryAccessor: "region",
      valueAccessor: "value",
      width: 300,
      height: 300,
    }),
  }),
  TestCase({
    title: "SankeyDiagram (CSR)",
    testId: "csr-sankey",
    children: React.createElement(SankeyDiagram, {
      nodes: networkNodes,
      edges: networkEdges,
      valueAccessor: "value",
      nodeIdAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      width: 500,
      height: 300,
    }),
  }),
  TestCase({
    title: "Treemap (CSR)",
    testId: "csr-treemap",
    children: React.createElement(Treemap, {
      data: hierarchy,
      childrenAccessor: "children",
      valueAccessor: "value",
      width: 500,
      height: 400,
    }),
  }),
]

createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null, ...examples),
)
