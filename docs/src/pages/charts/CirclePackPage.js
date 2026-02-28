import React from "react"
import { NetworkFrame } from "semiotic"
import { CirclePack } from "semiotic"

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
  name: "Languages",
  children: [
    {
      name: "Frontend",
      children: [
        { name: "JavaScript", value: 300 },
        { name: "TypeScript", value: 250 },
        { name: "CSS", value: 120 },
      ],
    },
    {
      name: "Backend",
      children: [
        { name: "Python", value: 280 },
        { name: "Go", value: 180 },
        { name: "Rust", value: 100 },
        { name: "Java", value: 200 },
      ],
    },
    {
      name: "Data",
      children: [
        { name: "SQL", value: 220 },
        { name: "R", value: 90 },
      ],
    },
  ],
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const circlePackProps = [
  { name: "data", type: "object", required: true, default: null, description: "Hierarchical data structure with children and values." },
  { name: "childrenAccessor", type: "string | function", required: false, default: '"children"', description: "Field name or function to access children array." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access node value for sizing." },
  { name: "nodeIdAccessor", type: "string | function", required: false, default: '"name"', description: "Field name or function to access node identifier." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine node color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme for nodes or custom colors array." },
  { name: "colorByDepth", type: "boolean", required: false, default: "false", description: "Color nodes by hierarchy depth level." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show labels on circles." },
  { name: "nodeLabel", type: "string | function", required: false, default: "nodeIdAccessor", description: "Node label accessor." },
  { name: "circleOpacity", type: "number", required: false, default: "0.7", description: "Circle fill opacity (helps see nesting)." },
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

export default function CirclePackPage() {
  return (
    <PageLayout
      title="CirclePack"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Network", path: "/charts" },
        { label: "CirclePack", path: "/charts/circle-pack" },
      ]}
      prevPage={{ title: "Treemap", path: "/charts/treemap" }}
      nextPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
    >
      <ComponentMeta
        componentName="CirclePack"
        importStatement='import { CirclePack } from "semiotic"'
        tier="charts"
        wraps="NetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "Treemap", path: "/charts/treemap" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "NetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        CirclePack visualizes hierarchical data as nested circles. Each
        circle's area is proportional to its value, and nesting shows the
        hierarchy. It wraps{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> with{" "}
        <code>networkType="circlepack"</code>. Use{" "}
        <code>circleOpacity</code> to control transparency so nested circles
        remain visible.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Pass hierarchical data with <code>children</code> arrays and{" "}
        <code>value</code> fields on leaf nodes.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          nodeIdAccessor: "name",
          valueAccessor: "value",
          colorByDepth: true,
        }}
        type={CirclePack}
        startHidden={false}
        overrideProps={{
          data: `{
  name: "Languages",
  children: [
    { name: "Frontend", children: [
      { name: "JavaScript", value: 300 },
      { name: "TypeScript", value: 250 },
      { name: "CSS", value: 120 }
    ]},
    { name: "Backend", children: [
      { name: "Python", value: 280 },
      { name: "Go", value: 180 },
      { name: "Rust", value: 100 },
      { name: "Java", value: 200 }
    ]},
    { name: "Data", children: [
      { name: "SQL", value: 220 },
      { name: "R", value: 90 }
    ]}
  ]
}`,
          colorByDepth: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-name">Color by Name</h3>
      <p>
        Use <code>colorBy</code> to assign colors based on a data field.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          nodeIdAccessor: "name",
          valueAccessor: "value",
          colorBy: "name",
          circleOpacity: 0.5,
        }}
        type={CirclePack}
        overrideProps={{
          data: "hierarchyData",
          colorBy: '"name"',
          circleOpacity: "0.5",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="CirclePack" props={circlePackProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For full control, use{" "}
        <Link to="/frames/network-frame">NetworkFrame</Link> directly with{" "}
        <code>{`networkType={{ type: "circlepack" }}`}</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { CirclePack } from "semiotic"

<CirclePack
  data={hierarchyData}
  valueAccessor="value"
  colorByDepth
  circleOpacity={0.6}
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
  networkType={{ type: "circlepack" }}
  nodeIDAccessor="name"
  nodeStyle={d => ({
    fill: colorScale(d.depth),
    fillOpacity: 0.6,
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
          <Link to="/charts/treemap">Treemap</Link> — nested rectangles as
          an alternative hierarchical layout
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
