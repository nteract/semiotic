import React, { useState, useRef, useEffect, useCallback } from "react"
import { RealtimeHistogram, RealtimeSwarmChart } from "semiotic"
import PageLayout from "../../components/PageLayout"
import PropControls from "../../components/PropControls"
import CodeBlock from "../../components/CodeBlock"

// ---------------------------------------------------------------------------
// Control schemas
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

const barControls = [
  { name: "binSize", type: "number", label: "Bin Size (ms)", group: "Bars",
    default: 500, min: 100, max: 2000, step: 100 },
  { name: "fill", type: "color", label: "Fill Color", group: "Bars",
    default: "#007bff" },
  { name: "gap", type: "number", label: "Bar Gap", group: "Bars",
    default: 1, min: 0, max: 5, step: 1 },
]

const swarmControls = [
  { name: "radius", type: "number", label: "Dot Radius", group: "Dots",
    default: 3, min: 1, max: 10, step: 1 },
  { name: "opacity", type: "number", label: "Dot Opacity", group: "Dots",
    default: 0.7, min: 0.1, max: 1, step: 0.05 },
  { name: "fill", type: "color", label: "Fill Color", group: "Dots",
    default: "#007bff" },
]

// ---------------------------------------------------------------------------
// Category colors for stacked/colored mode
// ---------------------------------------------------------------------------

const categoryColors = {
  GET: "#007bff",
  POST: "#28a745",
  DELETE: "#dc3545",
}

// ---------------------------------------------------------------------------
// Data generators
// ---------------------------------------------------------------------------

