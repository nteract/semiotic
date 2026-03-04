import React from "react"
import { StreamNetworkFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const forceNodes = [
  { id: "Alice", group: "team1" },
  { id: "Bob", group: "team1" },
  { id: "Carol", group: "team2" },
  { id: "Dave", group: "team2" },
  { id: "Eve", group: "team3" },
  { id: "Frank", group: "team3" },
  { id: "Grace", group: "team1" },
  { id: "Hank", group: "team2" },
]

const forceEdges = [
  { source: "Alice", target: "Bob" },
  { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Dave" },
  { source: "Carol", target: "Dave" },
  { source: "Dave", target: "Eve" },
  { source: "Eve", target: "Frank" },
  { source: "Frank", target: "Grace" },
  { source: "Grace", target: "Hank" },
  { source: "Hank", target: "Alice" },
  { source: "Bob", target: "Eve" },
]

const sankeyEdges = [
  { source: "Salary", target: "Budget", value: 5000 },
  { source: "Freelance", target: "Budget", value: 2000 },
  { source: "Budget", target: "Rent", value: 2500 },
  { source: "Budget", target: "Food", value: 1500 },
  { source: "Budget", target: "Savings", value: 2000 },
  { source: "Budget", target: "Utilities", value: 1000 },
]

const treeData = {
  name: "root",
  children: [
    {
      name: "Engineering",
      children: [
        { name: "Frontend", value: 12 },
        { name: "Backend", value: 15 },
        { name: "DevOps", value: 6 },
      ],
    },
    {
      name: "Product",
      children: [
        { name: "Design", value: 8 },
        { name: "Research", value: 5 },
      ],
    },
    {
      name: "Operations",
      children: [
        { name: "Support", value: 10 },
        { name: "Sales", value: 14 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const networkFrameProps = [
  { name: "chartType", type: "string", required: true, default: null, description: '"force", "sankey", "chord", "tree", "cluster", "circlepack", "treemap", "partition".' },
  { name: "nodes", type: "array", required: false, default: null, description: "Array of node objects." },
  { name: "edges", type: "array | object", required: false, default: null, description: "Array of edge objects, or single hierarchy root for tree types." },
  { name: "size", type: "[number, number]", required: false, default: "[600, 600]", description: "Chart dimensions as [width, height]." },
  { name: "nodeIDAccessor", type: "string | function", required: false, default: '"id"', description: "How to get a unique ID from each node." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Edge field for source node ID." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Edge field for target node ID." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Edge weight for sankey/chord." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Node field for color encoding." },
  { name: "colorScheme", type: "string | string[]", required: false, default: null, description: "Color scheme for nodes." },
  { name: "nodeLabel", type: "string | function", required: false, default: null, description: "Label displayed on each node." },
  { name: "showLabels", type: "boolean", required: false, default: "false", description: "Whether to display node labels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover tooltips." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkFramePage() {
  return (
    <PageLayout
      title="StreamNetworkFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "StreamNetworkFrame", path: "/frames/network-frame" },
      ]}
      prevPage={{ title: "StreamOrdinalFrame", path: "/frames/ordinal-frame" }}
      nextPage={null}
    >
      <ComponentMeta
        componentName="StreamNetworkFrame"
        importStatement='import { StreamNetworkFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
        ]}
      />

      <p>
        StreamNetworkFrame is the foundational frame for all network and
        hierarchical data visualization. It renders force-directed graphs,
        sankey diagrams, chord diagrams, trees, treemaps, and circle packs
        on canvas for high performance. Use it directly when you need full
        control over layout and styling.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide <code>chartType</code>, <code>nodes</code>, and{" "}
        <code>edges</code>. The frame handles layout computation automatically.
      </p>

      <LiveExample
        frameProps={{
          chartType: "force",
          nodes: forceNodes,
          edges: forceEdges,
          nodeIDAccessor: "id",
          colorBy: "group",
          colorScheme: ["#6366f1", "#f59e0b", "#10b981"],
          showLabels: true,
          nodeLabel: "id",
          enableHover: true,
          size: [500, 400],
        }}
        type={StreamNetworkFrame}
        startHidden={false}
        overrideProps={{
          nodes: `[
  { id: "Alice", group: "team1" },
  { id: "Bob", group: "team1" },
  // ...more nodes
]`,
          edges: `[
  { source: "Alice", target: "Bob" },
  { source: "Alice", target: "Carol" },
  // ...more edges
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="sankey">Sankey Diagram</h3>
      <p>
        Use <code>chartType="sankey"</code> with weighted edges. The frame
        computes the flow layout automatically.
      </p>

      <LiveExample
        frameProps={{
          chartType: "sankey",
          edges: sankeyEdges,
          sourceAccessor: "source",
          targetAccessor: "target",
          valueAccessor: "value",
          showLabels: true,
          nodeLabel: "id",
          enableHover: true,
          size: [500, 350],
        }}
        type={StreamNetworkFrame}
        overrideProps={{
          edges: `[
  { source: "Salary", target: "Budget", value: 5000 },
  { source: "Freelance", target: "Budget", value: 2000 },
  { source: "Budget", target: "Rent", value: 2500 },
  // ...more flows
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="tree">Tree Diagram</h3>
      <p>
        Use <code>chartType="tree"</code> with a hierarchy root object
        passed as <code>edges</code>. The frame lays out the tree automatically.
      </p>

      <LiveExample
        frameProps={{
          chartType: "tree",
          edges: treeData,
          nodeIDAccessor: "name",
          showLabels: true,
          nodeLabel: "name",
          colorBy: "depth",
          enableHover: true,
          size: [500, 400],
        }}
        type={StreamNetworkFrame}
        overrideProps={{
          edges: `{
  name: "root",
  children: [
    { name: "Engineering", children: [...] },
    { name: "Product", children: [...] },
    { name: "Operations", children: [...] },
  ]
}`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StreamNetworkFrame" props={networkFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> --
          simplified Chart for force layouts
        </li>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> --
          simplified Chart for sankey flows
        </li>
        <li>
          <Link to="/charts/tree-diagram">TreeDiagram</Link> --
          simplified Chart for tree layouts
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> -- for continuous
          x/y data
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> -- for
          categorical data
        </li>
      </ul>
    </PageLayout>
  )
}
