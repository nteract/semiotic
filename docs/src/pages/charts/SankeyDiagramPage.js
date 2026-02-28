import React from "react"
import { NetworkFrame } from "semiotic"
import { SankeyDiagram } from "semiotic"

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
  { source: "Budget", target: "Engineering", value: 400 },
  { source: "Budget", target: "Marketing", value: 250 },
  { source: "Budget", target: "Operations", value: 150 },
  { source: "Engineering", target: "Salaries", value: 300 },
  { source: "Engineering", target: "Tools", value: 100 },
  { source: "Marketing", target: "Advertising", value: 150 },
  { source: "Marketing", target: "Events", value: 100 },
  { source: "Operations", target: "Salaries", value: 100 },
  { source: "Operations", target: "Facilities", value: 50 },
]

const nodeData = [
  { id: "Budget", category: "Source" },
  { id: "Engineering", category: "Department" },
  { id: "Marketing", category: "Department" },
  { id: "Operations", category: "Department" },
  { id: "Salaries", category: "Expense" },
  { id: "Tools", category: "Expense" },
  { id: "Advertising", category: "Expense" },
  { id: "Events", category: "Expense" },
  { id: "Facilities", category: "Expense" },
]

const conversionEdges = [
  { source: "Visitors", target: "Signups", value: 1000 },
  { source: "Visitors", target: "Bounced", value: 4000 },
  { source: "Signups", target: "Free Trial", value: 800 },
  { source: "Signups", target: "Dropped", value: 200 },
  { source: "Free Trial", target: "Paid", value: 300 },
  { source: "Free Trial", target: "Cancelled", value: 500 },
  { source: "Paid", target: "Renewed", value: 200 },
  { source: "Paid", target: "Churned", value: 100 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const sankeyDiagramProps = [
  { name: "edges", type: "array", required: true, default: null, description: "Array of edge objects with source, target, and value properties." },
  { name: "nodes", type: "array", required: false, default: "(inferred from edges)", description: "Array of node objects. Will be inferred from edges if not provided." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Field name or function to access source node identifier." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Field name or function to access target node identifier." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access edge value (flow width)." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"id"', description: "Field name or function to access node identifier." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "edgeColorBy", type: '"source" | "target" | "gradient" | function', required: false, default: '"source"', description: 'Edge color strategy: "source", "target", "gradient", or a custom function.' },
  { name: "orientation", type: '"horizontal" | "vertical"', required: false, default: '"horizontal"', description: "Layout orientation. Horizontal flows left to right; vertical flows top to bottom." },
  { name: "nodeAlign", type: '"justify" | "left" | "right" | "center"', required: false, default: '"justify"', description: "Node alignment strategy within the Sankey layout." },
  { name: "nodePaddingRatio", type: "number", required: false, default: "0.05", description: "Padding between nodes as a ratio of node height." },
  { name: "nodeWidth", type: "number", required: false, default: "15", description: "Fixed width of each node in pixels." },
  { name: "nodeLabel", type: "string | function", required: false, default: "(uses nodeIdAccessor)", description: "Label accessor for nodes." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show node labels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations." },
  { name: "edgeOpacity", type: "number", required: false, default: "0.5", description: "Opacity of the flow ribbons." },
  { name: "edgeSort", type: "function", required: false, default: null, description: "Sort function for edges within each node." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "800", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "600", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 50, left: 50, right: 50 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional NetworkFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SankeyDiagramPage() {
  return (
    <PageLayout
      title="SankeyDiagram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "SankeyDiagram", path: "/charts/sankey-diagram" },
      ]}
      prevPage={{ title: "Chord Diagram", path: "/charts/chord-diagram" }}
      nextPage={{ title: "Tree Diagram", path: "/charts/tree-diagram" }}
    >
      <ComponentMeta
        componentName="SankeyDiagram"
        importStatement='import { SankeyDiagram } from "semiotic"'
        tier="charts"
        wraps="NetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "ChordDiagram", path: "/charts/chord-diagram" },
          { name: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "NetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        SankeyDiagram visualizes the flow and magnitude of movement between
        nodes in a directed acyclic graph. Nodes are arranged in columns and
        connected by ribbons whose width encodes the flow value. Sankey
        diagrams are ideal for budget allocation, conversion funnels, energy
        flows, and any data that moves through stages.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest Sankey diagram requires just <code>edges</code> with{" "}
        <code>source</code>, <code>target</code>, and <code>value</code>{" "}
        properties. Nodes are inferred automatically from the edges.
      </p>

      <LiveExample
        frameProps={{
          edges: edgeData,
        }}
        type={SankeyDiagram}
        startHidden={false}
        overrideProps={{
          edges: `[
  { source: "Budget", target: "Engineering", value: 400 },
  { source: "Budget", target: "Marketing", value: 250 },
  { source: "Engineering", target: "Salaries", value: 300 },
  // ...more edges with value
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="colored-nodes">Colored by Category</h3>
      <p>
        Use explicit <code>nodes</code> with a category field and{" "}
        <code>colorBy</code> to color both nodes and flow ribbons by stage
        type. The <code>edgeColorBy</code> prop controls whether ribbons
        inherit the source or target node color.
      </p>

      <LiveExample
        frameProps={{
          nodes: nodeData,
          edges: edgeData,
          colorBy: "category",
          edgeColorBy: "source",
        }}
        type={SankeyDiagram}
        overrideProps={{
          nodes: `[
  { id: "Budget", category: "Source" },
  { id: "Engineering", category: "Department" },
  { id: "Salaries", category: "Expense" },
  // ...nodes with category field
]`,
          edges: "edgeData",
          colorBy: '"category"',
          edgeColorBy: '"source"',
        }}
        hiddenProps={{}}
      />

      <h3 id="conversion-funnel">Conversion Funnel</h3>
      <p>
        Sankey diagrams are a natural fit for conversion funnels, where users
        flow from one stage to the next and drop off along the way.
      </p>

      <LiveExample
        frameProps={{
          edges: conversionEdges,
          nodeWidth: 20,
          nodePaddingRatio: 0.08,
          edgeOpacity: 0.4,
        }}
        type={SankeyDiagram}
        overrideProps={{
          edges: `[
  { source: "Visitors", target: "Signups", value: 1000 },
  { source: "Visitors", target: "Bounced", value: 4000 },
  { source: "Signups", target: "Free Trial", value: 800 },
  { source: "Free Trial", target: "Paid", value: 300 },
  // ...funnel stages
]`,
          nodeWidth: "20",
          nodePaddingRatio: "0.08",
          edgeOpacity: "0.4",
        }}
        hiddenProps={{}}
      />

      <h3 id="node-alignment">Node Alignment Options</h3>
      <p>
        The <code>nodeAlign</code> prop controls how nodes are distributed
        across columns. Use <code>"left"</code> to pack nodes toward the start
        of the flow.
      </p>

      <LiveExample
        frameProps={{
          edges: edgeData,
          nodeAlign: "left",
          nodeWidth: 12,
          edgeOpacity: 0.35,
        }}
        type={SankeyDiagram}
        overrideProps={{
          edges: "edgeData",
          nodeAlign: '"left"',
          nodeWidth: "12",
          edgeOpacity: "0.35",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="SankeyDiagram" props={sankeyDiagramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom node rendering, drag
        interactions, or complex Sankey configuration — graduate to{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly. Every{" "}
        <code>SankeyDiagram</code> is just a configured{" "}
        <code>NetworkFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { SankeyDiagram } from "semiotic"

<SankeyDiagram
  edges={flowData}
  nodes={nodeData}
  colorBy="category"
  edgeColorBy="source"
  nodeWidth={20}
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
    type: "sankey",
    orient: "justify",
    nodePaddingRatio: 0.05,
    nodeWidth: 20
  }}
  nodeStyle={d => ({
    fill: colorScale(d.category),
    stroke: "black"
  })}
  edgeStyle={d => ({
    fill: colorScale(d.source.category),
    fillOpacity: 0.5,
    stroke: "black",
    strokeWidth: 0.5
  })}
  nodeLabels={d => d.id}
  hoverAnnotation={true}
  size={[800, 600]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on SankeyDiagram lets you pass any
        NetworkFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<SankeyDiagram
  edges={flowData}
  colorBy="category"
  frameProps={{
    annotations: [
      { type: "node", id: "Engineering", label: "Largest department" }
    ],
    customNodeIcon: ({ d }) => (
      <rect
        width={15}
        height={d.nodeHeight}
        fill={colorScale(d.category)}
        rx={3}
      />
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
          <Link to="/charts/chord-diagram">ChordDiagram</Link> — circular layout
          for showing bidirectional flow between entities
        </li>
        <li>
          <Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> —
          force-directed layout for general network visualization
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
