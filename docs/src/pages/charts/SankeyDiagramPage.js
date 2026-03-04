import React, { useRef, useEffect, useState } from "react"
import { SankeyDiagram, StreamNetworkFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Responsive container hook
// ---------------------------------------------------------------------------

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

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
// Streaming data sets
// ---------------------------------------------------------------------------

const BUDGET_EDGES = [
  { source: "Salary", target: "Budget", value: 5000 },
  { source: "Freelance", target: "Budget", value: 1500 },
  { source: "Budget", target: "Rent", value: 2000 },
  { source: "Budget", target: "Food", value: 800 },
  { source: "Budget", target: "Transport", value: 400 },
  { source: "Budget", target: "Savings", value: 1500 },
  { source: "Budget", target: "Entertainment", value: 500 },
  { source: "Savings", target: "Stocks", value: 1000 },
  { source: "Savings", target: "Emergency", value: 500 }
]

const MORE_EDGES = [
  { source: "Budget", target: "Insurance", value: 300 },
  { source: "Budget", target: "Utilities", value: 200 },
  { source: "Freelance", target: "Taxes", value: 500 },
  { source: "Entertainment", target: "Streaming", value: 50 },
  { source: "Entertainment", target: "Dining", value: 250 },
  { source: "Food", target: "Groceries", value: 500 },
  { source: "Food", target: "Dining", value: 300 }
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
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamNetworkFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Streaming Quick Start demo
// ---------------------------------------------------------------------------

const streamingSankeyCode = `import { useRef } from "react"
import { StreamNetworkFrame } from "semiotic"

function StreamingSankey() {
  const chartRef = useRef()

  const pushBudget = () => {
    chartRef.current?.push({ source: "Budget", target: "Engineering", value: 400 })
    chartRef.current?.push({ source: "Budget", target: "Marketing", value: 250 })
    chartRef.current?.push({ source: "Engineering", target: "Salaries", value: 300 })
    chartRef.current?.push({ source: "Marketing", target: "Advertising", value: 150 })
  }

  return (
    <>
      <button onClick={pushBudget}>Push Budget Data</button>
      <StreamNetworkFrame
        ref={chartRef}
        chartType="sankey"
        size={[800, 400]}
        showParticles
        edgeOpacity={0.4}
      />
    </>
  )
}`

function StreamingSankeyDemo({ width }) {
  const chartRef = useRef()
  const [pushed, setPushed] = useState(false)

  const pushData = () => {
    if (!chartRef.current) return
    BUDGET_EDGES.forEach(e => chartRef.current.push(e))
    setPushed(true)
  }

  const addMore = () => {
    if (!chartRef.current) return
    chartRef.current.push({
      source: "Budget",
      target: "Insurance",
      value: Math.round(Math.random() * 200 + 50)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
        <button className="demo-button" onClick={pushData}>Load Budget</button>
        <button className="demo-button" onClick={addMore} disabled={!pushed}>Add Edge</button>
        <button className="demo-button" onClick={() => { chartRef.current?.clear(); setPushed(false) }}>Clear</button>
      </div>
      <StreamNetworkFrame
        ref={chartRef}
        chartType="sankey"
        size={[width, 350]}
        showParticles
        edgeOpacity={0.4}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interactive push demo (from former RealtimeSankey page)
// ---------------------------------------------------------------------------

function PushApiDemo() {
  const chartRef = useRef()
  const [containerRef, containerWidth] = useContainerWidth()
  const [edgeCount, setEdgeCount] = useState(0)

  const pushInitial = () => {
    if (!chartRef.current) return
    chartRef.current.clear()
    for (const edge of BUDGET_EDGES) {
      chartRef.current.push(edge)
    }
    setEdgeCount(BUDGET_EDGES.length)
  }

  const pushMore = () => {
    if (!chartRef.current) return
    const edge = MORE_EDGES[edgeCount % MORE_EDGES.length]
    chartRef.current.push(edge)
    setEdgeCount((c) => c + 1)
  }

  const pushIncrement = () => {
    if (!chartRef.current) return
    const randomEdge = BUDGET_EDGES[Math.floor(Math.random() * BUDGET_EDGES.length)]
    chartRef.current.push({
      source: randomEdge.source,
      target: randomEdge.target,
      value: Math.round(Math.random() * 200 + 50)
    })
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="demo-button" onClick={pushInitial}>
          Load Budget Data
        </button>
        <button className="demo-button" onClick={pushMore}>
          Add Edge
        </button>
        <button className="demo-button" onClick={pushIncrement}>
          Increment Random Edge
        </button>
        <button className="demo-button" onClick={() => { chartRef.current?.clear(); setEdgeCount(0) }}>
          Clear
        </button>
      </div>
      <div
        ref={containerRef}
        style={{
          background: "var(--surface-1)",
          borderRadius: 8,
          padding: 16,
          border: "1px solid var(--surface-3)",
          overflow: "hidden"
        }}
      >
        {containerWidth && (
          <StreamNetworkFrame
            ref={chartRef}
            chartType="sankey"
            size={[containerWidth, 400]}
            showParticles
            edgeOpacity={0.4}
            particleStyle={{
              radius: 2.5,
              opacity: 0.6,
              spawnRate: 0.05,
              speedMultiplier: 0.8
            }}
          />
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Continuous streaming demo (from former RealtimeSankey page)
// ---------------------------------------------------------------------------

function ContinuousStreamDemo() {
  const chartRef = useRef()
  const [containerRef, containerWidth] = useContainerWidth()
  const [running, setRunning] = useState(false)

  const PIPELINE = [
    { source: "Ingest", target: "Validate", w: 3 },
    { source: "Validate", target: "Process", w: 3 },
    { source: "Validate", target: "Reject", w: 1 },
    { source: "Process", target: "Store", w: 2 },
    { source: "Process", target: "Cache", w: 2 },
    { source: "Store", target: "Serve", w: 2 },
    { source: "Cache", target: "Serve", w: 3 },
    { source: "Serve", target: "Ingest", w: 1 }
  ]

  useEffect(() => {
    if (!running) return
    const totalW = PIPELINE.reduce((s, l) => s + l.w, 0)
    const id = setInterval(() => {
      if (!chartRef.current) return
      let r = Math.random() * totalW
      let link = PIPELINE[0]
      for (const l of PIPELINE) {
        r -= l.w
        if (r <= 0) { link = l; break }
      }
      chartRef.current.push({
        source: link.source,
        target: link.target,
        value: Math.round(Math.random() * 80 + 20)
      })
    }, 350)
    return () => clearInterval(id)
  }, [running])

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button className="demo-button" onClick={() => setRunning(!running)}>
          {running ? "Stop" : "Start"} Streaming
        </button>
        <button className="demo-button" onClick={() => { chartRef.current?.clear(); setRunning(false) }}>
          Clear
        </button>
      </div>
      <div
        ref={containerRef}
        style={{
          background: "var(--surface-1)",
          borderRadius: 8,
          padding: 16,
          border: "1px solid var(--surface-3)",
          overflow: "hidden"
        }}
      >
        {containerWidth && (
          <StreamNetworkFrame
            ref={chartRef}
            chartType="sankey"
            size={[containerWidth, 450]}
            showParticles
            edgeOpacity={0.35}
            particleStyle={{
              radius: 2,
              opacity: 0.5,
              spawnRate: 0.03,
              speedMultiplier: 1.2
            }}
            tensionConfig={{ threshold: 2.0 }}
          />
        )}
      </div>
    </div>
  )
}

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
        wraps="StreamNetworkFrame"
        wrapsPath="/frames/network-frame"
        related={[
          { name: "ChordDiagram", path: "/charts/chord-diagram" },
          { name: "ForceDirectedGraph", path: "/charts/force-directed-graph" },
          { name: "TreeDiagram", path: "/charts/tree-diagram" },
          { name: "StreamNetworkFrame", path: "/frames/network-frame" },
        ]}
      />

      <p>
        SankeyDiagram visualizes the flow and magnitude of movement between
        nodes in a directed acyclic graph. Nodes are arranged in columns and
        connected by ribbons whose width encodes the flow value. Sankey
        diagrams are ideal for budget allocation, conversion funnels, energy
        flows, and any data that moves through stages. They also support
        streaming data — push edges imperatively and watch the topology grow
        with animated particles.
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

      <StreamingToggle
        staticContent={
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
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingSankeyDemo width={w} />}
            code={streamingSankeyCode}
          />
        }
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
      {/* Streaming */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="streaming">Streaming</h2>

      <p>
        Use <code>StreamNetworkFrame</code> with <code>chartType="sankey"</code>{" "}
        to build streaming Sankey diagrams. Push edges imperatively via a ref and
        watch nodes, links, and animated particles appear. The tension model
        batches relayouts for smooth performance during high-frequency updates.
      </p>

      <h3 id="push-api">Interactive Push API</h3>
      <p>
        Click <strong>Load Budget Data</strong> to seed the Sankey with a personal budget flow.
        Then click <strong>Add Edge</strong> to grow the topology or <strong>Increment Random Edge</strong> to
        increase flow on an existing link. Particles animate along links proportional to their value.
      </p>
      <PushApiDemo />

      <CodeBlock
        code={`const chartRef = useRef()

// Push edges at any frequency
chartRef.current.push({ source: "Salary", target: "Budget", value: 5000 })
chartRef.current.push({ source: "Budget", target: "Rent", value: 2000 })

<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  size={[800, 400]}
  showParticles
  edgeOpacity={0.4}
/>`}
        language="jsx"
      />

      <h3 id="continuous-streaming">Continuous Streaming</h3>
      <p>
        Click <strong>Start Streaming</strong> to continuously push random edges between
        infrastructure nodes. The tension model automatically triggers relayouts as the
        topology evolves. Includes a feedback cycle (Serve → Ingest) to demonstrate
        circular link handling.
      </p>
      <ContinuousStreamDemo />

      <CodeBlock
        code={`useEffect(() => {
  const id = setInterval(() => {
    chartRef.current.push({
      source: randomNode(),
      target: randomNode(),
      value: Math.round(Math.random() * 100)
    })
  }, 300)
  return () => clearInterval(id)
}, [])`}
        language="jsx"
      />

      <h3 id="push-ref-handle">Push API Reference</h3>
      <p>Access these methods via a React ref on <code>StreamNetworkFrame</code>:</p>
      <ul>
        <li><code>push(edge)</code> — push a single edge <code>{`{ source, target, value }`}</code></li>
        <li><code>pushMany(edges)</code> — batch push multiple edges</li>
        <li><code>clear()</code> — reset the graph</li>
        <li><code>getTopology()</code> — get current <code>{`{ nodes, edges }`}</code></li>
        <li><code>relayout()</code> — force a full relayout</li>
        <li><code>getTension()</code> — current accumulated tension value</li>
      </ul>

      <h3 id="tension-model">Tension Model</h3>
      <p>
        Each push adds tension proportional to topological disruption. When tension exceeds
        the threshold, a full d3-sankey relayout runs with smooth ease-out animation.
      </p>
      <ul>
        <li>New node: +1.0 tension</li>
        <li>New edge: +0.5 tension</li>
        <li>Weight change: +0.1 tension</li>
        <li>Default threshold: 3.0</li>
      </ul>

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
        <Link to="/frames/network-frame">StreamNetworkFrame</Link> directly.
        Every <code>SankeyDiagram</code> is just a configured{" "}
        <code>StreamNetworkFrame</code> under the hood.
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
            code={`import { StreamNetworkFrame } from "semiotic"

<StreamNetworkFrame
  chartType="sankey"
  nodes={nodeData}
  edges={flowData}
  nodeIDAccessor="id"
  sourceAccessor="source"
  targetAccessor="target"
  valueAccessor="value"
  nodeAlign="justify"
  nodePaddingRatio={0.05}
  nodeWidth={20}
  showLabels
  enableHover
  showParticles
  size={[800, 600]}
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
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip content
          and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
