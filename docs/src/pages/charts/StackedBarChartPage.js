import React from "react"
import { OrdinalFrame } from "semiotic"
import { StackedBarChart } from "semiotic"

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
  { category: "Q1", product: "Widgets", value: 12000 },
  { category: "Q1", product: "Gadgets", value: 8000 },
  { category: "Q1", product: "Gizmos", value: 5000 },
  { category: "Q2", product: "Widgets", value: 15000 },
  { category: "Q2", product: "Gadgets", value: 11000 },
  { category: "Q2", product: "Gizmos", value: 7000 },
  { category: "Q3", product: "Widgets", value: 18000 },
  { category: "Q3", product: "Gadgets", value: 9000 },
  { category: "Q3", product: "Gizmos", value: 9500 },
  { category: "Q4", product: "Widgets", value: 22000 },
  { category: "Q4", product: "Gadgets", value: 14000 },
  { category: "Q4", product: "Gizmos", value: 11000 },
]

const regionData = [
  { category: "2022", region: "North America", value: 340 },
  { category: "2022", region: "Europe", value: 280 },
  { category: "2022", region: "Asia", value: 190 },
  { category: "2023", region: "North America", value: 380 },
  { category: "2023", region: "Europe", value: 310 },
  { category: "2023", region: "Asia", value: 260 },
  { category: "2024", region: "North America", value: 410 },
  { category: "2024", region: "Europe", value: 350 },
  { category: "2024", region: "Asia", value: 330 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const stackedBarChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category, subcategory, and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "stackBy", type: "string | function", required: true, default: null, description: "Field name or function to access subcategory values used for stacking." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation. Vertical bars grow upward; horizontal bars grow rightward." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: "stackBy value", description: "Field name or function to determine bar segment color. Defaults to stackBy." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "normalize", type: "boolean", required: false, default: "false", description: "Normalize to 100% (percentage stacked chart)." },
  { name: "barPadding", type: "number", required: false, default: "5", description: "Padding between bar groups in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on bar segments." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true", description: "Show a legend for stacked categories." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 120 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional OrdinalFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StackedBarChartPage() {
  return (
    <PageLayout
      title="StackedBarChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "StackedBarChart", path: "/charts/stacked-bar-chart" },
      ]}
      prevPage={{ title: "Bar Chart", path: "/charts/bar-chart" }}
      nextPage={{ title: "Swarm Plot", path: "/charts/swarm-plot" }}
    >
      <ComponentMeta
        componentName="StackedBarChart"
        importStatement='import { StackedBarChart } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "DotPlot", path: "/charts/dot-plot" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        StackedBarChart visualizes part-to-whole relationships by stacking
        subcategories within each category bar. Pass your data, specify a{" "}
        <code>stackBy</code> field, and get a publication-ready stacked bar chart
        with color-coded segments, legends, and hover interactions out of the box.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A stacked bar chart requires <code>data</code> and{" "}
        <code>stackBy</code> — the field that defines how bars are subdivided.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          stackBy: "product",
          valueAccessor: "value",
          categoryLabel: "Quarter",
          valueLabel: "Revenue ($)",
        }}
        type={StackedBarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Q1", product: "Widgets", value: 12000 },
  { category: "Q1", product: "Gadgets", value: 8000 },
  { category: "Q1", product: "Gizmos", value: 5000 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="horizontal-stacked">Horizontal Stacked</h3>
      <p>
        Set <code>orientation</code> to <code>"horizontal"</code> for
        horizontal stacked bars.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          stackBy: "product",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Quarter",
          valueLabel: "Revenue ($)",
        }}
        type={StackedBarChart}
        overrideProps={{
          data: "quarterlyData",
          orientation: '"horizontal"',
        }}
        hiddenProps={{}}
      />

      <h3 id="normalized">Normalized (100%) Stacked</h3>
      <p>
        Set <code>normalize</code> to <code>true</code> for a percentage-based
        stacked chart where each bar sums to 100%.
      </p>

      <LiveExample
        frameProps={{
          data: regionData,
          categoryAccessor: "category",
          stackBy: "region",
          valueAccessor: "value",
          normalize: true,
          categoryLabel: "Year",
          valueLabel: "Market Share",
        }}
        type={StackedBarChart}
        overrideProps={{
          data: `[
  { category: "2022", region: "North America", value: 340 },
  { category: "2022", region: "Europe", value: 280 },
  { category: "2022", region: "Asia", value: 190 },
  // ...more data points
]`,
          normalize: "true",
          stackBy: '"region"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-colors">Custom Color Scheme</h3>
      <p>
        Provide a <code>colorScheme</code> array to use your own palette.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          stackBy: "product",
          valueAccessor: "value",
          colorScheme: ["#6366f1", "#f59e0b", "#10b981"],
          categoryLabel: "Quarter",
          valueLabel: "Revenue ($)",
        }}
        type={StackedBarChart}
        overrideProps={{
          data: "quarterlyData",
          colorScheme: '["#6366f1", "#f59e0b", "#10b981"]',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StackedBarChart" props={stackedBarChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, mixed piece types,
        annotations — graduate to{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly. Every{" "}
        <code>StackedBarChart</code> is just a configured{" "}
        <code>OrdinalFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { StackedBarChart } from "semiotic"

<StackedBarChart
  data={quarterlyData}
  categoryAccessor="category"
  stackBy="product"
  valueAccessor="value"
  categoryLabel="Quarter"
  valueLabel="Revenue"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={quarterlyData}
  oAccessor="category"
  rAccessor="value"
  type="bar"
  pieceIDAccessor="product"
  style={d => ({
    fill: colorScale(d.product)
  })}
  oPadding={5}
  axes={[
    { orient: "left", label: "Revenue" },
    { orient: "bottom", label: "Quarter" }
  ]}
  hoverAnnotation={true}
  legend={{
    legendGroups: [{
      styleFn: d => ({ fill: d.color }),
      items: products.map(p => ({
        label: p, color: colorScale(p)
      }))
    }]
  }}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 70, right: 120 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on StackedBarChart lets you pass any
        OrdinalFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<StackedBarChart
  data={quarterlyData}
  stackBy="product"
  frameProps={{
    annotations: [
      { type: "or", category: "Q4", label: "Record quarter" }
    ],
    connectorStyle: { stroke: "#999" }
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
          <Link to="/charts/bar-chart">BarChart</Link> — simple bar chart
          without stacking
        </li>
        <li>
          <Link to="/charts/dot-plot">DotPlot</Link> — a minimal alternative
          for comparing values across categories
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
