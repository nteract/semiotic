import React, { useRef, useEffect } from "react"
import { DifferenceChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Temperature anomaly — daily highs vs. the climatological normal. Months
// 5/6 sit below normal (cool snap), 1/2 and 9–11 run above. Crossovers at
// ~3, ~6.5, and ~8 give the chart its signature shape.
const tempData = [
  { month: 1,  actual: 38, normal: 32 },
  { month: 2,  actual: 41, normal: 36 },
  { month: 3,  actual: 45, normal: 48 },
  { month: 4,  actual: 55, normal: 57 },
  { month: 5,  actual: 61, normal: 66 },
  { month: 6,  actual: 70, normal: 75 },
  { month: 7,  actual: 79, normal: 79 },
  { month: 8,  actual: 81, normal: 78 },
  { month: 9,  actual: 74, normal: 70 },
  { month: 10, actual: 64, normal: 58 },
  { month: 11, actual: 52, normal: 47 },
  { month: 12, actual: 42, normal: 37 },
]

// Forecast accuracy — actual vs. predicted demand. Forecaster runs slightly
// optimistic in spring, gets overrun by an unexpected summer peak, then
// over-predicts the fall slowdown. Three crossovers, mixed segments.
const forecastData = Array.from({ length: 18 }, (_, i) => {
  const x = i
  const trend = 100 + i * 4
  const actual = trend + Math.sin(i * 0.7) * 22 + (i > 8 && i < 13 ? 35 : 0) - (i > 13 ? 18 : 0)
  const forecast = trend + Math.sin(i * 0.7 + 0.3) * 18
  return { x, actual: Math.round(actual), forecast: Math.round(forecast) }
})

// Budget variance — spend vs. budget across 12 weeks. Three over-budget
// weeks early in the quarter, recovers mid-quarter, blows past target on
// week 11 from a hardware order.
const budgetData = [
  { week: 1,  spend: 12,  budget: 10 },
  { week: 2,  spend: 14,  budget: 12 },
  { week: 3,  spend: 9,   budget: 12 },
  { week: 4,  spend: 8,   budget: 14 },
  { week: 5,  spend: 13,  budget: 14 },
  { week: 6,  spend: 16,  budget: 14 },
  { week: 7,  spend: 11,  budget: 12 },
  { week: 8,  spend: 10,  budget: 12 },
  { week: 9,  spend: 14,  budget: 16 },
  { week: 10, spend: 17,  budget: 16 },
  { week: 11, spend: 28,  budget: 18 },
  { week: 12, spend: 16,  budget: 18 },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingDifferenceCode = `import { useRef, useEffect } from "react"
import { DifferenceChart } from "semiotic"

function StreamingDifference() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        // Two random walks, slowly diverging then converging.
        const a = 50 + Math.sin(i * 0.05) * 18 + (Math.random() - 0.5) * 6
        const b = 50 + Math.cos(i * 0.04) * 18 + (Math.random() - 0.5) * 6
        chartRef.current.push({ x: i, a, b })
      }
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <DifferenceChart
      ref={chartRef}
      xAccessor="x"
      seriesAAccessor="a"
      seriesBAccessor="b"
      seriesALabel="Series A"
      seriesBLabel="Series B"
      width={600}
      height={280}
      windowSize={80}
    />
  )
}`

function StreamingDifferenceDemo({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const a = 50 + Math.sin(i * 0.05) * 18 + (Math.random() - 0.5) * 6
        const b = 50 + Math.cos(i * 0.04) * 18 + (Math.random() - 0.5) * 6
        chartRef.current.push({ x: i, a, b })
      }
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <DifferenceChart
      ref={chartRef}
      xAccessor="x"
      seriesAAccessor="a"
      seriesBAccessor="b"
      seriesALabel="Series A"
      seriesBLabel="Series B"
      width={width}
      height={280}
      windowSize={80}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const differenceChartProps = [
  { name: "data", type: "array", required: false, default: null, description: "Array of {x, a, b} objects. Omit for push API mode." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Accessor for the x value." },
  { name: "seriesAAccessor", type: "string | function", required: false, default: '"a"', description: "Accessor for the series A value." },
  { name: "seriesBAccessor", type: "string | function", required: false, default: '"b"', description: "Accessor for the series B value." },
  { name: "seriesALabel", type: "string", required: false, default: '"A"', description: "Display label for series A (legend + tooltip)." },
  { name: "seriesBLabel", type: "string", required: false, default: '"B"', description: "Display label for series B." },
  { name: "seriesAColor", type: "string", required: false, default: "var(--semiotic-danger)", description: "Fill color used when series A is above series B." },
  { name: "seriesBColor", type: "string", required: false, default: "var(--semiotic-info)", description: "Fill color used when series B is above series A." },
  { name: "showLines", type: "boolean", required: false, default: "true", description: "Draw the two series as overlay lines on top of the filled difference." },
  { name: "lineWidth", type: "number", required: false, default: "1.5", description: "Stroke width for the overlay lines." },
  { name: "showPoints", type: "boolean", required: false, default: "false", description: "Show data points at each vertex on the overlay lines." },
  { name: "pointRadius", type: "number", required: false, default: "3", description: "Radius for the overlay-line points." },
  { name: "curve", type: "string", required: false, default: '"linear"', description: "Curve interpolation: linear, monotoneX, monotoneY, step, stepAfter, stepBefore, basis, cardinal, catmullRom." },
  { name: "areaOpacity", type: "number", required: false, default: "0.6", description: "Opacity of the difference fill (0–1)." },
  { name: "gradientFill", type: "{ stops }", required: false, default: null, description: "Tip-to-base gradient using { stops: [{ offset: 0–1, color?, opacity? }] }." },
  { name: "xExtent", type: "[number, number]", required: false, default: null, description: "Fixed x domain. Either bound may be undefined." },
  { name: "yExtent", type: "[number, number]", required: false, default: null, description: "Fixed y domain. Either bound may be undefined." },
  { name: "axisExtent", type: '"nice" | "exact"', required: false, default: '"nice"', description: "Tick endpoint mode (see /features/axes#axis-extent)." },
  { name: "pointIdAccessor", type: "string | function", required: false, default: null, description: "Stable ID accessor for push-mode remove()/update()." },
  { name: "windowSize", type: "number", required: false, default: null, description: "Maximum number of raw rows kept in the push buffer. When exceeded, oldest rows are evicted FIFO. Recommended for long-running streams so segment recomputation stays bounded." },
  { name: "annotations", type: "array", required: false, default: null, description: "Annotation objects (x-threshold, y-threshold, etc.)." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Custom tooltip; default tooltip shows both series + Δ at the hovered x." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Pass-through props to StreamXYFrame." },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DifferenceChartPage() {
  return (
    <PageLayout
      title="DifferenceChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "DifferenceChart", path: "/charts/difference-chart" },
      ]}
      nextPage={{ title: "StackedAreaChart", path: "/charts/stacked-area-chart" }}
    >
      <ComponentMeta
        componentName="DifferenceChart"
        importStatement='import { DifferenceChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "StackedAreaChart", path: "/charts/stacked-area-chart" },
        ]}
      />

      <p>
        DifferenceChart fills the region between two series with a color that
        switches based on which series is higher at each x. Crossovers are
        linearly interpolated, so segments meet at zero-width vertices — no
        jagged seams. Both series are drawn as overlay lines on top of the
        fill by default.
      </p>

      <p>
        Classic uses: temperature anomaly (actual vs. normal), forecast
        accuracy (actual vs. predicted), budget variance, and any A/B
        comparison where the <em>direction</em> of the difference carries
        information.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start (with streaming toggle) */}
      {/* ----------------------------------------------------------------- */}
      <ChartGrounding component="DifferenceChart" />

      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide an array of <code>{`{ x, a, b }`}</code> rows and the two
        series accessors. The chart computes crossovers and switches fill
        color automatically.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: tempData,
              xAccessor: "month",
              seriesAAccessor: "actual",
              seriesBAccessor: "normal",
              seriesALabel: "Actual",
              seriesBLabel: "Normal",
              xLabel: "Month",
              yLabel: "°F",
            }}
            type={DifferenceChart}
            startHidden={false}
            overrideProps={{
              data: `[
  { month: 1, actual: 38, normal: 32 },
  { month: 2, actual: 41, normal: 36 },
  // ...more rows
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingDifferenceDemo width={w} />}
            code={streamingDifferenceCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="forecast-accuracy">Forecast accuracy with multiple crossovers</h3>
      <p>
        When two series cross repeatedly, the fill flips at every crossover.
        Useful for showing where a forecast model over- or under-predicted
        over time. Custom semantic colors via{" "}
        <code>seriesAColor</code> / <code>seriesBColor</code>.
      </p>

      <LiveExample
        frameProps={{
          data: forecastData,
          xAccessor: "x",
          seriesAAccessor: "actual",
          seriesBAccessor: "forecast",
          seriesALabel: "Actual",
          seriesBLabel: "Forecast",
          seriesAColor: "var(--semiotic-success, #16a34a)",
          seriesBColor: "var(--semiotic-warning, #f59e0b)",
          xLabel: "Week",
          yLabel: "Demand",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `forecastData`,
          seriesAColor: '"var(--semiotic-success)"',
          seriesBColor: '"var(--semiotic-warning)"',
        }}
        hiddenProps={{}}
      />

      <h3 id="curve-interpolation">Curve interpolation</h3>
      <p>
        Pass a <code>curve</code> to smooth the segments and overlay lines.
        Crossovers are still computed at the linear-interpolation crossover
        x — the smoothed curve just rounds the shape between vertices.
      </p>
      <p>
        <em>Heads-up:</em> with a non-linear curve, the overlay lines and
        the fill boundary drift a few pixels apart near crossovers. Each
        side has different control-point context (a segment starts at the
        crossover; the continuous line has a real prior neighbor there),
        so the curve tangents diverge. Linear curve gives perfect
        alignment; if you want smooth boundaries, pair{" "}
        <code>curve="monotoneX"</code> with <code>showLines={`{false}`}</code>{" "}
        — the classic NYT-style look has no overlay lines to compare
        against.
      </p>

      <LiveExample
        frameProps={{
          data: tempData,
          xAccessor: "month",
          seriesAAccessor: "actual",
          seriesBAccessor: "normal",
          seriesALabel: "Actual",
          seriesBLabel: "Normal",
          curve: "monotoneX",
          xLabel: "Month",
          yLabel: "°F",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `tempData`,
          curve: '"monotoneX"',
        }}
        hiddenProps={{}}
      />

      <h3 id="gradient-fill">Gradient fill</h3>
      <p>
        Pass <code>gradientFill</code> for a tip→base opacity gradient that
        adds depth to each segment. The gradient runs along the segment
        boundary, fading from the dominant series toward the crossover line.
      </p>

      <LiveExample
        frameProps={{
          data: budgetData,
          xAccessor: "week",
          seriesAAccessor: "spend",
          seriesBAccessor: "budget",
          seriesALabel: "Spend",
          seriesBLabel: "Budget",
          gradientFill: {
            stops: [
              { offset: 0, opacity: 0.85 },
              { offset: 1, opacity: 0.15 },
            ],
          },
          curve: "monotoneX",
          xLabel: "Week",
          yLabel: "$K",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `budgetData`,
          gradientFill: `{ stops: [
  { offset: 0, opacity: 0.85 },
  { offset: 1, opacity: 0.15 },
] }`,
          curve: '"monotoneX"',
        }}
        hiddenProps={{}}
      />

      <h3 id="no-overlay-lines">Fill only (no overlay lines)</h3>
      <p>
        Set <code>showLines={`{false}`}</code> for a clean fill without the
        boundary lines — the classic NYT-style temperature-anomaly look.
      </p>

      <LiveExample
        frameProps={{
          data: tempData,
          xAccessor: "month",
          seriesAAccessor: "actual",
          seriesBAccessor: "normal",
          seriesALabel: "Actual",
          seriesBLabel: "Normal",
          showLines: false,
          areaOpacity: 0.85,
          xLabel: "Month",
          yLabel: "°F",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `tempData`,
          showLines: `false`,
        }}
        hiddenProps={{}}
      />

      <h3 id="annotations">Annotations</h3>
      <p>
        Add <code>x-threshold</code> / <code>y-threshold</code> annotations
        to mark important moments or target values — same annotation surface
        as the other XY charts.
      </p>

      <LiveExample
        frameProps={{
          data: budgetData,
          xAccessor: "week",
          seriesAAccessor: "spend",
          seriesBAccessor: "budget",
          seriesALabel: "Spend",
          seriesBLabel: "Budget",
          annotations: [
            { type: "x-threshold", value: 11, label: "HW order", color: "var(--semiotic-text)" },
          ],
          xLabel: "Week",
          yLabel: "$K",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `budgetData`,
          annotations: `[
  { type: "x-threshold", value: 11, label: "HW order", color: "var(--semiotic-text)" }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="show-points">Marked vertices</h3>
      <p>
        Set <code>showPoints</code> to draw a dot at each data vertex on the
        overlay lines. Useful for sparse data where the reader needs to know
        exactly where each measurement landed.
      </p>

      <LiveExample
        frameProps={{
          data: budgetData,
          xAccessor: "week",
          seriesAAccessor: "spend",
          seriesBAccessor: "budget",
          seriesALabel: "Spend",
          seriesBLabel: "Budget",
          showPoints: true,
          curve: "linear",
          xLabel: "Week",
          yLabel: "$K",
        }}
        type={DifferenceChart}
        overrideProps={{
          data: `budgetData`,
          showPoints: `true`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Streaming details */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="streaming">Streaming via push API</h2>

      <p>
        DifferenceChart supports the standard semiotic push API: omit
        <code>data</code>, attach a <code>ref</code>, and push raw{" "}
        <code>{`{ x, a, b }`}</code> rows. The HOC recomputes crossovers
        and re-renders each push. Use the top-level <code>windowSize</code>{" "}
        prop to cap the raw-data buffer — older rows evict FIFO so the
        per-render segment recomputation stays bounded.
      </p>

      <CodeBlock
        code={`<DifferenceChart
  ref={chartRef}
  xAccessor="x"
  seriesAAccessor="a"
  seriesBAccessor="b"
  windowSize={100}
/>

// In an effect:
chartRef.current.push({ x: t, a: aValue, b: bValue })
chartRef.current.pushMany([...rows])
chartRef.current.clear()

// remove()/update() require pointIdAccessor:
<DifferenceChart ref={chartRef} pointIdAccessor="id" ... />
chartRef.current.remove("row-42")
chartRef.current.update("row-42", d => ({ ...d, a: 99 }))`}
        language="jsx"
      />

      <p>
        Throughput: the HOC stores raw rows in React state and recomputes
        segments via <code>useMemo</code> on each render. This is fine for
        forecast / KPI / anomaly streams (≤1 Hz). For high-frequency
        streams, consider down-sampling before pushing.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="DifferenceChart" props={differenceChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> — single or
          multi-series filled areas with a fixed baseline (or ribbon via
          <code>y0Accessor</code>).
        </li>
        <li>
          <Link to="/charts/stacked-area-chart">StackedAreaChart</Link> —
          cumulative-sum visualization where part-to-whole relationships
          matter more than divergence.
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — two-line
          comparison without the filled difference; reach for this when the
          values matter more than the gap between them.
        </li>
      </ul>
    </PageLayout>
  )
}
