import React, { useState, useCallback } from "react"
import { LineChart, Scatterplot, BarChart, LinkedCharts, useChartObserver } from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5100 },
  { month: "Mar", revenue: 4800 },
  { month: "Apr", revenue: 6300 },
  { month: "May", revenue: 5900 },
  { month: "Jun", revenue: 7200 },
  { month: "Jul", revenue: 6800 },
  { month: "Aug", revenue: 7600 },
  { month: "Sep", revenue: 8100 },
  { month: "Oct", revenue: 7400 },
  { month: "Nov", revenue: 8500 },
  { month: "Dec", revenue: 9200 },
]

const scatterData = [
  { x: 1, y: 20, region: "North" },
  { x: 2, y: 35, region: "North" },
  { x: 3, y: 28, region: "South" },
  { x: 4, y: 42, region: "South" },
  { x: 5, y: 18, region: "East" },
  { x: 6, y: 55, region: "East" },
  { x: 7, y: 32, region: "North" },
  { x: 8, y: 48, region: "West" },
  { x: 9, y: 37, region: "West" },
  { x: 10, y: 60, region: "South" },
]

const barData = [
  { region: "North", sales: 340 },
  { region: "South", sales: 520 },
  { region: "East", sales: 280 },
  { region: "West", sales: 410 },
]

// ---------------------------------------------------------------------------
// Interactive demo: Observation Log
// ---------------------------------------------------------------------------

