import React from "react"
import { OrdinalFrame } from "semiotic"
import { GroupedBarChart } from "semiotic"

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
  { category: "Q1", product: "Alpha", value: 120 },
  { category: "Q1", product: "Beta", value: 90 },
  { category: "Q1", product: "Gamma", value: 150 },
  { category: "Q2", product: "Alpha", value: 140 },
  { category: "Q2", product: "Beta", value: 110 },
  { category: "Q2", product: "Gamma", value: 130 },
  { category: "Q3", product: "Alpha", value: 160 },
  { category: "Q3", product: "Beta", value: 125 },
  { category: "Q3", product: "Gamma", value: 170 },
  { category: "Q4", product: "Alpha", value: 180 },
  { category: "Q4", product: "Beta", value: 140 },
  { category: "Q4", product: "Gamma", value: 190 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const groupedBarChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category, group, and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "groupBy", type: "string | function", required: true, default: null, description: "Field name or function to access group values. Each group becomes a side-by-side bar." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: "groupBy", description: "Field name or function to determine bar color. Defaults to groupBy." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "barPadding", type: "number", required: false, default: "5", description: "Padding between bar groups in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on bars." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true", description: "Show a legend for groups." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional OrdinalFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GroupedBarChartPage() {
  return (
    <PageLayout
      title="GroupedBarChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Categorical", path: "/charts" },
        { label: "GroupedBarChart", path: "/charts/grouped-bar-chart" },
      ]}
      prevPage={{ title: "Donut Chart", path: "/charts/donut-chart" }}
      nextPage={{ title: "Force Directed Graph", path: "/charts/force-directed-graph" }}
    >
      <ComponentMeta
        componentName="GroupedBarChart"
        importStatement='import { GroupedBarChart } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "StackedBarChart", path: "/charts/stacked-bar-chart" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        GroupedBarChart displays bars side by side within each category,
        making it easy to compare values across groups. It wraps{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> with{" "}
        <code>type="clusterbar"</code>. While{" "}
        <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> shows
        part-to-whole relationships, GroupedBarChart emphasizes direct
        comparison between groups.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Pass your data with a <code>groupBy</code> prop specifying which field
        creates side-by-side bars within each category.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          groupBy: "product",
          valueAccessor: "value",
          categoryLabel: "Quarter",
          valueLabel: "Units Sold",
        }}
        type={GroupedBarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Q1", product: "Alpha", value: 120 },
  { category: "Q1", product: "Beta", value: 90 },
  { category: "Q1", product: "Gamma", value: 150 },
  // ...more data points
]`,
          groupBy: '"product"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="horizontal">Horizontal Grouped Bars</h3>
      <p>
        Set <code>orientation="horizontal"</code> when category labels are
        long or you have many groups.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          groupBy: "product",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Quarter",
          valueLabel: "Units Sold",
        }}
        type={GroupedBarChart}
        overrideProps={{
          data: "sampleData",
          orientation: '"horizontal"',
          groupBy: '"product"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-colors">Custom Color Scheme</h3>
      <p>
        Pass a custom <code>colorScheme</code> array for brand colors.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          groupBy: "product",
          valueAccessor: "value",
          colorScheme: ["#6366f1", "#22c55e", "#f59e0b"],
          categoryLabel: "Quarter",
          valueLabel: "Units Sold",
        }}
        type={GroupedBarChart}
        overrideProps={{
          data: "sampleData",
          groupBy: '"product"',
          colorScheme: '["#6366f1", "#22c55e", "#f59e0b"]',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="GroupedBarChart" props={groupedBarChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For full control, use{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly with{" "}
        <code>type="clusterbar"</code> and <code>pieceIDAccessor</code>.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { GroupedBarChart } from "semiotic"

<GroupedBarChart
  data={quarterlyData}
  categoryAccessor="quarter"
  groupBy="product"
  valueAccessor="sales"
  categoryLabel="Quarter"
  valueLabel="Sales"
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
  oAccessor="quarter"
  rAccessor="sales"
  type="clusterbar"
  pieceIDAccessor="product"
  style={d => ({ fill: colorScale(d.product) })}
  axes={[{ orient: "left", label: "Sales" }]}
  hoverAnnotation={true}
  size={[600, 400]}
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
          <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> — for
          part-to-whole breakdowns instead of side-by-side comparison
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — for single-series
          categorical data
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the underlying
          Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
