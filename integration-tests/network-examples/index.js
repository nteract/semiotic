import * as Semiotic from "../../dist/semiotic.module.js"
import React from "react"
import { createRoot } from "react-dom/client"
import { networkData, hierarchyData, colors } from "../test-data.js"

const { NetworkFrame } = Semiotic

const TestCase = ({ title, children, testId }) =>
  React.createElement(
    "div",
    { className: "test-case", "data-testid": testId },
    React.createElement("h2", null, title),
    children
  )

const examples = [
  // 1. Force-Directed Network
  TestCase({
    title: "Force-Directed Network",
    testId: "network-force-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      nodes: networkData.nodes,
      edges: networkData.edges,
      sourceAccessor: "source",
      targetAccessor: "target",
      networkType: { type: "force", iterations: 500 },
      nodeStyle: (d, i) => ({
        fill: colors[i % colors.length],
        stroke: "black",
        strokeWidth: 1
      }),
      edgeStyle: { stroke: "#999", strokeWidth: 1 },
      nodeIDAccessor: "id",
      nodeSizeAccessor: 5,
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  }),

  // 2. Tree Layout
  TestCase({
    title: "Tree Layout",
    testId: "network-tree-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      edges: hierarchyData,
      networkType: { type: "tree", projection: "horizontal" },
      nodeStyle: (d) => ({
        fill: colors[d.depth % colors.length],
        stroke: "black",
        strokeWidth: 1
      }),
      edgeStyle: { stroke: "#999", strokeWidth: 1 },
      nodeIDAccessor: "name",
      nodeSizeAccessor: 3,
      margin: { left: 50, bottom: 10, right: 50, top: 10 }
    })
  }),

  // 3. Treemap Layout
  TestCase({
    title: "Treemap Layout",
    testId: "network-treemap-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      edges: hierarchyData,
      networkType: { type: "treemap", hierarchySum: (d) => d.value },
      nodeStyle: (d) => ({
        fill: colors[d.depth % colors.length],
        fillOpacity: 0.7,
        stroke: "white",
        strokeWidth: 2
      }),
      nodeIDAccessor: "name",
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  }),

  // 4. Partition/Sunburst Layout
  TestCase({
    title: "Partition Layout",
    testId: "network-partition-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      edges: hierarchyData,
      networkType: {
        type: "partition",
        projection: "radial",
        hierarchySum: (d) => d.value
      },
      nodeStyle: (d) => ({
        fill: colors[d.depth % colors.length],
        fillOpacity: 0.8,
        stroke: "white",
        strokeWidth: 1
      }),
      nodeIDAccessor: "name",
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  }),

  // 5. Circle Pack Layout
  TestCase({
    title: "Circle Pack Layout",
    testId: "network-circlepack-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      edges: hierarchyData,
      networkType: { type: "circlepack", hierarchySum: (d) => d.value },
      nodeStyle: (d) => ({
        fill: colors[d.depth % colors.length],
        fillOpacity: 0.5,
        stroke: "black",
        strokeWidth: 1
      }),
      nodeIDAccessor: "name",
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  }),

  // 6. Sankey Diagram
  TestCase({
    title: "Sankey Diagram",
    testId: "network-sankey-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      nodes: networkData.nodes,
      edges: networkData.edges.map((e) => ({ ...e, value: e.weight })),
      sourceAccessor: "source",
      targetAccessor: "target",
      networkType: { type: "sankey", iterations: 100 },
      nodeStyle: (d, i) => ({
        fill: colors[i % colors.length],
        stroke: "black",
        strokeWidth: 1
      }),
      edgeStyle: (d, i) => ({
        fill: colors[i % colors.length],
        fillOpacity: 0.3,
        stroke: colors[i % colors.length]
      }),
      nodeIDAccessor: "id",
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  }),

  // 7. Chord Diagram
  TestCase({
    title: "Chord Diagram",
    testId: "network-chord-svg",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      edges: [
        { source: "A", target: "B", value: 5 },
        { source: "A", target: "C", value: 3 },
        { source: "B", target: "C", value: 7 },
        { source: "B", target: "D", value: 4 },
        { source: "C", target: "D", value: 2 }
      ],
      sourceAccessor: "source",
      targetAccessor: "target",
      networkType: { type: "chord" },
      edgeStyle: (d, i) => ({
        fill: colors[i % colors.length],
        fillOpacity: 0.5,
        stroke: colors[i % colors.length]
      }),
      nodeIDAccessor: (d) => d,
      margin: { left: 50, bottom: 50, right: 50, top: 50 }
    })
  }),

  // 8. Force Network with Hover
  TestCase({
    title: "Force Network with Hover",
    testId: "network-force-hover",
    children: React.createElement(NetworkFrame, {
      size: [400, 300],
      nodes: networkData.nodes,
      edges: networkData.edges,
      sourceAccessor: "source",
      targetAccessor: "target",
      networkType: { type: "force", iterations: 500 },
      nodeStyle: (d, i) => ({
        fill: colors[i % colors.length],
        stroke: "black",
        strokeWidth: 1
      }),
      edgeStyle: { stroke: "#999", strokeWidth: 1 },
      hoverAnnotation: true,
      tooltipContent: (d) =>
        React.createElement(
          "div",
          { className: "tooltip-content", "data-testid": "tooltip-content" },
          d.id || d.label
        ),
      nodeIDAccessor: "id",
      nodeSizeAccessor: 6,
      margin: { left: 10, bottom: 10, right: 10, top: 10 }
    })
  })
]

// Render all examples
const root = createRoot(document.getElementById("root"))
root.render(
  React.createElement("div", { className: "test-grid" }, examples)
)
