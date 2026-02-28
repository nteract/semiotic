import React from "react"
import { XYFrame } from "semiotic"
import { Scatterplot } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const simpleData = [
  { height: 160, weight: 55 },
  { height: 165, weight: 62 },
  { height: 170, weight: 68 },
  { height: 158, weight: 50 },
  { height: 175, weight: 75 },
  { height: 180, weight: 82 },
  { height: 168, weight: 64 },
  { height: 172, weight: 70 },
  { height: 163, weight: 58 },
  { height: 178, weight: 78 },
  { height: 155, weight: 48 },
  { height: 185, weight: 88 },
  { height: 167, weight: 66 },
  { height: 174, weight: 72 },
  { height: 182, weight: 85 },
]

const categorizedData = [
  { height: 160, weight: 55, group: "A" },
  { height: 165, weight: 62, group: "A" },
  { height: 170, weight: 68, group: "A" },
  { height: 158, weight: 50, group: "A" },
  { height: 175, weight: 75, group: "A" },
  { height: 180, weight: 82, group: "B" },
  { height: 168, weight: 64, group: "B" },
  { height: 172, weight: 70, group: "B" },
  { height: 163, weight: 58, group: "B" },
  { height: 178, weight: 78, group: "B" },
  { height: 155, weight: 48, group: "C" },
  { height: 185, weight: 88, group: "C" },
  { height: 167, weight: 66, group: "C" },
  { height: 174, weight: 72, group: "C" },
  { height: 182, weight: 85, group: "C" },
]

const sizedData = [
  { height: 160, weight: 55, score: 72 },
  { height: 165, weight: 62, score: 85 },
  { height: 170, weight: 68, score: 90 },
  { height: 158, weight: 50, score: 60 },
  { height: 175, weight: 75, score: 95 },
  { height: 180, weight: 82, score: 88 },
  { height: 168, weight: 64, score: 78 },
  { height: 172, weight: 70, score: 82 },
  { height: 163, weight: 58, score: 68 },
  { height: 178, weight: 78, score: 92 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const scatterplotProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Each point should have x and y properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "sizeBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point size." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[3, 15]", description: "Min and max radius for points when sizeBy is specified." },
  { name: "pointRadius", type: "number", required: false, default: "5", description: "Default point radius when sizeBy is not specified." },
  { name: "pointOpacity", type: "number", required: false, default: "0.8", description: "Opacity of the points." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on data points." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x-axis." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Label for the y-axis." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional XYFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScatterplotPage() {
  return (
    <PageLayout
      title="Scatterplot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "Scatterplot", path: "/charts/scatterplot" },
      ]}
      prevPage={{ title: "Stacked Area Chart", path: "/charts/stacked-area-chart" }}
      nextPage={{ title: "Bubble Chart", path: "/charts/bubble-chart" }}
    >
      <ComponentMeta
        componentName="Scatterplot"
        importStatement='import { Scatterplot } from "semiotic"'
        tier="charts"
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "BubbleChart", path: "/charts/bubble-chart" },
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "XYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        Scatterplot visualizes relationships between two continuous variables by
        plotting individual data points on an x-y plane. Color and size encoding
        can reveal additional dimensions in the data. For size-encoded points
        with a third variable, see{" "}
        <Link to="/charts/bubble-chart">BubbleChart</Link>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest scatterplot requires just <code>data</code>,{" "}
        <code>xAccessor</code>, and <code>yAccessor</code>.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "height",
          yAccessor: "weight",
          xLabel: "Height (cm)",
          yLabel: "Weight (kg)",
        }}
        type={Scatterplot}
        startHidden={false}
        overrideProps={{
          data: `[
  { height: 160, weight: 55 },
  { height: 165, weight: 62 },
  { height: 170, weight: 68 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-category">Color by Category</h3>
      <p>
        Use <code>colorBy</code> to color points by a categorical field. A
        legend is automatically shown.
      </p>

      <LiveExample
        frameProps={{
          data: categorizedData,
          xAccessor: "height",
          yAccessor: "weight",
          colorBy: "group",
          xLabel: "Height (cm)",
          yLabel: "Weight (kg)",
        }}
        type={Scatterplot}
        overrideProps={{
          data: `[
  { height: 160, weight: 55, group: "A" },
  { height: 165, weight: 62, group: "A" },
  // ...data with group field for coloring
]`,
          colorBy: '"group"',
        }}
        hiddenProps={{}}
      />

      <h3 id="size-encoding">Size Encoding</h3>
      <p>
        Use <code>sizeBy</code> to map a third variable to point size, and{" "}
        <code>sizeRange</code> to control the min/max radius.
      </p>

      <LiveExample
        frameProps={{
          data: sizedData,
          xAccessor: "height",
          yAccessor: "weight",
          sizeBy: "score",
          sizeRange: [3, 12],
          pointOpacity: 0.6,
          xLabel: "Height (cm)",
          yLabel: "Weight (kg)",
        }}
        type={Scatterplot}
        overrideProps={{
          data: `[
  { height: 160, weight: 55, score: 72 },
  { height: 165, weight: 62, score: 85 },
  // ...data with score field for sizing
]`,
          sizeBy: '"score"',
          sizeRange: "[3, 12]",
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-styling">Custom Point Styling</h3>
      <p>
        Combine <code>pointRadius</code>, <code>pointOpacity</code>, and{" "}
        <code>showGrid</code> for a polished look.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "height",
          yAccessor: "weight",
          pointRadius: 7,
          pointOpacity: 0.5,
          showGrid: true,
          xLabel: "Height (cm)",
          yLabel: "Weight (kg)",
        }}
        type={Scatterplot}
        overrideProps={{
          data: "measurementData",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="Scatterplot" props={scatterplotProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        regression lines — graduate to <Link to="/frames/xy-frame">XYFrame</Link>{" "}
        directly. Every <code>Scatterplot</code> is just a configured{" "}
        <code>XYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { Scatterplot } from "semiotic"

<Scatterplot
  data={measurements}
  xAccessor="height"
  yAccessor="weight"
  colorBy="group"
  pointRadius={5}
  xLabel="Height (cm)"
  yLabel="Weight (kg)"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { XYFrame } from "semiotic"

<XYFrame
  points={measurements}
  xAccessor="height"
  yAccessor="weight"
  pointStyle={d => ({
    fill: colorScale(d.group),
    fillOpacity: 0.8,
    r: 5
  })}
  axes={[
    { orient: "left", label: "Weight (kg)" },
    { orient: "bottom", label: "Height (cm)" }
  ]}
  hoverAnnotation={true}
  customPointMark={({ d }) => (
    <circle r={d.r} strokeWidth={1} stroke="#fff" />
  )}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on Scatterplot lets you pass any XYFrame
        prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<Scatterplot
  data={measurements}
  xAccessor="height"
  yAccessor="weight"
  frameProps={{
    annotations: [
      { type: "enclose", coordinates: outliers, label: "Outliers" }
    ],
    customPointMark: ({ d }) => <circle r={d.r} strokeWidth={1} />
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
          <Link to="/charts/bubble-chart">BubbleChart</Link> — scatterplot with
          a required size dimension for three-variable visualization
        </li>
        <li>
          <Link to="/charts/heatmap">Heatmap</Link> — for dense point data,
          aggregate into color-encoded cells
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — connect points with
          lines to show trends
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying Frame with
          full control over every rendering detail
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> — adding callouts,
          highlights, and notes to any visualization
        </li>
      </ul>
    </PageLayout>
  )
}
