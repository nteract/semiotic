import React from "react"
import { NetworkFrame } from "semiotic"
import { Treemap } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleData = {
  name: "Budget",
  children: [
    {
      name: "Engineering",
      children: [
        { name: "Frontend", value: 180 },
        { name: "Backend", value: 220 },
        { name: "DevOps", value: 80 },
      ],
    },
    {
      name: "Marketing",
      children: [
        { name: "Digital", value: 150 },
        { name: "Content", value: 90 },
        { name: "Events", value: 60 },
      ],
    },
    {
      name: "Sales",
      children: [
        { name: "Direct", value: 200 },
        { name: "Channel", value: 130 },
      ],
    },
    { name: "HR", value: 120 },
  ],
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const treemapProps = [
  { name: "data", type: "object", required: true, default: null, description: "Hierarchical data structure with children and values." },
  { name: "childrenAccessor", type: "string | function", required: false, default: '"children"', description: "Field name or function to access children array." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access node value for sizing." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"name"', description: "Field name or function to access node identifier." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme for nodes or custom colors array." },
  { name: "colorByDepth", type: "boolean", required: false, default: "false", description: "Color nodes by hierarchy depth level." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show labels on treemap cells." },
  { name: "nodeLabel", type: "string | function", required: false, default: "nodeIdAccessor", description: "Node label accessor." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "600", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 10, bottom: 10, left: 10, right: 10 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional NetworkFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TreemapPage() {
  return (
    <PageLayout
      title="Treemap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "Treemap", path: "/charts/treemap" },
      ]}
      prevPage={{ title: "Tree Diagram", path: "/charts/tree-diagram" }}
      nextPage={{ title: "Circle Pack", path: "/charts/circle-pack" }}
    >
      <ComponentMeta
        componentName="Treemap"
        importStatement='import { Treemap } from "semiotic"'
        tier="charts"
        wraps="NetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "CirclePack", path: "/charts/circle-pack" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "NetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        Treemap visualizes hierarchical data as nested rectangles. Each
        rectangle's area is proportional to its value, making it easy to spot
        the largest and smallest items in a hierarchy. It wraps{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> with{" "}
        <code>networkType="treemap"</code>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Pass hierarchical data with <code>children</code> arrays and{" "}
        <code>value</code> fields on leaf nodes. The treemap layout sizes
        each cell proportionally.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          nodeIdAccessor: "name",
          valueAccessor: "value",
          colorBy: "name",
        }}
        type={Treemap}
        startHidden={false}
        overrideProps={{
          data: `{
  name: "Budget",
  children: [
    { name: "Engineering", children: [
      { name: "Frontend", value: 180 },
      { name: "Backend", value: 220 },
      { name: "DevOps", value: 80 }
    ]},
    { name: "Marketing", children: [
      { name: "Digital", value: 150 },
      { name: "Content", value: 90 },
      { name: "Events", value: 60 }
    ]},
    { name: "Sales", children: [
      { name: "Direct", value: 200 },
      { name: "Channel", value: 130 }
    ]},
    { name: "HR", value: 120 }
  ]
}`,
          colorBy: '"name"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-depth">Color by Depth</h3>
      <p>
        Use <code>colorByDepth</code> to automatically color nodes based on
        their level in the hierarchy.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          nodeIdAccessor: "name",
          valueAccessor: "value",
          colorByDepth: true,
        }}
        type={Treemap}
        overrideProps={{
          data: "hierarchyData",
          colorByDepth: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="Treemap" props={treemapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For full control — custom node rendering, filtered nodes, edge
        display — graduate to{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly with{" "}
        <code>{`networkType={{ type: "treemap" }}`}</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { Treemap } from "semiotic"

<Treemap
  data={hierarchyData}
  valueAccessor="value"
  colorBy="name"
  showLabels
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
  networkType={{ type: "treemap" }}
  nodeIDAccessor="name"
  nodeStyle={d => ({
    fill: colorScale(d.name),
    stroke: "#fff"
  })}
  hierarchyChildren={d => d.children}
  hierarchySum={d => d.value}
  hoverAnnotation={true}
  size={[600, 600]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/circle-pack">CirclePack</Link> — nested circles
          as an alternative hierarchical layout
        </li>
        <li>
          <Link to="/charts/tree-diagram">TreeDiagram</Link> — node-link
          diagrams for showing structural relationships
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
