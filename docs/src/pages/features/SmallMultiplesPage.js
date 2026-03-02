import React from "react"
import {
  LinkedCharts,
  ScatterplotMatrix,
  Scatterplot,
  BarChart,
  LineChart,
} from "semiotic"
import { useFilteredData } from "semiotic"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data for LinkedCharts live example
// ---------------------------------------------------------------------------

const salesData = [
  { month: "Jan", revenue: 42, region: "North", spend: 18 },
  { month: "Feb", revenue: 51, region: "North", spend: 22 },
  { month: "Mar", revenue: 65, region: "South", spend: 28 },
  { month: "Apr", revenue: 38, region: "South", spend: 15 },
  { month: "May", revenue: 72, region: "East", spend: 35 },
  { month: "Jun", revenue: 60, region: "East", spend: 30 },
  { month: "Jul", revenue: 48, region: "West", spend: 20 },
  { month: "Aug", revenue: 55, region: "West", spend: 24 },
  { month: "Sep", revenue: 67, region: "North", spend: 31 },
  { month: "Oct", revenue: 58, region: "South", spend: 26 },
  { month: "Nov", revenue: 74, region: "East", spend: 38 },
  { month: "Dec", revenue: 63, region: "West", spend: 29 },
]

const regionTotals = ["North", "South", "East", "West"].map((region) => ({
  region,
  total: salesData
    .filter((d) => d.region === region)
    .reduce((s, d) => s + d.revenue, 0),
}))

// ---------------------------------------------------------------------------
// Sample data for ScatterplotMatrix
// ---------------------------------------------------------------------------

const splomData = Array.from({ length: 80 }, (_, i) => {
  const species = ["setosa", "versicolor", "virginica"][i % 3]
  const base = species === "setosa" ? 0 : species === "versicolor" ? 1 : 2
  return {
    sepalLength: 4.5 + base * 1.2 + Math.random() * 1.5,
    sepalWidth: 2.5 + (base === 0 ? 1 : 0) * 0.8 + Math.random() * 1,
    petalLength: 1 + base * 2 + Math.random() * 1.5,
    petalWidth: 0.2 + base * 0.7 + Math.random() * 0.5,
    species,
  }
})

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const linkedChartsProps = [
  {
    name: "selections",
    type: 'Record<string, { resolution?: "union" | "intersect" | "crossfilter" }>',
    required: false,
    default: "undefined",
    description:
      'Pre-configure named selections with a resolution mode. For cross-filtering dashboards, use { mySelection: { resolution: "crossfilter" } }.',
  },
]

