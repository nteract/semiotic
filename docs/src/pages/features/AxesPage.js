import React, { useState, useCallback } from "react"
import { StreamXYFrame, StreamOrdinalFrame } from "semiotic"
import { LineChart, BarChart } from "semiotic"

import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, sales: 4200 },
  { month: 2, sales: 5800 },
  { month: 3, sales: 4900 },
  { month: 4, sales: 7100 },
  { month: 5, sales: 6300 },
  { month: 6, sales: 8400 },
  { month: 7, sales: 7800 },
  { month: 8, sales: 9200 },
  { month: 9, sales: 8600 },
  { month: 10, sales: 10500 },
  { month: 11, sales: 9800 },
  { month: 12, sales: 12100 },
]

// Time series data spanning multiple months for landmark ticks demo
const timeSeriesData = (() => {
  const data = []
  const start = new Date(2024, 0, 1)
  for (let i = 0; i < 90; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    data.push({ date: d, value: 100 + Math.sin(i * 0.1) * 40 + Math.random() * 15 })
  }
  return data
})()

const timeSeriesFrameData = [{
  label: "Metric",
  coordinates: timeSeriesData.map(d => ({ date: d.date.getTime(), value: d.value })),
}]

const barData = [
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 },
]

const frameLineData = [
  {
    label: "Revenue",
    coordinates: lineData.map((d) => ({ step: d.month, value: d.sales })),
  },
]

// ---------------------------------------------------------------------------
// Axis props definition
// ---------------------------------------------------------------------------

const axisProps = [
  { name: "orient", type: "string", required: true, default: null, description: 'Position of the axis: "left", "right", "top", or "bottom".' },
  { name: "label", type: "string | object", required: false, default: null, description: "Axis label text. Can be a string or an object with { name, locationDistance, position } for precise placement." },
  { name: "ticks", type: "number", required: false, default: null, description: "Suggested number of ticks to display. The actual count may vary based on D3 tick algorithm." },
  { name: "tickValues", type: "array", required: false, default: null, description: "Explicit array of tick values to use instead of auto-generated ticks." },
  { name: "tickFormat", type: "function", required: false, default: null, description: "Function to format tick labels. Receives the tick value and returns a string." },
  { name: "tickLineGenerator", type: "function", required: false, default: null, description: "Custom function to render tick lines. Receives { xy } with { x1, x2, y1, y2 } coordinates." },
  { name: "baseline", type: "boolean | string", required: false, default: "true", description: 'Show the baseline. Set to false to hide, or "under" to draw beneath the visualization layer.' },
  { name: "jaggedBase", type: "boolean", required: false, default: "false", description: 'Renders the tick at the minimum data point with a "torn" appearance for non-zero baselines.' },
  { name: "showOutboundTickLines", type: "boolean", required: false, default: "false", description: "Display tick lines outside the chart area to accompany tick labels." },
  { name: "axisAnnotationFunction", type: "function", required: false, default: null, description: "Enables hover interaction on the axis. Called with { className, type, value } on click." },
  { name: "glyphFunction", type: "function", required: false, default: null, description: "Custom hover glyph on axis. Receives { lineWidth, lineHeight, value } and returns JSX." },
  { name: "marginalSummaryGraphics", type: "object", required: false, default: null, description: "Add an ordinal summary (histogram, violin, etc.) to the axis margin." },
  { name: "landmarkTicks", type: "boolean | function", required: false, default: "false", description: "Highlight ticks at time boundaries with semibold styling. Set to true for auto-detection (Date boundaries), or pass a function (d, i) => boolean for custom landmark logic." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ResizableAutoRotateDemo() {
  const [chartWidth, setChartWidth] = useState(300)
  const onMouseDown = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = chartWidth
    const onMove = (ev) => setChartWidth(Math.max(200, Math.min(800, startWidth + ev.clientX - startX)))
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp) }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }, [chartWidth])

  return (
    <div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <div style={{ width: chartWidth, border: "1px solid var(--semiotic-border, #e0e0e0)", borderRadius: 4, padding: 4, flexShrink: 0 }}>
          <StreamXYFrame
            data={timeSeriesFrameData}
            chartType="line"
            lineDataAccessor="coordinates"
            xAccessor="date"
            xScaleType="time"
            yAccessor="value"
            lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
            showAxes={true}
            axes={[
              { orient: "left" },
              { orient: "bottom", autoRotate: true, ticks: 8, tickFormat: (d) => {
                const date = new Date(d)
                return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })
              }},
            ]}
            size={[chartWidth - 10, 220]}
            margin={{ top: 10, bottom: 100, left: 50, right: 10 }}
          />
        </div>
        <div
          onMouseDown={onMouseDown}
          style={{ width: 8, cursor: "col-resize", background: "var(--semiotic-border, #ccc)", borderRadius: 4, marginLeft: 2, flexShrink: 0 }}
        />
      </div>
      <div style={{ fontSize: 12, color: "var(--semiotic-text-secondary, #666)", marginTop: 4 }}>
        Drag the handle to resize — {chartWidth}px wide
      </div>
    </div>
  )
}

