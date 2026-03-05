import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  SankeyDiagram,
  ChartContainer,
  DetailsPanel,
  LinkedCharts,
  useChartObserver,
  StreamNetworkFrame
} from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import StreamingDemo from "../../components/StreamingDemo"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data: a microservice architecture
// ---------------------------------------------------------------------------

const systemNodes = [
  { id: "API Gateway" },
  { id: "Auth Service" },
  { id: "User Service" },
  { id: "Order Service" },
  { id: "Payment Service" },
  { id: "Notification Service" },
  { id: "Database" },
  { id: "Cache" },
]

const systemEdges = [
  { source: "API Gateway", target: "Auth Service", value: 120 },
  { source: "API Gateway", target: "User Service", value: 85 },
  { source: "API Gateway", target: "Order Service", value: 200 },
  { source: "Auth Service", target: "Cache", value: 90 },
  { source: "User Service", target: "Database", value: 60 },
  { source: "Order Service", target: "Payment Service", value: 180 },
  { source: "Order Service", target: "Database", value: 150 },
  { source: "Payment Service", target: "Notification Service", value: 45 },
  { source: "Notification Service", target: "Database", value: 30 },
]

// ---------------------------------------------------------------------------
// Demo 1: DetailsPanel with click
// ---------------------------------------------------------------------------

function DetailsPanelDemo() {
  return (
    <LinkedCharts>
      <ChartContainer
        title="Microservice Architecture"
        status="live"
        actions={{ fullscreen: true }}
        detailsPanel={
          <DetailsPanel position="right" size={260} trigger="click">
            {(datum) => (
              <div style={{ fontSize: 13 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 15 }}>{datum.id || "Edge"}</h4>
                {datum.value != null && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "var(--text-secondary, #666)" }}>Throughput:</span>{" "}
                    <strong>{datum.value.toLocaleString()} req/s</strong>
                  </div>
                )}
                {datum.sourceLinks && (
                  <div style={{ marginBottom: 8 }}>
                    <span style={{ color: "var(--text-secondary, #666)" }}>Connections:</span>{" "}
                    <strong>{(datum.sourceLinks?.length || 0) + (datum.targetLinks?.length || 0)}</strong>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 16,
                    padding: "8px 12px",
                    background: "var(--surface-1, #f8f9fa)",
                    borderRadius: 6,
                    fontSize: 11,
                    fontFamily: "var(--font-code, monospace)",
                    color: "var(--text-secondary, #666)",
                  }}
                >
                  Click any node to inspect
                </div>
              </div>
            )}
          </DetailsPanel>
        }
        height={420}
      >
        <SankeyDiagram
          nodes={systemNodes}
          edges={systemEdges}
          sourceAccessor="source"
          targetAccessor="target"
          valueAccessor="value"
          width={700}
          height={420}
          onObservation={() => {}}
          chartId="system-sankey"
        />
      </ChartContainer>
    </LinkedCharts>
  )
}

// ---------------------------------------------------------------------------
// Demo 2: Streaming with proportional speed + thresholds + topology diff
// ---------------------------------------------------------------------------

const SERVICES = ["API Gateway", "Auth", "Users", "Orders", "Payments", "Notifications", "DB", "Cache"]
const ROUTES = [
  ["API Gateway", "Auth"],
  ["API Gateway", "Users"],
  ["API Gateway", "Orders"],
  ["Auth", "Cache"],
  ["Users", "DB"],
  ["Orders", "Payments"],
  ["Orders", "DB"],
  ["Payments", "Notifications"],
  ["Notifications", "DB"],
]

const THRESHOLD_CONFIG = {
  metric: (node) => node.value || 0,
  warning: 100,
  critical: 250,
  warningColor: "#f59e0b",
  criticalColor: "#ef4444",
}

const PARTICLE_STYLE = {
  proportionalSpeed: true,
  spawnRate: 0.08,
  radius: 2.5,
  opacity: 0.8,
}

