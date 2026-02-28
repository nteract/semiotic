import React from "react"
import { XYFrame } from "semiotic"
import { BubbleChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const countryData = [
  { gdp: 12000, lifeExpectancy: 72, population: 45, country: "Brazil" },
  { gdp: 42000, lifeExpectancy: 79, population: 33, country: "Canada" },
  { gdp: 8500, lifeExpectancy: 76, population: 140, country: "China" },
  { gdp: 38000, lifeExpectancy: 82, population: 67, country: "France" },
  { gdp: 44000, lifeExpectancy: 81, population: 83, country: "Germany" },
  { gdp: 2000, lifeExpectancy: 69, population: 138, country: "India" },
  { gdp: 34000, lifeExpectancy: 84, population: 126, country: "Japan" },
  { gdp: 9800, lifeExpectancy: 73, population: 130, country: "Mexico" },
  { gdp: 10000, lifeExpectancy: 72, population: 146, country: "Russia" },
  { gdp: 60000, lifeExpectancy: 78, population: 33, country: "USA" },
]

const categorizedData = [
  { gdp: 12000, lifeExpectancy: 72, population: 45, continent: "Americas" },
  { gdp: 42000, lifeExpectancy: 79, population: 33, continent: "Americas" },
  { gdp: 60000, lifeExpectancy: 78, population: 33, continent: "Americas" },
  { gdp: 9800, lifeExpectancy: 73, population: 130, continent: "Americas" },
  { gdp: 38000, lifeExpectancy: 82, population: 67, continent: "Europe" },
  { gdp: 44000, lifeExpectancy: 81, population: 83, continent: "Europe" },
  { gdp: 10000, lifeExpectancy: 72, population: 146, continent: "Europe" },
  { gdp: 8500, lifeExpectancy: 76, population: 140, continent: "Asia" },
  { gdp: 2000, lifeExpectancy: 69, population: 138, continent: "Asia" },
  { gdp: 34000, lifeExpectancy: 84, population: 126, continent: "Asia" },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const bubbleChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Each point should have x, y, and size properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "sizeBy", type: "string | function", required: true, default: null, description: "Field name or function to determine bubble size. This is required for bubble charts." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[5, 40]", description: "Min and max radius for bubbles." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine bubble color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "bubbleOpacity", type: "number", required: false, default: "0.6", description: "Opacity of the bubbles." },
  { name: "bubbleStrokeWidth", type: "number", required: false, default: "1", description: "Stroke width of bubble borders." },
  { name: "bubbleStrokeColor", type: "string", required: false, default: '"white"', description: "Stroke color of bubble borders." },
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

export default function BubbleChartPage() {
  return (
    <PageLayout
      title="BubbleChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "BubbleChart", path: "/charts/bubble-chart" },
      ]}
      prevPage={{ title: "Scatterplot", path: "/charts/scatterplot" }}
      nextPage={{ title: "Heatmap", path: "/charts/heatmap" }}
    >
      <ComponentMeta
        componentName="BubbleChart"
        importStatement='import { BubbleChart } from "semiotic"'
        tier="charts"
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Scatterplot", path: "/charts/scatterplot" },
          { name: "Heatmap", path: "/charts/heatmap" },
          { name: "XYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        BubbleChart visualizes three dimensions of data using x position, y
        position, and bubble size. It is perfect for showing relationships
        between continuous variables while encoding magnitude through area. Use{" "}
        <code>colorBy</code> to add a fourth categorical dimension. For simple
        two-variable point plots without size encoding, see{" "}
        <Link to="/charts/scatterplot">Scatterplot</Link>.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A bubble chart requires <code>data</code>, <code>xAccessor</code>,{" "}
        <code>yAccessor</code>, and <code>sizeBy</code>.
      </p>

      <LiveExample
        frameProps={{
          data: countryData,
          xAccessor: "gdp",
          yAccessor: "lifeExpectancy",
          sizeBy: "population",
          xLabel: "GDP per Capita ($)",
          yLabel: "Life Expectancy (years)",
        }}
        type={BubbleChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { gdp: 12000, lifeExpectancy: 72, population: 45, country: "Brazil" },
  { gdp: 42000, lifeExpectancy: 79, population: 33, country: "Canada" },
  { gdp: 8500, lifeExpectancy: 76, population: 140, country: "China" },
  // ...more data points
]`,
          sizeBy: '"population"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="color-by-category">Color by Category</h3>
      <p>
        Use <code>colorBy</code> to encode a categorical dimension with color.
        A legend is automatically displayed.
      </p>

      <LiveExample
        frameProps={{
          data: categorizedData,
          xAccessor: "gdp",
          yAccessor: "lifeExpectancy",
          sizeBy: "population",
          colorBy: "continent",
          xLabel: "GDP per Capita ($)",
          yLabel: "Life Expectancy (years)",
        }}
        type={BubbleChart}
        overrideProps={{
          data: `[
  { gdp: 12000, lifeExpectancy: 72, population: 45, continent: "Americas" },
  { gdp: 38000, lifeExpectancy: 82, population: 67, continent: "Europe" },
  // ...data with continent field for coloring
]`,
          sizeBy: '"population"',
          colorBy: '"continent"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-size-range">Custom Size Range</h3>
      <p>
        Adjust <code>sizeRange</code> to control the minimum and maximum bubble
        radii, and <code>bubbleOpacity</code> for overlapping readability.
      </p>

      <LiveExample
        frameProps={{
          data: countryData,
          xAccessor: "gdp",
          yAccessor: "lifeExpectancy",
          sizeBy: "population",
          sizeRange: [8, 50],
          bubbleOpacity: 0.4,
          bubbleStrokeWidth: 2,
          xLabel: "GDP per Capita ($)",
          yLabel: "Life Expectancy (years)",
        }}
        type={BubbleChart}
        overrideProps={{
          data: "countryData",
          sizeBy: '"population"',
          sizeRange: "[8, 50]",
          bubbleOpacity: "0.4",
          bubbleStrokeWidth: "2",
        }}
        hiddenProps={{}}
      />

      <h3 id="with-grid">With Grid Lines</h3>
      <p>
        Enable <code>showGrid</code> for reference lines that help readers
        estimate values.
      </p>

      <LiveExample
        frameProps={{
          data: countryData,
          xAccessor: "gdp",
          yAccessor: "lifeExpectancy",
          sizeBy: "population",
          showGrid: true,
          bubbleOpacity: 0.7,
          xLabel: "GDP per Capita ($)",
          yLabel: "Life Expectancy (years)",
        }}
        type={BubbleChart}
        overrideProps={{
          data: "countryData",
          sizeBy: '"population"',
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="BubbleChart" props={bubbleChartProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom marks, complex annotations,
        force-directed layouts — graduate to{" "}
        <Link to="/frames/xy-frame">XYFrame</Link> directly. Every{" "}
        <code>BubbleChart</code> is just a configured <code>XYFrame</code> under
        the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { BubbleChart } from "semiotic"

<BubbleChart
  data={countryData}
  xAccessor="gdp"
  yAccessor="lifeExpectancy"
  sizeBy="population"
  colorBy="continent"
  sizeRange={[5, 40]}
  xLabel="GDP per Capita"
  yLabel="Life Expectancy"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { XYFrame } from "semiotic"

<XYFrame
  points={countryData}
  xAccessor="gdp"
  yAccessor="lifeExpectancy"
  pointStyle={d => ({
    fill: colorScale(d.continent),
    fillOpacity: 0.6,
    stroke: "white",
    strokeWidth: 1,
    r: sizeScale(d.population)
  })}
  axes={[
    { orient: "left", label: "Life Expectancy" },
    { orient: "bottom", label: "GDP per Capita" }
  ]}
  hoverAnnotation={true}
  customPointMark={({ d }) => (
    <circle r={d.r} />
  )}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on BubbleChart lets you pass any XYFrame
        prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<BubbleChart
  data={countryData}
  xAccessor="gdp"
  yAccessor="lifeExpectancy"
  sizeBy="population"
  frameProps={{
    annotations: [
      { type: "enclose", coordinates: largeBubbles, label: "High population" }
    ],
    customPointMark: ({ d }) => <circle r={d.r} fill="gold" />
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
          <Link to="/charts/scatterplot">Scatterplot</Link> — two-variable point
          plots without size encoding
        </li>
        <li>
          <Link to="/charts/heatmap">Heatmap</Link> — aggregate dense point data
          into color-encoded cells
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the underlying Frame with
          full control over every rendering detail
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
