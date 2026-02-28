import React from "react"
import { RealtimeWaterfallChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — static snapshots representing streaming deltas (gains/losses)
// ---------------------------------------------------------------------------

const now = Date.now()

const simpleData = Array.from({ length: 40 }, (_, i) => ({
  time: now - (40 - i) * 1000,
  value: (Math.random() - 0.45) * 30,
}))

const styledData = Array.from({ length: 35 }, (_, i) => ({
  time: now - (35 - i) * 1200,
  value: Math.sin(i / 3) * 20 + (Math.random() - 0.5) * 8,
}))

const connectorData = Array.from({ length: 30 }, (_, i) => ({
  time: now - (30 - i) * 1500,
  value: i % 5 === 0 ? -15 - Math.random() * 10 : 5 + Math.random() * 15,
}))

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const realtimeWaterfallChartProps = [
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array. Each object should contain fields matched by timeAccessor and valueAccessor. Positive values represent gains, negative values represent losses." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the delta value (positive = gain, negative = loss)." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins: { top, right, bottom, left }." },
  { name: "arrowOfTime", type: '"left" | "right"', required: false, default: '"right"', description: "Direction that time flows across the chart." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy. "sliding" discards old points beyond windowSize.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity when using sliding window mode." },
  { name: "timeExtent", type: "[number, number]", required: false, default: null, description: "Fixed time domain. Defaults to auto-fit." },
  { name: "valueExtent", type: "[number, number]", required: false, default: null, description: "Fixed value domain. Defaults to auto-fit." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding factor applied to auto-computed extents." },
  { name: "positiveColor", type: "string", required: false, default: null, description: "Fill color for positive (gain) bars." },
  { name: "negativeColor", type: "string", required: false, default: null, description: "Fill color for negative (loss) bars." },
  { name: "connectorStroke", type: "string", required: false, default: null, description: "Stroke color for connector lines between bars. Omit to hide connectors." },
  { name: "connectorWidth", type: "number", required: false, default: null, description: "Stroke width for connector lines." },
  { name: "gap", type: "number", required: false, default: null, description: "Gap between bars in pixels." },
  { name: "stroke", type: "string", required: false, default: null, description: "Bar stroke (outline) color." },
  { name: "strokeWidth", type: "number", required: false, default: null, description: "Bar stroke width." },
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

export default function RealtimeWaterfallChartPage() {
  return (
    <PageLayout
      title="RealtimeWaterfallChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
      ]}
      prevPage={{ title: "Realtime Swarm Chart", path: "/charts/realtime-swarm-chart" }}
      nextPage={null}
    >
      <ComponentMeta
        componentName="RealtimeWaterfallChart"
        importStatement='import { RealtimeWaterfallChart } from "semiotic"'
        tier="charts"
        wraps="RealtimeFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
          { name: "RealtimeBarChart", path: "/charts/realtime-bar-chart" },
          { name: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
          { name: "RealtimeFrame", path: "/frames/realtime-frame" },
        ]}
      />

      <p>
        RealtimeWaterfallChart visualizes cumulative deltas as connected bars
        that rise and fall from a running baseline. Positive values appear as
        gain bars and negative values as loss bars, with optional connector
        lines linking consecutive bars. It wraps{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> with{" "}
        <code>chartType="waterfall"</code> and promotes waterfall styling to
        top-level props.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A basic waterfall chart needs <code>data</code> with positive and
        negative <code>value</code> fields representing gains and losses over
        time.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          timeAccessor: "time",
          valueAccessor: "value",
          positiveColor: "#28a745",
          negativeColor: "#dc3545",
          showAxes: true,
        }}
        type={RealtimeWaterfallChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { time: 1709000000, value: 12.5 },
  { time: 1709001000, value: -8.3 },
  { time: 1709002000, value: 15.1 },
  // ...streaming gain/loss deltas
]`,
          positiveColor: '"#28a745"',
          negativeColor: '"#dc3545"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="with-connectors">With Connector Lines</h3>
      <p>
        Set <code>connectorStroke</code> to draw lines connecting consecutive
        bars, making the cumulative flow easier to follow.
      </p>

      <LiveExample
        frameProps={{
          data: connectorData,
          timeAccessor: "time",
          valueAccessor: "value",
          positiveColor: "#28a745",
          negativeColor: "#dc3545",
          connectorStroke: "#999",
          connectorWidth: 1,
          showAxes: true,
        }}
        type={RealtimeWaterfallChart}
        overrideProps={{
          data: "revenueDeltas",
          connectorStroke: '"#999"',
          connectorWidth: "1",
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-styling">Custom Colors and Gaps</h3>
      <p>
        Use <code>positiveColor</code>, <code>negativeColor</code>,{" "}
        <code>gap</code>, and <code>stroke</code> for a customized visual
        style.
      </p>

      <LiveExample
        frameProps={{
          data: styledData,
          timeAccessor: "time",
          valueAccessor: "value",
          positiveColor: "#007bff",
          negativeColor: "#fd7e14",
          stroke: "#333",
          strokeWidth: 1,
          gap: 2,
          connectorStroke: "#aaa",
          connectorWidth: 1,
          background: "#f8f9fa",
          showAxes: true,
        }}
        type={RealtimeWaterfallChart}
        overrideProps={{
          data: "tradeDeltas",
          positiveColor: '"#007bff"',
          negativeColor: '"#fd7e14"',
          stroke: '"#333"',
          background: '"#f8f9fa"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeWaterfallChart" props={realtimeWaterfallChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom connector rendering, mixed chart
        types, or complex annotation logic — graduate to{" "}
        <Link to="/frames/realtime-frame">RealtimeFrame</Link> directly.
        Every <code>RealtimeWaterfallChart</code> is just a configured{" "}
        <code>RealtimeFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeWaterfallChart } from "semiotic"

<RealtimeWaterfallChart
  ref={chartRef}
  data={deltaStream}
  timeAccessor="time"
  valueAccessor="delta"
  positiveColor="#28a745"
  negativeColor="#dc3545"
  connectorStroke="#999"
  windowSize={300}
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
  chartType="waterfall"
  data={deltaStream}
  timeAccessor="time"
  valueAccessor="delta"
  waterfallStyle={{
    positiveColor: "#28a745",
    negativeColor: "#dc3545",
    connectorStroke: "#999"
  }}
  windowSize={300}
  hoverAnnotation={true}
  showAxes={true}
  size={[500, 300]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The waterfall styling props (<code>positiveColor</code>,{" "}
        <code>negativeColor</code>, <code>connectorStroke</code>, etc.) map
        directly to fields within the <code>waterfallStyle</code> object on
        RealtimeFrame.
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
          <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> —
          individual data points as a streaming scatter/swarm
        </li>
        <li>
          <Link to="/frames/realtime-frame">RealtimeFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/cookbook/waterfall-chart">Waterfall Chart (Cookbook)</Link> —
          static waterfall chart recipe using OrdinalFrame
        </li>
      </ul>
    </PageLayout>
  )
}
