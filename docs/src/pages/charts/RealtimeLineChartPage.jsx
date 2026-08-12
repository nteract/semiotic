import React, { useRef, useEffect, useState } from "react"
import { RealtimeLineChart } from "semiotic/realtime"

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

function BasicLineDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.05) * 20 + (Math.random() - 0.5) * 6,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          size={[containerWidth, 280]}
          stroke="#007bff"
          strokeWidth={2}
          windowSize={150}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StyledLineDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 30 + i * 0.3 + Math.sin(i * 0.08) * 15,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          size={[containerWidth, 280]}
          stroke="#e74c3c"
          strokeWidth={3}
          windowSize={150}
          showAxes={true}
        />
      )}
    </div>
  )
}

function DashedLineDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 100 - Math.cos(i * 0.04) * 30 + (Math.random() - 0.5) * 8,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          size={[containerWidth, 280]}
          stroke="#28a745"
          strokeWidth={2}
          strokeDasharray="6,3"
          windowSize={150}
          showAxes={true}
        />
      )}
    </div>
  )
}

function FixedExtentDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.05) * 20 + (Math.random() - 0.5) * 6,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          size={[containerWidth, 280]}
          stroke="#6f42c1"
          strokeWidth={2}
          valueExtent={[0, 100]}
          windowSize={150}
          showAxes={true}
        />
      )}
    </div>
  )
}

function ThresholdDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: Math.sin(i * 0.05) * 50 + 100 + (Math.random() - 0.5) * 20,
        })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeLineChart
          ref={chartRef}
          size={[containerWidth, 280]}
          stroke="#f59e0b"
          strokeWidth={2}
          windowSize={200}
          showAxes={true}
          annotations={[
            { type: "threshold", value: 130, label: "High", color: "#ef4444" },
            { type: "threshold", value: 70, label: "Low", color: "#6366f1", thresholdType: "lesser" },
          ]}
          svgAnnotationRules={(annotation, i, context) => {
            if (annotation.type === "threshold" && context && context.scales) {
              const y = context.scales.value(annotation.value)
              const lineColor = annotation.color || "#ef4444"
              return (
                <g key={`threshold-${i}`}>
                  <line
                    x1={0}
                    x2={context.width}
                    y1={y}
                    y2={y}
                    stroke={lineColor}
                    strokeWidth={1.5}
                    strokeDasharray="6,3"
                  />
                  <text
                    x={context.width - 4}
                    y={y - 6}
                    textAnchor="end"
                    fill={lineColor}
                    fontSize={11}
                    fontWeight="bold"
                  >
                    {annotation.label}: {annotation.value}
                  </text>
                </g>
              )
            }
            return null
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const realtimeLineChartProps = [
  { name: "data", type: "array", required: false, default: null, description: "Controlled data array. Omit this prop to use the ref push API; data={[]} is controlled empty data, not push mode." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value from each data point." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "number | object", required: false, default: null, description: "Uniform numeric margin or per-side margins: { top, right, bottom, left }." },
  { name: "arrowOfTime", type: '"left" | "right"', required: false, default: '"right"', description: "Direction that time flows across the chart." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy. "sliding" discards old points beyond windowSize; "growing" keeps all.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity when using sliding window mode." },
  { name: "timeExtent", type: "[number, number]", required: false, default: null, description: "Fixed time domain. Defaults to auto-fit." },
  { name: "valueExtent", type: "[number, number]", required: false, default: null, description: "Fixed value domain. Defaults to auto-fit." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding factor applied to auto-computed extents." },
  { name: "stroke", type: "string", required: false, default: '"#007bff"', description: "Line color." },
  { name: "strokeWidth", type: "number", required: false, default: "2", description: "Line width in pixels." },
  { name: "strokeDasharray", type: "string", required: false, default: null, description: 'SVG dash pattern string, e.g. "4,2".' },
  { name: "opacity", type: "number", required: false, default: "1", description: "Uniform line opacity from 0 to 1." },
  { name: "cursor", type: "CSS cursor", required: false, default: null, description: 'Presentation-only cursor for the line, such as "pointer". It does not add click or keyboard behavior.' },
  { name: "aggregate", type: "object", required: false, default: null, description: "Reduce pushed events into tumbling, hopping, or session windows before rendering." },
  { name: "eventTime", type: "object", required: false, default: null, description: "Reorder pushed events inside a bounded lateness window. Call flush() at an asserted stream or batch boundary." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on the chart." },
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

export default function RealtimeLineChartPage() {
  return (
    <PageLayout
      title="RealtimeLineChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
      ]}
      prevPage={{ title: "Multi-Axis Line Chart", path: "/charts/multi-axis-line-chart" }}
      nextPage={{ title: "Realtime Histogram", path: "/charts/realtime-histogram" }}
    >
      <ComponentMeta
        componentName="RealtimeLineChart"
        importStatement='import { RealtimeLineChart } from "semiotic/realtime"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeHistogram", path: "/charts/realtime-histogram" },
          { name: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "StreamXYFrame", path: "/frames/realtime-frame" },
          { name: "LineChart", path: "/charts/line-chart" },
        ]}
      />

      <p>
        RealtimeLineChart renders a continuously updating line from streaming
        data. It wraps{" "}
        <Link to="/frames/realtime-frame">StreamXYFrame</Link> with{" "}
        <code>chartType=&quot;line&quot;</code> and promotes stroke styling to top-level
        props. Create a ref and call <code>ref.current.push(point)</code> in a{" "}
        <code>setInterval</code> to stream data in.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Create a ref, push data points on an interval, and
        RealtimeLineChart handles the rest. The sliding window keeps the
        most recent points in view.
      </p>

      <BasicLineDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeLineChart } from "semiotic/realtime"
import { useRef, useEffect } from "react"

function StreamingLine() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      chartRef.current?.push({
        time: indexRef.current++,
        value: 50 + Math.sin(indexRef.current * 0.05) * 20
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeLineChart
      ref={chartRef}
      stroke="#007bff"
      strokeWidth={2}
      windowSize={150}
      showAxes={true}
    />
  )
}`}
          language="jsx"
        />
      </div>

      <h2 id="event-time">Event-Time Ordering and Aggregation</h2>

      <p>
        Set <code>eventTime</code> when events can arrive out of order.
        RealtimeLineChart holds a bounded grace window, then releases points in
        event-time order. This delays display by <code>lateness</code>. Call the
        chart-specific <code>RealtimeLineChartHandle.flush()</code> only when
        the source reaches a real end-of-stream or batch boundary; there is no
        need to push a fake future point to release the tail.
      </p>

      <p>
        The optional <code>aggregate</code> transform reduces raw events into
        tumbling, hopping, or session windows before rendering. Changing the
        window structure or either accessor rebuilds the accumulator:
        controlled <code>data</code> is replayed, while a push-only stream
        begins a new epoch because raw history is not retained.
      </p>

      <CodeBlock
        code={`const chartRef = useRef()

<RealtimeLineChart
  ref={chartRef}
  eventTime={{ lateness: "2s", latePolicy: "drop" }}
  aggregate={{
    window: "tumbling",
    size: "10s",
    stat: "mean",
    band: "stddev",
    retain: 120
  }}
/>

// At a confirmed stream or batch boundary:
chartRef.current?.flush()`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="custom-stroke">Custom Stroke Color and Width</h3>
      <p>
        Use <code>stroke</code> and <code>strokeWidth</code> to style the
        line.
      </p>

      <StyledLineDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeLineChart
  ref={chartRef}
  stroke="#e74c3c"
  strokeWidth={3}
  windowSize={150}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="dashed-line">Dashed Line</h3>
      <p>
        Set <code>strokeDasharray</code> to create a dashed line pattern,
        useful for representing projected or estimated values.
      </p>

      <DashedLineDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeLineChart
  ref={chartRef}
  stroke="#28a745"
  strokeWidth={2}
  strokeDasharray="6,3"
  windowSize={150}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="fixed-extent">Fixed Value Extent</h3>
      <p>
        Pin the y-axis range with <code>valueExtent</code> so the chart does
        not rescale as new data arrives.
      </p>

      <FixedExtentDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeLineChart
  ref={chartRef}
  stroke="#6f42c1"
  strokeWidth={2}
  valueExtent={[0, 100]}
  windowSize={150}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="annotations-thresholds">Annotations and Thresholds</h3>
      <p>
        Use <code>annotations</code> and <code>svgAnnotationRules</code> to
        draw threshold lines, callouts, or any custom SVG annotation over the
        streaming line. Annotations are rendered in an SVG overlay on top of
        the canvas so they stay crisp at any scale.
      </p>

      <ThresholdDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeLineChart
  ref={chartRef}
  stroke="#f59e0b"
  strokeWidth={2}
  windowSize={200}
  annotations={[
    { type: "threshold", value: 130, label: "High", color: "#ef4444" },
    { type: "threshold", value: 70, label: "Low", color: "#6366f1",
      thresholdType: "lesser" }
  ]}
  svgAnnotationRules={(annotation, i, context) => {
    if (annotation.type === "threshold" && context?.scales) {
      const y = context.scales.value(annotation.value)
      return (
        <g key={\`threshold-\${i}\`}>
          <line x1={0} x2={context.width}
                y1={y} y2={y}
                stroke={annotation.color}
                strokeDasharray="6,3" />
          <text x={context.width - 4} y={y - 6}
                textAnchor="end" fill={annotation.color}
                fontSize={11} fontWeight="bold">
            {annotation.label}: {annotation.value}
          </text>
        </g>
      )
    }
    return null
  }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeLineChart" props={realtimeLineChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">When to Use the Frame</h2>

      <p>
        Use <Link to="/frames/realtime-frame">StreamXYFrame</Link> directly for custom canvas
        rendering, overlapping chart types, or advanced annotation logic.{" "}
        <code>RealtimeLineChart</code> delegates to a configured <code>StreamXYFrame</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeLineChart } from "semiotic/realtime"

<RealtimeLineChart
  ref={chartRef}
  stroke="#007bff"
  strokeWidth={2}
  windowSize={150}
  enableHover
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamXYFrame } from "semiotic/realtime"

<StreamXYFrame
  ref={frameRef}
  chartType="line"
  windowSize={150}
  lineStyle={{
    stroke: "#007bff",
    strokeWidth: 2
  }}
  hoverAnnotation={true}
  showAxes={true}
/>`}
            language="jsx"
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/realtime-histogram">RealtimeHistogram</Link> —
          streaming temporal histograms with binned bars
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
          <Link to="/frames/realtime-frame">StreamXYFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — for static (non-realtime)
          line chart visualization
        </li>
      </ul>
    </PageLayout>
  )
}