const TENSION_CONFIG = { transitionDuration: 600 }
const STALENESS_CONFIG = { threshold: 3000, showBadge: true, dimOpacity: 0.4 }

function StreamingSystemDemo({ width }) {
  const chartRef = useRef()
  const intervalRef = useRef(null)
  const [isRunning, setIsRunning] = useState(false)
  const [lastClickObs, setLastClickObs] = useState(null)

  const handleObservation = useCallback((obs) => {
    if (obs.type === "click" || obs.type === "click-end") {
      setLastClickObs(obs)
    }
  }, [])

  const start = useCallback(() => {
    if (intervalRef.current) return
    setIsRunning(true)

    // Seed initial topology
    for (const [source, target] of ROUTES) {
      chartRef.current?.push({ source, target, value: 5 + Math.floor(Math.random() * 20) })
    }

    intervalRef.current = setInterval(() => {
      const route = ROUTES[Math.floor(Math.random() * ROUTES.length)]
      chartRef.current?.push({
        source: route[0],
        target: route[1],
        value: 1 + Math.floor(Math.random() * 15),
      })

      // Occasionally add a new service (topology change)
      if (Math.random() < 0.02) {
        const newService = `Service-${Math.floor(Math.random() * 100)}`
        const existingService = SERVICES[Math.floor(Math.random() * SERVICES.length)]
        chartRef.current?.push({
          source: existingService,
          target: newService,
          value: 3,
        })
      }
    }, 300)
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button onClick={start} disabled={isRunning} style={btnStyle}>
          Start Streaming
        </button>
        <button onClick={stop} disabled={!isRunning} style={btnStyle}>
          Stop
        </button>
        <button
          onClick={() => { stop(); chartRef.current?.clear() }}
          style={btnStyle}
        >
          Clear
        </button>
      </div>
      <ChartContainer
        title="Live System Topology"
        status={isRunning ? "live" : "paused"}
        actions={{ fullscreen: true }}
        height={400}
        detailsPanel={
          <DetailsPanel position="right" size={240} trigger="click" observation={lastClickObs}>
            {(datum) => {
              const val = datum.value || 0
              const status = val >= 250 ? "critical" : val >= 100 ? "warning" : "normal"
              const statusColor = status === "critical" ? "#ef4444" : status === "warning" ? "#f59e0b" : "#22c55e"
              const statusLabel = status === "critical" ? "Critical" : status === "warning" ? "Warning" : "Normal"

              return (
                <div style={{ fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: statusColor, display: "inline-block", flexShrink: 0,
                    }} />
                    <h4 style={{ margin: 0, fontSize: 15 }}>{datum.id || "Edge"}</h4>
                  </div>
                  <div style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 4,
                    fontSize: 11, fontWeight: 600, letterSpacing: "0.03em",
                    background: statusColor, color: "#fff", marginBottom: 12,
                  }}>
                    {statusLabel}
                  </div>
                  {datum.value != null && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "var(--text-secondary, #666)" }}>Accumulated value:</span>{" "}
                      <strong>{Math.round(val).toLocaleString()}</strong>
                    </div>
                  )}
                  {(datum.sourceLinks || datum.targetLinks) && (
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: "var(--text-secondary, #666)" }}>Connections:</span>{" "}
                      <strong>{(datum.sourceLinks?.length || 0) + (datum.targetLinks?.length || 0)}</strong>
                    </div>
                  )}
                  <div style={{
                    marginTop: 12, padding: "6px 10px", borderRadius: 4,
                    fontSize: 11, color: "var(--text-secondary, #666)",
                    background: "var(--surface-1, #f5f5f5)", lineHeight: 1.5,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                      Normal: &lt; 100
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
                      Warning: 100–249
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
                      Critical: 250+
                    </div>
                  </div>
                </div>
              )
            }}
          </DetailsPanel>
        }
      >
        <StreamNetworkFrame
          ref={chartRef}
          chartType="sankey"
          size={[750, 400]}
          showParticles
          particleStyle={PARTICLE_STYLE}
          thresholds={THRESHOLD_CONFIG}
          tensionConfig={TENSION_CONFIG}
          showLabels
          enableHover
          edgeOpacity={0.4}
          staleness={STALENESS_CONFIG}
          background="#fafafa"
          onObservation={handleObservation}
        />
      </ChartContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const detailsPanelCode = `import { ChartContainer, DetailsPanel, SankeyDiagram, LinkedCharts } from "semiotic"

<LinkedCharts>
  <ChartContainer
    title="System Monitor"
    status="live"
    detailsPanel={
      <DetailsPanel position="right" size={300} trigger="click">
        {(datum, observation) => (
          <div>
            <h3>{datum.id}</h3>
            <p>Throughput: {datum.value} req/s</p>
            {/* Embed sparklines, metrics, anything */}
          </div>
        )}
      </DetailsPanel>
    }
  >
    <SankeyDiagram
      edges={edges}
      onObservation={() => {}}
      chartId="system"
    />
  </ChartContainer>
</LinkedCharts>`

