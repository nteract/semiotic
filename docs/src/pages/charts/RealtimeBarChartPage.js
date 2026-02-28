import React from "react"
import { RealtimeBarChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — static snapshots representing streaming event counts
// ---------------------------------------------------------------------------

const now = Date.now()

const simpleData = Array.from({ length: 80 }, (_, i) => ({
  time: now - (80 - i) * 500,
  value: Math.floor(Math.random() * 40) + 10,
}))

const stackedData = []
const categories = ["errors", "warnings", "info"]
for (let i = 0; i < 60; i++) {
  const t = now - (60 - i) * 800
  stackedData.push({ time: t, value: Math.floor(Math.random() * 5) + 1, category: "errors" })
  stackedData.push({ time: t, value: Math.floor(Math.random() * 10) + 3, category: "warnings" })
  stackedData.push({ time: t, value: Math.floor(Math.random() * 20) + 8, category: "info" })
}

const styledData = Array.from({ length: 60 }, (_, i) => ({
  time: now - (60 - i) * 600,
  value: Math.floor(Math.abs(Math.sin(i / 4)) * 50) + 5,
}))

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
        A basic streaming bar chart needs <code>data</code> and a{" "}
        <code>binSize</code> to define the time interval for aggregation.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          binSize: 5000,
          timeAccessor: "time",
          valueAccessor: "value",
          fill: "#007bff",
          showAxes: true,
        }}
        type={RealtimeBarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { time: 1709000000, value: 23 },
  { time: 1709000500, value: 31 },
  { time: 1709001000, value: 18 },
  // ...streaming event counts
]`,
          binSize: "5000",
        }}
        hiddenProps={{}}
      />

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

      <LiveExample
        frameProps={{
          data: stackedData,
          binSize: 8000,
          timeAccessor: "time",
          valueAccessor: "value",
          categoryAccessor: "category",
          colors: { errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" },
          showAxes: true,
        }}
        type={RealtimeBarChart}
        overrideProps={{
          data: `[
  { time: t, value: 3, category: "errors" },
  { time: t, value: 7, category: "warnings" },
  { time: t, value: 15, category: "info" },
  // ...streaming categorized events
]`,
          categoryAccessor: '"category"',
          colors: '{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }',
        }}
        hiddenProps={{}}
      />

      <h3 id="styled-bars">Custom Bar Styling</h3>
      <p>
        Control the appearance with <code>fill</code>, <code>stroke</code>,
        and <code>gap</code> to create distinct visual styles.
      </p>

      <LiveExample
        frameProps={{
          data: styledData,
          binSize: 6000,
          timeAccessor: "time",
          valueAccessor: "value",
          fill: "#28a745",
          stroke: "#1e7e34",
          strokeWidth: 1,
          gap: 2,
          background: "#f0faf3",
          showAxes: true,
        }}
        type={RealtimeBarChart}
        overrideProps={{
          data: "throughputData",
          fill: '"#28a745"',
          stroke: '"#1e7e34"',
          background: '"#f0faf3"',
        }}
        hiddenProps={{}}
      />

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
