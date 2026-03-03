import React, { useRef, useEffect, useState } from "react"
import { RealtimeSankey } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"

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
// Sample data sets for push demos
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
// Demos
// ---------------------------------------------------------------------------

function BasicDemo() {
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
    // Push a small increment to an existing edge
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
          <RealtimeSankey
            ref={chartRef}
            size={[containerWidth, 400]}
            showParticles={true}
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

function StreamingDemo() {
  const chartRef = useRef()
  const [containerRef, containerWidth] = useContainerWidth()
  const [running, setRunning] = useState(false)

  // Pipeline with branching, merging, and a feedback cycle
  const PIPELINE = [
    { source: "Ingest", target: "Validate", w: 3 },
    { source: "Validate", target: "Process", w: 3 },
    { source: "Validate", target: "Reject", w: 1 },
    { source: "Process", target: "Store", w: 2 },
    { source: "Process", target: "Cache", w: 2 },
    { source: "Store", target: "Serve", w: 2 },
    { source: "Cache", target: "Serve", w: 3 },
    { source: "Serve", target: "Ingest", w: 1 }  // feedback cycle
  ]

  useEffect(() => {
    if (!running) return
    // Weighted random selection so the cycle link fires less often
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
          <RealtimeSankey
            ref={chartRef}
            size={[containerWidth, 450]}
            showParticles={true}
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
// Page
// ---------------------------------------------------------------------------

const PROPS = [
  { name: "size", type: "[number, number]", default: "[800, 600]", description: "Chart dimensions as [width, height]" },
  { name: "margin", type: "object", default: "{ top: 20, right: 80, bottom: 20, left: 80 }", description: "Chart margins" },
  { name: "initialEdges", type: "EdgePush[]", default: "undefined", description: "Initial edges to populate the graph" },
  { name: "sourceAccessor", type: "string", default: '"source"', description: "Field name for source in pushed edges" },
  { name: "targetAccessor", type: "string", default: '"target"', description: "Field name for target in pushed edges" },
  { name: "valueAccessor", type: "string", default: '"value"', description: "Field name for value in pushed edges" },
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"', description: "Layout orientation" },
  { name: "nodeAlign", type: '"justify" | "left" | "right" | "center"', default: '"justify"', description: "Node alignment strategy" },
  { name: "nodePaddingRatio", type: "number", default: "0.05", description: "Padding between nodes (ratio)" },
  { name: "nodeWidth", type: "number", default: "15", description: "Width of node rectangles in pixels" },
  { name: "showParticles", type: "boolean", default: "true", description: "Show animated particles flowing through links" },
  { name: "particleStyle", type: "ParticleStyle", default: "{ radius: 3, opacity: 0.7, spawnRate: 0.1 }", description: "Particle visual configuration" },
  { name: "tensionConfig", type: "Partial<TensionConfig>", default: "{ threshold: 3.0 }", description: "Tension model configuration for incremental relayout" },
  { name: "colorBy", type: "string | function", default: "undefined", description: "Node color accessor" },
  { name: "colorScheme", type: 'string | string[]', default: '"category10"', description: "Color scheme for nodes" },
  { name: "edgeColorBy", type: '"source" | "target" | function', default: '"source"', description: "Edge color strategy" },
  { name: "edgeOpacity", type: "number", default: "0.5", description: "Opacity of edge bands" },
  { name: "nodeLabel", type: "string | function", default: "undefined", description: "Node label accessor" },
  { name: "showLabels", type: "boolean", default: "true", description: "Show node labels" },
  { name: "enableHover", type: "boolean", default: "true", description: "Enable hover tooltips" },
  { name: "tooltipContent", type: "function", default: "undefined", description: "Custom tooltip renderer" },
  { name: "onTopologyChange", type: "function", default: "undefined", description: "Callback when topology changes" },
  { name: "background", type: "string", default: "undefined", description: "Background color" },
  { name: "className", type: "string", default: "undefined", description: "CSS class name" }
]

export default function RealtimeSankeyPage() {
  return (
    <PageLayout>
      <ComponentMeta
        name="RealtimeSankey"
        description="A streaming Sankey diagram where topology grows over time. Push edges imperatively via ref and watch nodes, links, and animated particles appear. The tension model batches relayouts for smooth performance."
        importPath='import { RealtimeSankey } from "semiotic"'
        category="Realtime"
      />

      <h2>Interactive Demo</h2>
      <p>
        Click <strong>Load Budget Data</strong> to seed the Sankey with a personal budget flow.
        Then click <strong>Add Edge</strong> to grow the topology or <strong>Increment Random Edge</strong> to
        increase flow on an existing link. Particles animate along links proportional to their value.
      </p>
      <BasicDemo />

      <CodeBlock
        code={`const chartRef = useRef()

// Push edges at any frequency
chartRef.current.push({ source: "Salary", target: "Budget", value: 5000 })
chartRef.current.push({ source: "Budget", target: "Rent", value: 2000 })

<RealtimeSankey
  ref={chartRef}
  size={[800, 400]}
  showParticles
  edgeOpacity={0.4}
/>`}
      />

      <h2>Streaming Demo</h2>
      <p>
        Click <strong>Start Streaming</strong> to continuously push random edges between
        infrastructure nodes. The tension model automatically triggers relayouts as the
        topology evolves.
      </p>
      <StreamingDemo />

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
      />

      <h2>Push API (ref handle)</h2>
      <p>Access these methods via a React ref:</p>
      <ul>
        <li><code>push(edge)</code> — push a single edge <code>{`{ source, target, value }`}</code></li>
        <li><code>pushMany(edges)</code> — batch push multiple edges</li>
        <li><code>clear()</code> — reset the graph</li>
        <li><code>getTopology()</code> — get current <code>{`{ nodes, edges }`}</code></li>
        <li><code>relayout()</code> — force a full relayout</li>
        <li><code>getTension()</code> — current accumulated tension value</li>
      </ul>

      <h2>Tension Model</h2>
      <p>
        Each push adds tension proportional to topological disruption. When tension exceeds
        the threshold, a full d3-sankey relayout runs with smooth animation.
      </p>
      <ul>
        <li>New node: +1.0 tension</li>
        <li>New edge: +0.5 tension</li>
        <li>Weight change: +0.1 tension</li>
        <li>Default threshold: 3.0</li>
      </ul>

      <h2>Props</h2>
      <PropTable props={PROPS} />
    </PageLayout>
  )
}
