import React, { useRef, useEffect, useState } from "react"
import { RealtimeBarChart } from "semiotic"

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

function BasicBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: Math.floor(Math.random() * 39) + 1,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeBarChart
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          fill="#007bff"
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StackedBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const categories = ["errors", "warnings", "info"]

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const cat = categories[i % categories.length]
        const ranges = { errors: 5, warnings: 10, info: 20 }
        chartRef.current.push({
          time: Math.floor(i / 3),
          value: Math.floor(Math.random() * ranges[cat]) + 1,
          category: cat,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeBarChart
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          categoryAccessor="category"
          colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StyledBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: Math.floor(Math.abs(Math.sin(i * 0.04)) * 50) + 5,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeBarChart
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          fill="#28a745"
          stroke="#1e7e34"
          gap={2}
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

const realtimeBarChartProps = [
  { name: "binSize", type: "number", required: true, default: null, description: "Time interval for binning data points into bars. Points within the same bin are aggregated." },
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
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for stacked bars. When provided, bars are stacked by category within each bin." },
  { name: "colors", type: "object", required: false, default: null, description: "Category-to-color map for stacked bars. Keys also determine stack order." },
  { name: "fill", type: "string", required: false, default: null, description: "Bar fill color in non-stacked mode." },
  { name: "stroke", type: "string", required: false, default: null, description: "Bar stroke (outline) color." },
  { name: "strokeWidth", type: "number", required: false, default: null, description: "Bar stroke width." },
  { name: "gap", type: "number", required: false, default: null, description: "Gap between bars in pixels." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on bars." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip render function. Receives hover data." },
  { name: "onHover", type: "function", required: false, default: null, description: "Callback fired on hover. Receives hover data or null." },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects rendered on the chart." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation render function." },
  { name: "tickFormatTime", type: "function", required: false, default: null, description: "Custom formatter for time axis tick labels." },
  { name: "tickFormatValue", type: "function", required: false, default: null, description: "Custom formatter for value axis tick labels." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name for the chart container." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeBarChartPage() {
  return (
    <PageLayout
      title="RealtimeBarChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeBarChart", path: "/charts/realtime-bar-chart" },
      ]}
      prevPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
      nextPage={{ title: "Realtime Swarm Chart", path: "/charts/realtime-swarm-chart" }}
    >
      <ComponentMeta
        componentName="RealtimeBarChart"
        importStatement='import { RealtimeBarChart } from "semiotic"'
        tier="charts"
        wraps="RealtimeFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
          { name: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "RealtimeFrame", path: "/frames/realtime-frame" },
        ]}
      />

      <p>
        RealtimeBarChart renders a streaming temporal histogram. Incoming data
        points are binned by time interval and rendered as bars that scroll
        across the chart. It wraps{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> with{" "}
        <code>chartType="bar"</code> and supports both simple and stacked
        (categorical) modes. Edge bins that only partially fall within the
        visible time window are rendered at proportionally narrower widths.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Create a ref, push data points on an interval, and
        RealtimeBarChart bins and renders them as bars. The{" "}
        <code>binSize</code> prop defines the time interval for aggregation.
      </p>

      <BasicBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeBarChart } from "semiotic"
import { useRef, useEffect } from "react"

function StreamingBars() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      chartRef.current?.push({
        time: indexRef.current++,
        value: Math.floor(Math.random() * 39) + 1
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeBarChart
      ref={chartRef}
      binSize={20}
      fill="#007bff"
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

      <h3 id="stacked-bars">Stacked Bars by Category</h3>
      <p>
        Use <code>categoryAccessor</code> and <code>colors</code> to stack
        bars by category within each bin. The stack order follows the key
        order of the <code>colors</code> object.
      </p>

      <StackedBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`const categories = ["errors", "warnings", "info"]

useEffect(() => {
  const id = setInterval(() => {
    const cat = categories[indexRef.current % 3]
    chartRef.current?.push({
      time: Math.floor(indexRef.current++ / 3),
      value: Math.floor(Math.random() * 10) + 1,
      category: cat
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeBarChart
  ref={chartRef}
  binSize={20}
  categoryAccessor="category"
  colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
  windowSize={200}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="styled-bars">Custom Bar Styling</h3>
      <p>
        Control the appearance with <code>fill</code>, <code>stroke</code>,
        and <code>gap</code> to create distinct visual styles.
      </p>

      <StyledBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`useEffect(() => {
  const id = setInterval(() => {
    const i = indexRef.current++
    chartRef.current?.push({
      time: i,
      value: Math.floor(Math.abs(Math.sin(i * 0.04)) * 50) + 5
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeBarChart
  ref={chartRef}
  binSize={20}
  fill="#28a745"
  stroke="#1e7e34"
  gap={2}
  windowSize={200}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeBarChart" props={realtimeBarChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom bin aggregation, mixed chart
        types, or advanced annotation logic — graduate to{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> directly.
        Every <code>RealtimeBarChart</code> is just a configured{" "}
        <code>RealtimeFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeBarChart } from "semiotic"

<RealtimeBarChart
  ref={chartRef}
  data={eventStream}
  binSize={5000}
  timeAccessor="time"
  valueAccessor="count"
  fill="#007bff"
  gap={2}
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
  chartType="bar"
  data={eventStream}
  binSize={5000}
  timeAccessor="time"
  valueAccessor="count"
  barStyle={{
    fill: "#007bff",
    gap: 2
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
        The <code>categoryAccessor</code> and <code>colors</code> props on
        RealtimeBarChart map directly to <code>categoryAccessor</code> and{" "}
        <code>barColors</code> on RealtimeFrame for stacked bar support.
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
          <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> —
          individual data points as a streaming scatter/swarm
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
          <Link to="/charts/bar-chart">BarChart</Link> — for static (non-realtime)
          bar chart visualization
        </li>
      </ul>
    </PageLayout>
  )
}
