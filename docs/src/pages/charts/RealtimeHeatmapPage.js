import React, { useRef, useEffect, useState } from "react"
import { RealtimeHeatmap } from "semiotic"

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

function BasicHeatmapDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        // Generate random 2D data points that cluster in patterns
        chartRef.current.push({
          time: i,
          x: 50 + Math.sin(i * 0.03) * 30 + (Math.random() - 0.5) * 40,
          y: 50 + Math.cos(i * 0.05) * 25 + (Math.random() - 0.5) * 40,
          value: 1,
        })
      }
    }, 20)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeHeatmap
          ref={chartRef}
          size={[containerWidth, 300]}
          timeAccessor="x"
          valueAccessor="y"
          heatmapXBins={20}
          heatmapYBins={15}
          aggregation="count"
          windowSize={500}
          showAxes={true}
        />
      )}
    </div>
  )
}

function SumAggregationDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        // Simulate sensor readings across a 2D grid
        const zone = i % 3
        const baseX = zone === 0 ? 20 : zone === 1 ? 50 : 80
        const baseY = zone === 0 ? 70 : zone === 1 ? 40 : 60
        chartRef.current.push({
          time: i,
          x: baseX + (Math.random() - 0.5) * 30,
          y: baseY + (Math.random() - 0.5) * 30,
          intensity: 5 + Math.random() * 15,
        })
      }
    }, 25)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeHeatmap
          ref={chartRef}
          size={[containerWidth, 300]}
          timeAccessor="x"
          valueAccessor="y"
          heatmapXBins={15}
          heatmapYBins={12}
          aggregation="sum"
          windowSize={400}
          showAxes={true}
        />
      )}
    </div>
  )
}

function DecayHeatmapDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          x: 50 + Math.sin(i * 0.04) * 35 + (Math.random() - 0.5) * 20,
          y: 50 + Math.cos(i * 0.06) * 30 + (Math.random() - 0.5) * 20,
          value: 1,
        })
      }
    }, 20)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeHeatmap
          ref={chartRef}
          size={[containerWidth, 300]}
          timeAccessor="x"
          valueAccessor="y"
          heatmapXBins={25}
          heatmapYBins={18}
          aggregation="count"
          windowSize={300}
          showAxes={true}
          decay={{ type: "exponential", halfLife: 150, minOpacity: 0.15 }}
          pulse={{ duration: 400, color: "rgba(255,255,255,0.5)" }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const realtimeHeatmapProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array. Each object should contain fields matched by timeAccessor and valueAccessor." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the x-axis value from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the y-axis value from each data point." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins: { top, right, bottom, left }." },
  { name: "arrowOfTime", type: '"left" | "right"', required: false, default: '"right"', description: "Direction that time flows across the chart." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy. "sliding" discards old points beyond windowSize.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity when using sliding window mode." },
  { name: "timeExtent", type: "[number, number]", required: false, default: null, description: "Fixed x-axis domain. Defaults to auto-fit." },
  { name: "valueExtent", type: "[number, number]", required: false, default: null, description: "Fixed y-axis domain. Defaults to auto-fit." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding factor applied to auto-computed extents." },
  { name: "heatmapXBins", type: "number", required: false, default: "20", description: "Number of bins along the x-axis." },
  { name: "heatmapYBins", type: "number", required: false, default: "20", description: "Number of bins along the y-axis." },
  { name: "aggregation", type: '"count" | "sum" | "mean"', required: false, default: '"count"', description: "How values are aggregated within each grid cell." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on cells." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip render function. Receives hover data." },
  { name: "onHover", type: "function", required: false, default: null, description: "Callback fired on hover. Receives hover data or null." },
  { name: "decay", type: "DecayConfig", required: false, default: null, description: 'Configurable opacity decay. { type: "linear"|"exponential"|"step", halfLife?, minOpacity?, stepThreshold? }' },
  { name: "pulse", type: "PulseConfig", required: false, default: null, description: "Flash effect on new data. { duration?, color?, glowRadius? }" },
  { name: "staleness", type: "StalenessConfig", required: false, default: null, description: "Data liveness indicator. { threshold?, dimOpacity?, showBadge?, badgePosition? }" },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation render function." },
  { name: "tickFormatTime", type: "function", required: false, default: null, description: "Custom formatter for x-axis tick labels." },
  { name: "tickFormatValue", type: "function", required: false, default: null, description: "Custom formatter for y-axis tick labels." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name for the chart container." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeHeatmapPage() {
  return (
    <PageLayout
      title="RealtimeHeatmap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeHeatmap", path: "/charts/realtime-heatmap" },
      ]}
      prevPage={{ title: "Realtime Waterfall Chart", path: "/charts/realtime-waterfall-chart" }}
      nextPage={{ title: "Bar Chart", path: "/charts/bar-chart" }}
    >
      <ComponentMeta
        componentName="RealtimeHeatmap"
        importStatement='import { RealtimeHeatmap } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
          { name: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
          { name: "RealtimeHistogram", path: "/charts/realtime-bar-chart" },
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "Heatmap", path: "/charts/heatmap" },
          { name: "StreamXYFrame", path: "/frames/realtime-frame" },
        ]}
      />

      <p>
        RealtimeHeatmap renders a streaming 2D heatmap by binning continuous x/y
        data into a grid and color-encoding aggregated values. It wraps{" "}
        <Link to="/frames/realtime-frame">StreamXYFrame</Link> with{" "}
        <code>chartType="heatmap"</code> and <code>runtimeMode="streaming"</code>.
        Create a ref and call <code>ref.current.push(point)</code> to stream data
        in. Supports count, sum, and mean aggregation modes, plus realtime
        encoding features like decay and pulse.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Push data points with x and y coordinates. The heatmap bins them into a
        grid and colors each cell by the aggregated count. The sliding window
        keeps only the most recent points.
      </p>

      <BasicHeatmapDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeHeatmap } from "semiotic"
