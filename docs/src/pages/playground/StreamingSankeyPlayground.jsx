import React, { useState, useRef, useEffect, useCallback } from "react"
import { StreamNetworkFrame } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Control schemas
// ---------------------------------------------------------------------------

const layoutControls = [
  { name: "orientation", type: "select", label: "Orientation", group: "Layout",
    default: "horizontal", options: ["horizontal", "vertical"] },
  { name: "nodeAlign", type: "select", label: "Node Alignment", group: "Layout",
    default: "justify", options: ["justify", "left", "right", "center"] },
  { name: "nodeWidth", type: "number", label: "Node Width", group: "Layout",
    default: 15, min: 5, max: 40, step: 1 },
  { name: "nodePaddingRatio", type: "number", label: "Node Padding", group: "Layout",
    default: 0.05, min: 0.01, max: 0.2, step: 0.01 },
  { name: "showLabels", type: "boolean", label: "Show Labels", group: "Layout",
    default: true },
]

const particleControls = [
  { name: "showParticles", type: "boolean", label: "Show Particles", group: "Particles",
    default: true },
  { name: "particleRadius", type: "number", label: "Particle Radius", group: "Particles",
    default: 3, min: 1, max: 10, step: 1 },
  { name: "particleOpacity", type: "number", label: "Particle Opacity", group: "Particles",
    default: 0.7, min: 0.1, max: 1, step: 0.05 },
  { name: "particleSpeed", type: "number", label: "Speed Multiplier", group: "Particles",
    default: 1, min: 0.1, max: 5, step: 0.1 },
  { name: "particleSpawnRate", type: "number", label: "Spawn Rate", group: "Particles",
    default: 0.1, min: 0.01, max: 0.5, step: 0.01 },
  { name: "particleMaxPerEdge", type: "number", label: "Max Per Edge", group: "Particles",
    default: 50, min: 5, max: 200, step: 5 },
  { name: "proportionalSpeed", type: "boolean", label: "Proportional Speed", group: "Particles",
    default: false },
  { name: "particleColorBy", type: "select", label: "Color By", group: "Particles",
    default: "source", options: ["source", "target"] },
]

const edgeControls = [
  { name: "edgeOpacity", type: "number", label: "Edge Opacity", group: "Edges",
    default: 0.5, min: 0.1, max: 1, step: 0.05 },
  { name: "edgeColorBy", type: "select", label: "Edge Color By", group: "Edges",
    default: "source", options: ["source", "target"] },
]

const tensionControls = [
  { name: "tensionThreshold", type: "number", label: "Relayout Threshold", group: "Tension",
    default: 3.0, min: 0.5, max: 10, step: 0.5 },
  { name: "transitionDuration", type: "number", label: "Transition (ms)", group: "Tension",
    default: 500, min: 100, max: 2000, step: 100 },
]

const interactionControls = [
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
]

const allControls = [
  ...layoutControls,
  ...particleControls,
  ...edgeControls,
  ...tensionControls,
  ...interactionControls,
]

// ---------------------------------------------------------------------------
// Topology generators — each returns batches of edges to push
// ---------------------------------------------------------------------------

