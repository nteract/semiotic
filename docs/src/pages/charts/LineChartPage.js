import React, { useRef, useEffect } from "react"
import { LineChart, RealtimeLineChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const forecastData = [
  { month: 1, value: 120, upper: 15, lower: 10 },
  { month: 2, value: 135, upper: 18, lower: 12 },
  { month: 3, value: 128, upper: 20, lower: 14 },
  { month: 4, value: 145, upper: 22, lower: 16 },
  { month: 5, value: 160, upper: 25, lower: 18 },
  { month: 6, value: 155, upper: 28, lower: 20 },
  { month: 7, value: 170, upper: 30, lower: 22 },
  { month: 8, value: 185, upper: 32, lower: 24 },
  { month: 9, value: 178, upper: 35, lower: 26 },
  { month: 10, value: 195, upper: 38, lower: 28 },
  { month: 11, value: 210, upper: 40, lower: 30 },
  { month: 12, value: 225, upper: 42, lower: 32 },
]

const simpleData = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
  { month: 7, revenue: 24000 },
  { month: 8, revenue: 31000 },
  { month: 9, revenue: 28000 },
  { month: 10, revenue: 35000 },
  { month: 11, revenue: 32000 },
  { month: 12, revenue: 41000 },
]

const multiLineData = [
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  { month: 3, revenue: 14000, product: "Widget" },
  { month: 4, revenue: 22000, product: "Widget" },
  { month: 5, revenue: 19000, product: "Widget" },
  { month: 6, revenue: 27000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 2, revenue: 11000, product: "Gadget" },
  { month: 3, revenue: 15000, product: "Gadget" },
  { month: 4, revenue: 13000, product: "Gadget" },
  { month: 5, revenue: 17000, product: "Gadget" },
  { month: 6, revenue: 21000, product: "Gadget" },
  { month: 1, revenue: 5000, product: "Doohickey" },
  { month: 2, revenue: 7000, product: "Doohickey" },
  { month: 3, revenue: 9000, product: "Doohickey" },
  { month: 4, revenue: 8000, product: "Doohickey" },
  { month: 5, revenue: 12000, product: "Doohickey" },
  { month: 6, revenue: 14000, product: "Doohickey" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const lineChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points or array of line objects with coordinates." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "lineBy", type: "string | function", required: false, default: null, description: "Field name or function to group data into multiple lines (e.g., by series)." },
  { name: "lineDataAccessor", type: "string", required: false, default: '"coordinates"', description: "Field name in line objects that contains coordinate arrays." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine line color for multiple lines." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "curve", type: "string", required: false, default: '"linear"', description: 'Curve interpolation: "linear", "monotoneX", "step", "basis", "cardinal", "catmullRom".' },
  { name: "showPoints", type: "boolean", required: false, default: "false", description: "Show data points on the line." },
  { name: "pointRadius", type: "number", required: false, default: "3", description: "Point radius when showPoints is true." },
  { name: "fillArea", type: "boolean", required: false, default: "false", description: "Fill the area under the line." },
  { name: "areaOpacity", type: "number", required: false, default: "0.3", description: "Opacity of the area fill when fillArea is true." },
  { name: "lineWidth", type: "number", required: false, default: "2", description: "Stroke width of the line." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on data points." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (multi-line)", description: "Show a legend. Defaults to true when multiple lines are present." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x-axis." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Label for the y-axis." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamXYFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingLineCode = `import { useRef, useEffect } from "react"
import { RealtimeLineChart } from "semiotic"

function StreamingRevenue() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 20000 + Math.sin(i * 0.04) * 8000
            + (Math.random() - 0.5) * 3000,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeLineChart
      ref={chartRef}
      size={[600, 280]}
      stroke="#6366f1"
      strokeWidth={2}
      windowSize={150}
      showAxes
    />
  )
}`

function StreamingLineDemo({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 20000 + Math.sin(i * 0.04) * 8000 + (Math.random() - 0.5) * 3000,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeLineChart
      ref={chartRef}
      size={[width, 280]}
      stroke="#6366f1"
      strokeWidth={2}
      windowSize={150}
      showAxes={true}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LineChartPage() {
  return (
    <PageLayout
      title="LineChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "LineChart", path: "/charts/line-chart" },
      ]}
      prevPage={{ title: "Getting Started", path: "/getting-started" }}
      nextPage={{ title: "Area Chart", path: "/charts/area-chart" }}
    >
      <ComponentMeta
        componentName="LineChart"
        importStatement='import { LineChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "Scatterplot", path: "/charts/scatterplot" },
          { name: "StreamXYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        LineChart visualizes trends and time series data. Pass your data, specify
        the x and y accessors, and get a publication-ready chart with hover
        interactions, axes, and legends — all with sensible defaults.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest line chart requires just <code>data</code>,{" "}
        <code>xAccessor</code>, and <code>yAccessor</code>.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: simpleData,
              xAccessor: "month",
              yAccessor: "revenue",
              xLabel: "Month",
              yLabel: "Revenue ($)",
            }}
            type={LineChart}
            startHidden={false}
            overrideProps={{
              data: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  // ...more data points
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingLineDemo width={w} />}
            code={streamingLineCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="multi-line">Multiple Lines</h3>
      <p>
        Use <code>lineBy</code> to group data points into separate lines, and{" "}
        <code>colorBy</code> to color them by category.
      </p>

      <LiveExample
        frameProps={{
          data: multiLineData,
          xAccessor: "month",
          yAccessor: "revenue",
          lineBy: "product",
          colorBy: "product",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  // ...data with product field for grouping
]`,
          lineBy: '"product"',
          colorBy: '"product"',
        }}
        hiddenProps={{}}
      />

      <h3 id="with-points-and-curve">With Points and Smooth Curve</h3>
      <p>
        Enable <code>showPoints</code> and set <code>curve</code> to{" "}
        <code>"monotoneX"</code> for a smooth interpolation with visible data
        points.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "revenue",
          showPoints: true,
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: "salesData",
        }}
        hiddenProps={{}}
      />

      <h3 id="area-fill">Area Fill</h3>
      <p>
        Set <code>fillArea</code> to fill the area beneath the line.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "revenue",
          fillArea: true,
          areaOpacity: 0.25,
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: "salesData",
        }}
        hiddenProps={{}}
      />

      <h3 id="confidence-bands">Confidence Bands (lineBounds)</h3>
      <p>
        Use <code>frameProps</code> with StreamXYFrame's <code>summaryType</code> to
        add confidence intervals or error bands around your line. The{" "}
        <code>linebounds</code> summary type takes a{" "}
        <code>boundingAccessor</code> (or separate{" "}
        <code>topBoundingAccessor</code> / <code>bottomBoundingAccessor</code>)
        that returns how far the band extends above and below each point.
      </p>

      <LiveExample
        frameProps={{
          data: forecastData,
          xAccessor: "month",
          yAccessor: "value",
          curve: "monotoneX",
          showPoints: true,
          pointRadius: 3,
          xLabel: "Month",
          yLabel: "Forecast",
          frameProps: {
            summaries: [{ coordinates: forecastData }],
            summaryType: {
              type: "linebounds",
              topBoundingAccessor: d => d.upper,
              bottomBoundingAccessor: d => d.lower,
            },
            summaryStyle: {
              fill: "#6366f1",
              fillOpacity: 0.15,
              stroke: "#6366f1",
              strokeOpacity: 0.3,
              strokeWidth: 1,
            },
          },
        }}
        type={LineChart}
        overrideProps={{
          data: `[
  { month: 1, value: 120, upper: 15, lower: 10 },
  { month: 2, value: 135, upper: 18, lower: 12 },
  { month: 3, value: 128, upper: 20, lower: 14 },
  // ...data with upper/lower bounds per point
]`,
          frameProps: `{
  summaries: [{ coordinates: forecastData }],
  summaryType: {
    type: "linebounds",
    topBoundingAccessor: d => d.upper,
    bottomBoundingAccessor: d => d.lower,
  },
  summaryStyle: {
    fill: "#6366f1",
    fillOpacity: 0.15,
    stroke: "#6366f1",
    strokeOpacity: 0.3,
    strokeWidth: 1,
  },
}`,
        }}
        hiddenProps={{}}
      />

      <p>
        The <code>boundingAccessor</code> receives each raw data point and
        returns a pixel offset. Use separate <code>topBoundingAccessor</code>{" "}
        and <code>bottomBoundingAccessor</code> for asymmetric bands (e.g.,
        when your confidence interval isn't centered on the line). This is
        useful for forecasts, measurement uncertainty, or any scenario where
        you want to show a range around a trend.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="LineChart" props={lineChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        dual-axis layouts — graduate to <Link to="/frames/xy-frame">StreamXYFrame</Link>{" "}
        directly. Every <code>LineChart</code> is just a configured{" "}
        <code>StreamXYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  showPoints={true}
  xLabel="Month"
  yLabel="Revenue"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamXYFrame } from "semiotic"

<StreamXYFrame
  lines={[{ coordinates: salesData }]}
  xAccessor="month"
  yAccessor="revenue"
  lineDataAccessor="coordinates"
  lineType={{
    type: "line",
    interpolator: curveMonotoneX
  }}
  showLinePoints={true}
  pointStyle={{ fill: "#6366f1", r: 3 }}
  lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
  axes={[
    { orient: "left", label: "Revenue" },
    { orient: "bottom", label: "Month" }
  ]}
  hoverAnnotation={true}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on LineChart lets you pass any StreamXYFrame
        prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  frameProps={{
    annotations: [
      { type: "x", month: 6, label: "Mid-year" }
    ],
    customLineMark: ({ d }) => <circle r={5} fill="red" />
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> — filled area beneath
          the line (or use <code>fillArea</code> on LineChart)
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — for point-based XY
          visualizations
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — the underlying Frame with
          full control over every rendering detail
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding callouts,
          highlights, and notes to any visualization
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip content
          and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
