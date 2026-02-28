import React from "react"
import { NetworkFrame } from "semiotic"
import { ForceDirectedGraph } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const nodeData = [
  { id: "Alice", group: "Engineering" },
  { id: "Bob", group: "Engineering" },
  { id: "Carol", group: "Design" },
  { id: "Dave", group: "Design" },
  { id: "Eve", group: "Marketing" },
  { id: "Frank", group: "Marketing" },
  { id: "Grace", group: "Engineering" },
  { id: "Heidi", group: "Product" },
]

const edgeData = [
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

const sizedNodeData = [
  { id: "Alice", group: "Engineering", connections: 3 },
  { id: "Bob", group: "Engineering", connections: 3 },
  { id: "Carol", group: "Design", connections: 3 },
  { id: "Dave", group: "Design", connections: 2 },
  { id: "Eve", group: "Marketing", connections: 2 },
  { id: "Frank", group: "Marketing", connections: 2 },
  { id: "Grace", group: "Engineering", connections: 2 },
  { id: "Heidi", group: "Product", connections: 3 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const forceDirectedGraphProps = [
  { name: "nodes", type: "array", required: true, default: null, description: "Array of node objects. Each node should have an id property." },
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects connecting nodes via source and target properties." },
  { name: "nodeIDAccessor", type: "string | function", required: false, default: '"id"', description: "Field name or function to access node IDs." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Field name or function to access edge source IDs." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Field name or function to access edge target IDs." },
  { name: "nodeLabel", type: "string | function", required: false, default: null, description: "Field name or function to determine node labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "nodeSize", type: "number | string | function", required: false, default: "8", description: "Fixed size, field name, or function to determine node radius." },
  { name: "nodeSizeRange", type: "[number, number]", required: false, default: "[5, 20]", description: "Min and max radius for nodes when using dynamic sizing." },
  { name: "edgeWidth", type: "number | string | function", required: false, default: "1", description: "Fixed width, field name, or function to determine edge stroke width." },
  { name: "edgeColor", type: "string", required: false, default: '"#999"', description: "Stroke color applied to edges." },
  { name: "edgeOpacity", type: "number", required: false, default: "0.6", description: "Opacity applied to edges." },
  { name: "iterations", type: "number", required: false, default: "300", description: "Number of force simulation iterations. Higher values produce more stable layouts." },
  { name: "forceStrength", type: "number", required: false, default: "0.1", description: "Strength of the force simulation. Lower values create looser layouts." },
  { name: "showLabels", type: "boolean", required: false, default: "false", description: "Show text labels on each node." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on nodes." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy set)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "600", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 20, bottom: 20, left: 20, right: 20 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional NetworkFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ForceDirectedGraphPage() {
  return (
    <PageLayout
      title="ForceDirectedGraph"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
      ]}
      prevPage={{ title: "Dot Plot", path: "/charts/dot-plot" }}
      nextPage={{ title: "Chord Diagram", path: "/charts/chord-diagram" }}
    >
      <ComponentMeta
        componentName="ForceDirectedGraph"
        importStatement='import { ForceDirectedGraph } from "semiotic"'
        tier="charts"
        wraps="NetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "ChordDiagram", path: "/charts/chord-diagram" },
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "NetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        ForceDirectedGraph visualizes network relationships by simulating
        physical forces that push and pull connected nodes into a stable layout.
        Pass your nodes and edges, optionally map color and size to data fields,
        and get an interactive network diagram with hover annotations and
        legends — all with sensible defaults.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest force-directed graph requires just <code>nodes</code> and{" "}
        <code>edges</code>.
      </p>

      <LiveExample
        frameProps={{
          nodes: nodeData,
          edges: edgeData,
        }}
        type={ForceDirectedGraph}
        startHidden={false}
        overrideProps={{
          nodes: `[
  { id: "Alice", group: "Engineering" },
  { id: "Bob", group: "Engineering" },
  { id: "Carol", group: "Design" },
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

      <h3 id="color-by-group">Colored by Group</h3>
      <p>
        Use <code>colorBy</code> to color nodes by a categorical field. A
        legend is displayed automatically when <code>colorBy</code> is set.
      </p>

      <LiveExample
        frameProps={{
          nodes: nodeData,
          edges: edgeData,
          colorBy: "group",
        }}
        type={ForceDirectedGraph}
        overrideProps={{
          nodes: "nodeData",
          edges: "edgeData",
          colorBy: '"group"',
        }}
        hiddenProps={{}}
      />

      <h3 id="sized-nodes">Dynamic Node Sizing</h3>
      <p>
        Map <code>nodeSize</code> to a data field and control the range with{" "}
        <code>nodeSizeRange</code>. Combined with <code>colorBy</code> and{" "}
        <code>showLabels</code>, this creates a rich overview of your network.
      </p>

      <LiveExample
        frameProps={{
          nodes: sizedNodeData,
          edges: edgeData,
          colorBy: "group",
          nodeSize: "connections",
          nodeSizeRange: [5, 20],
          showLabels: true,
          nodeLabel: "id",
        }}
        type={ForceDirectedGraph}
        overrideProps={{
          nodes: `[
  { id: "Alice", group: "Engineering", connections: 3 },
  { id: "Bob", group: "Engineering", connections: 3 },
  // ...nodes with connections field
]`,
          edges: "edgeData",
          colorBy: '"group"',
          nodeSize: '"connections"',
          nodeSizeRange: "[5, 20]",
          showLabels: "true",
          nodeLabel: '"id"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-forces">Custom Force Strength</h3>
      <p>
        Adjust <code>iterations</code> and <code>forceStrength</code> to
        control the layout density. Lower force strength produces a looser,
        more spread-out graph.
      </p>

      <LiveExample
        frameProps={{
          nodes: nodeData,
          edges: edgeData,
          colorBy: "group",
          iterations: 500,
          forceStrength: 0.02,
          edgeColor: "#ccc",
          edgeOpacity: 0.4,
        }}
        type={ForceDirectedGraph}
        overrideProps={{
          nodes: "nodeData",
          edges: "edgeData",
          colorBy: '"group"',
          iterations: "500",
          forceStrength: "0.02",
          edgeColor: '"#ccc"',
          edgeOpacity: "0.4",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ForceDirectedGraph" props={forceDirectedGraphProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom node icons, complex interactions,
        or advanced force parameters — graduate to{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly. Every{" "}
        <code>ForceDirectedGraph</code> is just a configured{" "}
        <code>NetworkFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { ForceDirectedGraph } from "semiotic"

<ForceDirectedGraph
  nodes={networkNodes}
  edges={networkEdges}
  colorBy="group"
  nodeSize="connections"
  showLabels={true}
  nodeLabel="id"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { NetworkFrame } from "semiotic"

<NetworkFrame
  nodes={networkNodes}
  edges={networkEdges}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  networkType={{
    type: "force",
    iterations: 300,
    edgeStrength: 0.1
  }}
  nodeStyle={d => ({
    fill: colorScale(d.group),
    r: sizeScale(d.connections)
  })}
  edgeStyle={{ stroke: "#999", opacity: 0.6 }}
  nodeLabels={d => d.id}
  hoverAnnotation={true}
  size={[600, 600]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on ForceDirectedGraph lets you pass any
        NetworkFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  colorBy="group"
  frameProps={{
    customNodeIcon: ({ d }) => (
      <circle r={10} fill="gold" stroke="black" />
    ),
    annotations: [
      { type: "node", id: "Alice", label: "Key Person" }
    ]
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/chord-diagram">ChordDiagram</Link> — circular layout
          for showing flow between entities
        </li>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> — flow diagram
          showing magnitude of movement between nodes
        </li>
        <li>
          <Link to="/charts/tree-diagram">TreeDiagram</Link> — hierarchical
          layouts for tree-structured data
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the underlying
          Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip content
          and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
