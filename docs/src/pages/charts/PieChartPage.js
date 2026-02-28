import React from "react"
import { OrdinalFrame } from "semiotic"
import { PieChart } from "semiotic"

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
  { category: "Electronics", value: 340 },
  { category: "Clothing", value: 210 },
  { category: "Grocery", value: 450 },
  { category: "Furniture", value: 180 },
  { category: "Books", value: 120 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const pieChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, one per slice." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access slice labels." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access slice values." },
  { name: "colorBy", type: "string | function", required: false, default: "categoryAccessor", description: "Field name or function to determine slice color. Defaults to the category accessor." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "startAngle", type: "number", required: false, default: "0", description: "Starting angle offset in degrees." },
  { name: "slicePadding", type: "number", required: false, default: "2", description: "Padding between slices in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on slices." },
  { name: "showLegend", type: "boolean", required: false, default: "true", description: "Show a legend." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "400", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 20, bottom: 20, left: 20, right: 20 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional OrdinalFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PieChartPage() {
  return (
    <PageLayout
      title="PieChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Categorical", path: "/charts" },
        { label: "PieChart", path: "/charts/pie-chart" },
      ]}
      prevPage={{ title: "Dot Plot", path: "/charts/dot-plot" }}
      nextPage={{ title: "Donut Chart", path: "/charts/donut-chart" }}
    >
      <ComponentMeta
        componentName="PieChart"
        importStatement='import { PieChart } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "DonutChart", path: "/charts/donut-chart" },
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        PieChart visualizes proportions as slices of a circle. Each slice's
        arc size is proportional to its value relative to the total. It wraps{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> with radial
        projection, so all ordinal annotations and interactions work out of the
        box.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest pie chart requires just <code>data</code>. The defaults
        expect each object to have <code>category</code> and{" "}
        <code>value</code> fields. Each unique category becomes one slice.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
        }}
        type={PieChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Electronics", value: 340 },
  { category: "Clothing", value: 210 },
  { category: "Grocery", value: 450 },
  { category: "Furniture", value: 180 },
  { category: "Books", value: 120 }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="custom-colors">Custom Color Scheme</h3>
      <p>
        Pass a <code>colorScheme</code> array to use your own palette.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorScheme: ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"],
        }}
        type={PieChart}
        overrideProps={{
          data: "sampleData",
          colorScheme: '["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"]',
        }}
        hiddenProps={{}}
      />

      <h3 id="start-angle">Rotated Start Angle</h3>
      <p>
        Use <code>startAngle</code> to rotate the starting position of the
        first slice.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          startAngle: 90,
        }}
        type={PieChart}
        overrideProps={{
          data: "sampleData",
          startAngle: "90",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="PieChart" props={pieChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom annotations, label positioning,
        exploded slices — graduate to{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly. Every{" "}
        <code>PieChart</code> is just a configured <code>OrdinalFrame</code>{" "}
        with <code>projection="radial"</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { PieChart } from "semiotic"

<PieChart
  data={salesData}
  categoryAccessor="category"
  valueAccessor="value"
  colorScheme={["#6366f1", "#22c55e", "#f59e0b"]}
  showLegend
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={salesData}
  oAccessor="category"
  rAccessor="value"
  type="bar"
  projection="radial"
  style={d => ({ fill: colorScale(d.category) })}
  oPadding={2}
  hoverAnnotation={true}
  size={[400, 400]}
  margin={{ top: 20, bottom: 20, left: 20, right: 20 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/donut-chart">DonutChart</Link> — pie chart with a
          hole in the center, ideal for displaying a total or summary value
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — an alternative for
          comparing values across categories
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
