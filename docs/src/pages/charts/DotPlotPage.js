import React from "react"
import { OrdinalFrame } from "semiotic"
import { DotPlot } from "semiotic"

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
  { category: "Norway", value: 82.4 },
  { category: "Switzerland", value: 81.9 },
  { category: "Australia", value: 80.5 },
  { category: "Germany", value: 78.7 },
  { category: "Canada", value: 77.2 },
  { category: "United States", value: 73.4 },
  { category: "Japan", value: 72.1 },
  { category: "Brazil", value: 65.8 },
]

const colorData = [
  { category: "Norway", value: 82.4, continent: "Europe" },
  { category: "Switzerland", value: 81.9, continent: "Europe" },
  { category: "Australia", value: 80.5, continent: "Oceania" },
  { category: "Germany", value: 78.7, continent: "Europe" },
  { category: "Canada", value: 77.2, continent: "Americas" },
  { category: "United States", value: 73.4, continent: "Americas" },
  { category: "Japan", value: 72.1, continent: "Asia" },
  { category: "Brazil", value: 65.8, continent: "Americas" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const dotPlotProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"horizontal"', description: "Chart orientation. Defaults to horizontal, which is typical for dot plots." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine dot color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "sort", type: "boolean | string | function", required: false, default: "true", description: 'Sort categories by value. Accepts true, "asc", "desc", or a custom comparator function. Defaults to true (descending).' },
  { name: "dotRadius", type: "number", required: false, default: "5", description: "Radius of the dots." },
  { name: "categoryPadding", type: "number", required: false, default: "10", description: "Padding between categories in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on dots." },
  { name: "showGrid", type: "boolean", required: false, default: "true", description: "Show background grid lines. Defaults to true for dot plots." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy set)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 120, right: 40 }", description: "Margin around the chart area. Left margin is larger to accommodate category labels." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional OrdinalFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DotPlotPage() {
  return (
    <PageLayout
      title="DotPlot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "DotPlot", path: "/charts/dot-plot" },
      ]}
      prevPage={{ title: "Box Plot", path: "/charts/box-plot" }}
      nextPage={{ title: "Force-Directed Graph", path: "/charts/force-directed-graph" }}
    >
      <ComponentMeta
        componentName="DotPlot"
        importStatement='import { DotPlot } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "SwarmPlot", path: "/charts/swarm-plot" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        DotPlot (also known as a Cleveland dot plot) visualizes categorical data
        by placing a single dot along a value axis for each category. It is an
        effective, minimal alternative to bar charts when the goal is precise
        comparison of values. Categories are sorted by value by default,
        making rank easy to read at a glance.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest dot plot requires just <code>data</code>. Categories are
        sorted by value automatically with a horizontal layout.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          categoryLabel: "Country",
          valueLabel: "Quality of Life Index",
        }}
        type={DotPlot}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Norway", value: 82.4 },
  { category: "Switzerland", value: 81.9 },
  { category: "Australia", value: 80.5 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-group">Colored by Group</h3>
      <p>
        Use <code>colorBy</code> to color dots by a categorical field, such as
        continent or region.
      </p>

      <LiveExample
        frameProps={{
          data: colorData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "continent",
          categoryLabel: "Country",
          valueLabel: "Quality of Life Index",
        }}
        type={DotPlot}
        overrideProps={{
          data: `[
  { category: "Norway", value: 82.4, continent: "Europe" },
  { category: "Switzerland", value: 81.9, continent: "Europe" },
  // ...data with continent field for coloring
]`,
          colorBy: '"continent"',
        }}
        hiddenProps={{}}
      />

      <h3 id="vertical-dot-plot">Vertical Orientation</h3>
      <p>
        Set <code>orientation</code> to <code>"vertical"</code> and{" "}
        <code>sort</code> to <code>"asc"</code> for a vertical layout with
        ascending order.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          orientation: "vertical",
          sort: "asc",
          dotRadius: 7,
          valueLabel: "Quality of Life Index",
        }}
        type={DotPlot}
        overrideProps={{
          data: "countryData",
          orientation: '"vertical"',
          sort: '"asc"',
          dotRadius: "7",
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-styling">Custom Radius and No Sorting</h3>
      <p>
        Increase <code>dotRadius</code> for larger dots and set{" "}
        <code>sort</code> to <code>false</code> to preserve the original data
        order.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          sort: false,
          dotRadius: 8,
          showGrid: true,
          categoryLabel: "Country",
          valueLabel: "Quality of Life Index",
        }}
        type={DotPlot}
        overrideProps={{
          data: "countryData",
          sort: "false",
          dotRadius: "8",
          showGrid: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="DotPlot" props={dotPlotProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, range lines, annotations —
        graduate to <Link to="/frames/ordinal-frame">OrdinalFrame</Link>{" "}
        directly. Every <code>DotPlot</code> is just a configured{" "}
        <code>OrdinalFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { DotPlot } from "semiotic"

<DotPlot
  data={countryData}
  categoryAccessor="category"
  valueAccessor="value"
  colorBy="continent"
  dotRadius={6}
  categoryLabel="Country"
  valueLabel="Quality of Life"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={countryData}
  oAccessor="category"
  rAccessor="value"
  type="point"
  projection="horizontal"
  style={d => ({
    fill: colorScale(d.continent),
    r: 6,
    fillOpacity: 0.8
  })}
  oPadding={10}
  axes={[
    { orient: "left" },
    { orient: "bottom", label: "Quality of Life" }
  ]}
  pieceHoverAnnotation={true}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 120, right: 40 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on DotPlot lets you pass any
        OrdinalFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<DotPlot
  data={countryData}
  categoryAccessor="category"
  valueAccessor="value"
  frameProps={{
    annotations: [
      { type: "or", category: "Norway", label: "Highest" }
    ],
    connectorStyle: { stroke: "#ccc" },
    connectorType: { type: "line" }
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
          <Link to="/charts/bar-chart">BarChart</Link> — use bars instead of
          dots for category comparisons
        </li>
        <li>
          <Link to="/charts/swarm-plot">SwarmPlot</Link> — for distributions
          with multiple points per category
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
