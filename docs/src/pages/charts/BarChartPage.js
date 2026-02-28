import React from "react"
import { OrdinalFrame } from "semiotic"
import { BarChart } from "semiotic"

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
  { category: "Electronics", value: 12400 },
  { category: "Clothing", value: 8700 },
  { category: "Grocery", value: 15300 },
  { category: "Furniture", value: 6200 },
  { category: "Toys", value: 4100 },
  { category: "Books", value: 3800 },
]

const colorData = [
  { category: "Electronics", value: 12400, region: "North" },
  { category: "Clothing", value: 8700, region: "South" },
  { category: "Grocery", value: 15300, region: "North" },
  { category: "Furniture", value: 6200, region: "East" },
  { category: "Toys", value: 4100, region: "South" },
  { category: "Books", value: 3800, region: "East" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const barChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Each point should have a category and value." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation. Vertical bars grow upward; horizontal bars grow rightward." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine bar color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "sort", type: "boolean | string | function", required: false, default: "false", description: 'Sort bars by value. Accepts true, "asc", "desc", or a custom comparator function.' },
  { name: "barPadding", type: "number", required: false, default: "5", description: "Padding between bars in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on bars." },
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

export default function BarChartPage() {
  return (
    <PageLayout
      title="BarChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "BarChart", path: "/charts/bar-chart" },
      ]}
      prevPage={{ title: "Heatmap", path: "/charts/heatmap" }}
      nextPage={{ title: "Stacked Bar Chart", path: "/charts/stacked-bar-chart" }}
    >
      <ComponentMeta
        componentName="BarChart"
        importStatement='import { BarChart } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "StackedBarChart", path: "/charts/stacked-bar-chart" },
          { name: "DotPlot", path: "/charts/dot-plot" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        BarChart visualizes categorical data using rectangular bars whose lengths
        are proportional to the values they represent. Pass your data, specify
        the category and value accessors, and get a publication-ready chart with
        hover interactions, axes, and optional sorting — all with sensible
        defaults.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest bar chart requires just <code>data</code>. The defaults
        expect each object to have <code>category</code> and{" "}
        <code>value</code> fields.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          categoryLabel: "Department",
          valueLabel: "Sales ($)",
        }}
        type={BarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Electronics", value: 12400 },
  { category: "Clothing", value: 8700 },
  { category: "Grocery", value: 15300 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="horizontal">Horizontal Bars</h3>
      <p>
        Set <code>orientation</code> to <code>"horizontal"</code> for horizontal
        bars. This works well when category labels are long.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Department",
          valueLabel: "Sales ($)",
        }}
        type={BarChart}
        overrideProps={{
          data: "sampleData",
          orientation: '"horizontal"',
        }}
        hiddenProps={{}}
      />

      <h3 id="sorted">Sorted Bars with Color</h3>
      <p>
        Use <code>sort</code> to order bars by value and <code>colorBy</code>{" "}
        to color them by a data field.
      </p>

      <LiveExample
        frameProps={{
          data: colorData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "region",
          sort: "desc",
          categoryLabel: "Department",
          valueLabel: "Sales ($)",
        }}
        type={BarChart}
        overrideProps={{
          data: `[
  { category: "Electronics", value: 12400, region: "North" },
  { category: "Clothing", value: 8700, region: "South" },
  // ...data with region field for coloring
]`,
          sort: '"desc"',
          colorBy: '"region"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-format">Custom Value Formatting</h3>
      <p>
        Pass a <code>valueFormat</code> function to control how value axis
        tick labels are displayed.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          valueFormat: (d) => `$${(d / 1000).toFixed(0)}k`,
          categoryLabel: "Department",
          valueLabel: "Sales",
          showGrid: true,
        }}
        type={BarChart}
        overrideProps={{
          data: "sampleData",
          valueFormat: 'd => `$${(d / 1000).toFixed(0)}k`',
          showGrid: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="BarChart" props={barChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        mixed piece types — graduate to{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly. Every{" "}
        <code>BarChart</code> is just a configured <code>OrdinalFrame</code>{" "}
        under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { BarChart } from "semiotic"

<BarChart
  data={salesData}
  categoryAccessor="category"
  valueAccessor="value"
  orientation="vertical"
  sort="desc"
  categoryLabel="Department"
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
  data={salesData}
  oAccessor="category"
  rAccessor="value"
  type="bar"
  projection="vertical"
  style={{ fill: "#6366f1" }}
  oPadding={5}
  axes={[
    { orient: "left", label: "Sales" },
    { orient: "bottom", label: "Department" }
  ]}
  hoverAnnotation={true}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 70, right: 40 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on BarChart lets you pass any
        OrdinalFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<BarChart
  data={salesData}
  categoryAccessor="category"
  valueAccessor="value"
  frameProps={{
    annotations: [
      { type: "or", category: "Grocery", label: "Top seller" }
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
          <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> — for
          part-to-whole breakdowns within categories
        </li>
        <li>
          <Link to="/charts/dot-plot">DotPlot</Link> — a minimal alternative for
          comparing single values across categories
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
