import React from "react"
import { NetworkFrame } from "semiotic"
import { ChordDiagram } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const edgeData = [
  { source: "Engineering", target: "Design", value: 40 },
  { source: "Design", target: "Engineering", value: 25 },
  { source: "Engineering", target: "Marketing", value: 15 },
  { source: "Marketing", target: "Engineering", value: 10 },
  { source: "Design", target: "Marketing", value: 30 },
  { source: "Marketing", target: "Design", value: 20 },
  { source: "Engineering", target: "Sales", value: 8 },
  { source: "Sales", target: "Engineering", value: 5 },
  { source: "Marketing", target: "Sales", value: 35 },
  { source: "Sales", target: "Marketing", value: 22 },
  { source: "Design", target: "Sales", value: 12 },
  { source: "Sales", target: "Design", value: 7 },
]

const nodeData = [
  { id: "Engineering", category: "Technical" },
  { id: "Design", category: "Technical" },
  { id: "Marketing", category: "Business" },
  { id: "Sales", category: "Business" },
]

const trafficEdges = [
  { source: "Homepage", target: "Products", value: 500 },
  { source: "Homepage", target: "Blog", value: 300 },
  { source: "Homepage", target: "About", value: 100 },
  { source: "Products", target: "Homepage", value: 150 },
  { source: "Products", target: "Checkout", value: 200 },
  { source: "Blog", target: "Products", value: 120 },
  { source: "Blog", target: "Homepage", value: 80 },
  { source: "About", target: "Homepage", value: 60 },
  { source: "About", target: "Products", value: 40 },
  { source: "Checkout", target: "Homepage", value: 30 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const chordDiagramProps = [
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects with source, target, and value properties." },
  { name: "nodes", type: "array", required: false, default: "(inferred from edges)", description: "Array of node objects. Will be inferred from edges if not provided." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Field name or function to access source node identifier." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Field name or function to access target node identifier." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access edge value (width of chord)." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"id"', description: "Field name or function to access node identifier." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "edgeColorBy", type: '"source" | "target" | function', required: false, default: '"source"', description: 'Edge color strategy: "source", "target", or a custom function.' },
  { name: "padAngle", type: "number", required: false, default: "0.01", description: "Padding angle between adjacent groups in radians." },
  { name: "groupWidth", type: "number", required: false, default: "20", description: "Width of the outer arc (node) in pixels." },
  { name: "sortGroups", type: "function", required: false, default: null, description: "Sort function for groups (nodes) around the circle." },
  { name: "nodeLabel", type: "string | function", required: false, default: "(uses nodeIdAccessor)", description: "Label accessor for nodes around the circumference." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show labels around the circumference." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations." },
  { name: "edgeOpacity", type: "number", required: false, default: "0.5", description: "Opacity of the chord ribbons." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "600", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 50, left: 50, right: 50 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional NetworkFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChordDiagramPage() {
  return (
    <PageLayout
      title="ChordDiagram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "ChordDiagram", path: "/charts/chord-diagram" },
      ]}
      prevPage={{ title: "Force Directed Graph", path: "/charts/force-directed-graph" }}
      nextPage={{ title: "Sankey Diagram", path: "/charts/sankey-diagram" }}
    >
      <ComponentMeta
        componentName="ChordDiagram"
        importStatement='import { ChordDiagram } from "semiotic"'
        tier="charts"
        wraps="NetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
          { name: "SankeyDiagram", path: "/charts/sankey-diagram" },
          { name: "NetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        ChordDiagram shows the flow and magnitude of relationships between
        entities arranged in a circle. Arcs around the circumference represent
        nodes, and ribbons connecting them encode the volume of the relationship.
        Chord diagrams are especially useful when relationships are asymmetric
        and you want to highlight who sends more to whom.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest chord diagram requires just <code>edges</code> with{" "}
        <code>source</code>, <code>target</code>, and <code>value</code>{" "}
        properties. Nodes are inferred automatically from the edges.
      </p>

      <LiveExample
        frameProps={{
          edges: edgeData,
        }}
        type={ChordDiagram}
        startHidden={false}
        overrideProps={{
          edges: `[
  { source: "Engineering", target: "Design", value: 40 },
  { source: "Design", target: "Engineering", value: 25 },
  { source: "Engineering", target: "Marketing", value: 15 },
  // ...more edges with value
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="with-color">Colored by Category</h3>
      <p>
        Provide explicit <code>nodes</code> with a category field and use{" "}
        <code>colorBy</code> to color arcs by group. Use{" "}
        <code>edgeColorBy</code> to control whether chords inherit the source
        or target color.
      </p>

      <LiveExample
        frameProps={{
          nodes: nodeData,
          edges: edgeData,
          colorBy: "category",
          edgeColorBy: "source",
        }}
        type={ChordDiagram}
        overrideProps={{
          nodes: `[
  { id: "Engineering", category: "Technical" },
  { id: "Design", category: "Technical" },
  { id: "Marketing", category: "Business" },
  { id: "Sales", category: "Business" },
]`,
          edges: "edgeData",
          colorBy: '"category"',
          edgeColorBy: '"source"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-padding">Wider Groups with Padding</h3>
      <p>
        Increase <code>padAngle</code> to add spacing between arcs and{" "}
        <code>groupWidth</code> to make the outer arcs thicker.
      </p>

      <LiveExample
        frameProps={{
          edges: edgeData,
          padAngle: 0.05,
          groupWidth: 30,
          edgeOpacity: 0.35,
        }}
        type={ChordDiagram}
        overrideProps={{
          edges: "edgeData",
          padAngle: "0.05",
          groupWidth: "30",
          edgeOpacity: "0.35",
        }}
        hiddenProps={{}}
      />

      <h3 id="site-traffic">Website Traffic Flow</h3>
      <p>
        Chord diagrams work well for showing page-to-page navigation patterns
        on a website, where each arc is a page and chords represent user
        traffic between pages.
      </p>

      <LiveExample
        frameProps={{
          edges: trafficEdges,
          edgeOpacity: 0.4,
          padAngle: 0.03,
        }}
        type={ChordDiagram}
        overrideProps={{
          edges: `[
  { source: "Homepage", target: "Products", value: 500 },
  { source: "Homepage", target: "Blog", value: 300 },
  { source: "Products", target: "Checkout", value: 200 },
  // ...page-to-page traffic flows
]`,
          edgeOpacity: "0.4",
          padAngle: "0.03",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ChordDiagram" props={chordDiagramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom arc rendering, complex
        interactions, or advanced chord configuration — graduate to{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly. Every{" "}
        <code>ChordDiagram</code> is just a configured{" "}
        <code>NetworkFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { ChordDiagram } from "semiotic"

<ChordDiagram
  edges={flowData}
  colorBy="category"
  padAngle={0.05}
  groupWidth={30}
  showLabels={true}
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { NetworkFrame } from "semiotic"

<NetworkFrame
  nodes={nodeData}
  edges={flowData}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  edgeWidthAccessor="value"
  networkType={{
    type: "chord",
    padAngle: 0.05,
    groupWidth: 30
  }}
  nodeStyle={(d, i) => ({
    fill: colorScale(d.category),
    stroke: "black"
  })}
  edgeStyle={d => ({
    fill: colorScale(d.source.category),
    fillOpacity: 0.5
  })}
  nodeLabels={d => d.id}
  hoverAnnotation={true}
  size={[600, 600]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on ChordDiagram lets you pass any
        NetworkFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<ChordDiagram
  edges={flowData}
  colorBy="category"
  frameProps={{
    annotations: [
      { type: "node", id: "Engineering", label: "Largest dept" }
    ],
    customNodeIcon: ({ d }) => (
      <rect width={20} height={d.height} fill="steelblue" />
    )
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
          <Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> —
          force-directed layout for general network visualization
        </li>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> — linear flow
          diagram showing magnitude of movement through stages
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
