import React, { useState, useCallback } from "react"
import { LineChart, BarChart, SankeyDiagram, OrbitDiagram, LinkedCharts } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ── Fake comment thread component ────────────────────────────────────────

function CommentThread({ label, onClose }) {
  const [comments, setComments] = useState([
    { author: "Alex", text: "This value looks anomalous — investigating." },
  ])
  const [draft, setDraft] = useState("")

  return (
    <div style={{
      position: "absolute", zIndex: 100,
      background: "var(--surface-1, white)", border: "1px solid var(--surface-3, #ddd)",
      borderRadius: 8, padding: 12, width: 240, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      fontSize: 13, lineHeight: 1.4,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{label}</strong>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>x</button>
      </div>
      {comments.map((c, i) => (
        <div key={i} style={{ marginBottom: 6, padding: "4px 0", borderBottom: "1px solid var(--surface-3, #eee)" }}>
          <strong style={{ fontSize: 11 }}>{c.author}</strong>
          <div>{c.text}</div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add comment..."
          style={{ flex: 1, padding: "4px 6px", borderRadius: 4, border: "1px solid var(--surface-3, #ccc)", fontSize: 12 }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              setComments(prev => [...prev, { author: "You", text: draft.trim() }])
              setDraft("")
            }
          }}
        />
      </div>
    </div>
  )
}

// ── Alert widget — emoji button that opens a comment thread ──────────────

function AlertWidget({ label, emoji = "\u26a0\ufe0f" }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 18, lineHeight: 1, padding: 0,
        }}
        title={label}
      >
        {emoji}
      </button>
      {open && (
        <div style={{ position: "absolute", left: 20, top: -10 }}>
          <CommentThread label={label} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

// ── Sample data ──────────────────────────────────────────────────────────

const lineData = [
  { month: 1, revenue: 12 }, { month: 2, revenue: 18 },
  { month: 3, revenue: 14 }, { month: 4, revenue: 32 },
  { month: 5, revenue: 19 }, { month: 6, revenue: 27 },
  { month: 7, revenue: 24 }, { month: 8, revenue: 31 },
]

const barData = [
  { region: "North", sales: 112 },
  { region: "South", sales: 45 },
  { region: "East", sales: 95 },
  { region: "West", sales: 68 },
]

const sankeyEdges = [
  { source: "Budget", target: "Engineering", value: 50 },
  { source: "Budget", target: "Marketing", value: 30 },
  { source: "Budget", target: "Sales", value: 20 },
  { source: "Engineering", target: "Cloud", value: 35 },
  { source: "Engineering", target: "Infra", value: 15 },
  { source: "Marketing", target: "Ads", value: 20 },
  { source: "Marketing", target: "Content", value: 10 },
]

const orbitData = {
  name: "Platform",
  children: [
    { name: "API", children: [{ name: "Auth" }, { name: "Gateway" }, { name: "Rate Limit" }] },
    { name: "Data", children: [{ name: "Pipeline" }, { name: "Warehouse" }] },
    { name: "Frontend", children: [{ name: "Dashboard" }, { name: "Mobile" }] },
  ]
}

// ── Page ─────────────────────────────────────────────────────────────────

export default function AnnotationFlowPage() {
  return (
    <PageLayout
      title="Advanced Annotations"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Advanced Annotations", path: "/features/advanced-annotations" },
      ]}
      prevPage={{ title: "Annotations", path: "/features/annotations" }}
    >
      <p>
        The <code>widget</code> annotation type places arbitrary React content
        at data coordinates. Use it for alert icons, comment threads, action
        buttons, or any interactive element that lives <em>in the data space</em>
        rather than in a sidebar or toolbar.
      </p>
      <p>
        By default, a widget renders an <strong>{"ℹ️"}</strong> info emoji. Pass a
        {" "}<code>content</code> prop with any React element to customize it.
        Widgets support <code>dx</code>/<code>dy</code> offsets and work across
        all chart types.
      </p>

      <CodeBlock
        code={`// Widget annotation — place any React element at a data point
{
  type: "widget",
  x: 4,            // data coordinate (or use pointId)
  y: 32,
  dx: 0,           // pixel offset from data point
  dy: -20,
  width: 32,       // widget dimensions
  height: 32,
  content: <MyAlertButton onClick={openThread} />,  // any React element
}

// Default (no content prop): renders ℹ️ emoji`}
        language="jsx"
      />

      {/* ── Line Chart with widget annotation ───────────────────────── */}
      <h2 id="line-chart">Line Chart</h2>
      <p>
        An alert on the spike at month 4 opens a comment thread discussing
        the anomalous revenue.
      </p>

      <div style={{ marginBottom: 24 }}>
        <LineChart
          data={lineData}
          xAccessor="month"
          yAccessor="revenue"
          xLabel="Month"
          yLabel="Revenue ($K)"
          showGrid
          showPoints
          width={600}
          height={350}
          annotations={[
            {
              type: "widget",
              month: 4,
              revenue: 32,
              dy: -4,
              width: 36,
              height: 36,
              content: <AlertWidget label="Month 4 spike" emoji={"\u26a0\ufe0f"} />,
            },
          ]}
        />
      </div>

      <CodeBlock
        code={`<LineChart
  data={revenueData}
  xAccessor="month"
  yAccessor="revenue"
  showPoints
  annotations={[
    {
      type: "widget",
      month: 4,       // x-coordinate in data space
      revenue: 32,    // y-coordinate in data space
      dy: -24,
      content: <AlertWidget label="Month 4 spike" />,
    },
  ]}
/>`}
        language="jsx"
      />

      {/* ── Bar Chart with widget annotation ────────────────────────── */}
      <h2 id="bar-chart">Bar Chart</h2>
      <p>
        A warning on the underperforming South region.
      </p>

      <div style={{ marginBottom: 24 }}>
        <BarChart
          data={barData}
          categoryAccessor="region"
          valueAccessor="sales"
          colorBy="region"
          width={600}
          height={350}
          annotations={[
            {
              type: "widget",
              region: "South",
              sales: 45,
              dy: -10,
              width: 36,
              height: 36,
              content: <AlertWidget label="South underperforming" emoji={"\u26a0\ufe0f"} />,
            },
          ]}
        />
      </div>

      {/* ── Sankey with widget annotation ────────────────────────────── */}
      <h2 id="sankey">Sankey Diagram</h2>
      <p>
        Widget annotations on network charts anchor to nodes by
        {" "}<code>nodeId</code>. The widget tracks the node's rendered position.
      </p>

      <div style={{ marginBottom: 24 }}>
        <SankeyDiagram
          edges={sankeyEdges}
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
          showLabels
          width={600}
          height={350}
          margin={{ top: 10, right: 60, bottom: 10, left: 10 }}
          frameProps={{
            annotations: [
              {
                type: "widget",
                nodeId: "Cloud",
                dy: -14,
                width: 36,
                height: 36,
                content: <AlertWidget label="Cloud costs over budget" emoji={"\u26a0\ufe0f"} />,
              },
              {
                type: "widget",
                nodeId: "Infra",
                dy: -14,
                width: 36,
                height: 36,
                content: <AlertWidget label="Infra capacity warning" emoji={"\ud83d\udea8"} />,
              },
            ],
          }}
        />
      </div>

      {/* ── Orbit Diagram with widget annotation ─────────────────────── */}
      <h2 id="orbit">Orbit Diagram</h2>
      <p>
        Widget annotations on OrbitDiagram anchor to nodes by <code>nodeId</code>.
        They track the node as it orbits.
      </p>

      <div style={{ marginBottom: 24 }}>
        <OrbitDiagram
          data={orbitData}
          childrenAccessor="children"
          nodeIdAccessor="name"
          colorByDepth
          showLabels
          speed={0.3}
          nodeRadius={8}
          width={500}
          height={500}
          annotations={[
            {
              type: "widget",
              nodeId: "Pipeline",
              dy: -10,
              width: 36,
              height: 36,
              content: <AlertWidget label="Pipeline latency alert" emoji={"\u26a0\ufe0f"} />,
            },
            {
              type: "widget",
              nodeId: "Auth",
              dy: -10,
              width: 36,
              height: 36,
              content: <AlertWidget label="Auth rate limit exceeded" emoji={"\ud83d\udea8"} />,
            },
          ]}
        />
      </div>

      <CodeBlock
        code={`<OrbitDiagram
  data={systemTopology}
  childrenAccessor="children"
  nodeIdAccessor="name"
  colorByDepth
  showLabels
  annotations={[
    {
      type: "widget",
      nodeId: "Pipeline",      // anchors to this node
      dy: -20,                  // offset above the node
      content: <AlertWidget label="Pipeline latency alert" />,
    },
  ]}
/>`}
        language="jsx"
      />

      {/* ── Building custom widgets ──────────────────────────────────── */}
      <h2 id="custom-widgets">Building Custom Widgets</h2>

      <p>
        A widget is any React component. The annotation positions it at data
        coordinates — you control what it renders and how it behaves.
      </p>

      <CodeBlock
        code={`// Alert button that opens a comment thread
function AlertWidget({ label, emoji = "⚠️" }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}
        title={label}>
        {emoji}
      </button>
      {open && <CommentThread label={label} onClose={() => setOpen(false)} />}
    </div>
  )
}

// Use it in any chart's annotations array:
annotations={[
  {
    type: "widget",
    x: dataPoint.x,
    y: dataPoint.y,
    content: <AlertWidget label="Investigate this point" />,
  },
]}`}
        language="jsx"
      />

      <h2 id="patterns">Patterns</h2>

      <ul>
        <li>
          <strong>Alerts</strong> — place warning/error icons on anomalous data
          points. Click to open investigation context.
        </li>
        <li>
          <strong>Comments</strong> — anchor discussion threads to specific data
          coordinates. Persist via your backend; the widget is just the UI anchor.
        </li>
        <li>
          <strong>Actions</strong> — deploy buttons that trigger workflows
          (acknowledge alert, create ticket, share snapshot) directly from the
          data point.
        </li>
        <li>
          <strong>Live feeds</strong> — embed mini status indicators
          (sparklines, traffic lights) at key nodes in a network diagram.
        </li>
      </ul>

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/features/annotations">Annotations</Link> — labels, thresholds, bands, enclose</li>
        <li><Link to="/features/observation-hooks">Observation Hooks</Link> — structured events for AI agents</li>
        <li><Link to="/charts/orbit-diagram">OrbitDiagram</Link> — animated orbital hierarchy</li>
        <li><Link to="/features/streaming-system-model">Streaming System Model</Link> — DetailsPanel for click-to-inspect</li>
      </ul>
    </PageLayout>
  )
}