function ObservationLogDemo() {
  const [log, setLog] = useState([])

  const handleObservation = useCallback((obs) => {
    setLog((prev) => {
      const next = [...prev, obs]
      return next.length > 8 ? next.slice(next.length - 8) : next
    })
  }, [])

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        <div>
          <Scatterplot
            data={scatterData}
            xAccessor="x"
            yAccessor="y"
            colorBy="region"
            width={360}
            height={280}
            onObservation={handleObservation}
            chartId="demo-scatter"
          />
        </div>
        <div
          style={{
            background: "var(--surface-1, #1a1a2e)",
            borderRadius: 8,
            padding: 12,
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.6,
            color: "#a8e6cf",
            maxHeight: 280,
            overflow: "auto",
            border: "1px solid var(--surface-3, #333)"
          }}
        >
          <div style={{ color: "#888", marginBottom: 8 }}>Observation Log</div>
          {log.length === 0 && (
            <div style={{ color: "#666" }}>Hover over the chart...</div>
          )}
          {log.map((obs, i) => (
            <div key={i} style={{ borderBottom: "1px solid #333", paddingBottom: 4, marginBottom: 4 }}>
              <span style={{ color: obs.type === "hover" ? "#a8e6cf" : "#ff6b6b" }}>
                {obs.type}
              </span>
              {obs.type === "hover" && obs.datum && (
                <span style={{ color: "#ddd" }}>
                  {" "}x={obs.datum.x} y={obs.datum.y} region={obs.datum.region}
                </span>
              )}
              <span style={{ color: "#666", marginLeft: 8 }}>
                {new Date(obs.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interactive demo: useChartObserver aggregation
// ---------------------------------------------------------------------------

function ObserverInsightPanel() {
  const { observations, latest } = useChartObserver({
    limit: 10,
    types: ["hover"]
  })

  // Count hovers per region
  const regionCounts = {}
  for (const obs of observations) {
    if (obs.datum?.region) {
      regionCounts[obs.datum.region] = (regionCounts[obs.datum.region] || 0) + 1
    }
  }
  const topRegion = Object.entries(regionCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div
      style={{
        background: "var(--surface-1, #f8f9fa)",
        borderRadius: 8,
        padding: 16,
        border: "1px solid var(--surface-3, #ddd)",
        minHeight: 100
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
        AI Insight Panel
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2, #666)" }}>
        {observations.length === 0 ? (
          "Hover over either chart to generate observations..."
        ) : (
          <>
            <div>
              Observations collected: <strong>{observations.length}</strong>
              {latest?.chartId && (
                <> from <code>{latest.chartId}</code></>
              )}
            </div>
            {topRegion && (
              <div style={{ marginTop: 4 }}>
                Most explored region: <strong>{topRegion[0]}</strong> ({topRegion[1]} hovers)
              </div>
            )}
            {latest?.datum && (
              <div style={{ marginTop: 4, opacity: 0.8 }}>
                Last point: {JSON.stringify(latest.datum)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function LinkedObserverDemo() {
  return (
    <LinkedCharts>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Scatterplot
          data={scatterData}
          xAccessor="x"
          yAccessor="y"
          colorBy="region"
          width={360}
          height={250}
          onObservation={() => {}}
          chartId="linked-scatter"
          linkedHover={{ name: "obs-hl", fields: ["region"] }}
          selection={{ name: "obs-hl" }}
        />
        <BarChart
          data={barData}
          categoryAccessor="region"
          valueAccessor="sales"
          colorBy="region"
          width={360}
          height={250}
          onObservation={() => {}}
          chartId="linked-bar"
          linkedHover={{ name: "obs-hl", fields: ["region"] }}
          selection={{ name: "obs-hl" }}
        />
      </div>
      <ObserverInsightPanel />
    </LinkedCharts>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ObservationHooksPage() {
  return (
    <PageLayout
      title="AI Observation Hooks"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "AI Observation Hooks", path: "/features/observation-hooks" },
      ]}
      prevPage={{ title: "Chart Modes", path: "/features/chart-modes" }}
      nextPage={{ title: "Candlestick Chart", path: "/cookbook/candlestick-chart" }}
    >
      <p>
        Every Semiotic chart accepts an <code>onObservation</code> callback that
        emits structured events when users interact with the chart. These
        observations can feed into an AI agent's context window, enabling
        real-time insight generation based on what users are exploring.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Add <code>onObservation</code> to any chart to start receiving events.
        Each event includes the <code>type</code>, the <code>datum</code> being
        interacted with, pixel coordinates, a timestamp, and the chart type.
      </p>

      <CodeBlock
        code={`import { Scatterplot } from "semiotic"

<Scatterplot
  data={data}
  xAccessor="x"
  yAccessor="y"
  onObservation={(obs) => {
    // obs.type: "hover" | "hover-end" | "brush" | "brush-end" | "selection" | "selection-end"
    // obs.datum: the data point being hovered
    // obs.timestamp: Date.now()
    // obs.chartType: "Scatterplot"
    console.log(obs.type, obs.datum)
  }}
  chartId="my-scatter"
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Live Demo */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="live-demo">Live Demo</h2>

      <p>
        Hover over points in the scatterplot to see observation events appear
        in the log panel in real time. Each hover emits a structured event
        with the full datum and position.
      </p>

      <ObservationLogDemo />

      <CodeBlock
        code={`function ObservationLog() {
  const [log, setLog] = useState([])

  return (
    <>
      <Scatterplot
        data={data}
        xAccessor="x"
        yAccessor="y"
        colorBy="region"
        onObservation={(obs) => {
          setLog(prev => [...prev.slice(-7), obs])
        }}
        chartId="demo-scatter"
      />
      <pre>{JSON.stringify(log, null, 2)}</pre>
    </>
  )
}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Event Types */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="event-types">Event Types</h2>

      <p>
        Six event types cover the full range of chart interactions:
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Key Fields</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>hover</code></td>
            <td style={tdStyle}>User hovers over a data point</td>
            <td style={tdStyle}><code>datum</code>, <code>x</code>, <code>y</code></td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>hover-end</code></td>
            <td style={tdStyle}>Mouse leaves chart or data</td>
            <td style={tdStyle}>&mdash;</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>brush</code></td>
            <td style={tdStyle}>Brush selection changes</td>
            <td style={tdStyle}><code>extent.x</code>, <code>extent.y</code></td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>brush-end</code></td>
            <td style={tdStyle}>Brush cleared</td>
            <td style={tdStyle}>&mdash;</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>selection</code></td>
            <td style={tdStyle}>Cross-chart selection changes</td>
            <td style={tdStyle}><code>selection.name</code>, <code>selection.fields</code></td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>selection-end</code></td>
            <td style={tdStyle}>Selection cleared</td>
            <td style={tdStyle}><code>selection.name</code></td>
          </tr>
        </tbody>
      </table>

      <p>
        All events include <code>timestamp</code> (Date.now()),{" "}
        <code>chartType</code> (e.g. "Scatterplot"), and optionally{" "}
        <code>chartId</code> (your custom identifier).
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* useChartObserver */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="use-chart-observer">useChartObserver</h2>

      <p>
        Inside a <code>LinkedCharts</code> provider, the{" "}
        <code>useChartObserver</code> hook aggregates observations from all
        charts in the coordinated view. This enables "insight panels" that
        react to what users are exploring across multiple charts.
      </p>

      <LinkedObserverDemo />

      <CodeBlock
        code={`import { LinkedCharts, Scatterplot, BarChart, useChartObserver } from "semiotic"

function InsightPanel() {
  const { observations, latest, clear } = useChartObserver({
    limit: 20,          // keep last 20 observations
    types: ["hover"],   // only hover events
    chartId: undefined  // from all charts (or filter by chartId)
  })

  // Example: count hovers per region for an AI prompt
  const regionCounts = {}
  for (const obs of observations) {
    const region = obs.datum?.region
    if (region) regionCounts[region] = (regionCounts[region] || 0) + 1
  }

  return <div>Most explored: {Object.entries(regionCounts).sort((a,b) => b[1]-a[1])[0]?.[0]}</div>
}

function Dashboard() {
  return (
    <LinkedCharts>
      <Scatterplot data={d} xAccessor="x" yAccessor="y" colorBy="region"
        onObservation={() => {}} chartId="scatter"
        linkedHover={{ name: "hl", fields: ["region"] }}
        selection={{ name: "hl" }} />
      <BarChart data={agg} categoryAccessor="region" valueAccessor="total"
        onObservation={() => {}} chartId="bar"
        linkedHover={{ name: "hl", fields: ["region"] }}
        selection={{ name: "hl" }} />
      <InsightPanel />
    </LinkedCharts>
  )
}`}
        language="jsx"
      />

      <h3 id="observer-options">Options</h3>

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
            <td style={tdCodeStyle}><code>limit</code></td>
            <td style={tdStyle}>number</td>
            <td style={tdStyle}>50</td>
            <td style={tdStyle}>Maximum observations returned</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>types</code></td>
            <td style={tdStyle}>string[]</td>
            <td style={tdStyle}>all</td>
            <td style={tdStyle}>Filter by event type</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>chartId</code></td>
            <td style={tdStyle}>string</td>
            <td style={tdStyle}>all</td>
            <td style={tdStyle}>Filter by chart instance</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* AI Agent Integration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="ai-integration">AI Agent Integration</h2>

      <p>
        The observation system completes Semiotic's AI loop: the{" "}
        <Link to="/using-ssr">MCP server</Link> lets agents <em>render</em>{" "}
        charts, while observation hooks let agents <em>watch</em> what users do.
        An AI agent can consume observations and respond with annotations,
        suggested views, or natural language insights.
      </p>

      <CodeBlock
        code={`// Example: feed observations to an AI agent
function AIAssistant() {
  const { observations } = useChartObserver({ limit: 50 })

  useEffect(() => {
    if (observations.length < 5) return

    // Build a prompt from recent observations
    const summary = observations.map(o =>
      o.type === "hover"
        ? \`User examined \${JSON.stringify(o.datum)} in \${o.chartType}\`
        : \`User stopped examining (\${o.chartType})\`
    ).join("\\n")

    // Send to your AI backend
    fetchInsight(summary).then(insight => {
      // Add insight as an annotation on the chart
      setAnnotations([{ type: "callout", label: insight }])
    })
  }, [observations.length])
}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/interaction">Interaction</Link> — hover, click,
          and brush interaction configuration
        </li>
        <li>
          <Link to="/features/small-multiples">Linked Charts</Link> — cross-highlighting
          and coordinated views that observations compose with
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — tooltip content
          that works alongside observation hooks
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — add AI-generated
          annotations in response to observations
        </li>
      </ul>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
