import React, { useState, useMemo, useCallback } from "react"
import { LineChart, Scatterplot, BarChart, toConfig, fromConfig, toURL, fromURL, configToJSX } from "semiotic"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const salesData = [
  { x: 1, y: 4200 },
  { x: 2, y: 5100 },
  { x: 3, y: 4800 },
  { x: 4, y: 6300 },
  { x: 5, y: 5900 },
  { x: 6, y: 7200 },
  { x: 7, y: 6800 },
  { x: 8, y: 7600 },
]

const scatterData = [
  { x: 1, y: 20, cat: "A" }, { x: 2, y: 35, cat: "A" },
  { x: 3, y: 28, cat: "B" }, { x: 4, y: 42, cat: "B" },
  { x: 5, y: 18, cat: "C" }, { x: 6, y: 55, cat: "C" },
  { x: 7, y: 32, cat: "A" }, { x: 8, y: 48, cat: "B" },
]

const barData = [
  { category: "Q1", value: 340 },
  { category: "Q2", value: 520 },
  { category: "Q3", value: 280 },
  { category: "Q4", value: 410 },
]

// ---------------------------------------------------------------------------
// Interactive demo: Round-trip serializer
// ---------------------------------------------------------------------------

const CHART_OPTIONS = {
  LineChart: {
    props: {
      data: salesData,
      xAccessor: "x",
      yAccessor: "y",
      width: 500,
      height: 300,
      curve: "monotoneX",
      showPoints: true,
    },
    render: (props) => <LineChart {...props} />,
  },
  Scatterplot: {
    props: {
      data: scatterData,
      xAccessor: "x",
      yAccessor: "y",
      colorBy: "cat",
      width: 500,
      height: 300,
      pointRadius: 6,
    },
    render: (props) => <Scatterplot {...props} />,
  },
  BarChart: {
    props: {
      data: barData,
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 500,
      height: 300,
    },
    render: (props) => <BarChart {...props} />,
  },
}

