import React from "react"
import { StreamOrdinalFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const barData = [
  { department: "Engineering", employees: 42 },
  { department: "Sales", employees: 28 },
  { department: "Marketing", employees: 19 },
  { department: "Support", employees: 35 },
  { department: "Design", employees: 12 },
]

const stackedData = [
  { region: "North", product: "Widget", revenue: 12000 },
  { region: "North", product: "Gadget", revenue: 8000 },
  { region: "South", product: "Widget", revenue: 9000 },
  { region: "South", product: "Gadget", revenue: 11000 },
  { region: "East", product: "Widget", revenue: 7000 },
  { region: "East", product: "Gadget", revenue: 14000 },
]

const swarmData = Array.from({ length: 80 }, (_, i) => {
  const dept = ["Eng", "Sales", "Marketing", "Support"][i % 4]
  const base = dept === "Eng" ? 90 : dept === "Sales" ? 70 : dept === "Marketing" ? 60 : 80
  return { department: dept, score: base + (Math.random() - 0.5) * 40 }
})

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const ordinalFrameProps = [
  { name: "chartType", type: "string", required: true, default: null, description: '"bar", "clusterbar", "point", "swarm", "pie", "donut", "boxplot", "violin", "histogram", "ridgeline", "timeline".' },
  { name: "runtimeMode", type: '"bounded" | "streaming"', required: false, default: '"bounded"', description: "Whether data is static (bounded) or pushed via ref (streaming)." },
  { name: "data", type: "array", required: false, default: null, description: "Array of data objects." },
  { name: "size", type: "[number, number]", required: false, default: "[600, 400]", description: "Chart dimensions as [width, height]." },
  { name: "oAccessor", type: "string | function", required: false, default: '"category"', description: "Accessor for the ordinal (category) dimension." },
  { name: "rAccessor", type: "string | function | array", required: false, default: '"value"', description: "Accessor for the range (value) dimension. Array for multi-axis." },
  { name: "projection", type: '"vertical" | "horizontal" | "radial"', required: false, default: '"vertical"', description: "Chart projection direction." },
  { name: "stackBy", type: "string | function", required: false, default: null, description: "Stack pieces within each category by this field." },
  { name: "groupBy", type: "string | function", required: false, default: null, description: "Group pieces side-by-side within each category." },
  { name: "barPadding", type: "number", required: false, default: null, description: "Padding between category bands in pixels." },
  { name: "normalize", type: "boolean", required: false, default: "false", description: "Normalize stacked values to 100%." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show axes on the chart." },
  { name: "oLabel", type: "string", required: false, default: null, description: "Label for the ordinal axis." },
  { name: "rLabel", type: "string", required: false, default: null, description: "Label for the range axis." },
  { name: "pieceStyle", type: "function", required: false, default: null, description: "Style for bar/point marks. (datum, category) => Style." },
  { name: "summaryStyle", type: "function", required: false, default: null, description: "Style for summary marks (boxplot, violin). (datum, category) => Style." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover tooltips." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, right: 40, bottom: 60, left: 70 }", description: "Chart margins." },
  { name: "colorScheme", type: "string | string[]", required: false, default: null, description: "Color scheme for multi-series." },
  { name: "barColors", type: "object", required: false, default: null, description: "Category-to-color mapping." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrdinalFramePage() {
  return (
    <PageLayout
      title="StreamOrdinalFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "StreamOrdinalFrame", path: "/frames/ordinal-frame" },
      ]}
      prevPage={{ title: "StreamXYFrame", path: "/frames/xy-frame" }}
      nextPage={{ title: "StreamNetworkFrame", path: "/frames/network-frame" }}
    >
      <ComponentMeta
        componentName="StreamOrdinalFrame"
        importStatement='import { StreamOrdinalFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "SwarmPlot", path: "/charts/swarm-plot" },
          { name: "BoxPlot", path: "/charts/box-plot" },
        ]}
      />

      <p>
        StreamOrdinalFrame is the foundational frame for all categorical data
        visualization. It handles bar charts, stacked bars, cluster bars, swarm
        plots, pie/donut charts, boxplots, violins, histograms, and more. Use it
        directly when you need full control over styling and layout beyond what
        the simpler Chart components provide.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Provide <code>chartType</code>, <code>data</code>,{" "}
        <code>oAccessor</code> (category), and <code>rAccessor</code> (value).
      </p>

      <LiveExample
        frameProps={{
          chartType: "bar",
          data: barData,
          oAccessor: "department",
          rAccessor: "employees",
          showAxes: true,
          enableHover: true,
          pieceStyle: () => ({ fill: "#6366f1" }),
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          size: [500, 300],
        }}
        type={StreamOrdinalFrame}
        startHidden={false}
        overrideProps={{
          data: `[
  { department: "Engineering", employees: 42 },
  { department: "Sales", employees: 28 },
  { department: "Marketing", employees: 19 },
  { department: "Support", employees: 35 },
  { department: "Design", employees: 12 },
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="stacked-bar">Stacked Bar Chart</h3>
      <p>
        Use <code>stackBy</code> to stack pieces within each category.
        Use <code>barColors</code> to map stack groups to colors.
      </p>

      <LiveExample
        frameProps={{
          chartType: "bar",
          data: stackedData,
          oAccessor: "region",
          rAccessor: "revenue",
          stackBy: "product",
          barColors: { Widget: "#6366f1", Gadget: "#f59e0b" },
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          size: [500, 300],
        }}
        type={StreamOrdinalFrame}
        overrideProps={{
          data: `[
  { region: "North", product: "Widget", revenue: 12000 },
  { region: "North", product: "Gadget", revenue: 8000 },
  // ...
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="swarm-plot">Swarm Plot</h3>
      <p>
        Use <code>chartType="swarm"</code> to display individual data points
        within categories. Points are jittered to avoid overlap.
      </p>

      <LiveExample
        frameProps={{
          chartType: "swarm",
          data: swarmData,
          oAccessor: "department",
          rAccessor: "score",
          pieceStyle: () => ({ fill: "#10b981", opacity: 0.7, r: 4 }),
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 60, left: 70, right: 20 },
          size: [500, 300],
        }}
        type={StreamOrdinalFrame}
        overrideProps={{
          data: `Array.from({ length: 80 }, (_, i) => ({
  department: ["Eng", "Sales", "Marketing", "Support"][i % 4],
  score: base + (Math.random() - 0.5) * 40
}))`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StreamOrdinalFrame" props={ordinalFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> -- simplified Chart
          component for bar visualizations
        </li>
        <li>
          <Link to="/charts/swarm-plot">SwarmPlot</Link> -- simplified Chart
          component for swarm/beeswarm plots
        </li>
        <li>
          <Link to="/charts/box-plot">BoxPlot</Link> -- statistical boxplots
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> -- for continuous
          x/y data (line, area, scatter)
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> -- for
          topological data (force layouts, hierarchies)
        </li>
      </ul>
    </PageLayout>
  )
}