const topologies = [
  {
    label: "Microservice Traffic",
    description: "Web/Mobile/API sources route through services to destinations",
    nodes: ["Web", "Mobile", "API", "Gateway", "Auth", "Billing", "Analytics", "DB", "Cache", "Logs"],
    generate() {
      const routes = [
        ["Web", "Gateway"], ["Mobile", "Gateway"], ["API", "Gateway"],
        ["Gateway", "Auth"], ["Gateway", "Billing"], ["Gateway", "Analytics"],
        ["Auth", "DB"], ["Auth", "Cache"],
        ["Billing", "DB"], ["Analytics", "DB"], ["Analytics", "Logs"],
      ]
      const route = routes[Math.floor(Math.random() * routes.length)]
      const value = 5 + Math.floor(Math.random() * 20)
      return { source: route[0], target: route[1], value }
    },
  },
  {
    label: "Data Pipeline (with cycles)",
    description: "ETL pipeline where failed records retry — demonstrating circular edges",
    nodes: ["Ingest", "Validate", "Transform", "Enrich", "Load", "Archive", "DLQ"],
    generate() {
      const routes = [
        ["Ingest", "Validate", 15],
        ["Validate", "Transform", 12],
        ["Validate", "DLQ", 2],
        ["Transform", "Enrich", 10],
        ["Enrich", "Load", 8],
        ["Load", "Archive", 6],
        // Cycles: retries and reprocessing
        ["DLQ", "Ingest", 1],
        ["Load", "Transform", 2],
      ]
      const route = routes[Math.floor(Math.random() * routes.length)]
      const jitter = Math.floor(Math.random() * 5)
      return { source: route[0], target: route[1], value: route[2] + jitter }
    },
  },
  {
    label: "Supply Chain",
    description: "Raw materials flow through manufacturing to distribution",
    nodes: ["Supplier A", "Supplier B", "Supplier C", "Factory", "QA", "Warehouse", "Retail", "Online", "Returns"],
    generate() {
      const routes = [
        ["Supplier A", "Factory", 20],
        ["Supplier B", "Factory", 15],
        ["Supplier C", "Factory", 10],
        ["Factory", "QA", 40],
        ["QA", "Warehouse", 35],
        ["QA", "Factory", 3],  // cycle: QA rejects
        ["Warehouse", "Retail", 20],
        ["Warehouse", "Online", 15],
        ["Retail", "Returns", 2],
        ["Online", "Returns", 3],
        ["Returns", "Warehouse", 4],  // cycle: returns re-enter
      ]
      const route = routes[Math.floor(Math.random() * routes.length)]
      const jitter = Math.floor(Math.random() * route[2])
      return { source: route[0], target: route[1], value: route[2] + jitter }
    },
  },
]

// ---------------------------------------------------------------------------
// Color schemes for the selector
// ---------------------------------------------------------------------------

