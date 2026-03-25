import React, { useRef, useEffect } from "react"
import { MultiAxisLineChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — weather station readings
// ---------------------------------------------------------------------------

const weatherData = [
  { time: 0, temperature: 58, humidity: 0.82 },
  { time: 1, temperature: 55, humidity: 0.85 },
  { time: 2, temperature: 52, humidity: 0.88 },
  { time: 3, temperature: 50, humidity: 0.91 },
  { time: 4, temperature: 49, humidity: 0.90 },
  { time: 5, temperature: 51, humidity: 0.87 },
  { time: 6, temperature: 56, humidity: 0.80 },
  { time: 7, temperature: 62, humidity: 0.72 },
  { time: 8, temperature: 68, humidity: 0.65 },
  { time: 9, temperature: 73, humidity: 0.58 },
  { time: 10, temperature: 78, humidity: 0.50 },
  { time: 11, temperature: 82, humidity: 0.44 },
  { time: 12, temperature: 85, humidity: 0.40 },
  { time: 13, temperature: 87, humidity: 0.38 },
  { time: 14, temperature: 88, humidity: 0.36 },
  { time: 15, temperature: 86, humidity: 0.39 },
  { time: 16, temperature: 82, humidity: 0.45 },
  { time: 17, temperature: 77, humidity: 0.52 },
  { time: 18, temperature: 72, humidity: 0.60 },
  { time: 19, temperature: 68, humidity: 0.67 },
  { time: 20, temperature: 64, humidity: 0.73 },
  { time: 21, temperature: 61, humidity: 0.78 },
  { time: 22, temperature: 59, humidity: 0.81 },
  { time: 23, temperature: 57, humidity: 0.84 },
]

// Server metrics — requests/sec vs latency
const serverData = [
  { minute: 0, rps: 1200, latency: 45 },
  { minute: 5, rps: 1350, latency: 42 },
  { minute: 10, rps: 1500, latency: 48 },
  { minute: 15, rps: 2800, latency: 85 },
  { minute: 20, rps: 3200, latency: 120 },
  { minute: 25, rps: 3500, latency: 210 },
  { minute: 30, rps: 3100, latency: 180 },
  { minute: 35, rps: 2400, latency: 95 },
  { minute: 40, rps: 1800, latency: 55 },
  { minute: 45, rps: 1500, latency: 46 },
  { minute: 50, rps: 1400, latency: 44 },
  { minute: 55, rps: 1300, latency: 43 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const multiAxisProps = [
  { name: "data", type: "array", required: false, default: null, description: "Array of data points shared by both series. Omit when using push API." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "series", type: "MultiAxisSeriesConfig[]", required: true, default: null, description: "Array of series configurations. Exactly 2 for dual-axis mode. Each: { yAccessor, label?, color?, format?, extent? }." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array. First two colors are used for the two series." },
  { name: "curve", type: "string", required: false, default: '"monotoneX"', description: 'Curve interpolation: "linear", "monotoneX", "step", etc.' },
  { name: "lineWidth", type: "number", required: false, default: "2", description: "Line stroke width." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover tooltips." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true", description: "Show a legend." },
  { name: "tooltip", type: "boolean | object | function", required: false, default: null, description: "Enable/disable default tooltip (boolean), or provide a config object or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "auto (70px left/right)", description: "Margin around the chart area. Auto-expands left/right to 70px for dual-axis labels." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x-axis." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamXYFrame props for advanced customization." },
]

const seriesConfigProps = [
  { name: "yAccessor", type: "string | function", required: true, default: null, description: "Field name or function to access y values for this series." },
  { name: "label", type: "string", required: false, default: null, description: "Axis label for this series, displayed on the left (series 0) or right (series 1) axis." },
  { name: "color", type: "string", required: false, default: "theme palette", description: "Override color for this series line." },
  { name: "format", type: "function", required: false, default: null, description: "Tick format function for this series' axis, e.g. d => d.toFixed(1)." },
  { name: "extent", type: "[number, number]", required: false, default: "computed from data", description: "Fixed [min, max] extent. Required for push API streaming so unitization is stable." },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingCode = `import { useRef, useEffect } from "react"
import { MultiAxisLineChart } from "semiotic"

function StreamingDualAxis() {
  const chartRef = useRef()

  useEffect(() => {
    let t = 0
    const interval = setInterval(() => {
      chartRef.current?.push({
        time: t++,
        temperature: 65 + Math.sin(t * 0.2) * 20 + (Math.random() - 0.5) * 5,
        humidity: 0.5 + Math.cos(t * 0.15) * 0.3 + (Math.random() - 0.5) * 0.05,
      })
    }, 300)
    return () => clearInterval(interval)
  }, [])

  return (
    <MultiAxisLineChart
      ref={chartRef}
      xAccessor="time"
      series={[
        { yAccessor: "temperature", label: "Temp (\u00B0F)", extent: [30, 100] },
        { yAccessor: "humidity", label: "Humidity", extent: [0, 1],
          format: d => (d * 100).toFixed(0) + "%" },
      ]}
      showLegend legendPosition="bottom"
      width={500} height={350}
    />
  )
}`

function StreamingDualAxisDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    let t = 0
    const interval = setInterval(() => {
      chartRef.current?.push({
        time: t++,
        temperature: 65 + Math.sin(t * 0.2) * 20 + (Math.random() - 0.5) * 5,
        humidity: 0.5 + Math.cos(t * 0.15) * 0.3 + (Math.random() - 0.5) * 0.05,
      })
    }, 300)
    return () => clearInterval(interval)
  }, [])

  return (
    <MultiAxisLineChart
      ref={chartRef}
      xAccessor="time"
      series={[
        { yAccessor: "temperature", label: "Temp (\u00B0F)", extent: [30, 100] },
        { yAccessor: "humidity", label: "Humidity", extent: [0, 1],
          format: d => (d * 100).toFixed(0) + "%" },
      ]}
      showLegend legendPosition="bottom"
      width={width || 500} height={350}
    />
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function MultiAxisLineChartPage() {
  return (
    <PageLayout
      title="Multi-Axis Line Chart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Multi-Axis Line Chart", path: "/charts/multi-axis-line-chart" },
      ]}
      prevPage={{ title: "Quadrant Chart", path: "/charts/quadrant-chart" }}
      nextPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
    >
      <ComponentMeta
        componentName="MultiAxisLineChart"
        importStatement='import { MultiAxisLineChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Line Chart", path: "/charts/line-chart" },
          { name: "Area Chart", path: "/charts/area-chart" },
        ]}
      />

      <p>
        A dual Y-axis line chart for comparing two series with different scales
        on the same X axis. Data is unitized (normalized to [0,1]) internally so
        both lines share a common visual scale, while the left axis shows
        series[0] values and the right axis shows series[1] values in their
        original units.
      </p>

      <h2 id="quick-start">Quick Start</h2>
      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: weatherData,
              xAccessor: "time",
              series: [
                { yAccessor: "temperature", label: "Temperature (\u00B0F)" },
                { yAccessor: "humidity", label: "Humidity",
                  format: d => (d * 100).toFixed(0) + "%" },
              ],
              xLabel: "Hour of Day",
              title: "Weather Station — 24h",
              tooltip: true,
              showLegend: true,
              legendPosition: "bottom",
            }}
            type={MultiAxisLineChart}
            overrideProps={{
              data: `[
  { time: 0, temperature: 58, humidity: 0.82 },
  { time: 6, temperature: 56, humidity: 0.80 },
  { time: 12, temperature: 85, humidity: 0.40 },
  { time: 18, temperature: 72, humidity: 0.60 },
  { time: 23, temperature: 57, humidity: 0.84 },
  // ... 24 hourly readings
]`,
              series: `[
  { yAccessor: "temperature", label: "Temperature (\u00B0F)" },
  { yAccessor: "humidity", label: "Humidity",
    format: d => (d * 100).toFixed(0) + "%" },
]`,
            }}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={({ width }) => <StreamingDualAxisDemo width={width} />}
            code={streamingCode}
          />
        }
      />

      <h2 id="examples">Examples</h2>

      <h3>Server Metrics — RPS vs Latency</h3>
      <p>
        Requests per second and latency have vastly different scales (thousands
        vs milliseconds). The dual-axis layout lets you see the correlation
        without one series drowning the other.
      </p>
      <LiveExample
        frameProps={{
          data: serverData,
          xAccessor: "minute",
          series: [
            { yAccessor: "rps", label: "Requests/sec", color: "#4e79a7" },
            { yAccessor: "latency", label: "Latency (ms)", color: "#e15759" },
          ],
          xLabel: "Minutes",
          title: "API Metrics During Load Test",
          tooltip: true,
          showGrid: true,
          legendPosition: "bottom",
        }}
        type={MultiAxisLineChart}
        overrideProps={{
          data: `[
  { minute: 0, rps: 1200, latency: 45 },
  { minute: 15, rps: 2800, latency: 85 },
  { minute: 25, rps: 3500, latency: 210 },
  { minute: 40, rps: 1800, latency: 55 },
  // ... 12 readings
]`,
          series: `[
  { yAccessor: "rps", label: "Requests/sec", color: "#4e79a7" },
  { yAccessor: "latency", label: "Latency (ms)", color: "#e15759" },
]`,
        }}
      />

      <h3>Custom Extent</h3>
      <p>
        When you know the expected range of each series, provide{" "}
        <code>extent</code> to lock the axis scale. This is especially
        important for the push API, where the unitization range must be stable
        before data arrives.
      </p>
      <CodeBlock language="jsx" code={`<MultiAxisLineChart
  data={data}
  xAccessor="time"
  series={[
    { yAccessor: "temperature", label: "Temp", extent: [0, 120] },
    { yAccessor: "humidity", label: "Humidity", extent: [0, 1],
      format: d => (d * 100).toFixed(0) + "%" },
  ]}
/>`} />

      <h3>Fallback: More or Fewer Than 2 Series</h3>
      <p>
        If <code>series</code> doesn't contain exactly 2 entries, the chart
        renders as a standard multi-line chart (single Y axis) and logs a
        warning in the console. This prevents broken layouts while still
        showing something useful.
      </p>
      <CodeBlock language="jsx" code={`// This renders as a normal line chart with a console warning
<MultiAxisLineChart
  data={data}
  xAccessor="time"
  series={[
    { yAccessor: "a", label: "A" },
    { yAccessor: "b", label: "B" },
    { yAccessor: "c", label: "C" },
  ]}
/>`} />

      <h2 id="props">Props</h2>
      <PropTable props={multiAxisProps} />

      <h3>MultiAxisSeriesConfig</h3>
      <p>
        Each entry in the <code>series</code> array accepts:
      </p>
      <PropTable props={seriesConfigProps} />

      <h2 id="graduating">Graduating to the Frame</h2>
      <p>
        Under the hood, MultiAxisLineChart unitizes both series into a shared
        [0,1] y-range and uses <code>lineBy</code> grouping. You can achieve
        the same result on <code>StreamXYFrame</code> with manual unitization
        and a right-axis config via the <code>axes</code> prop:
      </p>
      <CodeBlock language="jsx" code={`// HOC (simple)
<MultiAxisLineChart
  data={data}
  xAccessor="time"
  series={[
    { yAccessor: "temperature", label: "Temp" },
    { yAccessor: "humidity", label: "Humidity" },
  ]}
/>

// Frame (full control — you handle unitization)
const unitized = data.flatMap(d => [
  { time: d.time, __y: (d.temperature - tMin) / (tMax - tMin), __series: "temperature" },
  { time: d.time, __y: (d.humidity - hMin) / (hMax - hMin), __series: "humidity" },
])

<StreamXYFrame
  chartType="line"
  data={unitized}
  xAccessor="time"
  yAccessor="__y"
  groupAccessor="__series"
  yExtent={[0, 1]}
  axes={[
    { orient: "left", tickFormat: v => invertTemp(v).toFixed(0) },
    { orient: "right", tickFormat: v => invertHumidity(v).toFixed(1) },
  ]}
  yLabel="Temperature"
  yLabelRight="Humidity"
  size={[600, 400]}
  margin={{ left: 70, right: 70 }}
/>`} />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/line-chart">Line Chart</Link> — single Y-axis line chart</li>
        <li><Link to="/charts/area-chart">Area Chart</Link> — filled areas under lines</li>
        <li><Link to="/charts/realtime-line-chart">Realtime Line Chart</Link> — streaming time series</li>
        <li><Link to="/frames/xy-frame">StreamXYFrame</Link> — full control with axes config</li>
      </ul>
    </PageLayout>
  )
}
