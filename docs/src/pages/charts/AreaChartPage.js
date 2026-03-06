import React, { useRef, useEffect } from "react"
import { AreaChart, StreamXYFrame } from "semiotic"

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

const simpleData = [
  { month: 1, sales: 4200 },
  { month: 2, sales: 5800 },
  { month: 3, sales: 4900 },
  { month: 4, sales: 7200 },
  { month: 5, sales: 6100 },
  { month: 6, sales: 8400 },
  { month: 7, sales: 7800 },
  { month: 8, sales: 9500 },
  { month: 9, sales: 8800 },
  { month: 10, sales: 10200 },
  { month: 11, sales: 9600 },
  { month: 12, sales: 11800 },
]

// Percentile band data (p5–p95)
const percentileData = Array.from({ length: 24 }, (_, i) => {
  const base = 50 + Math.sin(i * 0.25) * 20 + i * 0.5
  const spread = 8 + Math.sin(i * 0.15) * 4
  return {
    month: i + 1,
    p95: Math.round((base + spread * 2) * 10) / 10,
    p75: Math.round((base + spread) * 10) / 10,
    median: Math.round(base * 10) / 10,
    p25: Math.round((base - spread) * 10) / 10,
    p5: Math.round((base - spread * 2) * 10) / 10,
  }
})