const colorSchemes = [
  { label: "Category10", value: "category10" },
  { label: "Tableau10", value: "tableau10" },
  { label: "Paired", value: "paired" },
  { label: "Set2", value: "set2" },
  { label: "Dark2", value: "dark2" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StreamingSankeyPlayground() {
  const [values, setValues] = useState(() => {
    const d = {}
    for (const c of allControls) d[c.name] = c.default
    return d
  })
  const [topoIndex, setTopoIndex] = useState(0)
  const [colorScheme, setColorScheme] = useState("category10")
  const [running, setRunning] = useState(true)
  const [pushRate, setPushRate] = useState(200)
  const [containerWidth, setContainerWidth] = useState(null)
  const [tensionDisplay, setTensionDisplay] = useState(0)
  const [edgeCount, setEdgeCount] = useState(0)
  const chartRef = useRef(null)
  const vizRef = useRef(null)

  const defaults = {}
  for (const c of allControls) defaults[c.name] = c.default

  // ResizeObserver
  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Data pump
  useEffect(() => {
    if (!running) return
    const topo = topologies[topoIndex]
    const interval = setInterval(() => {
      const edge = topo.generate()
      chartRef.current?.push(edge)
      setEdgeCount((c) => c + 1)
      // Update tension readout periodically
      if (chartRef.current?.getTension) {
        setTensionDisplay(chartRef.current.getTension())
      }
    }, pushRate)
    return () => clearInterval(interval)
  }, [running, topoIndex, pushRate])

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setValues(() => {
      const next = {}
      for (const c of allControls) next[c.name] = c.default
      return next
    })
  }, [])

  const handleClear = useCallback(() => {
    chartRef.current?.clear()
    setEdgeCount(0)
    setTensionDisplay(0)
  }, [])

  const handleAddEdge = useCallback(() => {
    const topo = topologies[topoIndex]
    const edge = topo.generate()
    chartRef.current?.push(edge)
    setEdgeCount((c) => c + 1)
  }, [topoIndex])

  const handleAddCycleEdge = useCallback(() => {
    const topo = topologies[topoIndex]
    const nodes = topo.nodes
    // Pick two nodes that create a backward edge
    const target = nodes[Math.floor(Math.random() * Math.min(3, nodes.length))]
    const source = nodes[Math.min(nodes.length - 1, 3 + Math.floor(Math.random() * (nodes.length - 3)))]
    if (source !== target) {
      chartRef.current?.push({ source, target, value: 5 + Math.floor(Math.random() * 10) })
      setEdgeCount((c) => c + 1)
    }
  }, [topoIndex])

  const handleRelayout = useCallback(() => {
    chartRef.current?.relayout()
  }, [])

  const chartWidth = containerWidth || 800
  const chartHeight = 500

  // Build chart key for props that require remount
  const chartKey = `streaming-sankey-${values.orientation}-${values.enableHover}-${topoIndex}`

  const code = generateCode(values, defaults, colorScheme)

  return (
    <PageLayout
      title="Streaming Sankey Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Streaming Sankey", path: "/playground/streaming-sankey" },
      ]}
      prevPage={{ title: "Sankey Diagram Playground", path: "/playground/sankey-diagram" }}
      nextPage={{ title: "Realtime Line / Waterfall Playground", path: "/playground/realtime-line-chart" }}
    >
      <p>
        Streaming Sankey diagrams grow their topology over time via a push API.
        Edges accumulate, nodes appear automatically, and the layout re-runs
        when internal tension crosses a threshold. Animated particles flow along
        edges proportional to throughput. Try the "Data Pipeline" topology to see
        circular edges (retries and reprocessing loops).
      </p>

      {/* Topology picker */}
      <div className="playground-dataset-picker" style={{ marginBottom: 8 }}>
        <label htmlFor="pg-topo">Topology:</label>
        <select
          id="pg-topo"
          className="playground-select"
          value={topoIndex}
          onChange={(e) => {
            setTopoIndex(parseInt(e.target.value, 10))
            handleClear()
          }}
        >
          {topologies.map((t, i) => (
            <option key={i} value={i}>{t.label}</option>
          ))}
        </select>

        <label htmlFor="pg-colors" style={{ marginLeft: 12 }}>Colors:</label>
        <select
          id="pg-colors"
          className="playground-select"
          value={colorScheme}
          onChange={(e) => setColorScheme(e.target.value)}
        >
          {colorSchemes.map((cs) => (
            <option key={cs.value} value={cs.value}>{cs.label}</option>
          ))}
        </select>
      </div>

      {/* Transport + manual controls */}
      <div className="playground-dataset-picker">
        <button
          className="playground-reset-button"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "Pause" : "Resume"}
        </button>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 4 }}
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 4 }}
          onClick={handleAddEdge}
        >
          + Edge
        </button>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 4 }}
          onClick={handleAddCycleEdge}
        >
          + Cycle Edge
        </button>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 4 }}
          onClick={handleRelayout}
        >
          Force Relayout
        </button>

        <label htmlFor="pg-rate" style={{ marginLeft: 12 }}>Push Rate:</label>
        <select
          id="pg-rate"
          className="playground-select"
          value={pushRate}
          onChange={(e) => setPushRate(parseInt(e.target.value, 10))}
        >
          <option value={50}>50ms (fast)</option>
          <option value={200}>200ms</option>
          <option value={500}>500ms</option>
          <option value={1000}>1s (slow)</option>
        </select>
      </div>

      {/* Status bar */}
      <div style={{
        display: "flex", gap: 16, padding: "6px 0", fontSize: 13,
        color: "var(--text-secondary)",
      }}>
        <span>Edges pushed: <strong>{edgeCount}</strong></span>
        <span>Tension: <strong>{tensionDisplay.toFixed(2)}</strong></span>
        <span style={{ opacity: 0.6 }}>{topologies[topoIndex].description}</span>
      </div>

      {/* Chart */}
      <div ref={vizRef} className="playground-chart-container">
        {containerWidth ? (
          <StreamNetworkFrame
            key={chartKey}
            ref={chartRef}
            chartType="sankey"
            size={[chartWidth, chartHeight]}
            orientation={values.orientation}
            nodeAlign={values.nodeAlign}
            nodeWidth={values.nodeWidth}
            nodePaddingRatio={values.nodePaddingRatio}
            showLabels={values.showLabels}
            showParticles={values.showParticles}
            particleStyle={{
              radius: values.particleRadius,
              opacity: values.particleOpacity,
              speedMultiplier: values.particleSpeed,
              spawnRate: values.particleSpawnRate,
              maxPerEdge: values.particleMaxPerEdge,
              proportionalSpeed: values.proportionalSpeed,
              colorBy: values.particleColorBy,
            }}
            edgeOpacity={values.edgeOpacity}
            edgeColorBy={values.edgeColorBy}
            colorScheme={colorScheme}
            tensionConfig={{
              threshold: values.tensionThreshold,
              transitionDuration: values.transitionDuration,
            }}
            enableHover={values.enableHover}
          />
        ) : null}
      </div>

      {/* Controls */}
      <PropControls
        controls={allControls}
        values={values}
        onChange={handleChange}
        onReset={handleReset}
      />

      {/* Generated code */}
      <h2 id="generated-code">Generated Code</h2>
      <CodeBlock code={code} language="jsx" />
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Code generator
// ---------------------------------------------------------------------------

