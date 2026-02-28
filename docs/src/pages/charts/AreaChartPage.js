import React from "react"
import { XYFrame } from "semiotic"
import { AreaChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
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
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional XYFrame props for advanced customization. Escape hatch to the full Frame API." },
]

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
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "StackedAreaChart", path: "/charts/stacked-area-chart" },
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "XYFrame", path: "/frames/xy-frame" },
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
        dual-axis layouts — graduate to <Link to="/frames/xy-frame">XYFrame</Link>{" "}
        directly. Every <code>AreaChart</code> is just a configured{" "}
        <code>XYFrame</code> under the hood.
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
            code={`import { XYFrame } from "semiotic"

<XYFrame
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
        The <code>frameProps</code> prop on AreaChart lets you pass any XYFrame
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
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying Frame with
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
