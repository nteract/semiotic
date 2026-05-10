import * as Semiotic from "../../dist/semiotic.module.min.js"
import React from "react"
import { createRoot } from "react-dom/client"

const {
  LineChart,
  BarChart,
  PieChart,
  SankeyDiagram,
  Treemap,
  ProcessSankey,
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

// ProcessSankey fixture: a tiny 4-node temporal flow. Inline timestamps
// (ms since epoch) keep the spec-side mirror byte-identical without
// pulling Date construction into the parity boundary.
const psNodes = [
  { id: "Alice",   category: "Person",    xExtent: [1767657600000, 1767657600000] },
  { id: "Bob",     category: "Person",    xExtent: [1769472000000, 1769472000000] },
  { id: "Eng",     category: "Team" },
  { id: "Release", category: "Milestone", xExtent: [1776384000000, 1779494400000] },
]
const psEdges = [
  { id: "alice-eng", source: "Alice", target: "Eng",     value: 8,  startTime: 1769904000000, endTime: 1771632000000 },
  { id: "bob-eng",   source: "Bob",   target: "Eng",     value: 5,  startTime: 1771977600000, endTime: 1774569600000 },
  { id: "eng-rel",   source: "Eng",   target: "Release", value: 13, startTime: 1776384000000, endTime: 1778889600000 },
]
const psDomain = [1767225600000, 1779494400000]

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
  TestCase({
    title: "ProcessSankey (CSR)",
    testId: "csr-process-sankey",
    children: React.createElement(ProcessSankey, {
      nodes: psNodes,
      edges: psEdges,
      domain: psDomain,
      colorBy: "category",
      showLegend: true,
      width: 500,
      height: 320,
    }),
  }),
]

createRoot(document.getElementById("root")).render(
  React.createElement(React.Fragment, null, ...examples),
)
