import React from "react"
import { OrdinalFrame } from "semiotic"
import { DonutChart } from "semiotic"

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
  { category: "Complete", value: 72 },
  { category: "In Progress", value: 18 },
  { category: "Not Started", value: 10 },
]

const budgetData = [
  { category: "Engineering", value: 450000 },
  { category: "Marketing", value: 280000 },
  { category: "Sales", value: 320000 },
  { category: "Operations", value: 180000 },
  { category: "HR", value: 120000 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const donutChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points, one per slice." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access slice labels." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access slice values." },
  { name: "innerRadius", type: "number", required: false, default: "60", description: "Inner radius in pixels. Controls the donut hole size." },
  { name: "centerContent", type: "ReactNode", required: false, default: null, description: "Content to render in the center of the donut (e.g., a total label)." },
  { name: "colorBy", type: "string | function", required: false, default: "categoryAccessor", description: "Field name or function to determine slice color." },
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

export default function DonutChartPage() {
  return (
    <PageLayout
      title="DonutChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Categorical", path: "/charts" },
        { label: "DonutChart", path: "/charts/donut-chart" },
      ]}
      prevPage={{ title: "Pie Chart", path: "/charts/pie-chart" }}
      nextPage={{ title: "Grouped Bar Chart", path: "/charts/grouped-bar-chart" }}
    >
      <ComponentMeta
        componentName="DonutChart"
        importStatement='import { DonutChart } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "PieChart", path: "/charts/pie-chart" },
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        DonutChart is a pie chart with a hole in the center. The{" "}
        <code>innerRadius</code> prop controls the hole size, and{" "}
        <code>centerContent</code> lets you place a label or value in the
        center. Like <Link to="/charts/pie-chart">PieChart</Link>, it wraps{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> with radial
        projection.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest donut chart requires just <code>data</code>. The default
        inner radius is 60 pixels.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorScheme: ["#22c55e", "#f59e0b", "#e2e4e8"],
        }}
        type={DonutChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Complete", value: 72 },
  { category: "In Progress", value: 18 },
  { category: "Not Started", value: 10 }
]`,
          colorScheme: '["#22c55e", "#f59e0b", "#e2e4e8"]',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="large-hole">Larger Inner Radius</h3>
      <p>
        Increase <code>innerRadius</code> for a thinner ring.
      </p>

      <LiveExample
        frameProps={{
          data: budgetData,
          categoryAccessor: "category",
          valueAccessor: "value",
          innerRadius: 100,
        }}
        type={DonutChart}
        overrideProps={{
          data: `[
  { category: "Engineering", value: 450000 },
  { category: "Marketing", value: 280000 },
  { category: "Sales", value: 320000 },
  { category: "Operations", value: 180000 },
  { category: "HR", value: 120000 }
]`,
          innerRadius: "100",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="DonutChart" props={donutChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For full control, use{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly with{" "}
        <code>projection="radial"</code> and{" "}
        <code>type={`{{ type: "bar", innerRadius: 60 }}`}</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { DonutChart } from "semiotic"

<DonutChart
  data={progressData}
  categoryAccessor="category"
  valueAccessor="value"
  innerRadius={80}
  centerContent={<span>72%</span>}
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={progressData}
  oAccessor="category"
  rAccessor="value"
  type={{ type: "bar", innerRadius: 80 }}
  projection="radial"
  style={d => ({ fill: colorScale(d.category) })}
  hoverAnnotation={true}
  size={[400, 400]}
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
          <Link to="/charts/pie-chart">PieChart</Link> — full circle without a
          center hole
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