const splomProps = [
  {
    name: "data",
    type: "TDatum[]",
    required: true,
    default: "-",
    description: "Array of data objects.",
  },
  {
    name: "fields",
    type: "string[]",
    required: true,
    default: "-",
    description: "Array of field names to include in the matrix.",
  },
  {
    name: "fieldLabels",
    type: "Record<string, string>",
    required: false,
    default: "{}",
    description: "Display labels for each field.",
  },
  {
    name: "colorBy",
    type: "string | function",
    required: false,
    default: "undefined",
    description: "Color encoding for points.",
  },
  {
    name: "cellSize",
    type: "number",
    required: false,
    default: "150",
    description: "Pixel size of each cell.",
  },
  {
    name: "diagonal",
    type: '"histogram" | "density" | "label"',
    required: false,
    default: '"histogram"',
    description: "What to render on diagonal cells.",
  },
  {
    name: "brushMode",
    type: '"crossfilter" | "intersect" | false',
    required: false,
    default: '"crossfilter"',
    description: "Brush interaction mode. Crossfilter excludes the brushing cell from its own filter.",
  },
  {
    name: "unselectedOpacity",
    type: "number",
    required: false,
    default: "0.1",
    description: "Opacity for non-matching points when a selection is active.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmallMultiplesPage() {
  return (
    <PageLayout
      title="Linked Charts"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Linked Charts", path: "/features/small-multiples" },
      ]}
      prevPage={{ title: "Sparklines", path: "/features/sparklines" }}
      nextPage={{ title: "Styling", path: "/features/styling" }}
    >
      <p>
        <strong>LinkedCharts</strong> is a React Context provider that enables
        cross-highlighting, brushing-and-linking, and cross-filtering between
        any Semiotic chart components at any depth in the tree. Charts opt in
        via the <code>selection</code>, <code>linkedHover</code>, and{" "}
        <code>linkedBrush</code> props.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Live example */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="example">Example</h2>

      <p>
        Hover over a point in the scatterplot to highlight the matching region
        in the bar chart, and vice versa:
      </p>

      <div style={{ marginBottom: 32 }}>
        <LinkedCharts>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <Scatterplot
              data={salesData}
              xAccessor="revenue"
              yAccessor="spend"
              colorBy="region"
              pointRadius={6}
              width={360}
              height={300}
              xLabel="Revenue"
              yLabel="Spend"
              linkedHover={{ name: "hl", fields: ["region"] }}
              selection={{ name: "hl" }}
            />
            <BarChart
              data={regionTotals}
              categoryAccessor="region"
              valueAccessor="total"
              colorBy="region"
              width={320}
              height={300}
              valueLabel="Total Revenue"
              linkedHover={{ name: "hl", fields: ["region"] }}
              selection={{ name: "hl" }}
            />
          </div>
        </LinkedCharts>
      </div>

      <CodeBlock
        code={`import { LinkedCharts, Scatterplot, BarChart } from "semiotic"

const salesData = [
  { month: "Jan", revenue: 42, region: "North", spend: 18 },
  { month: "Feb", revenue: 51, region: "North", spend: 22 },
  // ...
]

const regionTotals = ["North", "South", "East", "West"].map(region => ({
  region,
  total: salesData
    .filter(d => d.region === region)
    .reduce((s, d) => s + d.revenue, 0),
}))

<LinkedCharts>
  <Scatterplot
    data={salesData}
    xAccessor="revenue"
    yAccessor="spend"
    colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }}
  />
  <BarChart
    data={regionTotals}
    categoryAccessor="region"
    valueAccessor="total"
    colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }}
  />
</LinkedCharts>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* How it works */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="how-it-works">How It Works</h2>

      <p>
        <code>LinkedCharts</code> wraps your charts in a shared selection
        store. Each chart can <strong>produce</strong> selections (via{" "}
        <code>linkedHover</code> or <code>linkedBrush</code>) and{" "}
        <strong>consume</strong> them (via <code>selection</code>). When a
        selection is active, non-matching elements are dimmed.
      </p>

      <h3 id="selection-props">Selection Props on Charts</h3>
      <p>
        All HOC chart components accept these coordination props when used
        inside <code>LinkedCharts</code>:
      </p>

      <CodeBlock
        code={`// selection — consume a named selection (dims unmatched elements)
selection={{ name: "mySelection", unselectedOpacity: 0.2 }}

// linkedHover — produce hover-based selections
linkedHover={{ name: "hl", fields: ["category"] }}
linkedHover={true}          // shorthand: name="hover", auto-detect fields
linkedHover="myHoverName"   // shorthand: custom name, auto-detect fields

// linkedBrush — produce brush-based selections (Scatterplot, BubbleChart only)
linkedBrush={{ name: "brush", xField: "x", yField: "y" }}
linkedBrush="selectionName" // shorthand`}
        language="jsx"
      />

      <h3 id="brush-and-link">Brush-and-Link</h3>
      <p>
        Brush a region in one chart to filter data in another. Use the{" "}
        <code>useFilteredData</code> hook to access the filtered subset:
      </p>

      <CodeBlock
        code={`import { LinkedCharts, LineChart, Scatterplot, useFilteredData } from "semiotic"

function FilteredDetail({ data }) {
  const filtered = useFilteredData(data, "timeRange")
  return <Scatterplot data={filtered} xAccessor="x" yAccessor="y" />
}

<LinkedCharts>
  <LineChart
    data={data}
    xAccessor="date"
    yAccessor="value"
    linkedBrush={{ name: "timeRange", xField: "date" }}
  />
  <FilteredDetail data={data} />
</LinkedCharts>`}
        language="jsx"
      />

      <h3 id="cross-filtering">Cross-Filtering</h3>
      <p>
        With <code>resolution: "crossfilter"</code>, each chart's own brush is
        excluded from its filter — the standard SPLOM interaction model:
      </p>

      <CodeBlock
        code={`<LinkedCharts selections={{ dash: { resolution: "crossfilter" } }}>
  <Scatterplot
    data={data}
    xAccessor="age"
    yAccessor="income"
    linkedBrush={{ name: "dash", xField: "age", yField: "income" }}
    selection={{ name: "dash", unselectedOpacity: 0.05 }}
  />
  <BarChart
    data={data}
    categoryAccessor="region"
    valueAccessor="count"
    selection={{ name: "dash" }}
  />
</LinkedCharts>`}
        language="jsx"
      />

      <h3 id="linked-charts-props">LinkedCharts Props</h3>
      <PropTable
        componentName="LinkedCharts"
        props={linkedChartsProps}
      />

      {/* ----------------------------------------------------------------- */}
      {/* ScatterplotMatrix */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="scatterplot-matrix">ScatterplotMatrix</h2>

      <p>
        The <code>ScatterplotMatrix</code> (SPLOM) renders an N x N grid of
        scatterplots with built-in cross-filter brushing. Diagonal cells
        show histograms. Brushing one cell highlights matching points in
        all other cells. It uses <code>LinkedCharts</code> internally.
      </p>

      <div style={{ marginBottom: 32 }}>
        <ScatterplotMatrix
          data={splomData}
          fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
          fieldLabels={{
            sepalLength: "Sepal L",
            sepalWidth: "Sepal W",
            petalLength: "Petal L",
            petalWidth: "Petal W",
          }}
          colorBy="species"
          cellSize={140}
          diagonal="histogram"
          brushMode="crossfilter"
        />
      </div>

      <CodeBlock
        code={`import { ScatterplotMatrix } from "semiotic"

<ScatterplotMatrix
  data={iris}
  fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
  fieldLabels={{
    sepalLength: "Sepal L",
    sepalWidth: "Sepal W",
    petalLength: "Petal L",
    petalWidth: "Petal W",
  }}
  colorBy="species"
  cellSize={140}
  diagonal="histogram"
  brushMode="crossfilter"
/>`}
        language="jsx"
      />

      <h3 id="splom-props">ScatterplotMatrix Props</h3>
      <PropTable
        componentName="ScatterplotMatrix"
        props={splomProps}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Hooks */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="hooks">Selection Hooks</h2>
      <p>
        For custom coordinated views beyond the built-in chart props,
        Semiotic exports these hooks:
      </p>

      <CodeBlock
        code={`import {
  useSelection,      // low-level: full control over selection clauses
  useLinkedHover,    // convenience: hover-based cross-highlighting
  useBrushSelection, // convenience: brush-based cross-filtering
  useFilteredData,   // returns data filtered by a named selection
} from "semiotic"

// useSelection — full control
const { predicate, isActive, selectPoints, selectInterval, clear } =
  useSelection({ name: "mySelection" })

// useLinkedHover — hover convenience
const { onHover, predicate, isActive } =
  useLinkedHover({ name: "hover", fields: ["category"] })

// useBrushSelection — brush convenience
const { brushInteraction, predicate, isActive, clear } =
  useBrushSelection({ name: "brush", xField: "x", yField: "y" })

// useFilteredData — derived filtered array
const filtered = useFilteredData(data, "mySelection")`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — child frame type for
          lines, areas, and scatterplots
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — child frame
          type for bars, swarms, and distributions
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — child frame
          type for network diagrams
        </li>
        <li>
          <Link to="/features/sparklines">Sparklines</Link> — tiny inline
          charts as an alternative to full small multiples
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — adding legends to your
          coordinated chart layouts
        </li>
      </ul>
    </PageLayout>
  )
}
