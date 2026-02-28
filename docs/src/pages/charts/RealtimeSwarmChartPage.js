import React, { useRef, useEffect, useState } from "react"
import { RealtimeSwarmChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
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
// Live streaming demos
// ---------------------------------------------------------------------------

function BasicSwarmDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 10 + Math.random() * 80,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeSwarmChart
          ref={chartRef}
          size={[containerWidth, 280]}
          radius={3}
          fill="#007bff"
          opacity={0.7}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function CategorizedSwarmDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const sensors = ["sensor1", "sensor2", "sensor3"]

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const sensor = sensors[i % 3]
        const base = sensor === "sensor1" ? 60 : sensor === "sensor2" ? 45 : 30
        chartRef.current.push({
          time: i,
          value: base + (Math.random() - 0.5) * 20,
          sensor,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeSwarmChart
          ref={chartRef}
          size={[containerWidth, 280]}
          categoryAccessor="sensor"
          colors={{ sensor1: "#007bff", sensor2: "#28a745", sensor3: "#fd7e14" }}
          radius={4}
          opacity={0.8}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StyledSwarmDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.08) * 25 + (Math.random() - 0.5) * 10,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeSwarmChart
          ref={chartRef}
          size={[containerWidth, 280]}
          radius={5}
          fill="#6f42c1"
          opacity={0.6}
          stroke="#4c2889"
          strokeWidth={1}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const realtimeSwarmChartProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array. Each object should contain fields matched by timeAccessor and valueAccessor." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value from each data point." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins: { top, right, bottom, left }." },
  { name: "arrowOfTime", type: '"left" | "right"', required: false, default: '"right"', description: "Direction that time flows across the chart." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy. "sliding" discards old points beyond windowSize.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity when using sliding window mode." },
  { name: "timeExtent", type: "[number, number]", required: false, default: null, description: "Fixed time domain. Defaults to auto-fit." },
  { name: "valueExtent", type: "[number, number]", required: false, default: null, description: "Fixed value domain. Defaults to auto-fit." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding factor applied to auto-computed extents." },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for color-coding dots by group." },
  { name: "colors", type: "object", required: false, default: null, description: "Category-to-color map when using categoryAccessor." },
  { name: "radius", type: "number", required: false, default: null, description: "Dot radius in pixels." },
  { name: "fill", type: "string", required: false, default: null, description: "Dot fill color when no categoryAccessor is set." },
  { name: "opacity", type: "number", required: false, default: null, description: "Dot opacity (0 to 1)." },
  { name: "stroke", type: "string", required: false, default: null, description: "Dot stroke (outline) color." },
  { name: "strokeWidth", type: "number", required: false, default: null, description: "Dot stroke width." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on dots." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip render function. Receives hover data." },
  { name: "onHover", type: "function", required: false, default: null, description: "Callback fired on hover. Receives hover data or null." },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects, including threshold coloring rules." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation render function." },
  { name: "tickFormatTime", type: "function", required: false, default: null, description: "Custom formatter for time axis tick labels." },
  { name: "tickFormatValue", type: "function", required: false, default: null, description: "Custom formatter for value axis tick labels." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name for the chart container." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeSwarmChartPage() {
  return (
    <PageLayout
      title="RealtimeSwarmChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
      ]}
      prevPage={{ title: "Realtime Bar Chart", path: "/charts/realtime-bar-chart" }}
      nextPage={{ title: "Realtime Waterfall Chart", path: "/charts/realtime-waterfall-chart" }}
    >
      <ComponentMeta
        componentName="RealtimeSwarmChart"
        importStatement='import { RealtimeSwarmChart } from "semiotic"'
        tier="charts"
        wraps="RealtimeFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
          { name: "RealtimeBarChart", path: "/charts/realtime-bar-chart" },
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "RealtimeFrame", path: "/frames/realtime-frame" },
        ]}
      />

      <p>
        RealtimeSwarmChart renders individual data points as dots at their
        (time, value) coordinates, creating a streaming scatter or swarm
        visualization. It wraps{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> with{" "}
        <code>chartType="swarm"</code> and promotes dot styling to top-level
        props. Create a ref and call <code>ref.current.push(point)</code> in a{" "}
        <code>setInterval</code> to stream data in. Supports category-based
        color coding and threshold coloring via annotations.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Create a ref, push data points on an interval, and
        RealtimeSwarmChart handles the rest. The sliding window keeps the
        most recent points in view.
      </p>

      <BasicSwarmDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeSwarmChart } from "semiotic"
