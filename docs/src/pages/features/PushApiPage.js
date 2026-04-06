import React, { useRef, useState, useCallback } from "react"
import { Scatterplot } from "../../../../src/components/charts/xy/Scatterplot"
import { BarChart } from "../../../../src/components/charts/ordinal/BarChart"
import { ForceDirectedGraph } from "../../../../src/components/charts/network/ForceDirectedGraph"
import PageLayout from "../../components/PageLayout"
import CodeBlock from "../../components/CodeBlock"

// ── Styles ───────────────────────────────────────────────────────────

const demoStyle = {
  background: "var(--surface-2, #f8f8f8)",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid var(--border-color, #e0e0e0)",
  marginBottom: "16px",
}

const controlRow = {
  display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px",
}

const btnStyle = {
  padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "13px",
  border: "1px solid var(--border-color, #ccc)",
  background: "var(--surface-3, #eee)", color: "var(--text-primary, #333)",
}

const btnPrimary = {
  ...btnStyle,
  background: "var(--accent, #007bff)", color: "#fff", border: "none",
}

const logStyle = {
  fontSize: "12px", fontFamily: "monospace",
  color: "var(--text-secondary, #888)", marginTop: "8px",
  maxHeight: "80px", overflow: "auto",
}

// ── Demo 1: Push + Remove on Scatterplot ─────────────────────────────

let nextPointId = 1

function ScatterPushDemo() {
  const ref = useRef(null)
  const [log, setLog] = useState([])

  const addPoint = useCallback(() => {
    const id = `p${nextPointId++}`
    const point = { id, x: Math.random() * 100, y: Math.random() * 100 }
    ref.current?.push(point)
    setLog(prev => [`push(${id}: ${Math.round(point.x)}, ${Math.round(point.y)})`, ...prev].slice(0, 10))
  }, [])

  const addBatch = useCallback(() => {
    const points = Array.from({ length: 10 }, () => {
      const id = `p${nextPointId++}`
      return { id, x: Math.random() * 100, y: Math.random() * 100 }
    })
    ref.current?.pushMany(points)
    setLog(prev => [`pushMany(${points.length} points)`, ...prev].slice(0, 10))
  }, [])

  const removeLast = useCallback(() => {
    const data = ref.current?.getData() || []
    if (data.length === 0) return
    const last = data[data.length - 1]
    ref.current?.remove(last.id)
    setLog(prev => [`remove("${last.id}")`, ...prev].slice(0, 10))
  }, [])

  const clear = useCallback(() => {
    ref.current?.clear()
    setLog(prev => ["clear()", ...prev].slice(0, 10))
  }, [])

  return (
    <div style={demoStyle}>
      <div style={controlRow}>
        <button style={btnPrimary} onClick={addPoint}>Push Point</button>
        <button style={btnStyle} onClick={addBatch}>Push 10</button>
        <button style={btnStyle} onClick={removeLast}>Remove Last</button>
        <button style={btnStyle} onClick={clear}>Clear</button>
      </div>
      <Scatterplot
        ref={ref}
        xAccessor="x" yAccessor="y"
        pointIdAccessor="id"
        width={500} height={300}
        enableHover tooltip
      />
      <div style={logStyle}>{log.map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  )
}

// ── Demo 2: Update on BarChart ───────────────────────────────────────

const REGIONS = ["North", "South", "East", "West"]

function BarUpdateDemo() {
  const ref = useRef(null)
  const [log, setLog] = useState([])
  const initialized = useRef(false)

  // Initialize with data on first render
  const initRef = useCallback((node) => {
    ref.current = node
    if (node && !initialized.current) {
      initialized.current = true
      REGIONS.forEach((region, i) => {
        node.push({ id: region, category: region, value: 20 + i * 15 })
      })
    }
  }, [])

  const randomizeOne = useCallback(() => {
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)]
    const newValue = Math.round(10 + Math.random() * 80)
    ref.current?.update(region, d => ({ ...d, value: newValue }))
    setLog(prev => [`update("${region}", value → ${newValue})`, ...prev].slice(0, 10))
  }, [])

  const randomizeAll = useCallback(() => {
    REGIONS.forEach(region => {
      const newValue = Math.round(10 + Math.random() * 80)
      ref.current?.update(region, d => ({ ...d, value: newValue }))
    })
    setLog(prev => ["update(all regions)", ...prev].slice(0, 10))
  }, [])

  const addRegion = useCallback(() => {
    const name = `Region-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
    ref.current?.push({ id: name, category: name, value: Math.round(20 + Math.random() * 60) })
    setLog(prev => [`push("${name}")`, ...prev].slice(0, 10))
  }, [])

  const removeRandom = useCallback(() => {
    const data = ref.current?.getData() || []
    if (data.length === 0) return
    const item = data[Math.floor(Math.random() * data.length)]
    ref.current?.remove(item.id)
    setLog(prev => [`remove("${item.id}")`, ...prev].slice(0, 10))
  }, [])

  return (
    <div style={demoStyle}>
      <div style={controlRow}>
        <button style={btnPrimary} onClick={randomizeOne}>Update Random Bar</button>
        <button style={btnStyle} onClick={randomizeAll}>Randomize All</button>
        <button style={btnStyle} onClick={addRegion}>Add Region</button>
        <button style={btnStyle} onClick={removeRandom}>Remove Random</button>
      </div>
      <BarChart
        ref={initRef}
        categoryAccessor="category" valueAccessor="value"
        dataIdAccessor="id" colorBy="category"
        width={500} height={300}
        enableHover tooltip showGrid
      />
      <div style={logStyle}>{log.map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  )
}

// ── Demo 3: Network Remove/Update ────────────────────────────────────

function NetworkDemo() {
  const ref = useRef(null)
  const [log, setLog] = useState([])
  const initialized = useRef(false)

  const initRef = useCallback((node) => {
    ref.current = node
    if (node && !initialized.current) {
      initialized.current = true
      // Build a small network
      const edges = [
        { source: "API", target: "DB" },
        { source: "API", target: "Cache" },
        { source: "Web", target: "API" },
        { source: "Mobile", target: "API" },
        { source: "Cache", target: "DB" },
      ]
      node.pushMany(edges)
    }
  }, [])

  const removeNode = useCallback(() => {
    // Remove Cache node (and its edges)
    ref.current?.remove("Cache")
    setLog(prev => ['removeNode("Cache") — edges cascade', ...prev].slice(0, 10))
  }, [])

  const addEdge = useCallback(() => {
    ref.current?.push({ source: "Web", target: "DB" })
    setLog(prev => ['push({ source: "Web", target: "DB" })', ...prev].slice(0, 10))
  }, [])

  const clear = useCallback(() => {
    ref.current?.clear()
    initialized.current = false
    setLog(prev => ["clear()", ...prev].slice(0, 10))
  }, [])

  const rebuild = useCallback(() => {
    ref.current?.clear()
    initialized.current = false
    const edges = [
      { source: "API", target: "DB" },
      { source: "API", target: "Cache" },
      { source: "Web", target: "API" },
      { source: "Mobile", target: "API" },
      { source: "Cache", target: "DB" },
    ]
    ref.current?.pushMany(edges)
    setLog(prev => ["Rebuilt network", ...prev].slice(0, 10))
  }, [])

  return (
    <div style={demoStyle}>
      <div style={controlRow}>
        <button style={btnPrimary} onClick={removeNode}>Remove "Cache"</button>
        <button style={btnStyle} onClick={addEdge}>Add Web→DB Edge</button>
        <button style={btnStyle} onClick={rebuild}>Rebuild</button>
        <button style={btnStyle} onClick={clear}>Clear</button>
      </div>
      <ForceDirectedGraph
        ref={initRef}
        nodeIDAccessor="id"
        sourceAccessor="source" targetAccessor="target"
        showLabels nodeLabel="id"
        width={500} height={300}
        enableHover tooltip
      />
      <div style={logStyle}>{log.map((l, i) => <div key={i}>{l}</div>)}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────

export default function PushApiPage() {
  return (
    <PageLayout
      title="Push API"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Push API", path: "/features/push-api" },
      ]}
      prevPage={{ title: "Performance", path: "/features/performance" }}
      nextPage={{ title: "Styling", path: "/theming/styling" }}
    >
      <p>
        The push API lets you imperatively add, remove, and update data on a chart
        without re-rendering the entire component. This is the foundation for live
        dashboards, streaming data, interactive editors, and any scenario where data
        changes after initial render.
      </p>

      <h2>Core Methods</h2>
      <CodeBlock code={`const ref = useRef()

ref.current.push({ id: "p1", x: 10, y: 20 })        // add one
ref.current.pushMany([...points])                      // add batch
ref.current.remove("p1")                               // remove by ID
ref.current.remove(["p1", "p2"])                       // remove batch
ref.current.update("p1", d => ({ ...d, y: 99 }))      // update in place
ref.current.clear()                                    // reset
ref.current.getData()                                  // read current data`} language="js" />

      <p>
        <code>remove()</code> and <code>update()</code> require an ID accessor so
        the store can find the item to modify. XY charts use <code>pointIdAccessor</code>,
        ordinal charts use <code>dataIdAccessor</code>. Geo charts implement
        <code>update()</code> as remove + push internally.
      </p>

      <h2>Push + Remove: Scatterplot</h2>
      <p>
        <strong>When to use:</strong> Live sensor feeds, real-time dashboards, any scenario
        where data points arrive and expire. Push adds a point to the chart instantly.
        Remove takes it off by ID — no full re-render, no state management.
      </p>
      <p>
        Click "Push Point" to add random points. "Remove Last" deletes the most recent by ID.
        The chart re-renders only the affected data — the pipeline recomputes extents and
        rebuilds the scene incrementally.
      </p>
      <ScatterPushDemo />
      <CodeBlock code={`const ref = useRef()

<Scatterplot
  ref={ref}
  xAccessor="x" yAccessor="y"
  pointIdAccessor="id"      // required for remove/update
  enableHover tooltip
/>

// Add data
ref.current.push({ id: "sensor-1", x: 42, y: 87 })

// Remove by ID when the reading expires
ref.current.remove("sensor-1")

// Batch add
ref.current.pushMany(latestReadings)`} language="jsx" />

      <h2>Update: Bar Chart</h2>
      <p>
        <strong>When to use:</strong> Dashboards where values change but categories stay the
        same. A KPI dashboard where revenue updates every minute. A leaderboard where
        scores change. <code>update()</code> modifies the datum in place — the bar resizes
        without removing and re-adding it, preserving buffer position and (when transitions
        are enabled) animating smoothly.
      </p>
      <p>
        Click "Update Random Bar" to change one bar's value. "Randomize All" updates every
        bar. "Add Region" pushes a new category. "Remove Random" deletes one.
      </p>
      <BarUpdateDemo />
      <CodeBlock code={`const ref = useRef()

<BarChart
  ref={ref}
  categoryAccessor="category" valueAccessor="value"
  dataIdAccessor="id"       // required for remove/update on ordinal charts
  colorBy="category"
/>

// Initialize
ref.current.push({ id: "north", category: "North", value: 42 })

// Update a value — bar resizes, no remove+push needed
ref.current.update("north", d => ({ ...d, value: 58 }))

// Add a new category
ref.current.push({ id: "central", category: "Central", value: 33 })

// Remove a category entirely
ref.current.remove("north")`} language="jsx" />

      <h2>Network: Remove Node with Edge Cascade</h2>
      <p>
        <strong>When to use:</strong> Infrastructure monitoring where services go offline.
        Team network analysis where a member leaves. Dependency graphs where a package is
        removed. When you remove a node from a network, all edges connected to it are
        automatically removed — the graph stays consistent.
      </p>
      <p>
        Click "Remove Cache" to delete the Cache node. Both edges connected to it (API→Cache
        and Cache→DB) disappear automatically. "Add Web→DB Edge" pushes a new connection.
        "Rebuild" restores the original topology.
      </p>
      <NetworkDemo />
      <CodeBlock code={`// Network HOCs expose remove/update for nodes via the standard ref API
const ref = useRef()

// Remove a node by ID — connected edges cascade automatically
ref.current.remove("Cache")

// Update a node's data (e.g., change its status or weight)
ref.current.update("API", d => ({ ...d, status: "degraded" }))

// For edge-level operations (removeEdge, updateEdge), use StreamNetworkFrame:
// const frameRef = useRef<StreamNetworkFrameHandle>()
// frameRef.current.removeEdge("Web", "API")
// frameRef.current.updateEdge("Web", "API", d => ({ ...d, value: 200 }))`} language="jsx" />

      <h2>When to use push vs. controlled data</h2>

      <p>
        The push API and the <code>data</code> prop are two ways to feed data into a chart.
        Use the right one for your scenario:
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px", marginBottom: "24px" }}>
        <div style={{ ...demoStyle, margin: 0 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>Push API</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", lineHeight: 1.8 }}>
            <li>Data arrives over time (WebSocket, SSE, polling)</li>
            <li>Individual items added, removed, or updated</li>
            <li>High-frequency updates (100+ per second)</li>
            <li>Chart manages its own buffer (RingBuffer)</li>
            <li>Omit the <code>data</code> prop entirely</li>
          </ul>
        </div>
        <div style={{ ...demoStyle, margin: 0 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: "14px" }}>Controlled data prop</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", lineHeight: 1.8 }}>
            <li>Data loaded from an API or file</li>
            <li>Entire dataset replaced at once</li>
            <li>Data managed by React state or a store</li>
            <li>Standard React data flow</li>
            <li>Pass <code>data={"{myData}"}</code> prop</li>
          </ul>
        </div>
      </div>

      <h2>ID accessors by chart type</h2>
      <CodeBlock code={`// XY charts: pointIdAccessor
<Scatterplot pointIdAccessor="id" />
<LineChart pointIdAccessor="id" />

// Ordinal charts: dataIdAccessor
<BarChart dataIdAccessor="id" />
<PieChart dataIdAccessor="id" />

// Network charts: nodeIDAccessor (already required)
<ForceDirectedGraph nodeIDAccessor="id" />
// remove/update use node IDs directly — no extra accessor needed

// Geo charts: pointIdAccessor
<ProportionalSymbolMap pointIdAccessor="id" />`} language="jsx" />

      <h2>Important notes</h2>
      <ul>
        <li><strong>Omit <code>data</code> when using push.</strong> Passing <code>data={"{[]}"}</code> clears pushed data on every render. Just don't pass the prop.</li>
        <li><strong>ID accessors are required for remove/update.</strong> Without them, the store can't find the item. <code>push()</code> and <code>pushMany()</code> work without IDs.</li>
        <li><strong>Network edge cascade.</strong> Removing a node automatically removes all connected edges. You don't need to remove edges manually.</li>
        <li><strong>Extent tracking.</strong> The store tracks min/max values incrementally. When you remove an item that was the min or max, the extent is marked dirty and recalculated on the next scene computation.</li>
        <li><strong>Update preserves buffer position.</strong> Unlike remove+push, <code>update()</code> modifies the datum in place. This matters for decay encoding (age-based opacity) — an updated item keeps its original age.</li>
      </ul>
    </PageLayout>
  )
}
