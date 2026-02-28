import React from "react"
import { OrdinalFrame } from "semiotic"
import { BoxPlot } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleData = [
  { category: "Morning", value: 62 },
  { category: "Morning", value: 58 },
  { category: "Morning", value: 71 },
  { category: "Morning", value: 66 },
  { category: "Morning", value: 55 },
  { category: "Morning", value: 73 },
  { category: "Morning", value: 60 },
  { category: "Morning", value: 68 },
  { category: "Afternoon", value: 78 },
  { category: "Afternoon", value: 85 },
  { category: "Afternoon", value: 72 },
  { category: "Afternoon", value: 90 },
  { category: "Afternoon", value: 81 },
  { category: "Afternoon", value: 76 },
  { category: "Afternoon", value: 88 },
  { category: "Afternoon", value: 83 },
  { category: "Evening", value: 45 },
  { category: "Evening", value: 52 },
  { category: "Evening", value: 48 },
  { category: "Evening", value: 39 },
  { category: "Evening", value: 55 },
  { category: "Evening", value: 42 },
  { category: "Evening", value: 50 },
  { category: "Evening", value: 46 },
]

const colorData = [
  { category: "Region A", value: 120, zone: "Urban" },
  { category: "Region A", value: 135, zone: "Urban" },
  { category: "Region A", value: 110, zone: "Urban" },
  { category: "Region A", value: 145, zone: "Urban" },
  { category: "Region A", value: 128, zone: "Urban" },
  { category: "Region A", value: 115, zone: "Urban" },
  { category: "Region B", value: 90, zone: "Suburban" },
  { category: "Region B", value: 105, zone: "Suburban" },
  { category: "Region B", value: 85, zone: "Suburban" },
  { category: "Region B", value: 98, zone: "Suburban" },
  { category: "Region B", value: 112, zone: "Suburban" },
  { category: "Region B", value: 95, zone: "Suburban" },
  { category: "Region C", value: 65, zone: "Rural" },
  { category: "Region C", value: 72, zone: "Rural" },
  { category: "Region C", value: 58, zone: "Rural" },
  { category: "Region C", value: 80, zone: "Rural" },
  { category: "Region C", value: 68, zone: "Rural" },
  { category: "Region C", value: 75, zone: "Rural" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const boxPlotProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Multiple points per category are used to compute quartiles." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine box color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "showOutliers", type: "boolean", required: false, default: "true", description: "Show outlier points beyond the whiskers." },
  { name: "outlierRadius", type: "number", required: false, default: "3", description: "Radius for outlier points." },
  { name: "categoryPadding", type: "number", required: false, default: "20", description: "Padding between categories in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations showing quartile statistics." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy set)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional OrdinalFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BoxPlotPage() {
  return (
    <PageLayout
      title="BoxPlot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "BoxPlot", path: "/charts/box-plot" },
      ]}
      prevPage={{ title: "Swarm Plot", path: "/charts/swarm-plot" }}
      nextPage={{ title: "Dot Plot", path: "/charts/dot-plot" }}
    >
      <ComponentMeta
        componentName="BoxPlot"
        importStatement='import { BoxPlot } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "SwarmPlot", path: "/charts/swarm-plot" },
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        BoxPlot visualizes statistical distributions using box-and-whisker
        diagrams. Each box shows the median, first and third quartiles, and
        whiskers extending to the min and max values. Pass raw data points and
        the component computes the statistics automatically, with hover
        interactions that reveal quartile details.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A box plot requires just <code>data</code> — provide multiple data
        points per category and the component computes quartiles automatically.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={BoxPlot}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Morning", value: 62 },
  { category: "Morning", value: 58 },
  { category: "Morning", value: 71 },
  // ...multiple points per category
  { category: "Afternoon", value: 78 },
  { category: "Afternoon", value: 85 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="horizontal-boxplot">Horizontal Box Plot</h3>
      <p>
        Set <code>orientation</code> to <code>"horizontal"</code> for
        horizontal box-and-whisker diagrams.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={BoxPlot}
        overrideProps={{
          data: "responseTimeData",
          orientation: '"horizontal"',
        }}
        hiddenProps={{}}
      />

      <h3 id="colored-boxplot">Colored by Category</h3>
      <p>
        Use <code>colorBy</code> to give each box a distinct color based on a
        data field.
      </p>

      <LiveExample
        frameProps={{
          data: colorData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "zone",
          categoryLabel: "Region",
          valueLabel: "Latency (ms)",
        }}
        type={BoxPlot}
        overrideProps={{
          data: `[
  { category: "Region A", value: 120, zone: "Urban" },
  { category: "Region A", value: 135, zone: "Urban" },
  // ...data with zone field for coloring
]`,
          colorBy: '"zone"',
        }}
        hiddenProps={{}}
      />

      <h3 id="no-outliers">Without Outliers</h3>
      <p>
        Set <code>showOutliers</code> to <code>false</code> to hide outlier
        points beyond the whiskers.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          showOutliers: false,
          showGrid: true,
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={BoxPlot}
        overrideProps={{
          data: "responseTimeData",
          showOutliers: "false",
          showGrid: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="BoxPlot" props={boxPlotProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom summary rendering, overlaid swarm
        points, annotations — graduate to{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly. Every{" "}
        <code>BoxPlot</code> is just a configured <code>OrdinalFrame</code>{" "}
        under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { BoxPlot } from "semiotic"

<BoxPlot
  data={responseTimeData}
  categoryAccessor="category"
  valueAccessor="value"
  showOutliers={true}
  categoryLabel="Time of Day"
  valueLabel="Response Time (ms)"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={responseTimeData}
  oAccessor="category"
  rAccessor="value"
  summaryType={{
    type: "boxplot",
    outliers: true
  }}
  summaryStyle={d => ({
    fill: "#6366f1",
    stroke: "#6366f1",
    fillOpacity: 0.8
  })}
  oPadding={20}
  axes={[
    { orient: "left", label: "Response Time (ms)" },
    { orient: "bottom", label: "Time of Day" }
  ]}
  summaryHoverAnnotation={true}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 70, right: 40 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on BoxPlot lets you pass any
        OrdinalFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<BoxPlot
  data={responseTimeData}
  categoryAccessor="category"
  valueAccessor="value"
  frameProps={{
    // Overlay individual points on the box plot
    type: "swarm",
    style: { fill: "#333", r: 2, fillOpacity: 0.4 },
    annotations: [
      { type: "or", category: "Afternoon", label: "Peak hours" }
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
          <Link to="/charts/swarm-plot">SwarmPlot</Link> — show every individual
          data point as non-overlapping circles
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — for aggregated category
          comparisons
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          Frame with full control over every rendering detail
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