const proportionalSpeedCode = `<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  showParticles
  particleStyle={{
    proportionalSpeed: true,  // faster particles on high-throughput edges
    spawnRate: 0.08,
    radius: 2.5,
  }}
  // ...
/>`

const thresholdCode = `<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  thresholds={{
    metric: (node) => node.value,     // extract the metric to check
    warning: 100,                      // yellow glow at 100+
    critical: 250,                     // red glow at 250+
    warningColor: "#f59e0b",
    criticalColor: "#ef4444",
    pulse: true,                       // animate the glow (default)
  }}
  // ...
/>`

const topologyDiffCode = `// Topology diffing is automatic for streaming sankey.
// New nodes get a green pulse glow (2s fade) when they appear.

// Access diff data via the ref handle:
const diff = chartRef.current.getTopologyDiff()
// → { addedNodes: ["Service-42"], removedNodes: [], addedEdges: [...], removedEdges: [] }

// React to topology changes:
<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  onTopologyChange={(nodes, edges) => {
    const diff = chartRef.current.getTopologyDiff()
    if (diff.addedNodes.length > 0) {
      console.log("New services:", diff.addedNodes)
    }
  }}
/>`

const detailsPanelApiCode = `// DetailsPanel works with any chart, not just network charts.
// It consumes click observations via useChartObserver internally.

import { DetailsPanel, ChartContainer, Scatterplot, LinkedCharts } from "semiotic"

<LinkedCharts>
  <ChartContainer
    title="My Dashboard"
    detailsPanel={
      <DetailsPanel
        position="right"    // "right" | "bottom" | "overlay"
        size={300}           // width (right) or height (bottom)
        trigger="click"      // "click" | "hover"
        chartId="scatter"    // filter to specific chart
        dismissOnEmpty       // clicking empty space closes panel
        showClose            // show close button (default true)
        onToggle={(open) => console.log("Panel", open ? "opened" : "closed")}
      >
        {(datum, observation) => (
          <div>
            <h3>{datum.name}</h3>
            <p>Clicked at ({observation.x}, {observation.y})</p>
          </div>
        )}
      </DetailsPanel>
    }
  >
    <Scatterplot
      data={data}
      xAccessor="x"
      yAccessor="y"
      onObservation={() => {}}
      chartId="scatter"
    />
  </ChartContainer>
</LinkedCharts>`

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StreamingSystemModelPage() {
  return (
    <PageLayout
      title="Streaming System Model"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Streaming System Model", path: "/features/streaming-system-model" },
      ]}
      prevPage={{ title: "Vega-Lite Translator", path: "/features/vega-lite" }}
    >
      <p>
        Four features that turn a streaming Sankey diagram into a system
        monitoring tool: a generic <strong>details panel</strong> for
        click-to-inspect, <strong>proportional particle speed</strong> for
        flow rate visualization, <strong>threshold alerting</strong> for
        metric-based node highlighting, and <strong>topology diffing</strong>{" "}
        for tracking infrastructure changes over time.
      </p>

      <p>
        These features compose with the existing{" "}
        <Link to="/features/observation-hooks">observation hooks</Link>,{" "}
        <Link to="/features/serialization">serialization</Link>, and{" "}
        <Link to="/features/realtime-encoding">realtime encoding</Link>{" "}
        systems. The details panel is generic — it works with any chart type,
        not just network charts.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Details Panel */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="details-panel">Details Panel</h2>

      <p>
        <code>DetailsPanel</code> is a selection-driven detail view that
        opens when a user clicks on a data point. It uses the observation
        system internally (<code>useChartObserver</code> with{" "}
        <code>click</code> events), so it works inside{" "}
        <code>LinkedCharts</code> and composes with any chart that emits
        observations.
      </p>

      <p>
        Place it inside a <code>ChartContainer</code> via the{" "}
        <code>detailsPanel</code> prop. The panel receives the clicked datum
        through a render prop — you control what shows.
      </p>

      <DetailsPanelDemo />

      <CodeBlock code={detailsPanelCode} language="jsx" />

      <h3 id="details-panel-positions">Positions</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Position</th>
            <th style={thStyle}>Behavior</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>"right"</code></td>
            <td style={tdStyle}>Slides in from right edge (default). <code>size</code> controls width.</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>"bottom"</code></td>
            <td style={tdStyle}>Slides up from bottom edge. <code>size</code> controls height.</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>"overlay"</code></td>
            <td style={tdStyle}>Centered overlay with shadow. <code>size</code> controls max width.</td>
          </tr>
        </tbody>
      </table>

      <h3 id="details-panel-props">Props</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>children</code></td>
            <td style={tdStyle}>(datum, observation) =&gt; ReactNode</td>
            <td style={tdStyle}>required</td>
            <td style={tdStyle}>Render function for panel content</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>position</code></td>
            <td style={tdStyle}>"right" | "bottom" | "overlay"</td>
            <td style={tdStyle}>"right"</td>
            <td style={tdStyle}>Panel position</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>size</code></td>
            <td style={tdStyle}>number</td>
            <td style={tdStyle}>300</td>
            <td style={tdStyle}>Width (right) or height (bottom)</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>trigger</code></td>
            <td style={tdStyle}>"click" | "hover"</td>
            <td style={tdStyle}>"click"</td>
            <td style={tdStyle}>Observation type that triggers the panel</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>chartId</code></td>
            <td style={tdStyle}>string</td>
            <td style={tdStyle}>all</td>
            <td style={tdStyle}>Filter observations by chart ID</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>dismissOnEmpty</code></td>
            <td style={tdStyle}>boolean</td>
            <td style={tdStyle}>true</td>
            <td style={tdStyle}>Close panel when clicking empty space</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>showClose</code></td>
            <td style={tdStyle}>boolean</td>
            <td style={tdStyle}>true</td>
            <td style={tdStyle}>Show close button</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>onToggle</code></td>
            <td style={tdStyle}>(open: boolean) =&gt; void</td>
            <td style={tdStyle}>&mdash;</td>
            <td style={tdStyle}>Called when panel opens or closes</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock code={detailsPanelApiCode} language="jsx" />

      {/* ----------------------------------------------------------------- */}
      {/* Edge Flow Rate */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="edge-flow-rate">Edge Flow Rate</h2>

      <p>
        Set <code>proportionalSpeed: true</code> on <code>particleStyle</code>{" "}
        to make particles travel faster on high-throughput edges. Speed scales
        from 0.3× (lowest-value edge) to 2× (highest-value edge), giving an
        immediate visual sense of where traffic is flowing most.
      </p>

      <CodeBlock code={proportionalSpeedCode} language="jsx" />

      {/* ----------------------------------------------------------------- */}
      {/* Threshold Alerting */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="threshold-alerting">Threshold Alerting</h2>

      <p>
        The <code>thresholds</code> prop on <code>StreamNetworkFrame</code>{" "}
        monitors a metric function against warning and critical thresholds.
        Nodes that cross a threshold change color and pulse with a glow
        animation, making overloaded services immediately visible.
      </p>

      <CodeBlock code={thresholdCode} language="jsx" />

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Option</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>metric</code></td>
            <td style={tdStyle}>(node) =&gt; number</td>
            <td style={tdStyle}>required</td>
            <td style={tdStyle}>Extract metric value from a node</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>warning</code></td>
            <td style={tdStyle}>number</td>
            <td style={tdStyle}>&mdash;</td>
            <td style={tdStyle}>Warning threshold</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>critical</code></td>
            <td style={tdStyle}>number</td>
            <td style={tdStyle}>&mdash;</td>
            <td style={tdStyle}>Critical threshold</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>warningColor</code></td>
            <td style={tdStyle}>string</td>
            <td style={tdStyle}>#f59e0b</td>
            <td style={tdStyle}>Warning state fill color</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>criticalColor</code></td>
            <td style={tdStyle}>string</td>
            <td style={tdStyle}>#ef4444</td>
            <td style={tdStyle}>Critical state fill color</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>pulse</code></td>
            <td style={tdStyle}>boolean</td>
            <td style={tdStyle}>true</td>
            <td style={tdStyle}>Animate glow on alerting nodes</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Topology Diffing */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="topology-diffing">Topology Diffing</h2>

      <p>
        When new nodes or edges appear in a streaming topology, Semiotic
        automatically highlights them with a green pulse glow that fades over
        2 seconds. This makes infrastructure changes immediately visible
        without any configuration.
      </p>

      <p>
        Access diff data programmatically via the <code>getTopologyDiff()</code>{" "}
        ref handle method, or react to changes with <code>onTopologyChange</code>.
      </p>

      <CodeBlock code={topologyDiffCode} language="jsx" />

      {/* ----------------------------------------------------------------- */}
      {/* Live Streaming Demo */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="live-demo">Live Demo</h2>

      <p>
        This demo combines all four features: click any node for details,
        watch particle speed vary by edge throughput, see nodes glow when
        they cross thresholds, and notice the green flash when new services
        appear in the topology.
      </p>

      <StreamingSystemDemo width={750} />

      <CodeBlock
        code={`const chartRef = useRef()

// Push streaming data
setInterval(() => {
  chartRef.current?.push({
    source: "API Gateway",
    target: "Orders",
    value: Math.floor(Math.random() * 15),
  })
}, 300)

<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  showParticles
  particleStyle={{ proportionalSpeed: true, spawnRate: 0.08 }}
  thresholds={{
    metric: (node) => node.value,
    warning: 100,
    critical: 250,
  }}
  tensionConfig={{ transitionDuration: 600 }}
  staleness={{ threshold: 3000, showBadge: true }}
  showLabels
  edgeOpacity={0.4}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/observation-hooks">AI Observation Hooks</Link> — the
          click/hover event system that DetailsPanel builds on
        </li>
        <li>
          <Link to="/features/serialization">Serialization</Link> — save and
          restore chart state for system model snapshots
        </li>
        <li>
          <Link to="/features/realtime-encoding">Realtime Encoding</Link> — decay,
          pulse, staleness encoding that compose with threshold alerting
        </li>
        <li>
          <Link to="/features/chart-container">Chart Container</Link> — the
          container component that hosts DetailsPanel
        </li>
        <li>
          <Link to="/charts/sankey-diagram">Sankey Diagram</Link> — the
          chart component used for network flow visualization
        </li>
      </ul>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const btnStyle = {
  background: "var(--accent, #007bff)",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  opacity: 1,
}

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3, #ddd)",
  fontWeight: 600,
}

const tdStyle = {
  padding: "10px 16px",
  borderBottom: "1px solid var(--surface-3, #eee)",
}

const tdCodeStyle = {
  ...tdStyle,
  fontFamily: "monospace",
}

const trStyle = {}