const generators = [
  {
    label: "Server Latency (3 endpoints)",
    generate: () => {
      const endpoints = ["GET", "POST", "DELETE"]
      const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)]
      // Simulate different latency profiles per endpoint
      const base = endpoint === "GET" ? 20 : endpoint === "POST" ? 40 : 30
      const jitter = Math.random() * 60
      const spike = Math.random() > 0.95 ? 150 : 0
      return {
        time: Date.now(),
        value: base + jitter + spike,
        category: endpoint,
      }
    },
    hasCategories: true,
  },
  {
    label: "Sensor Readings",
    generate: (() => {
      let val = 50
      return () => {
        val += (Math.random() - 0.5) * 6
        val = Math.max(10, Math.min(90, val))
        return {
          time: Date.now(),
          value: val + (Math.random() - 0.5) * 4,
        }
      }
    })(),
    hasCategories: false,
  },
  {
    label: "Event Bursts",
    generate: (() => {
      let burstCountdown = 0
      return () => {
        if (burstCountdown <= 0 && Math.random() > 0.97) {
          burstCountdown = 10 + Math.floor(Math.random() * 20)
        }
        const inBurst = burstCountdown > 0
        if (inBurst) burstCountdown--
        return {
          time: Date.now(),
          value: inBurst
            ? 60 + Math.random() * 40
            : 10 + Math.random() * 20,
        }
      }
    })(),
    hasCategories: false,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeHistogramPlayground() {
  const [chartType, setChartType] = useState("bar")

  const controls = chartType === "bar"
    ? [...barControls, ...sharedControls]
    : [...swarmControls, ...sharedControls]

  const defaults = {}
  for (const c of controls) {
    defaults[c.name] = c.default
  }

  const [values, setValues] = useState(() => {
    const d = {}
    for (const c of [...barControls, ...swarmControls, ...sharedControls]) {
      d[c.name] = c.default
    }
    return d
  })
  const [genIndex, setGenIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [containerWidth, setContainerWidth] = useState(null)
  const chartRef = useRef(null)
  const vizRef = useRef(null)

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

  // Data pump - pushes individual points at ~20Hz
  useEffect(() => {
    if (!running) return
    const gen = generators[genIndex]
    const interval = setInterval(() => {
      const point = gen.generate()
      chartRef.current?.push(point)
    }, 50)
    return () => clearInterval(interval)
  }, [running, genIndex])

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
  }, [])

  const chartWidth = containerWidth || 600
  const chartHeight = 350
  const currentGen = generators[genIndex]

  const code = generateCode(chartType, controls, values, defaults, currentGen.hasCategories)

  const chartKey = `rt-${chartType}-${values.enableHover}-${values.arrowOfTime}-${values.windowSize}-${values.binSize}`

  return (
    <PageLayout
      title="Realtime Bar / Swarm Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Realtime Bar / Swarm", path: "/playground/realtime-bar-chart" },
      ]}
      prevPage={{ title: "Realtime Line / Waterfall Playground", path: "/playground/realtime-line-chart" }}
    >
      <p>
        <strong>Stacked time bars</strong> and <strong>swarm plots</strong> answer
        different questions about the same data stream. Time bars aggregate
        incoming points into bins — great for dashboards where you want
        throughput, error rates, or distribution summaries at a glance. Switch
        to a swarm when you need to see <em>every individual data point</em>:
        each dot sits at its exact (time, value) coordinate, revealing outliers,
        clusters, and gaps that binning would hide. For the "Server Latency"
        dataset, bars show total request volume per bin stacked by endpoint,
        while swarm shows each request's latency individually, color-coded by
        endpoint.
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
          <option value="bar">Stacked Time Bars</option>
          <option value="swarm">Swarm Plot</option>
        </select>
      </div>

      {/* Generator picker + transport controls */}
      <div className="playground-dataset-picker">
        <label htmlFor="pg-gen">Data Source:</label>
        <select
          id="pg-gen"
          className="playground-select"
          value={genIndex}
          onChange={(e) => {
            setGenIndex(parseInt(e.target.value, 10))
            handleClear()
          }}
        >
          {generators.map((g, i) => (
            <option key={i} value={i}>{g.label}</option>
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
          chartType === "bar" ? (
            <RealtimeHistogram
              key={chartKey}
              ref={chartRef}
              size={[chartWidth, chartHeight]}
              timeAccessor="time"
              valueAccessor="value"
              binSize={values.binSize}
              windowSize={values.windowSize}
              arrowOfTime={values.arrowOfTime}
              showAxes={values.showAxes}
              enableHover={values.enableHover}
              fill={currentGen.hasCategories ? undefined : values.fill}
              gap={values.gap}
              {...(currentGen.hasCategories
                ? { categoryAccessor: "category", colors: categoryColors }
                : {}
              )}
            />
          ) : (
            <RealtimeSwarmChart
              key={chartKey}
              ref={chartRef}
              size={[chartWidth, chartHeight]}
              timeAccessor="time"
              valueAccessor="value"
              radius={values.radius}
              opacity={values.opacity}
              windowSize={values.windowSize}
              arrowOfTime={values.arrowOfTime}
              showAxes={values.showAxes}
              enableHover={values.enableHover}
              fill={currentGen.hasCategories ? undefined : values.fill}
              {...(currentGen.hasCategories
                ? { categoryAccessor: "category", colors: categoryColors }
                : {}
              )}
            />
          )
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

function generateCode(chartType, controls, values, defaults, hasCategories) {
  const componentName = chartType === "bar" ? "RealtimeHistogram" : "RealtimeSwarmChart"
  let code = `import { ${componentName} } from "semiotic"\nimport { useRef } from "react"\n\n`
  code += `const chartRef = useRef()\n\n`
  code += `// Push individual data points\n`
  if (hasCategories) {
    code += `chartRef.current.push({ time: Date.now(), value: 42, category: "GET" })\n\n`
  } else {
    code += `chartRef.current.push({ time: Date.now(), value: reading })\n\n`
  }
  code += `<${componentName}\n`
  code += `  ref={chartRef}\n`
  code += `  timeAccessor="time"\n`
  code += `  valueAccessor="value"\n`

  if (hasCategories) {
    code += `  categoryAccessor="category"\n`
    code += `  colors={{ GET: "#007bff", POST: "#28a745", DELETE: "#dc3545" }}\n`
  }

  for (const c of controls) {
    const v = values[c.name]
    if (v === defaults[c.name]) continue
    if (c.type === "string" && v === "") continue
    // Skip fill when categories are active (colors map is used instead)
    if (c.name === "fill" && hasCategories) continue

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
