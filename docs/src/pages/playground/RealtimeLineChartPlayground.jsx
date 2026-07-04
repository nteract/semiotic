import React, { useState, useRef, useEffect, useCallback } from "react"
import { RealtimeLineChart, RealtimeWaterfallChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Control schemas (shared + per-chart-type)
// ---------------------------------------------------------------------------

const sharedControls = [
  { name: "windowSize", type: "number", label: "Buffer Size", group: "Data",
    default: 200, min: 50, max: 500, step: 50 },
  { name: "arrowOfTime", type: "select", label: "Direction", group: "Layout",
    default: "right", options: ["right", "left", "up", "down"] },
  { name: "showAxes", type: "boolean", label: "Show Axes", group: "Layout",
    default: true },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
]

const lineControls = [
  { name: "stroke", type: "color", label: "Line Color", group: "Style",
    default: "#007bff" },
  { name: "strokeWidth", type: "number", label: "Line Width", group: "Style",
    default: 2, min: 1, max: 6, step: 0.5 },
]

const waterfallControls = [
  { name: "positiveColor", type: "color", label: "Gain Color", group: "Style",
    default: "#28a745" },
  { name: "negativeColor", type: "color", label: "Loss Color", group: "Style",
    default: "#dc3545" },
  { name: "connectorStroke", type: "color", label: "Connector Color", group: "Style",
    default: "#999999" },
  { name: "gap", type: "number", label: "Bar Gap", group: "Style",
    default: 1, min: 0, max: 5, step: 1 },
]

// ---------------------------------------------------------------------------
// Signal generators
// ---------------------------------------------------------------------------

const signals = [
  {
    label: "Sine Wave + Noise",
    generate: (t) => Math.sin(t * 0.05) * 40 + 50 + (Math.random() - 0.5) * 10,
  },
  {
    label: "Random Walk",
    generate: (() => {
      let val = 50
      return () => {
        val += (Math.random() - 0.5) * 4
        val = Math.max(0, Math.min(100, val))
        return val
      }
    })(),
  },
  {
    label: "Sawtooth + Jitter",
    generate: (t) => (t % 100) + (Math.random() - 0.5) * 5,
  },
  {
    label: "Daily Stock P&L",
    generate: (() => {
      // Produces mixed positive/negative values centered around zero,
      // with occasional larger swings — looks great as a waterfall.
      let streak = 0
      let bias = 0
      return () => {
        if (streak <= 0) {
          bias = (Math.random() - 0.5) * 2 // slight bull/bear bias
          streak = 3 + Math.floor(Math.random() * 8)
        }
        streak--
        const base = bias + (Math.random() - 0.5) * 6
        const shock = Math.random() > 0.93 ? (Math.random() - 0.5) * 20 : 0
        return Math.round((base + shock) * 100) / 100
      }
    })(),
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeLineChartPlayground() {
  const [chartType, setChartType] = useState("line")

  // Build control set based on chart type
  const controls = chartType === "line"
    ? [...lineControls, ...sharedControls]
    : [...waterfallControls, ...sharedControls]

  // Build defaults from current control set
  const defaults = {}
  for (const c of controls) {
    defaults[c.name] = c.default
  }

  const [values, setValues] = useState(() => {
    const d = {}
    for (const c of [...lineControls, ...waterfallControls, ...sharedControls]) {
      d[c.name] = c.default
    }
    return d
  })
  const [signalIndex, setSignalIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [containerWidth, setContainerWidth] = useState(null)
  const chartRef = useRef(null)
  const vizRef = useRef(null)
  const tickRef = useRef(0)

  // ResizeObserver for responsive chart width
  useEffect(() => {
    const el = vizRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Data pump
  useEffect(() => {
    if (!running) return
    const signal = signals[signalIndex]
    const interval = setInterval(() => {
      tickRef.current += 1
      const point = {
        time: Date.now(),
        value: signal.generate(tickRef.current),
      }
      chartRef.current?.push(point)
    }, 50)
    return () => clearInterval(interval)
  }, [running, signalIndex])

  const handleChange = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const handleReset = useCallback(() => {
    setValues((prev) => {
      const next = { ...prev }
      for (const c of controls) {
        next[c.name] = c.default
      }
      return next
    })
  }, [chartType])

  const handleClear = useCallback(() => {
    chartRef.current?.clear()
    tickRef.current = 0
  }, [])

  // Build chart props
  const chartWidth = containerWidth || 600
  const chartHeight = 350

  // Generate code
  const code = generateCode(chartType, controls, values, defaults)

  const ChartComponent = chartType === "line" ? RealtimeLineChart : RealtimeWaterfallChart
  const componentName = chartType === "line" ? "RealtimeLineChart" : "RealtimeWaterfallChart"

  return (
    <PageLayout
      title="Realtime Line / Waterfall Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Realtime Line / Waterfall", path: "/playground/realtime-line-chart" },
      ]}
      prevPage={{ title: "Streaming Sankey Playground", path: "/playground/streaming-sankey" }}
      nextPage={{ title: "Realtime Bar / Swarm Playground", path: "/playground/realtime-bar-chart" }}
    >
      <p>
        <strong>Line</strong> and <strong>Waterfall</strong> are two views of the same
        streaming signal. A line chart is the natural default for monitoring a
        continuous value over time — CPU load, stock price, sensor
        temperature — where the shape of the curve tells the story. Switch to
        a waterfall when you care about <em>individual changes</em>: each bar
        shows one delta (green for gains, red for losses), making it easy to
        spot anomalies or audit a sequence of incremental updates like a P&amp;L
        statement. Use the toggle below to compare them side-by-side on the
        same data stream.
      </p>

      {/* Chart type toggle */}
      <div className="playground-dataset-picker" style={{ marginBottom: 8 }}>
        <label htmlFor="pg-chart-type">Chart Type:</label>
        <select
          id="pg-chart-type"
          className="playground-select"
          value={chartType}
          onChange={(e) => {
            setChartType(e.target.value)
            handleClear()
          }}
        >
          <option value="line">Line</option>
          <option value="waterfall">Waterfall</option>
        </select>
      </div>

      {/* Signal picker + transport controls */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-signal">Signal:</label>
        <select
          id="pg-signal"
          className="playground-select"
          value={signalIndex}
          onChange={(e) => {
            setSignalIndex(parseInt(e.target.value, 10))
            handleClear()
          }}
        >
          {signals.map((s, i) => (
            <option key={i} value={i}>{s.label}</option>
          ))}
        </select>
        <button
          className="playground-reset-button"
          style={{ marginLeft: 8 }}
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
      </div>

      {/* Chart preview */}
      <div ref={vizRef} className="playground-chart-container">
        {containerWidth ? (
          <ChartComponent
            key={`rt-${chartType}-${values.enableHover}-${values.arrowOfTime}-${values.windowSize}`}
            ref={chartRef}
            size={[chartWidth, chartHeight]}
            timeAccessor="time"
            valueAccessor="value"
            windowSize={values.windowSize}
            arrowOfTime={values.arrowOfTime}
            showAxes={values.showAxes}
            enableHover={values.enableHover}
            {...(chartType === "line"
              ? {
                  stroke: values.stroke,
                  strokeWidth: values.strokeWidth,
                }
              : {
                  positiveColor: values.positiveColor,
                  negativeColor: values.negativeColor,
                  connectorStroke: values.connectorStroke,
                  gap: values.gap,
                }
            )}
          />
        ) : null}
      </div>

      {/* Controls */}
      <PropControls
        controls={controls}
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

function generateCode(chartType, controls, values, defaults) {
  const componentName = chartType === "line" ? "RealtimeLineChart" : "RealtimeWaterfallChart"
  let code = `import { ${componentName} } from "semiotic"\nimport { useRef } from "react"\n\n`
  code += `const chartRef = useRef()\n\n`
  code += `// Push data at any frequency\n`
  code += `chartRef.current.push({ time: Date.now(), value: reading })\n\n`
  code += `<${componentName}\n`
  code += `  ref={chartRef}\n`
  code += `  timeAccessor="time"\n`
  code += `  valueAccessor="value"\n`

  for (const c of controls) {
    const v = values[c.name]
    if (v === defaults[c.name]) continue
    if (c.type === "string" && v === "") continue

    let propStr
    if (c.type === "color" || c.type === "string" || c.type === "select") {
      propStr = `"${v}"`
    } else if (c.type === "boolean") {
      propStr = `{${v}}`
    } else {
      propStr = `{${v}}`
    }
    code += `  ${c.name}=${propStr}\n`
  }

  code += `/>`
  return code
}