const multiAreaData = [
  { month: 1, sales: 4200, channel: "Online" },
  { month: 2, sales: 5800, channel: "Online" },
  { month: 3, sales: 4900, channel: "Online" },
  { month: 4, sales: 7200, channel: "Online" },
  { month: 5, sales: 6100, channel: "Online" },
  { month: 6, sales: 8400, channel: "Online" },
  { month: 1, sales: 3100, channel: "Retail" },
  { month: 2, sales: 3800, channel: "Retail" },
  { month: 3, sales: 4200, channel: "Retail" },
  { month: 4, sales: 3600, channel: "Retail" },
  { month: 5, sales: 4800, channel: "Retail" },
  { month: 6, sales: 5200, channel: "Retail" },
  { month: 1, sales: 1800, channel: "Wholesale" },
  { month: 2, sales: 2200, channel: "Wholesale" },
  { month: 3, sales: 2600, channel: "Wholesale" },
  { month: 4, sales: 2400, channel: "Wholesale" },
  { month: 5, sales: 3200, channel: "Wholesale" },
  { month: 6, sales: 3600, channel: "Wholesale" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const areaChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, optionally grouped by category." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "areaBy", type: "string | function", required: false, default: null, description: "Field name or function to group data into multiple areas (e.g., by series)." },
  { name: "y0Accessor", type: "string | function", required: false, default: null, description: "Per-point lower bound accessor. When set, fills between yAccessor (top) and y0Accessor (bottom) instead of to the axis. Use for percentile bands, confidence intervals, or ribbons." },
  { name: "gradientFill", type: "boolean | object", required: false, default: "false", description: "Gradient fill from line to baseline. true for defaults (80%→5%) or { topOpacity, bottomOpacity } for custom." },
  { name: "lineDataAccessor", type: "string", required: false, default: '"coordinates"', description: "Field name in area objects that contains coordinate arrays." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine area color for multiple areas." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "curve", type: "string", required: false, default: '"monotoneX"', description: 'Curve interpolation: "linear", "monotoneX", "monotoneY", "step", "basis", "cardinal", "catmullRom".' },
  { name: "areaOpacity", type: "number", required: false, default: "0.7", description: "Opacity of the filled area." },
  { name: "showLine", type: "boolean", required: false, default: "true", description: "Show a line on top of the area." },
  { name: "lineWidth", type: "number", required: false, default: "2", description: "Stroke width of the line when showLine is true." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on data points." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (multi-area)", description: "Show a legend. Defaults to true when multiple areas are present." },
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

const streamingAreaCode = `import { useRef, useEffect } from "react"
import { StreamXYFrame } from "semiotic"

function StreamingArea() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 5000 + Math.sin(i * 0.03) * 2000
            + (Math.random() - 0.5) * 1500,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="line"
      runtimeMode="streaming"
      size={[600, 280]}
      lineStyle={{
        stroke: "#10b981",
        strokeWidth: 2,
        fill: "#10b981",
        fillOpacity: 0.3
      }}
      windowSize={150}
      showAxes
    />
  )
}`

function StreamingAreaDemo({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 5000 + Math.sin(i * 0.03) * 2000 + (Math.random() - 0.5) * 1500,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="line"
      runtimeMode="streaming"
      size={[width, 280]}
      lineStyle={{
        stroke: "#10b981",
        strokeWidth: 2,
        fill: "#10b981",
        fillOpacity: 0.3
      }}
      windowSize={150}
      showAxes={true}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AreaChartPage() {
  return (
    <PageLayout
      title="AreaChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "AreaChart", path: "/charts/area-chart" },
      ]}
      prevPage={{ title: "Line Chart", path: "/charts/line-chart" }}
      nextPage={{ title: "Stacked Area Chart", path: "/charts/stacked-area-chart" }}
    >
      <ComponentMeta
        componentName="AreaChart"
        importStatement='import { AreaChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "StackedAreaChart", path: "/charts/stacked-area-chart" },
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "StreamXYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        AreaChart visualizes quantities over continuous intervals with filled
        areas beneath a line. Each series fills from its line down to the
        baseline, with overlapping areas using transparency so all shapes remain
        visible. For stacked areas, use{" "}
        <Link to="/charts/stacked-area-chart">StackedAreaChart</Link>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest area chart requires just <code>data</code>,{" "}
        <code>xAccessor</code>, and <code>yAccessor</code>.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: simpleData,
              xAccessor: "month",
              yAccessor: "sales",
              xLabel: "Month",
              yLabel: "Sales ($)",
            }}
            type={AreaChart}
            startHidden={false}
            overrideProps={{
              data: `[
  { month: 1, sales: 4200 },
  { month: 2, sales: 5800 },
  { month: 3, sales: 4900 },
  // ...more data points
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingAreaDemo width={w} />}
            code={streamingAreaCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="multi-area">Multiple Areas</h3>
      <p>
        Use <code>areaBy</code> to group data points into separate areas, and{" "}
        <code>colorBy</code> to color them by category.
      </p>

      <LiveExample
        frameProps={{
          data: multiAreaData,
          xAccessor: "month",
          yAccessor: "sales",
          areaBy: "channel",
          colorBy: "channel",
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={AreaChart}
        overrideProps={{
          data: `[
  { month: 1, sales: 4200, channel: "Online" },
  { month: 2, sales: 5800, channel: "Online" },
  // ...data with channel field for grouping
]`,
          areaBy: '"channel"',
          colorBy: '"channel"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-curve-opacity">Custom Curve and Opacity</h3>
      <p>
        Adjust the <code>curve</code> interpolation and <code>areaOpacity</code>{" "}
        for different visual effects.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "sales",
          curve: "basis",
          areaOpacity: 0.4,
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={AreaChart}
        overrideProps={{
          data: "salesData",
        }}
        hiddenProps={{}}
      />

      <h3 id="gradient-fill">Gradient Fill</h3>
      <p>
        Set <code>gradientFill</code> to fade the fill from opaque at the line
        to transparent at the baseline — the modern area chart look. Use{" "}
        <code>true</code> for defaults (80% → 5%) or pass custom opacities.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "sales",
          gradientFill: true,
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={AreaChart}
        overrideProps={{
          data: "salesData",
        }}
        hiddenProps={{}}
      />

      <h3 id="no-line">Area Without Top Line</h3>
      <p>
        Set <code>showLine</code> to <code>false</code> for a pure filled area
        without the stroke on top.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "sales",
          showLine: false,
          areaOpacity: 0.5,
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={AreaChart}
        overrideProps={{
          data: "salesData",
        }}
        hiddenProps={{}}
      />

      <h3 id="percentile-band">Percentile Band (p5–p95)</h3>
      <p>
        Use <code>y0Accessor</code> to fill between two values per data point
        instead of filling down to the axis. This is ideal for percentile
        bands, confidence intervals, or any ribbon visualization. Layer
        multiple AreaCharts for nested bands (e.g., p5–p95 and p25–p75).
      </p>

      <LiveExample
        frameProps={{
          data: percentileData,
          xAccessor: "month",
          yAccessor: "p95",
          y0Accessor: "p5",
          areaOpacity: 0.15,
          showLine: false,
          colorScheme: ["#6366f1"],
          xLabel: "Month",
          yLabel: "Value",
          showGrid: true,
        }}
        type={AreaChart}
        overrideProps={{
          data: `[
  { month: 1, p95: 66, median: 50, p5: 34 },
  { month: 2, p95: 72, median: 55, p5: 38 },
  // ...data with percentile fields
]`,
          yAccessor: '"p95"',
          y0Accessor: '"p5"',
        }}
        hiddenProps={{}}
      />

      <p>
        For a layered percentile fan, render two AreaCharts — an outer
        p5–p95 band and an inner p25–p75 band — with a median LineChart
        on top:
      </p>

      <CodeBlock
        code={`import { AreaChart, LineChart } from "semiotic"

// Outer band: 5th–95th percentile
<AreaChart data={data} xAccessor="month"
  yAccessor="p95" y0Accessor="p5"
  areaOpacity={0.12} showLine={false} />

// Inner band: 25th–75th percentile
<AreaChart data={data} xAccessor="month"
  yAccessor="p75" y0Accessor="p25"
  areaOpacity={0.25} showLine={false} />

// Median line
<LineChart data={data} xAccessor="month" yAccessor="median" />`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="AreaChart" props={areaChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        dual-axis layouts — graduate to <Link to="/frames/xy-frame">StreamXYFrame</Link>{" "}
        directly. Every <code>AreaChart</code> is just a configured{" "}
        <code>StreamXYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { AreaChart } from "semiotic"

<AreaChart
  data={salesData}
  xAccessor="month"
  yAccessor="sales"
  areaBy="channel"
  colorBy="channel"
  curve="monotoneX"
  xLabel="Month"
  yLabel="Sales"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamXYFrame } from "semiotic"

<StreamXYFrame
  lines={[
    { channel: "Online", coordinates: onlineData },
    { channel: "Retail", coordinates: retailData }
  ]}
  xAccessor="month"
  yAccessor="sales"
  lineDataAccessor="coordinates"
  lineType={{
    type: "area",
    interpolator: curveMonotoneX
  }}
  lineStyle={d => ({
    fill: colorScale(d.channel),
    fillOpacity: 0.7,
    stroke: colorScale(d.channel),
    strokeWidth: 2
  })}
  axes={[
    { orient: "left", label: "Sales" },
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
        The <code>frameProps</code> prop on AreaChart lets you pass any StreamXYFrame
        prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<AreaChart
  data={salesData}
  xAccessor="month"
  yAccessor="sales"
  frameProps={{
    annotations: [
      { type: "x", month: 6, label: "Mid-year" }
    ]
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
          <Link to="/charts/stacked-area-chart">StackedAreaChart</Link> — areas
          stacked on top of each other to show totals
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — line without the
          filled area (or use <code>showLine</code> on AreaChart)
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
