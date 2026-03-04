import React from "react"
import { NetworkFrame } from "semiotic"
import { TreeDiagram } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const orgData = {
  name: "CEO",
  children: [
    {
      name: "VP Engineering",
      children: [
        { name: "Frontend Lead", children: [{ name: "Dev A" }, { name: "Dev B" }] },
        { name: "Backend Lead", children: [{ name: "Dev C" }, { name: "Dev D" }] },
      ],
    },
    {
      name: "VP Design",
      children: [
        { name: "UX Lead", children: [{ name: "Designer A" }] },
        { name: "UI Lead", children: [{ name: "Designer B" }, { name: "Designer C" }] },
      ],
    },
    {
      name: "VP Marketing",
      children: [
        { name: "Content Lead" },
        { name: "Growth Lead", children: [{ name: "Analyst A" }] },
      ],
    },
  ],
}

const fileSystemData = {
  name: "src",
  children: [
    {
      name: "components",
      value: 10,
      children: [
        { name: "Button.tsx", value: 3 },
        { name: "Input.tsx", value: 2 },
        { name: "Modal.tsx", value: 5 },
      ],
    },
    {
      name: "utils",
      value: 8,
      children: [
        { name: "format.ts", value: 4 },
        { name: "validate.ts", value: 4 },
      ],
    },
    {
      name: "pages",
      value: 15,
      children: [
        { name: "Home.tsx", value: 6 },
        { name: "About.tsx", value: 4 },
        { name: "Dashboard.tsx", value: 5 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const treeDiagramProps = [
  { name: "data", type: "object", required: true, default: null, description: "Hierarchical data object with a children property (or custom accessor)." },
  { name: "layout", type: '"tree" | "cluster" | "partition" | "treemap" | "circlepack"', required: false, default: '"tree"', description: "Tree layout algorithm. Different layouts suit different data and use cases." },
  { name: "orientation", type: '"vertical" | "horizontal" | "radial"', required: false, default: '"vertical"', description: "Projection orientation: top-to-bottom, left-to-right, or circular." },
  { name: "childrenAccessor", type: "string | function", required: false, default: '"children"', description: "Field name or function to access children array from each node." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access node value. Used by treemap, circlepack, and partition layouts for sizing." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"name"', description: "Field name or function to access node identifier." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "colorByDepth", type: "boolean", required: false, default: "false", description: "Color nodes by their depth level in the hierarchy." },
  { name: "edgeStyle", type: '"line" | "curve"', required: false, default: '"curve"', description: "Edge rendering style: straight lines or curved connectors." },
  { name: "nodeLabel", type: "string | function", required: false, default: "(uses nodeIdAccessor)", description: "Label accessor for nodes." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show node labels." },
  { name: "nodeSize", type: "number", required: false, default: "5", description: "Node circle radius for tree and cluster layouts." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations." },
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

export default function TreeDiagramPage() {
  return (
    <PageLayout
      title="TreeDiagram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "TreeDiagram", path: "/charts/tree-diagram" },
      ]}
      prevPage={{ title: "Sankey Diagram", path: "/charts/sankey-diagram" }}
      nextPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
    >
      <ComponentMeta
        componentName="TreeDiagram"
        importStatement='import { TreeDiagram } from "semiotic"'
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
        TreeDiagram visualizes hierarchical data structures using a variety of
        layouts. Pass a nested JSON object and choose from tree, cluster,
        treemap, partition, or circle-packing algorithms. TreeDiagram is ideal
        for organizational charts, file systems, taxonomies, and any data with
        parent-child relationships.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest tree diagram requires just a <code>data</code> object with
        nested <code>children</code> arrays.
      </p>

      <LiveExample
        frameProps={{
          data: orgData,
        }}
        type={TreeDiagram}
        startHidden={false}
        overrideProps={{
          data: `{
  name: "CEO",
  children: [
    {
      name: "VP Engineering",
      children: [
        { name: "Frontend Lead", children: [...] },
        { name: "Backend Lead", children: [...] },
      ],
    },
    { name: "VP Design", children: [...] },
    { name: "VP Marketing", children: [...] },
  ],
}`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="horizontal-cluster">Horizontal Dendrogram</h3>
      <p>
        Use <code>layout="cluster"</code> with{" "}
        <code>orientation="horizontal"</code> for a dendrogram that flows left
        to right. Enable <code>colorByDepth</code> to visually distinguish
        hierarchy levels.
      </p>

      <LiveExample
        frameProps={{
          data: orgData,
          layout: "cluster",
          orientation: "horizontal",
          colorByDepth: true,
        }}
        type={TreeDiagram}
        overrideProps={{
          data: "orgData",
          layout: '"cluster"',
          orientation: '"horizontal"',
          colorByDepth: "true",
        }}
        hiddenProps={{}}
      />

      <h3 id="radial-tree">Radial Tree</h3>
      <p>
        Set <code>orientation="radial"</code> to arrange nodes in a circular
        layout, which works well for wide hierarchies and makes efficient use
        of space.
      </p>

      <LiveExample
        frameProps={{
          data: orgData,
          layout: "tree",
          orientation: "radial",
          colorByDepth: true,
          nodeSize: 6,
        }}
        type={TreeDiagram}
        overrideProps={{
          data: "orgData",
          layout: '"tree"',
          orientation: '"radial"',
          colorByDepth: "true",
          nodeSize: "6",
        }}
        hiddenProps={{}}
      />

      <h3 id="treemap">Treemap Layout</h3>
      <p>
        Use <code>layout="treemap"</code> with a <code>valueAccessor</code> to
        create a space-filling visualization where area encodes each node's
        value. Treemaps are great for showing proportional sizes within a
        hierarchy such as disk usage or budget allocation.
      </p>

      <LiveExample
        frameProps={{
          data: fileSystemData,
          layout: "treemap",
          valueAccessor: "value",
          colorByDepth: true,
        }}
        type={TreeDiagram}
        overrideProps={{
          data: `{
  name: "src",
  children: [
    {
      name: "components", value: 10,
      children: [
        { name: "Button.tsx", value: 3 },
        { name: "Input.tsx", value: 2 },
        { name: "Modal.tsx", value: 5 },
      ],
    },
    // ...more folders and files with value
  ],
}`,
          layout: '"treemap"',
          valueAccessor: '"value"',
          colorByDepth: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="TreeDiagram" props={treeDiagramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom node rendering, animations, or
        mixed layouts — graduate to{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly. Every{" "}
        <code>TreeDiagram</code> is just a configured{" "}
        <code>NetworkFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { TreeDiagram } from "semiotic"

<TreeDiagram
  data={hierarchyData}
  layout="cluster"
  orientation="horizontal"
  colorByDepth={true}
  showLabels={true}
  nodeSize={6}
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { NetworkFrame } from "semiotic"

<NetworkFrame
  edges={hierarchyData}
  nodeIDAccessor="name"
  networkType={{
    type: "cluster",
    projection: "horizontal"
  }}
  hierarchyChildren={d => d.children}
  nodeStyle={d => ({
    fill: depthColorScale(d.depth),
    stroke: "black",
    strokeWidth: 1
  })}
  edgeStyle={() => ({
    stroke: "#999",
    fill: "none"
  })}
  nodeSizeAccessor={() => 6}
  nodeLabels={d => d.name}
  hoverAnnotation={true}
  size={[600, 600]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on TreeDiagram lets you pass any
        NetworkFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<TreeDiagram
  data={orgChart}
  layout="tree"
  orientation="vertical"
  frameProps={{
    customNodeIcon: ({ d }) => (
      <g>
        <rect x={-30} y={-12} width={60} height={24}
              rx={4} fill="white" stroke="#333" />
        <text textAnchor="middle" dy={4}
              fontSize={10}>{d.name}</text>
      </g>
    ),
    annotations: [
      { type: "node", name: "CEO", label: "You are here" }
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
          <Link to="/charts/force-directed-graph">ForceDirectedGraph</Link> —
          force-directed layout for general network visualization
        </li>
        <li>
          <Link to="/charts/sankey-diagram">SankeyDiagram</Link> — flow diagram
          showing magnitude of movement between nodes
        </li>
        <li>
          <Link to="/charts/chord-diagram">ChordDiagram</Link> — circular layout
          for showing bidirectional flow between entities
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