export default function AxesPage() {
  return (
    <PageLayout
      title="Axes"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Axes", path: "/features/axes" },
      ]}
      nextPage={{ title: "Annotations", path: "/features/annotations" }}
    >
      <p>
        Axes provide scale context for your visualizations. Semiotic supports
        axes on all four sides of XY and Ordinal visualizations, with full
        control over labels, tick formatting, tick count, grid lines, and
        interactive axis behaviors. Both the simplified Chart components and
        the lower-level Frame components share the same axis configuration
        system.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components like <code>LineChart</code> and <code>BarChart</code>{" "}
        generate axes automatically based on the <code>xLabel</code> and{" "}
        <code>yLabel</code> props. This is the simplest way to add labeled
        axes to your visualization.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "sales",
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={LineChart}
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

      <p>
        For more control over axis behavior in Chart components, use the{" "}
        <code>frameProps</code> escape hatch to pass axis configuration
        directly:
      </p>

      <CodeBlock
        code={`<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="sales"
  frameProps={{
    axes: [
      { orient: "left", label: "Sales ($)", tickFormat: d => \`$\${d.toLocaleString()}\` },
      { orient: "bottom", label: "Month", ticks: 6 }
    ]
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <p>
        Frame components accept an <code>axes</code> prop — an array of axis
        configuration objects. Each object must include an <code>orient</code>{" "}
        property to specify where the axis appears.
      </p>

      <h3 id="basic-axes">Basic Left and Bottom Axes</h3>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          showAxes: true,
          xLabel: "Month",
          yLabel: "Sales ($)",
        }}
        type={StreamXYFrame}
        startHidden={false}
        overrideProps={{
          data: `[{
  label: "Revenue",
  coordinates: [
    { step: 1, value: 4200 },
    { step: 2, value: 5800 },
    // ...more coordinates
  ]
}]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="tick-formatting">Custom Tick Formatting</h3>
      <p>
        Use <code>tickFormat</code> to control how tick labels render. This is
        especially useful for currencies, percentages, and dates.
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
          showAxes: true,
          xLabel: "Month",
          yLabel: "Revenue",
          // TODO: migrate custom tickFormat to StreamXYFrame API
          axes: [
            {
              orient: "left",
              label: "Revenue",
              tickFormat: (d) => `$${(d / 1000).toFixed(0)}k`,
            },
            {
              orient: "bottom",
              label: "Month",
              tickFormat: (d) =>
                ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d - 1] || d,
            },
          ],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[{ label: "Revenue", coordinates: salesData }]`,
          axes: `[
  {
    orient: "left",
    label: "Revenue",
    tickFormat: d => \`$\${(d / 1000).toFixed(0)}k\`
  },
  {
    orient: "bottom",
    label: "Month",
    tickFormat: d => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d - 1]
  }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="multi-axis">Multiple Axes</h3>
      <p>
        You can place axes on all four sides. This is useful for dual-axis
        charts or adding reference scales.
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          showAxes: true,
          axes: [
            { orient: "left", label: "Primary" },
            { orient: "right", label: "Secondary" },
            { orient: "bottom", label: "Step" },
          ],
          size: [500, 300],
          margin: { top: 20, bottom: 50, left: 60, right: 60 },
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `frameLineData`,
          axes: `[
  { orient: "left", label: "Primary" },
  { orient: "right", label: "Secondary" },
  { orient: "bottom", label: "Step" },
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="jagged-base">Jagged Base for Non-Zero Baselines</h3>
      <p>
        When your data does not start at zero, set <code>jaggedBase</code> to{" "}
        <code>true</code> to render a torn-edge tick at the minimum data
        point. This is a classic data visualization technique to signal that
        the axis has been truncated.
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          yExtent: [4000, undefined],
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          showAxes: true,
          axes: [
            { orient: "left", baseline: false, jaggedBase: true },
            { orient: "bottom" },
          ],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[{ label: "Revenue", coordinates: salesData }]`,
          yExtent: `[4000, undefined]`,
          axes: `[
  { orient: "left", baseline: false, jaggedBase: true },
  { orient: "bottom" }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-tick-lines">Custom Tick Lines</h3>
      <p>
        The <code>tickLineGenerator</code> prop lets you render custom tick
        line elements. This example draws dashed rectangular tick bands:
      </p>

      <CodeBlock
        code={`<StreamXYFrame
  axes={[
    {
      orient: "left",
      baseline: "under",
      tickLineGenerator: ({ xy }) => (
        <path
          style={{
            fill: "#efefef",
            stroke: "#ccc",
            strokeDasharray: "2 2"
          }}
          d={\`M\${xy.x1},\${xy.y1 - 5}L\${xy.x2},\${xy.y1 - 5}L\${xy.x2},\${xy.y1 + 5}L\${xy.x1},\${xy.y1 + 5}Z\`}
        />
      )
    }
  ]}
/>`}
        language="jsx"
      />

      <h3 id="landmark-ticks">Landmark Ticks for Time Series</h3>
      <p>
        When displaying time series data, <code>landmarkTicks</code> applies
        semibold styling to tick labels at time boundaries (e.g., when the month,
        year, or day changes). This provides hierarchical context that
        dramatically improves readability of long time axes. Notice how "Feb"
        and "Mar" are rendered bolder than regular day ticks:
      </p>

      <StreamXYFrame
        data={timeSeriesFrameData}
        chartType="line"
        lineDataAccessor="coordinates"
        xAccessor="date"
        xScaleType="time"
        yAccessor="value"
        lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
        margin={{ top: 20, bottom: 60, left: 60, right: 20 }}
        showAxes={true}
        axes={[
          { orient: "left", label: "Value" },
          {
            orient: "bottom",
            label: "Date",
            landmarkTicks: true,
            tickFormat: (d) => {
              const date = new Date(d)
              return `${date.toLocaleString("en", { month: "short" })} ${date.getDate()}`
            },
            ticks: 8,
          },
        ]}
        size={[600, 300]}
      />

      <CodeBlock
        code={`<StreamXYFrame
  data={timeSeriesData}  // 90 days, Jan–Mar 2024
  xAccessor="date"
  xScaleType="time"      // scaleTime for date-aware ticks
  yAccessor="value"
  axes={[
    { orient: "left", label: "Value" },
    { orient: "bottom", label: "Date",
      landmarkTicks: true,  // bold at month boundaries
      tickFormat: d => {
        const date = new Date(d)
        return \`\${date.toLocaleString("en", {month:"short"})} \${date.getDate()}\`
      },
      ticks: 8,
    }
  ]}
/>`}
        language="jsx"
      />

      <p>
        Landmark ticks render at <code>fontSize: 11</code> with{" "}
        <code>fontWeight: 600</code> (semibold), while regular ticks remain at{" "}
        <code>fontSize: 10</code> with normal weight. You can also pass a custom
        function:
      </p>

      <CodeBlock
        code={`// Custom landmark detection
axes={[{
  orient: "bottom",
  landmarkTicks: (d, i) => d.getMonth() === 0,  // bold only January ticks
}]}`}
        language="jsx"
      />

      <h3 id="explicit-tick-values">Explicit Tick Values</h3>
      <p>
        Use <code>tickValues</code> when you need exact control over which
        ticks appear:
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          showAxes: true,
          axes: [
            { orient: "left", tickValues: [3000, 5000, 7000, 9000], tickFormat: (d) => `$${d.toLocaleString()}` },
            { orient: "bottom", tickValues: [1, 4, 7, 10], tickFormat: (d) => `Step ${d}` },
          ],
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `frameLineData`,
          axes: `[
  { orient: "left", tickValues: [3000, 5000, 7000, 9000], tickFormat: d => "$" + d.toLocaleString() },
  { orient: "bottom", tickValues: [1, 4, 7, 10], tickFormat: d => "Step " + d },
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="include-max">Include Max Tick</h3>
      <p>
        Set <code>includeMax: true</code> to ensure the domain maximum always
        appears as a labeled tick, even if d3's default tick generation skips it.
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          showAxes: true,
          axes: [
            { orient: "left", label: "Value", includeMax: true },
            { orient: "bottom", label: "Step", includeMax: true },
          ],
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `frameLineData`,
          axes: `[
  { orient: "left", label: "Value", includeMax: true },
  { orient: "bottom", label: "Step", includeMax: true },
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="auto-rotate">Auto-Rotate Labels</h3>
      <p>
        Set <code>autoRotate: true</code> to automatically rotate bottom-axis
        labels 45° when horizontal spacing is too tight to fit them. Drag the
        handle to resize the chart and see labels switch between rotated and horizontal:
      </p>

      <ResizableAutoRotateDemo />

      <CodeBlock
        code={`<StreamXYFrame
  xScaleType="time"
  axes={[
    { orient: "bottom", autoRotate: true,
      tickFormat: d => new Date(d).toLocaleDateString("en-US",
        { weekday: "short", month: "long", day: "numeric", year: "numeric" })
    },
  ]}
/>`}
        language="jsx"
      />

      <h3 id="grid-style">Dashed & Dotted Grid Lines</h3>
      <p>
        Use <code>gridStyle</code> to change grid lines to dashed or
        dotted. Accepts <code>"dashed"</code>, <code>"dotted"</code>,
        or a custom <code>strokeDasharray</code> string. Requires{" "}
        <code>showGrid</code> to be enabled.
      </p>

      <LiveExample
        frameProps={{
          data: frameLineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          showAxes: true,
          showGrid: true,
          axes: [
            { orient: "left", gridStyle: "dotted" },
            { orient: "bottom", gridStyle: "dashed" },
          ],
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `frameLineData`,
          showGrid: "true",
          axes: `[
  { orient: "left", gridStyle: "dotted" },
  { orient: "bottom", gridStyle: "dashed" },
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <p>
        Each axis object in the <code>axes</code> array accepts the following
        properties:
      </p>

      <PropTable componentName="Axis" props={axisProps} />

      <h3 id="baseline-options">Baseline Options</h3>
      <p>
        The <code>baseline</code> prop controls the perpendicular line drawn
        at the axis edge. By default it renders above the visualization layer.
        Set it to <code>"under"</code> to draw it beneath, or{" "}
        <code>false</code> to hide it entirely.
      </p>

      <CodeBlock
        code={`// Baseline above visualization (default)
{ orient: "left", baseline: true }

// Baseline beneath visualization
{ orient: "left", baseline: "under" }

// No baseline
{ orient: "left", baseline: false }`}
        language="jsx"
      />

      <h3 id="outbound-ticks">Outbound Tick Lines</h3>
      <p>
        Set <code>showOutboundTickLines</code> to <code>true</code> to draw
        additional tick lines extending outside the chart area alongside the
        tick labels.
      </p>

      <CodeBlock
        code={`<StreamXYFrame
  axes={[
    { orient: "left", label: "Value", showOutboundTickLines: true }
  ]}
/>`}
        language="jsx"
      />

      <h3 id="axis-interactivity">Axis Interactivity</h3>
      <p>
        The <code>axisAnnotationFunction</code> prop enables hover and click
        interaction on the axis. When set, hovering over the axis displays a
        guideline, and clicking fires the callback with the axis value. Use{" "}
        <code>glyphFunction</code> to customize the hover display.
      </p>

      <CodeBlock
        code={`<StreamXYFrame
  axes={[
    {
      orient: "left",
      label: "Value",
      axisAnnotationFunction: ({ value }) => {
        console.log("Clicked axis at:", value)
        // Use this value to set a threshold annotation, filter data, etc.
      }
    }
  ]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — the underlying Frame
          for line, area, and point visualizations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the
          underlying Frame for bar, swarm, and categorical visualizations
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding
          callouts, highlights, and threshold lines
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — hover-triggered
          data display
        </li>
        <li>
          <Link to="/features/responsive">Responsive</Link> — making frames
          resize with their container
        </li>
      </ul>
    </PageLayout>
  )
}
