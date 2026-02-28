import React from "react"
import { XYFrame } from "semiotic"
import { StackedAreaChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const stackedData = [
  { quarter: 1, revenue: 12000, region: "North" },
  { quarter: 2, revenue: 15000, region: "North" },
  { quarter: 3, revenue: 18000, region: "North" },
  { quarter: 4, revenue: 22000, region: "North" },
  { quarter: 1, revenue: 8000, region: "South" },
  { quarter: 2, revenue: 11000, region: "South" },
  { quarter: 3, revenue: 14000, region: "South" },
  { quarter: 4, revenue: 16000, region: "South" },
  { quarter: 1, revenue: 5000, region: "East" },
  { quarter: 2, revenue: 7000, region: "East" },
  { quarter: 3, revenue: 9000, region: "East" },
  { quarter: 4, revenue: 13000, region: "East" },
  { quarter: 1, revenue: 3000, region: "West" },
  { quarter: 2, revenue: 4500, region: "West" },
  { quarter: 3, revenue: 6000, region: "West" },
  { quarter: 4, revenue: 8500, region: "West" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const stackedAreaChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, grouped by category." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "areaBy", type: "string | function", required: false, default: null, description: "Field name or function to group data into multiple stacked areas (e.g., by series)." },
  { name: "lineDataAccessor", type: "string", required: false, default: '"coordinates"', description: "Field name in area objects that contains coordinate arrays." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine area color for each stack." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "curve", type: "string", required: false, default: '"monotoneX"', description: 'Curve interpolation: "linear", "monotoneX", "monotoneY", "step", "basis", "cardinal", "catmullRom".' },
  { name: "areaOpacity", type: "number", required: false, default: "0.7", description: "Opacity of the filled areas." },
  { name: "showLine", type: "boolean", required: false, default: "true", description: "Show a line on top of each stacked area." },
  { name: "lineWidth", type: "number", required: false, default: "2", description: "Stroke width of the line when showLine is true." },
  { name: "normalize", type: "boolean", required: false, default: "false", description: "Normalize to 100% stacked (proportional) areas." },
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

export default function StackedAreaChartPage() {
  return (
    <PageLayout
      title="StackedAreaChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "StackedAreaChart", path: "/charts/stacked-area-chart" },
      ]}
      prevPage={{ title: "Area Chart", path: "/charts/area-chart" }}
      nextPage={{ title: "Scatterplot", path: "/charts/scatterplot" }}
    >
      <ComponentMeta
        componentName="StackedAreaChart"
        importStatement='import { StackedAreaChart } from "semiotic"'
        tier="charts"
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "XYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        StackedAreaChart visualizes quantities stacked on top of each other over
        continuous intervals. Each series is stacked so that the total height
        represents the sum of all series, making it easy to compare both
        individual contributions and the overall total. Use{" "}
        <code>normalize</code> for 100% stacked (proportional) areas. For
        overlapping (non-stacked) areas, use{" "}
        <Link to="/charts/area-chart">AreaChart</Link>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A stacked area chart requires <code>data</code>,{" "}
        <code>xAccessor</code>, <code>yAccessor</code>, and{" "}
        <code>areaBy</code> to group data into stacks.
      </p>

      <LiveExample
        frameProps={{
          data: stackedData,
          xAccessor: "quarter",
          yAccessor: "revenue",
          areaBy: "region",
          colorBy: "region",
          xLabel: "Quarter",
          yLabel: "Revenue ($)",
        }}
        type={StackedAreaChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { quarter: 1, revenue: 12000, region: "North" },
  { quarter: 2, revenue: 15000, region: "North" },
  { quarter: 1, revenue: 8000, region: "South" },
  // ...more data points grouped by region
]`,
          areaBy: '"region"',
          colorBy: '"region"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="normalized">Normalized (100% Stacked)</h3>
      <p>
        Set <code>normalize</code> to <code>true</code> to show proportional
        contributions. The y-axis will range from 0 to 1 (or 0% to 100%).
      </p>

      <LiveExample
        frameProps={{
          data: stackedData,
          xAccessor: "quarter",
          yAccessor: "revenue",
          areaBy: "region",
          colorBy: "region",
          normalize: true,
          xLabel: "Quarter",
          yLabel: "Share",
        }}
        type={StackedAreaChart}
        overrideProps={{
          data: `[
  { quarter: 1, revenue: 12000, region: "North" },
  // ...data grouped by region
]`,
          areaBy: '"region"',
          colorBy: '"region"',
          normalize: "true",
        }}
        hiddenProps={{}}
      />

      <h3 id="step-curve">Step Interpolation</h3>
      <p>
        Use <code>curve="step"</code> for a stepped appearance, useful for
        data that changes at discrete intervals.
      </p>

      <LiveExample
        frameProps={{
          data: stackedData,
          xAccessor: "quarter",
          yAccessor: "revenue",
          areaBy: "region",
          colorBy: "region",
          curve: "step",
          xLabel: "Quarter",
          yLabel: "Revenue ($)",
        }}
        type={StackedAreaChart}
        overrideProps={{
          data: "regionalData",
          areaBy: '"region"',
          colorBy: '"region"',
          curve: '"step"',
        }}
        hiddenProps={{}}
      />

      <h3 id="no-line-border">Without Line Borders</h3>
      <p>
        Set <code>showLine</code> to <code>false</code> to remove the stroke
        between stacked areas for a smoother appearance.
      </p>

      <LiveExample
        frameProps={{
          data: stackedData,
          xAccessor: "quarter",
          yAccessor: "revenue",
          areaBy: "region",
          colorBy: "region",
          showLine: false,
          areaOpacity: 0.85,
          xLabel: "Quarter",
          yLabel: "Revenue ($)",
        }}
        type={StackedAreaChart}
        overrideProps={{
          data: "regionalData",
          areaBy: '"region"',
          colorBy: '"region"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StackedAreaChart" props={stackedAreaChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        dual-axis layouts — graduate to <Link to="/frames/xy-frame">XYFrame</Link>{" "}
        directly. Every <code>StackedAreaChart</code> is just a configured{" "}
        <code>XYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { StackedAreaChart } from "semiotic"

<StackedAreaChart
  data={regionalData}
  xAccessor="quarter"
  yAccessor="revenue"
  areaBy="region"
  colorBy="region"
  normalize={true}
  xLabel="Quarter"
  yLabel="Share"
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
    { region: "North", coordinates: northData },
    { region: "South", coordinates: southData }
  ]}
  xAccessor="quarter"
  yAccessor="revenue"
  lineDataAccessor="coordinates"
  lineType={{
    type: "stackedpercent-area",
    interpolator: curveMonotoneX
  }}
  lineStyle={d => ({
    fill: colorScale(d.region),
    fillOpacity: 0.7,
    stroke: colorScale(d.region),
    strokeWidth: 2
  })}
  axes={[
    { orient: "left", label: "Share" },
    { orient: "bottom", label: "Quarter" }
  ]}
  hoverAnnotation={true}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on StackedAreaChart lets you pass any
        XYFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<StackedAreaChart
  data={regionalData}
  xAccessor="quarter"
  yAccessor="revenue"
  areaBy="region"
  colorBy="region"
  frameProps={{
    annotations: [
      { type: "x", quarter: 3, label: "Q3 Peak" }
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
          <Link to="/charts/area-chart">AreaChart</Link> — overlapping
          (non-stacked) filled areas
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — lines without
          fill for trend comparison
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
