import React, { useRef, useEffect, useState } from "react"
import { LineChart, LinkedCharts } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import Tabs from "../../components/Tabs"
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

const animateLineA = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
]

const animateLineB = [
  { month: 1, revenue: 20000 },
  { month: 2, revenue: 11000 },
  { month: 3, revenue: 25000 },
  { month: 4, revenue: 15000 },
  { month: 5, revenue: 30000 },
  { month: 6, revenue: 18000 },
]

function AnimateLineDemo() {
  const [useB, setUseB] = useState(false)
  return (
    <div>
      <button
        onClick={() => setUseB((v) => !v)}
        style={{
          marginBottom: 12,
          padding: "6px 16px",
          borderRadius: 4,
          border: "1px solid var(--semiotic-border, #ccc)",
          background: "var(--semiotic-bg, #fff)",
          color: "var(--semiotic-text, #333)",
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        Swap data {useB ? "← A" : "→ B"}
      </button>
      <LineChart
        data={useB ? animateLineB : animateLineA}
        xAccessor="month"
        yAccessor="revenue"
        animate={{ duration: 600, easing: "ease-out" }}
        showPoints
        curve="monotoneX"
        width={500}
        height={250}
        xLabel="Month"
        yLabel="Revenue ($)"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

// Throughput series with an asymmetric min/max envelope per sample —
// the average rides through the middle, the band shows the spread.
const bandData = [
  { hour: 0, avg: 82, min: 64, max: 102 },
  { hour: 1, avg: 74, min: 55, max: 98 },
  { hour: 2, avg: 66, min: 48, max: 85 },
  { hour: 3, avg: 60, min: 42, max: 78 },
  { hour: 4, avg: 64, min: 49, max: 80 },
  { hour: 5, avg: 78, min: 60, max: 96 },
  { hour: 6, avg: 98, min: 78, max: 122 },
  { hour: 7, avg: 132, min: 110, max: 161 },
  { hour: 8, avg: 168, min: 142, max: 197 },
  { hour: 9, avg: 184, min: 158, max: 220 },
  { hour: 10, avg: 176, min: 150, max: 211 },
  { hour: 11, avg: 162, min: 138, max: 195 },
  { hour: 12, avg: 158, min: 134, max: 188 },
  { hour: 13, avg: 166, min: 142, max: 197 },
  { hour: 14, avg: 170, min: 146, max: 205 },
  { hour: 15, avg: 174, min: 148, max: 210 },
  { hour: 16, avg: 168, min: 142, max: 199 },
  { hour: 17, avg: 152, min: 128, max: 182 },
  { hour: 18, avg: 138, min: 116, max: 165 },
  { hour: 19, avg: 124, min: 102, max: 149 },
  { hour: 20, avg: 112, min: 90, max: 137 },
  { hour: 21, avg: 100, min: 80, max: 124 },
  { hour: 22, avg: 92, min: 72, max: 115 },
  { hour: 23, avg: 86, min: 68, max: 108 },
]

// Percentile fan — two nested bands (p10-p90 outer, p25-p75 inner)
// produce the classic forecasting / SLO ribbon visualization.
const percentileFanData = [
  { day: 0, value: 100, p10: 80, p25: 90, p75: 110, p90: 122 },
  { day: 1, value: 105, p10: 82, p25: 93, p75: 117, p90: 130 },
  { day: 2, value: 110, p10: 84, p25: 96, p75: 124, p90: 138 },
  { day: 3, value: 115, p10: 85, p25: 99, p75: 131, p90: 147 },
  { day: 4, value: 120, p10: 86, p25: 102, p75: 138, p90: 155 },
  { day: 5, value: 125, p10: 86, p25: 104, p75: 146, p90: 164 },
  { day: 6, value: 130, p10: 87, p25: 107, p75: 153, p90: 172 },
  { day: 7, value: 135, p10: 88, p25: 110, p75: 160, p90: 180 },
  { day: 8, value: 140, p10: 88, p25: 112, p75: 168, p90: 188 },
  { day: 9, value: 145, p10: 89, p25: 115, p75: 175, p90: 197 },
]

const gapData = [
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  { month: 3, revenue: null, product: "Widget" },
  { month: 4, revenue: null, product: "Widget" },
  { month: 5, revenue: 19000, product: "Widget" },
  { month: 6, revenue: 27000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 2, revenue: 11000, product: "Gadget" },
  { month: 3, revenue: 15000, product: "Gadget" },
  { month: 4, revenue: null, product: "Gadget" },
  { month: 5, revenue: 17000, product: "Gadget" },
  { month: 6, revenue: 21000, product: "Gadget" },
]

const lineChartProps = [
  {
    name: "data",
    type: "array",
    required: true,
    default: null,
    description: "Array of data points or array of line objects with coordinates.",
  },
  {
    name: "xAccessor",
    type: "string | function",
    required: false,
    default: '"x"',
    description: "Field name or function to access x values from each data point.",
  },
  {
    name: "yAccessor",
    type: "string | function",
    required: false,
    default: '"y"',
    description: "Field name or function to access y values from each data point.",
  },
  {
    name: "lineBy",
    type: "string | function",
    required: false,
    default: null,
    description: "Field name or function to group data into multiple lines (e.g., by series).",
  },
  {
    name: "lineDataAccessor",
    type: "string",
    required: false,
    default: '"coordinates"',
    description: "Field name in line objects that contains coordinate arrays.",
  },
  {
    name: "colorBy",
    type: "string | function",
    required: false,
    default: null,
    description: "Field name or function to determine line color for multiple lines.",
  },
  {
    name: "colorScheme",
    type: "string | array",
    required: false,
    default: '"category10"',
    description: "Color scheme name or custom colors array.",
  },
  {
    name: "curve",
    type: "string",
    required: false,
    default: '"linear"',
    description:
      'Curve interpolation: "linear", "monotoneX", "step", "basis", "cardinal", "catmullRom".',
  },
  {
    name: "showPoints",
    type: "boolean",
    required: false,
    default: "false",
    description: "Show data points on the line.",
  },
  {
    name: "pointRadius",
    type: "number",
    required: false,
    default: "3",
    description: "Point radius when showPoints is true.",
  },
  {
    name: "fillArea",
    type: "boolean",
    required: false,
    default: "false",
    description: "Fill the area under the line.",
  },
  {
    name: "areaOpacity",
    type: "number",
    required: false,
    default: "0.3",
    description: "Opacity of the area fill when fillArea is true.",
  },
  {
    name: "lineWidth",
    type: "number",
    required: false,
    default: "2",
    description: "Stroke width of the line.",
  },
  {
    name: "enableHover",
    type: "boolean",
    required: false,
    default: "true",
    description: "Enable hover annotations on data points.",
  },
  {
    name: "showGrid",
    type: "boolean",
    required: false,
    default: "false",
    description: "Show background grid lines.",
  },
  {
    name: "showLegend",
    type: "boolean",
    required: false,
    default: "true (multi-line)",
    description: "Show a legend. Defaults to true when multiple lines are present.",
  },
  {
    name: "tooltip",
    type: '"multi" | object | function',
    required: false,
    default: null,
    description:
      'Tooltip configuration or render function. Pass "multi" to show every series value at the hovered x position.',
  },
  {
    name: "gapStrategy",
    type: '"break" | "interpolate" | "zero"',
    required: false,
    default: '"break"',
    description:
      'How to handle null/undefined/NaN values in data. "break" splits the line at gaps, "interpolate" connects across gaps, "zero" drops to zero.',
  },
  {
    name: "band",
    type: "BandConfig | BandConfig[]",
    required: false,
    default: null,
    description:
      "Asymmetric min/max envelope drawn under the line. `{ y0Accessor, y1Accessor, style?, perSeries?, interactive? }` or an array for percentile fans. Participates in y-extent auto-derivation. Hovered datum gets `band: {y0,y1}` and `bands: [...]` for tooltip access. Distinct from `boundsAccessor` (symmetric ±offset).",
  },
  {
    name: "directLabel",
    type: "boolean",
    required: false,
    default: "false",
    description:
      "Place category labels at line endpoints instead of using a separate legend. Auto-hides the legend when enabled.",
  },
  {
    name: "legendInteraction",
    type: '"highlight" | "isolate" | "none"',
    required: false,
    default: '"none"',
    description:
      'Legend interaction mode. "highlight" dims non-hovered categories to 30% opacity. "isolate" toggles category visibility on click.',
  },
  {
    name: "loading",
    type: "boolean",
    required: false,
    default: "false",
    description: "Show a skeleton loading placeholder instead of the chart.",
  },
  {
    name: "emptyContent",
    type: "ReactNode | false",
    required: false,
    default: null,
    description:
      'Custom content to show when data is empty. Set to false to disable the default "No data available" message.',
  },
  {
    name: "width",
    type: "number",
    required: false,
    default: "600",
    description: "Chart width in pixels.",
  },
  {
    name: "height",
    type: "number",
    required: false,
    default: "400",
    description: "Chart height in pixels.",
  },
  {
    name: "margin",
    type: "object",
    required: false,
    default: "{ top: 50, bottom: 60, left: 70, right: 40 }",
    description: "Margin around the chart area.",
  },
  {
    name: "xLabel",
    type: "string",
    required: false,
    default: null,
    description: "Label for the x-axis.",
  },
  {
    name: "yLabel",
    type: "string",
    required: false,
    default: null,
    description: "Label for the y-axis.",
  },
  {
    name: "animate",
    type: "boolean | object",
    required: false,
    default: "false",
    description:
      "Enable animated intro and smooth data-change transitions. `true` for defaults (300ms ease-out, intro enabled), or `{ duration, easing, intro }`. Set `{ intro: false }` to disable intro.",
  },
  {
    name: "hoverRadius",
    type: "number",
    required: false,
    default: "30",
    description:
      "Maximum distance (px) from a data point to trigger hover. Increase for sparse charts, decrease for dense ones.",
  },
  {
    name: "title",
    type: "string",
    required: false,
    default: null,
    description: "Chart title displayed at the top.",
  },
  {
    name: "frameProps",
    type: "object",
    required: false,
    default: null,
    description:
      "Additional StreamXYFrame props for advanced customization. Escape hatch to the full Frame API.",
  },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingLineCode = `import { useRef, useEffect } from "react"
import { LineChart } from "semiotic"

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
    <LineChart
      ref={chartRef}
      xAccessor="time"
      yAccessor="value"
      width={600}
      height={280}
      frameProps={{
        lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
        windowSize: 150,
      }}
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
    <LineChart
      ref={chartRef}
      xAccessor="time"
      yAccessor="value"
      width={width}
      height={280}
      frameProps={{
        lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
        windowSize: 150,
      }}
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
        LineChart visualizes trends and time series data. Pass your data, specify the x and y
        accessors, and get a publication-ready chart with hover interactions, axes, and legends —
        all with sensible defaults.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <ChartGrounding
        component="LineChart"
        props={{
          data: [
            { month: 1, revenue: 120 }, { month: 2, revenue: 145 },
            { month: 3, revenue: 138 }, { month: 4, revenue: 162 }, { month: 5, revenue: 175 },
          ],
          xAccessor: "month",
          yAccessor: "revenue",
          title: "Monthly revenue",
        }}
      />

      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest line chart requires just <code>data</code>, <code>xAccessor</code>, and{" "}
        <code>yAccessor</code>.
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
        Use <code>lineBy</code> to group data points into separate lines, and <code>colorBy</code>{" "}
        to color them by category.
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
        Enable <code>showPoints</code> and set <code>curve</code> to <code>"monotoneX"</code> for a
        smooth interpolation with visible data points.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "revenue",
          showPoints: true,
          pointRadius: 5,
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: "salesData",
          showPoints: "true",
          pointRadius: "5",
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

      <h3 id="confidence-bands">Confidence Bands (boundsAccessor)</h3>
      <p>
        Use <code>frameProps</code> with StreamXYFrame's <code>boundsAccessor</code> to add
        confidence intervals or error bands around your line. The accessor receives each data point
        and returns how far the band extends above and below the line value.
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
            boundsAccessor: (d) => Math.max(d.upper, d.lower),
            boundsStyle: {
              fill: "#6366f1",
              fillOpacity: 0.15,
              stroke: "none",
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
  boundsAccessor: d => Math.max(d.upper, d.lower),
  boundsStyle: {
    fill: "#6366f1",
    fillOpacity: 0.15,
    stroke: "none",
  },
}`,
        }}
        hiddenProps={{}}
      />

      <p>
        The <code>boundsAccessor</code> receives each raw data point and returns an offset value.
        The band is drawn symmetrically at <code>y +/- offset</code> around the line. For asymmetric
        confidence intervals, use the larger of the two bounds to ensure the full range is covered.
        This is useful for forecasts, measurement uncertainty, or any scenario where you want to
        show a range around a trend.
      </p>

      <h3 id="band">Asymmetric Min/Max Bands (band)</h3>
      <p>
        When the upper and lower bounds are <em>not</em> symmetric around the line value —
        throughput min/max ribbons, percentile spreads, SLO ranges — use the <code>band</code> prop
        instead of <code>boundsAccessor</code>. Pass <code>y0Accessor</code> and{" "}
        <code>y1Accessor</code> for the bottom and top of the envelope. The ribbon paints under the
        line, participates in the y-extent auto-derivation so it can't clip, and is non-interactive
        by default (hovers pass through to the line on top).
      </p>

      <LiveExample
        frameProps={{
          data: bandData,
          xAccessor: "hour",
          yAccessor: "avg",
          curve: "monotoneX",
          xLabel: "Hour",
          yLabel: "Requests/sec",
          band: {
            y0Accessor: "min",
            y1Accessor: "max",
          },
          tooltip: (d) => (
            <div style={{ padding: 6 }}>
              <div>
                <strong>{d.hour}:00</strong>
              </div>
              <div>avg: {d.avg}</div>
              <div>
                min: {d.band?.y0} / max: {d.band?.y1}
              </div>
            </div>
          ),
        }}
        type={LineChart}
        overrideProps={{
          data: `[
  { hour: 0, avg: 82, min: 64, max: 102 },
  // ...one row per hour with min/avg/max throughput
]`,
          band: `{
  y0Accessor: "min",
  y1Accessor: "max",
}`,
          tooltip: `d => (
  <div>
    <strong>{d.hour}:00</strong>
    avg: {d.avg}
    min: {d.band?.y0} / max: {d.band?.y1}
  </div>
)`,
        }}
        hiddenProps={{}}
      />

      <p>
        The hovered datum is enriched with <code>band: {"{ y0, y1 }"}</code> (first band) and{" "}
        <code>bands: [...]</code> (all bands), so custom tooltip functions can render the envelope
        values without re-running the accessors. The same enrichment flows through the pointer hover
        path, multi-mode <code>allSeries</code> entries (each series carries its own band values),
        and keyboard navigation, so every interaction surface sees the same shape.
      </p>

      <p>
        The <strong>default tooltip surfaces band values automatically</strong> — pass a{" "}
        <code>band</code> prop without a custom <code>tooltip</code> function and the rendered
        tooltip gains one row pair per band (low + high). String accessors become the row labels;
        function accessors fall back to <code>low</code> / <code>high</code>. The default ribbon
        style is the parent line color at <code>0.2</code> <code>fillOpacity</code>; override with{" "}
        <code>band.style</code> for full control.
      </p>

      <p>
        <strong>Percentile fan.</strong> Pass an array of bands to draw a forecasting fan — outer
        band first, inner band second. Each layer stacks visually so overlapping fills darken in the
        middle, which is the standard percentile-ribbon aesthetic.
      </p>

      <LiveExample
        frameProps={{
          data: percentileFanData,
          xAccessor: "day",
          yAccessor: "value",
          curve: "monotoneX",
          xLabel: "Day",
          yLabel: "Projected value",
          band: [
            {
              y0Accessor: "p10",
              y1Accessor: "p90",
              style: { fill: "#6366f1", fillOpacity: 0.15, stroke: "none" },
            },
            {
              y0Accessor: "p25",
              y1Accessor: "p75",
              style: { fill: "#6366f1", fillOpacity: 0.3, stroke: "none" },
            },
          ],
        }}
        type={LineChart}
        overrideProps={{
          data: `[
  { day: 0, value: 100, p10: 80, p25: 90, p75: 110, p90: 122 },
  // ...one row per day with percentile columns
]`,
          band: `[
  // Outer p10-p90 envelope drawn first (lighter)
  { y0Accessor: "p10", y1Accessor: "p90",
    style: { fill: "#6366f1", fillOpacity: 0.15, stroke: "none" } },
  // Inner p25-p75 envelope on top (darker)
  { y0Accessor: "p25", y1Accessor: "p75",
    style: { fill: "#6366f1", fillOpacity: 0.30, stroke: "none" } },
]`,
        }}
        hiddenProps={{}}
      />

      <p>
        When paired with <code>lineBy</code> / <code>colorBy</code>, each band defaults to{" "}
        <code>perSeries: true</code> — one ribbon per group, colored to match its line. Set{" "}
        <code>perSeries: false</code> for a single aggregate envelope (e.g. an aggregate min/max
        across all series). Band y0/y1 values feed <code>yExtent</code> auto-derivation, so a tall
        envelope can never get clipped; explicit <code>yExtent</code> still wins.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Gap Strategy */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="gap-strategy">Data Gap Handling</h2>

      <p>
        Real-world data often has missing values. The <code>gapStrategy</code> prop controls how
        LineChart handles <code>null</code>, <code>undefined</code>, or <code>NaN</code> values in
        your y-accessor field. Three strategies are available: <strong>break</strong> (default)
        splits the line at gaps, <strong>interpolate</strong> connects across them, and{" "}
        <strong>zero</strong> drops to the baseline.
      </p>

      <Tabs tabs={["Break (default)", "Interpolate", "Zero"]}>
        <div>
          <p>
            Splits the line into segments at gap boundaries. Each contiguous run of valid data
            renders as its own line. This is the safest default — it makes missing data visible
            rather than hiding it behind a smooth connection.
          </p>
          <LiveExample
            frameProps={{
              data: gapData,
              xAccessor: "month",
              yAccessor: "revenue",
              lineBy: "product",
              colorBy: "product",
              gapStrategy: "break",
              showPoints: true,
              xLabel: "Month",
              yLabel: "Revenue ($)",
            }}
            type={LineChart}
            overrideProps={{
              data: `[
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  { month: 3, revenue: null, product: "Widget" },  // gap
  { month: 4, revenue: null, product: "Widget" },  // gap
  { month: 5, revenue: 19000, product: "Widget" },
  { month: 6, revenue: 27000, product: "Widget" },
]`,
              gapStrategy: '"break"',
            }}
            hiddenProps={{}}
          />
        </div>
        <div>
          <p>
            Connects across gaps by skipping missing points. The line draws directly from the last
            valid value to the next valid value. Use this when the missing values don't represent a
            meaningful absence — for example, sparse sampling of a continuous signal.
          </p>
          <LiveExample
            frameProps={{
              data: gapData,
              xAccessor: "month",
              yAccessor: "revenue",
              lineBy: "product",
              colorBy: "product",
              gapStrategy: "interpolate",
              showPoints: true,
              xLabel: "Month",
              yLabel: "Revenue ($)",
            }}
            type={LineChart}
            overrideProps={{
              data: `gapData  // same data with null values`,
              gapStrategy: '"interpolate"',
            }}
            hiddenProps={{}}
          />
        </div>
        <div>
          <p>
            Drops to zero at gap boundaries. The line falls to the baseline at the start of a gap
            and rises back up at the end. Use this for cumulative metrics or event counts where a
            gap genuinely means "nothing happened."
          </p>
          <LiveExample
            frameProps={{
              data: gapData,
              xAccessor: "month",
              yAccessor: "revenue",
              lineBy: "product",
              colorBy: "product",
              gapStrategy: "zero",
              showPoints: true,
              xLabel: "Month",
              yLabel: "Revenue ($)",
            }}
            type={LineChart}
            overrideProps={{
              data: `gapData  // same data with null values`,
              gapStrategy: '"zero"',
            }}
            hiddenProps={{}}
          />
        </div>
      </Tabs>

      <CodeBlock
        code={`// Break the line at gaps (default) — makes missing data visible
<LineChart data={data} gapStrategy="break" />

// Connect across gaps — use for sparse but continuous signals
<LineChart data={data} gapStrategy="interpolate" />

// Drop to zero at gaps — use for event counts or cumulative metrics
<LineChart data={data} gapStrategy="zero" />`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Direct Labels */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="direct-label">Direct Labels</h2>

      <p>
        Instead of a separate legend, <code>directLabel</code> places category names at the end of
        each line. This follows the data visualization best practice of labeling data directly when
        space allows. The legend is auto-hidden when direct labels are active.
      </p>

      <LiveExample
        frameProps={{
          data: multiLineData,
          xAccessor: "month",
          yAccessor: "revenue",
          lineBy: "product",
          colorBy: "product",
          directLabel: true,
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 1, revenue: 5000, product: "Doohickey" },
  // ...data with product field
]`,
          directLabel: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Empty & Loading States */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="empty-loading">Empty and Loading States</h2>

      <p>
        All chart components support built-in <code>loading</code> and <code>emptyContent</code>{" "}
        props. See the <Link to="/features/chart-states">Chart States</Link> page for full
        documentation and examples.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Hover Highlight */}
      {/* ----------------------------------------------------------------- */}
      <h3 id="multi-tooltip">Hover-Anywhere Multi Tooltip</h3>
      <p>
        Set <code>tooltip="multi"</code> to show all series values at the hovered x position with
        color swatches. The tooltip follows the cursor across the rendered x range, so readers can
        compare series between sampled points as well as directly over them.
      </p>

      <LiveExample
        frameProps={{
          data: multiLineData,
          xAccessor: "month",
          yAccessor: "revenue",
          lineBy: "product",
          colorBy: "product",
          tooltip: "multi",
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        overrideProps={{
          data: `multiLineData`,
          tooltip: '"multi"',
          curve: '"monotoneX"',
        }}
        hiddenProps={{}}
      />

      <h3 id="axis-options">Axis Options</h3>
      <p>
        Configure axis behavior with <code>frameProps.axes</code>: force the domain max tick with{" "}
        <code>includeMax</code>, auto-rotate crowded labels, or use dashed baselines.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "month",
          yAccessor: "revenue",
          showGrid: true,
          frameProps: {
            axes: [
              { orient: "bottom", includeMax: true, autoRotate: true, gridStyle: "dashed" },
              { orient: "left", includeMax: true },
            ],
          },
        }}
        type={LineChart}
        overrideProps={{
          data: `simpleData`,
          showGrid: "true",
          frameProps: `{
  axes: [
    { orient: "bottom", includeMax: true, autoRotate: true, gridStyle: "dashed" },
    { orient: "left", includeMax: true },
  ],
}`,
        }}
        hiddenProps={{}}
      />

      <h3 id="hover-highlight">Hover Highlight (Sibling Dimming)</h3>
      <p>
        Set <code>hoverHighlight="series"</code> to dim non-hovered series when hovering a line.
        Requires <code>colorBy</code> to identify series.
      </p>

      <LiveExample
        frameProps={{
          data: multiLineData,
          xAccessor: "month",
          yAccessor: "revenue",
          lineBy: "product",
          colorBy: "product",
          hoverHighlight: "series",
        }}
        type={LineChart}
        overrideProps={{
          data: `multiLineData`,
          hoverHighlight: '"series"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Animate */}
      {/* ----------------------------------------------------------------- */}
      <h3 id="animate">Animated Transitions</h3>
      <p>
        Set <code>animate</code> to smoothly transition line positions when data changes. Pass{" "}
        <code>true</code> for defaults (300ms ease-out) or a config object.
      </p>

      <AnimateLineDemo />

      <CodeBlock
        code={`const [data, setData] = useState(datasetA)

<LineChart
  data={data}
  xAccessor="month"
  yAccessor="revenue"
  animate={{ duration: 600, easing: "ease-out" }}
  showPoints
  curve="monotoneX"
/>`}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Click-to-Lock Crosshair */}
      {/* ----------------------------------------------------------------- */}
      <h3 id="click-to-lock">Click-to-Lock Crosshair</h3>
      <p>
        With <code>linkedHover</code> in <code>"x-position"</code> mode, click a chart to lock the
        crosshair at that X position. Click again or press <kbd>Escape</kbd> to unlock. Hover to see
        the synced crosshair, then click to lock it in place.
      </p>

      <LinkedCharts>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          <LineChart
            data={simpleData}
            xAccessor="month"
            yAccessor="revenue"
            linkedHover={{ name: "lock-demo", mode: "x-position", xField: "month" }}
            tooltip
            width={500}
            height={180}
          />
          <LineChart
            data={simpleData.map((d) => ({ month: d.month, revenue: 50000 - d.revenue }))}
            xAccessor="month"
            yAccessor="revenue"
            linkedHover={{ name: "lock-demo", mode: "x-position", xField: "month" }}
            tooltip
            color="#e45050"
            width={500}
            height={180}
          />
        </div>
      </LinkedCharts>

      <CodeBlock language="jsx">{`<LinkedCharts>
  <LineChart
    data={revenueData}
    xAccessor="month" yAccessor="revenue"
    linkedHover={{ name: "sync", mode: "x-position", xField: "month" }}
    tooltip
  />
  <LineChart
    data={costData}
    xAccessor="month" yAccessor="cost"
    linkedHover={{ name: "sync", mode: "x-position", xField: "month" }}
    tooltip
  />
</LinkedCharts>`}</CodeBlock>

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
        When you need more control — custom marks, complex annotations, dual-axis layouts — graduate
        to <Link to="/frames/xy-frame">StreamXYFrame</Link> directly. Every <code>LineChart</code>{" "}
        is just a configured <code>StreamXYFrame</code> under the hood.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
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
        The <code>frameProps</code> prop on LineChart lets you pass any StreamXYFrame prop without
        fully graduating:
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
          <Link to="/charts/area-chart">AreaChart</Link> — filled area beneath the line (or use{" "}
          <code>fillArea</code> on LineChart)
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — for point-based XY visualizations
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — the underlying Frame with full control
          over every rendering detail
        </li>
        <li>
          <Link to="/annotations/overview">Annotations</Link> — adding callouts, highlights, and
          notes to any visualization
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — custom tooltip content and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