function generateCode(values, defaults, colorScheme) {
  let code = `import { StreamNetworkFrame } from "semiotic"\nimport { useRef } from "react"\n\n`
  code += `const chartRef = useRef()\n\n`
  code += `// Push edges at any frequency\n`
  code += `chartRef.current.push({ source: "A", target: "B", value: 10 })\n\n`
  code += `<StreamNetworkFrame\n`
  code += `  ref={chartRef}\n`
  code += `  chartType="sankey"\n`
  code += `  size={[800, 500]}\n`

  // Layout props
  if (values.orientation !== "horizontal") code += `  orientation="${values.orientation}"\n`
  if (values.nodeAlign !== "justify") code += `  nodeAlign="${values.nodeAlign}"\n`
  if (values.nodeWidth !== 15) code += `  nodeWidth={${values.nodeWidth}}\n`
  if (values.nodePaddingRatio !== 0.05) code += `  nodePaddingRatio={${values.nodePaddingRatio}}\n`
  if (!values.showLabels) code += `  showLabels={false}\n`

  // Particles
  if (values.showParticles) {
    code += `  showParticles\n`
    const particleProps = []
    if (values.particleRadius !== 3) particleProps.push(`radius: ${values.particleRadius}`)
    if (values.particleOpacity !== 0.7) particleProps.push(`opacity: ${values.particleOpacity}`)
    if (values.particleSpeed !== 1) particleProps.push(`speedMultiplier: ${values.particleSpeed}`)
    if (values.particleSpawnRate !== 0.1) particleProps.push(`spawnRate: ${values.particleSpawnRate}`)
    if (values.particleMaxPerEdge !== 50) particleProps.push(`maxPerEdge: ${values.particleMaxPerEdge}`)
    if (values.proportionalSpeed) particleProps.push(`proportionalSpeed: true`)
    if (values.particleColorBy !== "source") particleProps.push(`colorBy: "${values.particleColorBy}"`)
    if (particleProps.length > 0) {
      code += `  particleStyle={{ ${particleProps.join(", ")} }}\n`
    }
  }

  // Edges
  if (values.edgeOpacity !== 0.5) code += `  edgeOpacity={${values.edgeOpacity}}\n`
  if (values.edgeColorBy !== "source") code += `  edgeColorBy="${values.edgeColorBy}"\n`
  if (colorScheme !== "category10") code += `  colorScheme="${colorScheme}"\n`

  // Tension
  const tensionProps = []
  if (values.tensionThreshold !== 3.0) tensionProps.push(`threshold: ${values.tensionThreshold}`)
  if (values.transitionDuration !== 500) tensionProps.push(`transitionDuration: ${values.transitionDuration}`)
  if (tensionProps.length > 0) {
    code += `  tensionConfig={{ ${tensionProps.join(", ")} }}\n`
  }

  if (!values.enableHover) code += `  enableHover={false}\n`

  code += `/>`
  return code
}
