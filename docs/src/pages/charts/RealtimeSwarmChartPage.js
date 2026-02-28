import React from "react"
import { RealtimeSwarmChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — static snapshots representing streaming sensor readings
// ---------------------------------------------------------------------------

const now = Date.now()

const simpleData = Array.from({ length: 100 }, (_, i) => ({
  time: now - (100 - i) * 400,
  value: 50 + (Math.random() - 0.5) * 40,
}))

const categorizedData = []
const sensors = ["sensor1", "sensor2", "sensor3"]
for (let i = 0; i < 90; i++) {
  const t = now - (90 - i) * 500
  const sensor = sensors[i % 3]
  const base = sensor === "sensor1" ? 60 : sensor === "sensor2" ? 45 : 30
  categorizedData.push({
    time: t,
    value: base + (Math.random() - 0.5) * 20,
    sensor,
  })
}

const styledData = Array.from({ length: 80 }, (_, i) => ({
  time: now - (80 - i) * 450,
  value: 70 + Math.sin(i / 3) * 25 + (Math.random() - 0.5) * 10,
}))

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
        props. Supports category-based color coding and threshold coloring via
        annotations.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest swarm chart requires just a <code>data</code> array with{" "}
        <code>time</code> and <code>value</code> fields.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          timeAccessor: "time",
          valueAccessor: "value",
          radius: 3,
          fill: "#007bff",
          opacity: 0.7,
          showAxes: true,
        }}
        type={RealtimeSwarmChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { time: 1709000000, value: 52.3 },
  { time: 1709000400, value: 38.1 },
  { time: 1709000800, value: 61.7 },
  // ...streaming data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="categorized-dots">Color-Coded by Category</h3>
      <p>
        Use <code>categoryAccessor</code> and <code>colors</code> to
        color-code dots by group, such as different sensors or event types.
      </p>

      <LiveExample
        frameProps={{
          data: categorizedData,
          timeAccessor: "time",
          valueAccessor: "value",
          categoryAccessor: "sensor",
          colors: { sensor1: "#007bff", sensor2: "#28a745", sensor3: "#fd7e14" },
          radius: 4,
          opacity: 0.8,
          showAxes: true,
        }}
        type={RealtimeSwarmChart}
        overrideProps={{
          data: `[
  { time: t, value: 62.1, sensor: "sensor1" },
  { time: t, value: 44.3, sensor: "sensor2" },
  { time: t, value: 28.9, sensor: "sensor3" },
  // ...streaming categorized readings
]`,
          categoryAccessor: '"sensor"',
          colors: '{ sensor1: "#007bff", sensor2: "#28a745", sensor3: "#fd7e14" }',
        }}
        hiddenProps={{}}
      />

      <h3 id="styled-dots">Custom Dot Styling</h3>
      <p>
        Control the appearance with <code>radius</code>,{" "}
        <code>fill</code>, <code>opacity</code>, and <code>stroke</code> to
        create a distinctive look.
      </p>

      <LiveExample
        frameProps={{
          data: styledData,
          timeAccessor: "time",
          valueAccessor: "value",
          radius: 5,
          fill: "#6f42c1",
          opacity: 0.6,
          stroke: "#4c2889",
          strokeWidth: 1,
          background: "#f8f5ff",
          showAxes: true,
        }}
        type={RealtimeSwarmChart}
        overrideProps={{
          data: "latencyReadings",
          fill: '"#6f42c1"',
          stroke: '"#4c2889"',
          background: '"#f8f5ff"',
        }}
        hiddenProps={{}}
      />

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