import { useRef, useEffect } from "react"

function StreamingHeatmap() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      const i = indexRef.current++
      chartRef.current?.push({
        time: i,
        x: 50 + Math.sin(i * 0.03) * 30
          + (Math.random() - 0.5) * 40,
        y: 50 + Math.cos(i * 0.05) * 25
          + (Math.random() - 0.5) * 40,
        value: 1,
      })
    }, 20)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeHeatmap
      ref={chartRef}
      timeAccessor="x"
      valueAccessor="y"
      heatmapXBins={20}
      heatmapYBins={15}
      aggregation="count"
      windowSize={500}
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

      <h3 id="sum-aggregation">Sum Aggregation</h3>
      <p>
        Use <code>aggregation="sum"</code> to sum a numeric field per cell
        instead of counting. Useful for intensity or energy maps where each
        event carries a weight.
      </p>

      <SumAggregationDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`const zone = i % 3
const baseX = zone === 0 ? 20 : zone === 1 ? 50 : 80
const baseY = zone === 0 ? 70 : zone === 1 ? 40 : 60
chartRef.current?.push({
  time: i,
  x: baseX + (Math.random() - 0.5) * 30,
  y: baseY + (Math.random() - 0.5) * 30,
  intensity: 5 + Math.random() * 15,
})

<RealtimeHeatmap
  ref={chartRef}
  timeAccessor="x"
  valueAccessor="y"
  heatmapXBins={15}
  heatmapYBins={12}
  aggregation="sum"
  windowSize={400}
  showAxes={true}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="decay-pulse">Decay + Pulse</h3>
      <p>
        Combine <code>decay</code> to fade older data and <code>pulse</code> to
        flash newly arrived cells. This makes it easy to see where activity is
        happening right now versus where it was moments ago.
      </p>

      <DecayHeatmapDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeHeatmap
  ref={chartRef}
  timeAccessor="x"
  valueAccessor="y"
  heatmapXBins={25}
  heatmapYBins={18}
  aggregation="count"
  windowSize={300}
  showAxes={true}
  decay={{
    type: "exponential",
    halfLife: 150,
    minOpacity: 0.15
  }}
  pulse={{
    duration: 400,
    color: "rgba(255,255,255,0.5)"
  }}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeHeatmap" props={realtimeHeatmapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need full control — custom color scales, annotations, or
        combined chart types — graduate to{" "}
        <Link to="/frames/realtime-frame">StreamXYFrame</Link> directly.
        Every <code>RealtimeHeatmap</code> is just a configured{" "}
        <code>StreamXYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeHeatmap } from "semiotic"

<RealtimeHeatmap
  ref={chartRef}
  timeAccessor="x"
  valueAccessor="y"
  heatmapXBins={20}
  heatmapYBins={15}
  aggregation="count"
  windowSize={500}
  enableHover
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamXYFrame } from "semiotic"

<StreamXYFrame
  ref={frameRef}
  chartType="heatmap"
  runtimeMode="streaming"
  timeAccessor="x"
  valueAccessor="y"
  heatmapXBins={20}
  heatmapYBins={15}
  heatmapAggregation="count"
  windowSize={500}
  hoverAnnotation={true}
  showAxes={true}
  size={[500, 300]}
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
          <Link to="/charts/heatmap">Heatmap</Link> — static heatmap for
          pre-computed matrix data
        </li>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> —
          streaming continuous line for time-series data
        </li>
        <li>
          <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> —
          streaming scatter/swarm for individual data points
        </li>
        <li>
          <Link to="/charts/realtime-bar-chart">RealtimeHistogram</Link> —
          streaming temporal histograms with binned bars
        </li>
        <li>
          <Link to="/charts/realtime-waterfall-chart">RealtimeWaterfallChart</Link> —
          cumulative deltas as connected rising and falling bars
        </li>
        <li>
          <Link to="/frames/realtime-frame">StreamXYFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
