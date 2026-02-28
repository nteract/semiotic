import React from "react"
import { OrdinalFrame } from "semiotic"
import { SwarmPlot } from "semiotic"

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
  { category: "Control", value: 23, trial: "A" },
  { category: "Control", value: 27, trial: "A" },
  { category: "Control", value: 21, trial: "B" },
  { category: "Control", value: 25, trial: "B" },
  { category: "Control", value: 29, trial: "A" },
  { category: "Control", value: 22, trial: "B" },
  { category: "Control", value: 26, trial: "A" },
  { category: "Control", value: 24, trial: "B" },
  { category: "Treatment", value: 35, trial: "A" },
  { category: "Treatment", value: 31, trial: "B" },
  { category: "Treatment", value: 38, trial: "A" },
  { category: "Treatment", value: 33, trial: "B" },
  { category: "Treatment", value: 36, trial: "A" },
  { category: "Treatment", value: 30, trial: "B" },
  { category: "Treatment", value: 34, trial: "A" },
  { category: "Treatment", value: 37, trial: "B" },
  { category: "Placebo", value: 24, trial: "A" },
  { category: "Placebo", value: 26, trial: "B" },
  { category: "Placebo", value: 22, trial: "A" },
  { category: "Placebo", value: 28, trial: "B" },
  { category: "Placebo", value: 25, trial: "A" },
  { category: "Placebo", value: 23, trial: "B" },
  { category: "Placebo", value: 27, trial: "A" },
  { category: "Placebo", value: 21, trial: "B" },
]

const sizedData = [
  { category: "Team A", value: 82, importance: 3 },
  { category: "Team A", value: 91, importance: 8 },
  { category: "Team A", value: 76, importance: 5 },
  { category: "Team A", value: 88, importance: 7 },
  { category: "Team A", value: 95, importance: 9 },
  { category: "Team B", value: 70, importance: 4 },
  { category: "Team B", value: 85, importance: 6 },
  { category: "Team B", value: 79, importance: 2 },
  { category: "Team B", value: 92, importance: 8 },
  { category: "Team B", value: 68, importance: 3 },
  { category: "Team C", value: 74, importance: 5 },
  { category: "Team C", value: 89, importance: 7 },
  { category: "Team C", value: 81, importance: 6 },
  { category: "Team C", value: 77, importance: 4 },
  { category: "Team C", value: 93, importance: 9 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const swarmPlotProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with category and value fields." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "sizeBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point size." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[3, 8]", description: "Min and max radius for points when using dynamic sizing." },
  { name: "pointRadius", type: "number", required: false, default: "4", description: "Default point radius when sizeBy is not specified." },
  { name: "pointOpacity", type: "number", required: false, default: "0.7", description: "Point opacity (0 to 1)." },
  { name: "categoryPadding", type: "number", required: false, default: "20", description: "Padding between categories in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on individual points." },
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

export default function SwarmPlotPage() {
  return (
    <PageLayout
      title="SwarmPlot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "SwarmPlot", path: "/charts/swarm-plot" },
      ]}
      prevPage={{ title: "Stacked Bar Chart", path: "/charts/stacked-bar-chart" }}
      nextPage={{ title: "Box Plot", path: "/charts/box-plot" }}
    >
      <ComponentMeta
        componentName="SwarmPlot"
        importStatement='import { SwarmPlot } from "semiotic"'
        tier="charts"
        wraps="OrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "BoxPlot", path: "/charts/box-plot" },
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        SwarmPlot (also known as a beeswarm plot) visualizes distributions by
        plotting individual data points as non-overlapping circles within each
        category. It is ideal for showing the shape of a distribution while
        preserving every data point, making patterns, clusters, and outliers
        easy to spot.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest swarm plot requires just <code>data</code>. Points are
        automatically spread to avoid overlap.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          categoryLabel: "Group",
          valueLabel: "Response",
        }}
        type={SwarmPlot}
        startHidden={false}
        overrideProps={{
          data: `[
  { category: "Control", value: 23 },
  { category: "Control", value: 27 },
  { category: "Treatment", value: 35 },
  // ...more data points per category
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-group">Color by Subgroup</h3>
      <p>
        Use <code>colorBy</code> to color points by a data field, revealing
        subgroup distributions within each category.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "trial",
          categoryLabel: "Group",
          valueLabel: "Response",
        }}
        type={SwarmPlot}
        overrideProps={{
          data: `[
  { category: "Control", value: 23, trial: "A" },
  { category: "Control", value: 27, trial: "A" },
  // ...data with trial field for coloring
]`,
          colorBy: '"trial"',
        }}
        hiddenProps={{}}
      />

      <h3 id="size-by-value">Dynamic Point Sizing</h3>
      <p>
        Use <code>sizeBy</code> to encode an additional variable in the point
        radius, and <code>sizeRange</code> to control the min/max sizes.
      </p>

      <LiveExample
        frameProps={{
          data: sizedData,
          categoryAccessor: "category",
          valueAccessor: "value",
          sizeBy: "importance",
          sizeRange: [3, 10],
          categoryLabel: "Team",
          valueLabel: "Score",
        }}
        type={SwarmPlot}
        overrideProps={{
          data: `[
  { category: "Team A", value: 82, importance: 3 },
  { category: "Team A", value: 91, importance: 8 },
  // ...data with importance field for sizing
]`,
          sizeBy: '"importance"',
          sizeRange: "[3, 10]",
        }}
        hiddenProps={{}}
      />

      <h3 id="horizontal-swarm">Horizontal Orientation</h3>
      <p>
        Set <code>orientation</code> to <code>"horizontal"</code> for a
        horizontal swarm layout.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Group",
          valueLabel: "Response",
        }}
        type={SwarmPlot}
        overrideProps={{
          data: "experimentData",
          orientation: '"horizontal"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="SwarmPlot" props={swarmPlotProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom point marks, mixed summary types,
        annotations — graduate to{" "}
        <Link to="/frames/ordinal-frame">OrdinalFrame</Link> directly. Every{" "}
        <code>SwarmPlot</code> is just a configured <code>OrdinalFrame</code>{" "}
        under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { SwarmPlot } from "semiotic"

<SwarmPlot
  data={experimentData}
  categoryAccessor="category"
  valueAccessor="value"
  colorBy="trial"
  pointRadius={5}
  categoryLabel="Group"
  valueLabel="Response"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { OrdinalFrame } from "semiotic"

<OrdinalFrame
  data={experimentData}
  oAccessor="category"
  rAccessor="value"
  type="swarm"
  style={d => ({
    fill: colorScale(d.trial),
    fillOpacity: 0.7,
    r: 5
  })}
  oPadding={20}
  axes={[
    { orient: "left", label: "Response" },
    { orient: "bottom", label: "Group" }
  ]}
  pieceHoverAnnotation={true}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 70, right: 40 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on SwarmPlot lets you pass any
        OrdinalFrame prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<SwarmPlot
  data={experimentData}
  categoryAccessor="category"
  valueAccessor="value"
  frameProps={{
    summaryType: "violin",
    summaryStyle: { fill: "#eee", stroke: "#999" },
    annotations: [
      { type: "or", category: "Treatment", label: "Significant" }
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
          <Link to="/charts/box-plot">BoxPlot</Link> — statistical summary with
          quartiles and whiskers
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
