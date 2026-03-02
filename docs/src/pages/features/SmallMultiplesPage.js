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
// Sample data for LinkedCharts
// ---------------------------------------------------------------------------

const linkedData = [
  { x: 10, y: 45, region: "North", income: 52 },
  { x: 20, y: 55, region: "North", income: 61 },
  { x: 30, y: 65, region: "South", income: 48 },
  { x: 40, y: 35, region: "South", income: 39 },
  { x: 50, y: 72, region: "East", income: 75 },
  { x: 60, y: 62, region: "East", income: 68 },
  { x: 70, y: 48, region: "West", income: 54 },
  { x: 80, y: 58, region: "West", income: 62 },
]

const barAgg = ["North", "South", "East", "West"].map((region) => ({
  category: region,
  total: linkedData.filter((d) => d.region === region).reduce((s, d) => s + d.income, 0),
  region,
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
      title="Small Multiples & Coordinated Views"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Small Multiples", path: "/features/small-multiples" },
      ]}
      prevPage={{ title: "Sparklines", path: "/features/sparklines" }}
      nextPage={{ title: "Styling", path: "/features/styling" }}
    >
      <p>
        Semiotic provides <strong>LinkedCharts</strong> for modern
        producer-consumer coordination between charts, enabling
        cross-highlighting, brushing-and-linking, and cross-filtering.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* LinkedCharts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="linked-charts">LinkedCharts (Recommended)</h2>

      <p>
        <code>LinkedCharts</code> uses React Context to enable cross-highlighting,
        brushing-and-linking, and cross-filtering between any chart components
        at any depth in the tree. Charts opt in via the <code>selection</code>,{" "}
        <code>linkedHover</code>, and <code>linkedBrush</code> props.
      </p>

      <h3 id="cross-highlighting">Cross-Highlighting</h3>
      <p>
        Hover over a point in one chart to highlight matching data in all
        linked charts:
      </p>

      <CodeBlock
        code={`import { LinkedCharts, Scatterplot, BarChart } from "semiotic"

<LinkedCharts>
  <Scatterplot
    data={data}
    xAccessor="x"
    yAccessor="y"
    colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }}
  />
  <BarChart
    data={barData}
    categoryAccessor="category"
    valueAccessor="total"
    colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }}
  />
</LinkedCharts>`}
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

      <h3 id="cross-filtering">Cross-Filtering Dashboard</h3>
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
      {/* Selection Props */}
      {/* ----------------------------------------------------------------- */}
      <h3 id="selection-props">Selection Props on Charts</h3>
      <p>
        All HOC chart components (Scatterplot, BarChart, LineChart, etc.)
        accept these coordination props when used inside{" "}
        <code>LinkedCharts</code>:
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

      {/* ----------------------------------------------------------------- */}
      {/* ScatterplotMatrix */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="scatterplot-matrix">ScatterplotMatrix</h2>

      <p>
        The <code>ScatterplotMatrix</code> (SPLOM) renders an N x N grid of
        scatterplots with built-in cross-filter brushing. Diagonal cells
        show histograms. Brushing one cell highlights matching points in
        all other cells.
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
          small multiple layouts
        </li>
      </ul>
    </PageLayout>
  )
}