function RoundTripDemo() {
  const [selectedChart, setSelectedChart] = useState("LineChart")
  const [includeData, setIncludeData] = useState(true)
  const [viewMode, setViewMode] = useState("json") // json | jsx | url

  const chartOption = CHART_OPTIONS[selectedChart]
  const config = useMemo(
    () => toConfig(selectedChart, chartOption.props, { includeData }),
    [selectedChart, includeData, chartOption.props]
  )

  const reconstructed = useMemo(() => {
    try {
      return fromConfig(config)
    } catch {
      return null
    }
  }, [config])

  const displayText = useMemo(() => {
    switch (viewMode) {
      case "jsx":
        return configToJSX(config)
      case "url":
        return toURL(config)
      default:
        return JSON.stringify(config, null, 2)
    }
  }, [config, viewMode])

  // Verify URL round-trip
  const urlRoundTrip = useMemo(() => {
    try {
      const url = toURL(config)
      const decoded = fromURL(url)
      return JSON.stringify(decoded.props) === JSON.stringify(config.props)
    } catch {
      return false
    }
  }, [config])

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.keys(CHART_OPTIONS).map((name) => (
          <button
            key={name}
            className="demo-button"
            onClick={() => setSelectedChart(name)}
            style={{
              fontWeight: selectedChart === name ? 700 : 400,
              background: selectedChart === name ? "var(--accent, #6366f1)" : undefined,
              color: selectedChart === name ? "#fff" : undefined,
            }}
          >
            {name}
          </button>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
          <input type="checkbox" checked={includeData} onChange={(e) => setIncludeData(e.target.checked)} />
          Include data
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: rendered chart */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-2, #666)" }}>
            {reconstructed ? "Rendered from fromConfig()" : "Original"}
          </div>
          <div style={{
            background: "var(--surface-1, #f8f9fa)",
            borderRadius: 8,
            padding: 8,
            border: "1px solid var(--surface-3, #ddd)"
          }}>
            {reconstructed
              ? CHART_OPTIONS[reconstructed.componentName]?.render(reconstructed.props)
              : chartOption.render(chartOption.props)}
          </div>
        </div>

        {/* Right: serialized output */}
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {["json", "jsx", "url"].map((mode) => (
              <button
                key={mode}
                className="demo-button"
                onClick={() => setViewMode(mode)}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  fontWeight: viewMode === mode ? 700 : 400,
                  background: viewMode === mode ? "var(--accent, #6366f1)" : undefined,
                  color: viewMode === mode ? "#fff" : undefined,
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
            {viewMode === "url" && (
              <span
                title={urlRoundTrip
                  ? "Config was encoded to a URL and decoded back. The decoded props match the original — no data lost in the round-trip."
                  : "The decoded config does not match the original. Some data was lost during URL encoding."}
                style={{
                  fontSize: 11,
                  color: urlRoundTrip ? "#22c55e" : "#ef4444",
                  marginLeft: 8,
                  alignSelf: "center",
                  cursor: "help",
                  borderBottom: "1px dotted currentColor",
                }}
              >
                {urlRoundTrip ? "round-trip OK" : "round-trip failed"}
              </span>
            )}
          </div>
          <pre style={{
            background: "var(--surface-1, #1a1a2e)",
            color: "#a8e6cf",
            borderRadius: 8,
            padding: 12,
            fontSize: 11,
            lineHeight: 1.5,
            overflow: "auto",
            maxHeight: 350,
            border: "1px solid var(--surface-3, #333)",
            whiteSpace: viewMode === "url" ? "pre-wrap" : "pre",
            wordBreak: viewMode === "url" ? "break-all" : "normal",
            margin: 0,
          }}>
            {displayText}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Interactive demo: Config editor
// ---------------------------------------------------------------------------

function ConfigEditorDemo() {
  const [configText, setConfigText] = useState(() =>
    JSON.stringify(
      toConfig("BarChart", {
        data: barData,
        categoryAccessor: "category",
        valueAccessor: "value",
        width: 480,
        height: 280,
        orientation: "vertical",
      }),
      null,
      2
    )
  )
  const { rendered, error } = useMemo(() => {
    try {
      const config = JSON.parse(configText)
      const { componentName, props } = fromConfig(config)
      const Chart = CHART_OPTIONS[componentName]
      if (!Chart) return { rendered: null, error: `Unknown component "${componentName}"` }
      return { rendered: Chart.render(props), error: null }
    } catch (e) {
      return { rendered: null, error: e.message }
    }
  }, [configText])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-2, #666)" }}>
          Live preview (fromConfig)
        </div>
        <div style={{
          background: "var(--surface-1, #f8f9fa)",
          borderRadius: 8,
          padding: 8,
          border: "1px solid var(--surface-3, #ddd)",
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {rendered || (
            <div style={{ color: "var(--text-2, #999)", fontSize: 13 }}>
              {error ? "Fix the JSON to see a preview" : "No chart to render"}
            </div>
          )}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--text-2, #666)" }}>
          Edit JSON config
        </div>
        <textarea
          value={configText}
          onChange={(e) => setConfigText(e.target.value)}
          style={{
            width: "100%",
            height: 320,
            fontFamily: "monospace",
            fontSize: 11,
            lineHeight: 1.5,
            padding: 12,
            borderRadius: 8,
            border: error ? "2px solid #ef4444" : "1px solid var(--surface-3, #ddd)",
            background: "var(--surface-1, #f8f9fa)",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
        {error && (
          <div style={{ color: "#ef4444", fontSize: 12, marginTop: 4 }}>{error}</div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SerializationPage() {
  return (
    <PageLayout
      title="Chart State Serialization"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Serialization", path: "/features/serialization" },
      ]}
      prevPage={{ title: "AI Observation Hooks", path: "/features/observation-hooks" }}
      nextPage={{ title: "Candlestick Chart", path: "/cookbook/candlestick-chart" }}
    >
      <p>
        Serialize any chart's configuration to JSON, encode it as a URL for
        permalinks, copy it to the clipboard as JSON or JSX, or generate
        pasteable code. This enables sharing chart views across teams, bookmarking
        specific chart states, and letting AI agents read and modify chart
        configurations programmatically.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Why */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="why">Why Serialize Charts?</h2>

      <ul style={{ lineHeight: 1.8, fontSize: 14 }}>
        <li>
          <strong>Share views</strong> — copy a chart config and paste it in
          Slack, email, or a support ticket. Your colleague can reconstruct the
          exact chart you were looking at.
        </li>
        <li>
          <strong>Bookmarkable dashboards</strong> — encode chart state in the
          URL. Users can bookmark or share links that restore the exact chart
          configuration, including which data fields are mapped to which visual
          channels.
        </li>
        <li>
          <strong>AI agent integration</strong> — an AI agent can call{" "}
          <code>toConfig()</code> to read a chart's current state, reason about
          it, modify the config, then pass it to <code>fromConfig()</code> to
          render a new chart. <code>configToJSX()</code> generates code the
          developer can paste directly.
        </li>
        <li>
          <strong>Undo/redo</strong> — store config snapshots in a history stack
          for undo/redo functionality without managing individual prop changes.
        </li>
        <li>
          <strong>Testing and debugging</strong> — serialize a chart's config,
          save it to a test fixture, and use <code>fromConfig()</code> to
          reconstruct it in tests. Ensures visual consistency across releases.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <CodeBlock
        code={`import { toConfig, fromConfig, toURL, fromURL, copyConfig, configToJSX } from "semiotic"

// 1. Serialize chart props to a JSON-safe config
const config = toConfig("LineChart", {
  data: salesData,
  xAccessor: "month",
  yAccessor: "revenue",
  colorBy: "region",
  width: 600,
})

// 2. Reconstruct props from config
const { componentName, props } = fromConfig(config)
// componentName === "LineChart", props has data, xAccessor, yAccessor, etc.

// 3. Encode as a URL for permalinks
const permalink = \`https://app.com/viz?\${toURL(config)}\`
const decoded = fromURL(permalink)

// 4. Copy to clipboard as JSON or JSX
await copyConfig(config)           // JSON to clipboard
await copyConfig(config, "jsx")    // <LineChart xAccessor="month" ... />

// 5. Generate JSX code snippet
const code = configToJSX(config)
// '<LineChart\\n  xAccessor="month"\\n  yAccessor="revenue"\\n  .../>'`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Live Demo */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="round-trip-demo">Round-Trip Demo</h2>

      <p>
        Select a chart type to see its props serialized to JSON, JSX, or URL
        format. The chart on the left is rendered from{" "}
        <code>fromConfig(toConfig(...))</code> — proving the round-trip works.
        Toggle "Include data" off to see a lightweight config suitable for URL
        sharing.
      </p>

      <RoundTripDemo />

      {/* ----------------------------------------------------------------- */}
      {/* Config Editor */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="config-editor">Config Editor</h2>

      <p>
        Edit the JSON config on the left and see the chart update in real time.
        Try changing <code>orientation</code> to <code>"horizontal"</code>, or
        modify the <code>data</code> values. This is the same workflow an AI
        agent uses: read config, modify, render.
      </p>

      <ConfigEditorDemo />

      {/* ----------------------------------------------------------------- */}
      {/* What Gets Serialized */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="what-gets-serialized">What Gets Serialized</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Prop Type</th>
            <th style={thStyle}>Example</th>
            <th style={thStyle}>Serialized?</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdStyle}>String accessors</td>
            <td style={tdCodeStyle}><code>xAccessor: "month"</code></td>
            <td style={tdStyle}>Yes</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>Function accessors</td>
            <td style={tdCodeStyle}><code>{"xAccessor: d => d.month"}</code></td>
            <td style={tdStyle}>No (stripped)</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>Data arrays</td>
            <td style={tdCodeStyle}><code>{"data: [{...}]"}</code></td>
            <td style={tdStyle}>Yes (opt-out with <code>includeData: false</code>)</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>Numbers, strings, booleans</td>
            <td style={tdCodeStyle}><code>width: 600, showGrid: true</code></td>
            <td style={tdStyle}>Yes</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>Objects, arrays</td>
            <td style={tdCodeStyle}><code>{"margin: { top: 20 }"}</code></td>
            <td style={tdStyle}>Yes</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>Callbacks</td>
            <td style={tdCodeStyle}><code>{"onObservation, tooltip"}</code></td>
            <td style={tdStyle}>No (always stripped)</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdStyle}>React elements</td>
            <td style={tdCodeStyle}><code>{"centerContent: <span/>"}</code></td>
            <td style={tdStyle}>No (stripped)</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* ChartContainer Integration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="chart-container">ChartContainer Integration</h2>

      <p>
        The <Link to="/features/chart-container">ChartContainer</Link> component
        has a built-in "Copy Config" toolbar button. Pass the serialized config
        via the <code>chartConfig</code> prop.
      </p>

      <CodeBlock
        code={`import { ChartContainer, LineChart, toConfig } from "semiotic"

const chartProps = {
  data: salesData,
  xAccessor: "month",
  yAccessor: "revenue",
  width: 600,
  height: 400,
}

<ChartContainer
  title="Monthly Revenue"
  actions={{ export: true, copyConfig: true }}
  chartConfig={toConfig("LineChart", chartProps)}
>
  <LineChart {...chartProps} />
</ChartContainer>`}
        language="jsx"
      />

      <p>
        The copy icon in the toolbar copies the config to the clipboard. Use{" "}
        <code>{"actions={{ copyConfig: { format: 'jsx' } }}"}</code> to copy
        as a JSX code snippet instead.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Selection State */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="selection-state">Selection State</h2>

      <p>
        When using <Link to="/features/small-multiples">LinkedCharts</Link>, you
        can capture the current brush/selection state alongside the chart config.
        The <code>serializeSelections</code> function converts the internal
        Map/Set structures to JSON-safe objects.
      </p>

      <CodeBlock
        code={`import { toConfig, serializeSelections, deserializeSelections } from "semiotic"

// Capture selections (inside a component with access to the store)
const selections = serializeSelections(store.selections)

// Include in config
const config = toConfig("Scatterplot", props, { selections })

// Later: restore selections
const deserialized = deserializeSelections(config.selections)
// → Map<string, Selection> with Set values restored`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* AI Agent Workflow */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="ai-workflow">AI Agent Workflow</h2>

      <p>
        The serialization API completes Semiotic's AI agent loop. Combined
        with <Link to="/features/observation-hooks">observation hooks</Link> and
        the <Link to="/using-ssr">MCP server</Link>, an AI agent can:
      </p>

      <ol style={{ lineHeight: 1.8, fontSize: 14 }}>
        <li><strong>Observe</strong> — receive structured events via <code>onObservation</code></li>
        <li><strong>Read</strong> — call <code>toConfig()</code> to get the current chart state</li>
        <li><strong>Modify</strong> — change the config (adjust accessors, add annotations, switch chart type)</li>
        <li><strong>Render</strong> — pass modified config to <code>fromConfig()</code> or generate code with <code>configToJSX()</code></li>
      </ol>

      <CodeBlock
        code={`// AI agent workflow
const config = toConfig("Scatterplot", currentProps)

// Agent modifies the config
config.props.colorBy = "category"
config.props.showGrid = true
config.component = "BubbleChart"
config.props.sizeBy = "population"

// Generate code for the developer
const code = configToJSX(config)
// <BubbleChart
//   data={[...]}
//   xAccessor="x"
//   yAccessor="y"
//   colorBy="category"
//   showGrid
//   sizeBy="population"
// />`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* API Reference */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="api-reference">API Reference</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #ddd)" }}>
            <th style={thStyle}>Function</th>
            <th style={thStyle}>Returns</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>toConfig(name, props, opts?)</code></td>
            <td style={tdStyle}><code>ChartConfig</code></td>
            <td style={tdStyle}>Serialize props to JSON. Options: <code>includeData</code>, <code>selections</code></td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>{"fromConfig(config)"}</code></td>
            <td style={tdStyle}><code>{"{ componentName, props }"}</code></td>
            <td style={tdStyle}>Reconstruct component name and props from config</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>toURL(config)</code></td>
            <td style={tdStyle}><code>string</code></td>
            <td style={tdStyle}>Encode config as <code>sc=...</code> base64url query param</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>fromURL(url)</code></td>
            <td style={tdStyle}><code>ChartConfig</code></td>
            <td style={tdStyle}>Decode config from URL or query string</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>{"copyConfig(config, fmt?)"}</code></td>
            <td style={tdStyle}><code>{"Promise<void>"}</code></td>
            <td style={tdStyle}>Copy to clipboard. <code>fmt</code>: <code>"json"</code> (default) or <code>"jsx"</code></td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>configToJSX(config)</code></td>
            <td style={tdStyle}><code>string</code></td>
            <td style={tdStyle}>Generate pasteable JSX code snippet</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>serializeSelections(map)</code></td>
            <td style={tdStyle}><code>SerializedSelections</code></td>
            <td style={tdStyle}>Convert Map/Set selection state to JSON</td>
          </tr>
          <tr style={trStyle}>
            <td style={tdCodeStyle}><code>deserializeSelections(obj)</code></td>
            <td style={tdStyle}><code>{"Map<string, Selection>"}</code></td>
            <td style={tdStyle}>Restore Map/Set from JSON</td>
          </tr>
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/chart-container">Chart Container</Link> — toolbar
          with built-in "Copy Config" action
        </li>
        <li>
          <Link to="/features/observation-hooks">AI Observation Hooks</Link> —
          structured events for AI agent insight generation
        </li>
        <li>
          <Link to="/features/small-multiples">Linked Charts</Link> — coordinated
          views with serializable selection state
        </li>
        <li>
          <Link to="/using-ssr">Server-Side Rendering</Link> — render charts
          to static SVG for email/OG images
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
  fontSize: 13,
}

const trStyle = {}
