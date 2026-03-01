import React from "react"
import { ForceDirectedGraph } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "nodeSize", type: "number", label: "Node Size", group: "Nodes",
    default: 8, min: 2, max: 25, step: 1 },
  { name: "showLabels", type: "boolean", label: "Show Labels", group: "Nodes",
    default: false },
  { name: "edgeWidth", type: "number", label: "Edge Width", group: "Edges",
    default: 1, min: 0.5, max: 5, step: 0.5 },
  { name: "edgeColor", type: "color", label: "Edge Color", group: "Edges",
    default: "#999999" },
  { name: "edgeOpacity", type: "number", label: "Edge Opacity", group: "Edges",
    default: 0.6, min: 0.1, max: 1, step: 0.05 },
  { name: "iterations", type: "number", label: "Iterations", group: "Force",
    default: 300, min: 50, max: 800, step: 50 },
  { name: "forceStrength", type: "number", label: "Force Strength", group: "Force",
    default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "showLegend", type: "boolean", label: "Show Legend", group: "Layout",
    default: true },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const smallTeamNodes = [
  { id: "Alice", group: "Engineering" },
  { id: "Bob", group: "Engineering" },
  { id: "Carol", group: "Design" },
  { id: "Dave", group: "Design" },
  { id: "Eve", group: "Marketing" },
  { id: "Frank", group: "Marketing" },
  { id: "Grace", group: "Engineering" },
  { id: "Heidi", group: "Product" },
]

const smallTeamEdges = [
  { source: "Alice", target: "Bob" },
  { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Grace" },
  { source: "Carol", target: "Dave" },
  { source: "Dave", target: "Eve" },
  { source: "Eve", target: "Frank" },
  { source: "Frank", target: "Heidi" },
  { source: "Heidi", target: "Alice" },
  { source: "Grace", target: "Carol" },
  { source: "Bob", target: "Heidi" },
]

const deptNodes = [
  { id: "CEO", group: "Executive" },
  { id: "CTO", group: "Executive" },
  { id: "CFO", group: "Executive" },
  { id: "Dev1", group: "Engineering" },
  { id: "Dev2", group: "Engineering" },
  { id: "Dev3", group: "Engineering" },
  { id: "Des1", group: "Design" },
  { id: "Des2", group: "Design" },
  { id: "Mkt1", group: "Marketing" },
  { id: "Mkt2", group: "Marketing" },
  { id: "Mkt3", group: "Marketing" },
  { id: "Fin1", group: "Finance" },
  { id: "Fin2", group: "Finance" },
  { id: "PM1", group: "Product" },
  { id: "PM2", group: "Product" },
]

const deptEdges = [
  { source: "CEO", target: "CTO" }, { source: "CEO", target: "CFO" },
  { source: "CTO", target: "Dev1" }, { source: "CTO", target: "Dev2" },
  { source: "CTO", target: "Dev3" }, { source: "CTO", target: "Des1" },
  { source: "Des1", target: "Des2" }, { source: "CFO", target: "Fin1" },
  { source: "CFO", target: "Fin2" }, { source: "CEO", target: "Mkt1" },
  { source: "Mkt1", target: "Mkt2" }, { source: "Mkt1", target: "Mkt3" },
  { source: "CEO", target: "PM1" }, { source: "PM1", target: "PM2" },
  { source: "Dev1", target: "Des1" }, { source: "Dev2", target: "PM1" },
  { source: "Des2", target: "Mkt2" }, { source: "PM2", target: "Dev3" },
  { source: "Fin1", target: "CFO" }, { source: "Dev1", target: "Dev2" },
  { source: "Mkt2", target: "Mkt3" }, { source: "PM1", target: "Des2" },
  { source: "Dev3", target: "Des2" }, { source: "Fin2", target: "Mkt1" },
  { source: "PM2", target: "Mkt3" },
]

const sparseNodes = [
  { id: "N1", group: "A" }, { id: "N2", group: "A" },
  { id: "N3", group: "A" }, { id: "N4", group: "B" },
  { id: "N5", group: "B" }, { id: "N6", group: "B" },
  { id: "N7", group: "C" }, { id: "N8", group: "C" },
  { id: "N9", group: "C" }, { id: "N10", group: "D" },
  { id: "N11", group: "D" }, { id: "N12", group: "D" },
]

const sparseEdges = [
  { source: "N1", target: "N2" }, { source: "N3", target: "N4" },
  { source: "N5", target: "N6" }, { source: "N7", target: "N8" },
  { source: "N9", target: "N10" }, { source: "N11", target: "N12" },
  { source: "N1", target: "N7" }, { source: "N4", target: "N10" },
]

const datasets = [
  {
    label: "Small Team (8 nodes, 10 edges)",
    nodes: smallTeamNodes,
    edges: smallTeamEdges,
    colorBy: "group",
    codeString: `// nodes
[
  { id: "Alice", group: "Engineering" },
  { id: "Bob", group: "Engineering" },
  // ...8 nodes
]
// edges
[
  { source: "Alice", target: "Bob" },
  // ...10 edges
]`,
  },
  {
    label: "Departmental (15 nodes, 25 edges)",
    nodes: deptNodes,
    edges: deptEdges,
    colorBy: "group",
    codeString: `// nodes
[
  { id: "CEO", group: "Executive" },
  { id: "CTO", group: "Executive" },
  // ...15 nodes across 5 departments
]
// edges
[
  { source: "CEO", target: "CTO" },
  // ...25 edges
]`,
  },
  {
    label: "Sparse (12 nodes, 8 edges)",
    nodes: sparseNodes,
    edges: sparseEdges,
    colorBy: "group",
    codeString: `// nodes
[
  { id: "N1", group: "A" },
  { id: "N2", group: "A" },
  // ...12 nodes in 4 groups
]
// edges
[
  { source: "N1", target: "N2" },
  // ...8 sparse edges
]`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForceDirectedGraphPlayground() {
  return (
    <PlaygroundLayout
      title="Force Directed Graph Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Force Directed Graph", path: "/playground/force-directed-graph" },
      ]}
      prevPage={{ title: "Scatterplot Playground", path: "/playground/scatterplot" }}
      nextPage={{ title: "XY Frame", path: "/frames/xy-frame" }}
      chartComponent={ForceDirectedGraph}
      componentName="ForceDirectedGraph"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => ({
        nodes: ds.nodes,
        edges: ds.edges,
        colorBy: ds.colorBy,
        nodeLabel: "id",
        height: 500,
      })}
    >
      <p>
        Experiment with ForceDirectedGraph props in real time. Adjust the controls
        below the chart to see how each prop affects the visualization, then copy
        the generated code.
      </p>
    </PlaygroundLayout>
  )
}
