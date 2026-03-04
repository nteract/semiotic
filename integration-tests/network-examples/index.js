import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { networkData, hierarchyData, chordData, colors } from "../test-data.js"

const {
  ForceDirectedGraph,
  TreeDiagram,
  Treemap,
  CirclePack,
  SankeyDiagram,
  ChordDiagram
} = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Force-Directed Graph
  TestCase({
    title: "Force-Directed Graph",
    testId: "network-force",
    children: React.createElement(ForceDirectedGraph, {
      nodes: networkData.nodes,
      edges: networkData.edges,
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      nodeSize: 8,
      iterations: 500,
      width: 400,
      height: 400,
      colorScheme: colors
    })
  }),

  // 2. Tree Diagram
  TestCase({
    title: "Tree Diagram",
    testId: "network-tree",
    children: React.createElement(TreeDiagram, {
      data: hierarchyData,
      childrenAccessor: "children",
      nodeIdAccessor: "name",
      orientation: "horizontal",
      nodeSize: 5,
      showLabels: true,
      width: 400,
      height: 400,
      colorByDepth: true
    })
  }),

  // 3. Treemap
  TestCase({
    title: "Treemap",
    testId: "network-treemap",
    children: React.createElement(Treemap, {
      data: hierarchyData,
      childrenAccessor: "children",
      valueAccessor: "value",
      nodeIdAccessor: "name",
      colorByDepth: true,
      showLabels: true,
      width: 400,
      height: 400
    })
  }),

  // 4. Circle Pack
  TestCase({
    title: "Circle Pack",
    testId: "network-circlepack",
    children: React.createElement(CirclePack, {
      data: hierarchyData,
      childrenAccessor: "children",
      valueAccessor: "value",
      nodeIdAccessor: "name",
      colorByDepth: true,
      showLabels: true,
      width: 400,
      height: 400
    })
  }),

  // 5. Sankey Diagram
  TestCase({
    title: "Sankey Diagram",
    testId: "network-sankey",
    children: React.createElement(SankeyDiagram, {
      nodes: networkData.nodes,
      edges: networkData.edges.map((e) => ({ ...e, value: e.weight })),
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      nodeIdAccessor: "id",
      width: 400,
      height: 400,
      colorScheme: colors
    })
  }),

  // 6. Chord Diagram
  TestCase({
    title: "Chord Diagram",
    testId: "network-chord",
    children: React.createElement(ChordDiagram, {
      edges: chordData,
      sourceAccessor: "source",
      targetAccessor: "target",
      valueAccessor: "value",
      width: 400,
      height: 400,
      colorScheme: colors
    })
  }),

  // 7. Force-Directed Graph with Hover
  TestCase({
    title: "Force Graph with Hover",
    testId: "network-force-hover",
    children: React.createElement(ForceDirectedGraph, {
      nodes: networkData.nodes,
      edges: networkData.edges,
      nodeIDAccessor: "id",
      sourceAccessor: "source",
      targetAccessor: "target",
      nodeSize: 8,
      iterations: 500,
      enableHover: true,
      width: 400,
      height: 400,
      colorScheme: colors
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
