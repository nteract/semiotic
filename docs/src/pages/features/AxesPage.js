import React from "react"
import { XYFrame, OrdinalFrame } from "semiotic"
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
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          axes: [
            { orient: "left", label: "Sales ($)" },
            { orient: "bottom", label: "Month" },
          ],
        }}
        type={XYFrame}
        startHidden={false}
        overrideProps={{
          lines: `[{
  label: "Revenue",
  coordinates: [
    { step: 1, value: 4200 },
    { step: 2, value: 5800 },
    // ...more coordinates
  ]
}]`,
          axes: `[
  { orient: "left", label: "Sales ($)" },
  { orient: "bottom", label: "Month" }
]`,
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
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
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
        type={XYFrame}
        overrideProps={{
          lines: `[{ label: "Revenue", coordinates: salesData }]`,
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

      <CodeBlock
        code={`<XYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
  axes={[
    { orient: "left", label: "Primary Scale" },
    { orient: "right", label: "Secondary Scale" },
    { orient: "bottom", label: "Time" },
    { orient: "top" }
  ]}
  size={[600, 400]}
/>`}
        language="jsx"
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
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          axes: [
            { orient: "left", baseline: false, jaggedBase: true },
            { orient: "bottom" },
          ],
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[{ label: "Revenue", coordinates: salesData }]`,
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
        code={`<XYFrame
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

      <h3 id="ordinal-axes">Axes on OrdinalFrame</h3>
      <p>
        <code>OrdinalFrame</code> also supports the <code>axes</code> prop
        for its quantitative (r) axis. Category labels are controlled
        separately via the <code>oLabel</code> prop.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "revenue",
          type: "bar",
          style: { fill: "#6366f1", stroke: "white" },
          oLabel: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
          axes: [
            {
              orient: "left",
              label: "Revenue ($)",
              tickFormat: (d) => `$${(d / 1000).toFixed(0)}k`,
            },
          ],
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Q1", revenue: 24000 },
  { category: "Q2", revenue: 31000 },
  { category: "Q3", revenue: 28000 },
  { category: "Q4", revenue: 36000 }
]`,
          axes: `[{
  orient: "left",
  label: "Revenue ($)",
  tickFormat: d => \`$\${(d / 1000).toFixed(0)}k\`
}]`,
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
        code={`<XYFrame
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
        code={`<XYFrame
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

      <h3 id="explicit-tick-values">Explicit Tick Values</h3>
      <p>
        Use <code>tickValues</code> when you need exact control over which
        ticks appear:
      </p>

      <CodeBlock
        code={`<XYFrame
  axes={[
    {
      orient: "left",
      tickValues: [0, 2500, 5000, 7500, 10000],
      tickFormat: d => \`$\${d.toLocaleString()}\`
    },
    {
      orient: "bottom",
      tickValues: [1, 4, 7, 10],
      tickFormat: d => \`Q\${Math.ceil(d / 3)}\`
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
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying Frame
          for line, area, and point visualizations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the
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