import { useRef, useEffect } from "react"

function StreamingSwarm() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      chartRef.current?.push({
        time: indexRef.current++,
        value: 10 + Math.random() * 80
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeSwarmChart
      ref={chartRef}
      radius={3}
      fill="#007bff"
      opacity={0.7}
      windowSize={200}
      showAxes={true}
    />
  )
}`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="categorized-dots">Color-Coded by Category</h3>
      <p>
        Use <code>categoryAccessor</code> and <code>colors</code> to
        color-code dots by group, such as different sensors or event types.
      </p>

      <CategorizedSwarmDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`const sensors = ["sensor1", "sensor2", "sensor3"]

useEffect(() => {
  const id = setInterval(() => {
    const i = indexRef.current++
    const sensor = sensors[i % 3]
    const base = sensor === "sensor1" ? 60
      : sensor === "sensor2" ? 45 : 30
    chartRef.current?.push({
      time: i,
      value: base + (Math.random() - 0.5) * 20,
      sensor
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeSwarmChart
  ref={chartRef}
  categoryAccessor="sensor"
  colors={{
    sensor1: "#007bff",
    sensor2: "#28a745",
    sensor3: "#fd7e14"
  }}
  radius={4}
  opacity={0.8}
  windowSize={200}
  showAxes={true}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="styled-dots">Custom Dot Styling</h3>
      <p>
        Control the appearance with <code>radius</code>,{" "}
        <code>fill</code>, <code>opacity</code>, and <code>stroke</code> to
        create a distinctive look. Here the data follows a sinusoidal pattern
        with random noise.
      </p>

      <StyledSwarmDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`useEffect(() => {
  const id = setInterval(() => {
    const i = indexRef.current++
    chartRef.current?.push({
      time: i,
      value: 50 + Math.sin(i * 0.08) * 25
        + (Math.random() - 0.5) * 10
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeSwarmChart
  ref={chartRef}
  radius={5}
  fill="#6f42c1"
  opacity={0.6}
  stroke="#4c2889"
  strokeWidth={1}
  windowSize={200}
  showAxes={true}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeSwarmChart" props={realtimeSwarmChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need full control — threshold coloring, combined chart types,
        or custom canvas marks — graduate to{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> directly.
        Every <code>RealtimeSwarmChart</code> is just a configured{" "}
        <code>RealtimeFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeSwarmChart } from "semiotic"

<RealtimeSwarmChart
  ref={chartRef}
  data={sensorStream}
  timeAccessor="time"
  valueAccessor="value"
  categoryAccessor="sensor"
  colors={{
    sensor1: "#007bff",
    sensor2: "#28a745"
  }}
  radius={4}
  opacity={0.8}
  enableHover
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { RealtimeFrame } from "semiotic"

<RealtimeFrame
  ref={frameRef}
  chartType="swarm"
  data={sensorStream}
  timeAccessor="time"
  valueAccessor="value"
  categoryAccessor="sensor"
  barColors={{
    sensor1: "#007bff",
    sensor2: "#28a745"
  }}
  swarmStyle={{
    radius: 4,
    opacity: 0.8
  }}
  hoverAnnotation={true}
  showAxes={true}
  size={[500, 300]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        Note that <code>colors</code> on RealtimeSwarmChart maps to{" "}
        <code>barColors</code> on RealtimeFrame, and dot styling props are
        grouped into a <code>swarmStyle</code> object at the Frame level.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> —
          streaming continuous line for time-series data
        </li>
        <li>
          <Link to="/charts/realtime-bar-chart">RealtimeBarChart</Link> —
          streaming temporal histograms with binned bars
        </li>
        <li>
          <Link to="/charts/realtime-waterfall-chart">RealtimeWaterfallChart</Link> —
          cumulative deltas as connected rising and falling bars
        </li>
        <li>
          <Link to="/frames/realtime-frame">RealtimeFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — for static
          (non-realtime) point-based XY visualization
        </li>
      </ul>
    </PageLayout>
  )
}
