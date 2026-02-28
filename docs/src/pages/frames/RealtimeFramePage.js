import React, { useRef, useEffect, useState } from "react"
import { RealtimeFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Data generator helpers
// ---------------------------------------------------------------------------

function generatePoint(index) {
  return {
    time: index,
    value: Math.sin(index * 0.05) * 50 + 100 + (Math.random() - 0.5) * 20,
  }
}

// ---------------------------------------------------------------------------
// Hook to measure container width for responsive sizing
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
// Live examples as embedded components (since RealtimeFrame is imperative)
// ---------------------------------------------------------------------------

function QuickStartExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (frameRef.current) {
        frameRef.current.push(generatePoint(indexRef.current++))
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
        {containerWidth && <RealtimeFrame
          ref={frameRef}
          chartType="line"
          windowSize={150}
          size={[containerWidth, 280]}
          lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
          hoverAnnotation={true}
        />}
      </div>
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeFrame } from "semiotic"
import { useRef, useEffect } from "react"

function StreamingChart() {
  const frameRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      frameRef.current?.push({
        time: Date.now(),
        value: Math.random() * 100
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeFrame
      ref={frameRef}
      chartType="line"
      windowSize={150}
      size={[500, 280]}
      lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
      hoverAnnotation={true}
    />
  )
}`}
          language="jsx"
        />
      </div>
    </div>
  )
}

function BarChartExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const categories = ["errors", "warnings", "info"]
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (!frameRef.current) return
      const cat = categories[Math.floor(Math.random() * categories.length)]
      frameRef.current.push({
        time: indexRef.current++,
        value: Math.floor(Math.random() * 8) + 1,
        category: cat,
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && <RealtimeFrame
        ref={frameRef}
        chartType="bar"
        binSize={20}
        windowSize={300}
        size={[containerWidth, 280]}
        categoryAccessor="category"
        barColors={{ errors: "#ef4444", warnings: "#f59e0b", info: "#6366f1" }}
        hoverAnnotation={true}
      />}
    </div>
  )
}

function WaterfallExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (!frameRef.current) return
      frameRef.current.push({
        time: indexRef.current++,
        value: (Math.random() - 0.45) * 20,
      })
    }, 40)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && <RealtimeFrame
        ref={frameRef}
        chartType="waterfall"
        windowSize={200}
        size={[containerWidth, 280]}
        waterfallStyle={{
          positiveColor: "#10b981",
          negativeColor: "#ef4444",
          connectorStroke: "#999",
          connectorWidth: 1,
          gap: 1,
        }}
      />}
    </div>
  )
}

function SwarmExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const sensors = ["sensor1", "sensor2", "sensor3"]
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (!frameRef.current) return
      const sensor = sensors[Math.floor(Math.random() * sensors.length)]
      frameRef.current.push({
        time: indexRef.current++,
        value: Math.random() * 100,
        category: sensor,
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && <RealtimeFrame
        ref={frameRef}
        chartType="swarm"
        windowSize={300}
        size={[containerWidth, 280]}
        categoryAccessor="category"
        barColors={{ sensor1: "#6366f1", sensor2: "#10b981", sensor3: "#ef4444" }}
        swarmStyle={{ radius: 3, opacity: 0.7 }}
      />}
    </div>
  )
}

function AnnotationsExample() {
  const frameRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (frameRef.current) {
        frameRef.current.push(generatePoint(indexRef.current++))
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && <RealtimeFrame
        ref={frameRef}
        windowSize={200}
        size={[containerWidth, 280]}
        lineStyle={{ stroke: "#f59e0b", strokeWidth: 2 }}
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
      />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const realtimeFrameProps = [
  // --- Core ---
  { name: "chartType", type: "string", required: false, default: '"line"', description: 'Visualization type: "line", "swarm", "candlestick", "waterfall", or "bar".' },
  { name: "arrowOfTime", type: "string", required: false, default: '"right"', description: 'Direction time flows: "right", "left", "up", or "down".' },
  { name: "windowMode", type: "string", required: false, default: '"sliding"', description: '"sliding" evicts oldest data at capacity. "growing" accumulates indefinitely.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity (number of data points retained)." },
  { name: "data", type: "array", required: false, default: null, description: "Controlled data array. Use the imperative ref API for streaming instead." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Accessor for the time dimension of each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Accessor for the value dimension of each data point." },
  { name: "size", type: "array", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "object", required: false, default: "{ top: 20, right: 20, bottom: 30, left: 40 }", description: "Margin around the chart area." },

  // --- Extent & Scale ---
  { name: "timeExtent", type: "array", required: false, default: null, description: "Fixed [min, max] for the time axis. Auto-computed from data if omitted." },
  { name: "valueExtent", type: "array", required: false, default: null, description: "Fixed [min, max] for the value axis. Use to pin the y-axis domain." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding added to the auto-computed value extent." },

  // --- Line Style ---
  { name: "lineStyle", type: "object", required: false, default: null, description: "Canvas line styling: stroke, strokeWidth, strokeDasharray." },

  // --- Axes ---
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes with tick marks and labels." },
  { name: "tickFormatTime", type: "function", required: false, default: null, description: "Custom formatter for time axis tick labels." },
  { name: "tickFormatValue", type: "function", required: false, default: null, description: "Custom formatter for value axis tick labels." },

  // --- Background ---
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name applied to the wrapper element." },

  // --- Bar Chart ---
  { name: "binSize", type: "number", required: false, default: null, description: "Time interval for aggregating data into bar chart bins." },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for stacked bar charts and colored swarm dots." },
  { name: "barColors", type: "object", required: false, default: null, description: "Mapping of category names to colors for stacked bars and swarm dots." },
  { name: "barStyle", type: "object", required: false, default: null, description: "Bar styling: fill, stroke, strokeWidth, gap." },

  // --- Waterfall ---
  { name: "waterfallStyle", type: "object", required: false, default: null, description: "Waterfall chart styling: positiveColor, negativeColor, connectorStroke, connectorWidth, gap." },

  // --- Swarm ---
  { name: "swarmStyle", type: "object", required: false, default: null, description: "Swarm chart styling: radius, fill, opacity, stroke, strokeWidth." },

  // --- Annotations ---
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects rendered as SVG overlay on top of canvas." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation renderer. Receives (annotation, index, context) with scales." },

  // --- Interaction ---
  { name: "hoverAnnotation", type: "boolean | object", required: false, default: null, description: "Enable hover interaction with crosshair and tooltip. Object form configures crosshair style." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip renderer. Receives a HoverData object with { data, time, value, x, y }." },
  { name: "customHoverBehavior", type: "function", required: false, default: null, description: "Callback on hover. Receives HoverData or null when hover ends." },
]

const imperativeApiRows = [
  { name: "push(point)", type: "function", required: false, default: null, description: "Add a single data point to the ring buffer." },
  { name: "pushMany(points)", type: "function", required: false, default: null, description: "Add multiple data points at once." },
  { name: "clear()", type: "function", required: false, default: null, description: "Clear all data from the ring buffer." },
  { name: "getData()", type: "function", required: false, default: null, description: "Get the current data as an array." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeFramePage() {
  return (
    <PageLayout
      title="RealtimeFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "RealtimeFrame", path: "/frames/realtime-frame" },
      ]}
      prevPage={{ title: "NetworkFrame", path: "/frames/network-frame" }}
      nextPage={null}
    >
      <ComponentMeta
        componentName="RealtimeFrame"
        importStatement='import { RealtimeFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "XYFrame", path: "/frames/xy-frame" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        RealtimeFrame is a canvas-first frame designed for streaming and
        high-frequency data visualization. Unlike other Semiotic frames which
        are SVG-based and recalculate on every prop change, RealtimeFrame uses
        a <strong>ring buffer</strong> for O(1) data insertion, incremental
        extent tracking, and <code>requestAnimationFrame</code>-based rendering.
        This makes it ideal for dashboards, monitoring UIs, and any scenario
        where data arrives faster than React can re-render.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Concepts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="concepts">Concepts</h2>

      <p>
        RealtimeFrame takes a fundamentally different approach to data flow
        compared to other frames:
      </p>

      <ol>
        <li>
          <strong>Imperative data push</strong> -- Instead of passing data as
          a prop, you call <code>ref.current.push(point)</code> or{" "}
          <code>ref.current.pushMany(points)</code> to stream data in. A
          controlled <code>data</code> prop is also available but the ref API
          is the intended pattern for realtime use.
        </li>
        <li>
          <strong>Ring buffer storage</strong> -- Data is stored in a fixed-size
          ring buffer (set by <code>windowSize</code>). In "sliding" mode,
          new data evicts the oldest. In "growing" mode, data accumulates
          without limit.
        </li>
        <li>
          <strong>Incremental extent tracking</strong> -- Value extents are
          maintained incrementally as data arrives, avoiding full-array scans.
          You can also pin extents with <code>valueExtent</code>.
        </li>
        <li>
          <strong>Canvas rendering</strong> -- All chart elements (lines, bars,
          dots, axes) are drawn directly to an HTML5 Canvas element using{" "}
          <code>requestAnimationFrame</code>. Annotations and tooltips are
          rendered in an SVG overlay on top.
        </li>
        <li>
          <strong>Arrow of time</strong> -- The <code>arrowOfTime</code> prop
          controls which direction time flows: right, left, up, or down.
        </li>
      </ol>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Create a ref, push data points in a <code>setInterval</code>, and
        RealtimeFrame handles the rest. The sliding window keeps the most
        recent data points in view.
      </p>

      <QuickStartExample />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="stacked-bar-chart">Stacked Bar Chart</h3>
      <p>
        Set <code>chartType="bar"</code> with <code>binSize</code> to
        aggregate streaming data into time-bucketed bars. Add a{" "}
        <code>categoryAccessor</code> and <code>barColors</code> to create
        stacked categories within each bin.
      </p>

      <BarChartExample />

      <CodeBlock
        code={`<RealtimeFrame
  ref={frameRef}
  chartType="bar"
  binSize={20}
  windowSize={300}
  size={[500, 280]}
  categoryAccessor="category"
  barColors={{
    errors: "#ef4444",
    warnings: "#f59e0b",
    info: "#6366f1"
  }}
  hoverAnnotation={true}
/>`}
        language="jsx"
      />

      <h3 id="waterfall-chart">Waterfall Chart</h3>
      <p>
        Set <code>chartType="waterfall"</code> to visualize cumulative deltas
        as connected bars rising and falling from a running baseline. Positive
        values rise (green), negative values fall (red). Useful for P&L
        tracking, inventory changes, or running totals.
      </p>

      <WaterfallExample />

      <CodeBlock
        code={`<RealtimeFrame
  ref={frameRef}
  chartType="waterfall"
  windowSize={200}
  size={[500, 280]}
  waterfallStyle={{
    positiveColor: "#10b981",
    negativeColor: "#ef4444",
    connectorStroke: "#999",
    connectorWidth: 1,
    gap: 1
  }}
/>`}
        language="jsx"
      />

      <h3 id="swarm-chart">Swarm Chart</h3>
      <p>
        Set <code>chartType="swarm"</code> to render each data point as an
        individual dot at its (time, value) coordinates. Add{" "}
        <code>categoryAccessor</code> and <code>barColors</code> to color-code
        dots by category. This is ideal for streaming event data or sensor
        readings.
      </p>

      <SwarmExample />

      <CodeBlock
        code={`<RealtimeFrame
  ref={frameRef}
  chartType="swarm"
  windowSize={300}
  size={[500, 280]}
  categoryAccessor="category"
  barColors={{
    sensor1: "#6366f1",
    sensor2: "#10b981",
    sensor3: "#ef4444"
  }}
  swarmStyle={{ radius: 3, opacity: 0.7 }}
/>`}
        language="jsx"
      />

      <h3 id="annotations-and-thresholds">Annotations and Thresholds</h3>
      <p>
        RealtimeFrame supports the same annotation system as other Semiotic
        frames. Annotations are rendered in an SVG overlay on top of the
        canvas. Use <code>svgAnnotationRules</code> to draw threshold lines,
        callouts, or any custom SVG annotation.
      </p>

      <AnnotationsExample />

      <CodeBlock
        code={`<RealtimeFrame
  ref={frameRef}
  windowSize={200}
  size={[500, 280]}
  lineStyle={{ stroke: "#f59e0b", strokeWidth: 2 }}
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

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeFrame" props={realtimeFrameProps} />

      <h3 id="imperative-api">Imperative API (via ref)</h3>
      <p>
        Access these methods through a React ref:{" "}
        <code>const frameRef = useRef()</code> then{" "}
        <code>frameRef.current.push(point)</code>.
      </p>

      <PropTable componentName="RealtimeFrame ref" props={imperativeApiRows} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> -- SVG-based frame for
          static or low-update-frequency line, point, and area charts
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> -- for
          categorical data (bar charts, violin plots, etc.)
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> -- for
          topological data (force layouts, hierarchies, etc.)
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> -- simplified Chart
          component for static line visualizations
        </li>
      </ul>
    </PageLayout>
  )
}
