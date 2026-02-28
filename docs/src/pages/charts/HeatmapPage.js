import React from "react"
import { XYFrame } from "semiotic"
import { Heatmap } from "semiotic"

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
  { day: 1, hour: 8, value: 12 },
  { day: 1, hour: 10, value: 25 },
  { day: 1, hour: 12, value: 42 },
  { day: 1, hour: 14, value: 38 },
  { day: 1, hour: 16, value: 30 },
  { day: 2, hour: 8, value: 18 },
  { day: 2, hour: 10, value: 32 },
  { day: 2, hour: 12, value: 48 },
  { day: 2, hour: 14, value: 44 },
  { day: 2, hour: 16, value: 28 },
  { day: 3, hour: 8, value: 15 },
  { day: 3, hour: 10, value: 28 },
  { day: 3, hour: 12, value: 50 },
  { day: 3, hour: 14, value: 40 },
  { day: 3, hour: 16, value: 22 },
  { day: 4, hour: 8, value: 20 },
  { day: 4, hour: 10, value: 35 },
  { day: 4, hour: 12, value: 55 },
  { day: 4, hour: 14, value: 45 },
  { day: 4, hour: 16, value: 32 },
  { day: 5, hour: 8, value: 10 },
  { day: 5, hour: 10, value: 22 },
  { day: 5, hour: 12, value: 36 },
  { day: 5, hour: 14, value: 30 },
  { day: 5, hour: 16, value: 18 },
]

const correlationData = [
  { x: 1, y: 1, value: 1.0 },
  { x: 1, y: 2, value: 0.8 },
  { x: 1, y: 3, value: 0.3 },
  { x: 1, y: 4, value: -0.1 },
  { x: 2, y: 1, value: 0.8 },
  { x: 2, y: 2, value: 1.0 },
  { x: 2, y: 3, value: 0.5 },
  { x: 2, y: 4, value: 0.2 },
  { x: 3, y: 1, value: 0.3 },
  { x: 3, y: 2, value: 0.5 },
  { x: 3, y: 3, value: 1.0 },
  { x: 3, y: 4, value: 0.7 },
  { x: 4, y: 1, value: -0.1 },
  { x: 4, y: 2, value: 0.2 },
  { x: 4, y: 3, value: 0.7 },
  { x: 4, y: 4, value: 1.0 },
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const heatmapProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points with x, y, and value properties." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access cell values for color encoding." },
  { name: "colorScheme", type: "string", required: false, default: '"blues"', description: 'Color scheme: "blues", "reds", "greens", "viridis", or "custom".' },
  { name: "customColorScale", type: "d3 scale", required: false, default: null, description: 'Custom color scale (used when colorScheme is "custom").' },
  { name: "showValues", type: "boolean", required: false, default: "false", description: "Show values as text labels in cells." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for cell value labels." },
  { name: "cellBorderColor", type: "string", required: false, default: '"#fff"', description: "Border color of heatmap cells." },
  { name: "cellBorderWidth", type: "number", required: false, default: "1", description: "Border width of heatmap cells." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations on cells." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 80 }", description: "Margin around the chart area." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x-axis." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Label for the y-axis." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional XYFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeatmapPage() {
  return (
    <PageLayout
      title="Heatmap"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "Heatmap", path: "/charts/heatmap" },
      ]}
      prevPage={{ title: "Bubble Chart", path: "/charts/bubble-chart" }}
      nextPage={{ title: "Bar Chart", path: "/charts/bar-chart" }}
    >
      <ComponentMeta
        componentName="Heatmap"
        importStatement='import { Heatmap } from "semiotic"'
        tier="charts"
        wraps="XYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Scatterplot", path: "/charts/scatterplot" },
          { name: "BubbleChart", path: "/charts/bubble-chart" },
          { name: "XYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        Heatmap visualizes matrix data with color-encoded cells. It is ideal for
        showing patterns, correlations, and distributions across two categorical
        or ordinal dimensions. The color intensity of each cell encodes a
        continuous value, making it easy to spot clusters and outliers at a
        glance.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A heatmap requires <code>data</code> with x, y, and value fields. The
        default accessors match <code>"x"</code>, <code>"y"</code>, and{" "}
        <code>"value"</code>.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "day",
          yAccessor: "hour",
          valueAccessor: "value",
          xLabel: "Day",
          yLabel: "Hour",
        }}
        type={Heatmap}
        startHidden={false}
        overrideProps={{
          data: `[
  { day: 1, hour: 8, value: 12 },
  { day: 1, hour: 10, value: 25 },
  { day: 1, hour: 12, value: 42 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="with-values">With Cell Value Labels</h3>
      <p>
        Set <code>showValues</code> to <code>true</code> to display numeric
        labels inside each cell.
      </p>

      <LiveExample
        frameProps={{
          data: correlationData,
          xAccessor: "x",
          yAccessor: "y",
          valueAccessor: "value",
          showValues: true,
          valueFormat: (d) => d.toFixed(1),
          xLabel: "Variable",
          yLabel: "Variable",
        }}
        type={Heatmap}
        overrideProps={{
          data: `[
  { x: 1, y: 1, value: 1.0 },
  { x: 1, y: 2, value: 0.8 },
  // ...correlation matrix data
]`,
          showValues: "true",
          valueFormat: "d => d.toFixed(1)",
        }}
        hiddenProps={{}}
      />

      <h3 id="color-schemes">Color Schemes</h3>
      <p>
        Choose from built-in color schemes: <code>"blues"</code>,{" "}
        <code>"reds"</code>, <code>"greens"</code>, or <code>"viridis"</code>.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "day",
          yAccessor: "hour",
          valueAccessor: "value",
          colorScheme: "viridis",
          xLabel: "Day",
          yLabel: "Hour",
        }}
        type={Heatmap}
        overrideProps={{
          data: "activityData",
          colorScheme: '"viridis"',
        }}
        hiddenProps={{}}
      />

      <h3 id="custom-borders">Custom Cell Borders</h3>
      <p>
        Adjust <code>cellBorderColor</code> and <code>cellBorderWidth</code> to
        change the appearance of cell boundaries.
      </p>

      <LiveExample
        frameProps={{
          data: simpleData,
          xAccessor: "day",
          yAccessor: "hour",
          valueAccessor: "value",
          colorScheme: "reds",
          cellBorderColor: "#333",
          cellBorderWidth: 2,
          xLabel: "Day",
          yLabel: "Hour",
        }}
        type={Heatmap}
        overrideProps={{
          data: "activityData",
          colorScheme: '"reds"',
          cellBorderColor: '"#333"',
          cellBorderWidth: "2",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="Heatmap" props={heatmapProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom bin functions, hexbins, contour
        plots — graduate to <Link to="/frames/xy-frame">XYFrame</Link> directly.
        Every <code>Heatmap</code> is just a configured <code>XYFrame</code>{" "}
        under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { Heatmap } from "semiotic"

<Heatmap
  data={activityData}
  xAccessor="day"
  yAccessor="hour"
  valueAccessor="value"
  colorScheme="viridis"
  showValues={true}
  xLabel="Day"
  yLabel="Hour"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { XYFrame } from "semiotic"
import { scaleSequential } from "d3-scale"
import { interpolateViridis } from "d3-scale-chromatic"

<XYFrame
  summaries={{ coordinates: activityData }}
  xAccessor="day"
  yAccessor="hour"
  summaryType={{
    type: "heatmap",
    xBins: 5,
    yBins: 5,
    binValue: items => {
      const sum = items.reduce((a, d) => a + d.value, 0)
      return sum / items.length
    }
  }}
  summaryStyle={d => ({
    fill: colorScale(d.value),
    stroke: "#fff",
    strokeWidth: 1
  })}
  axes={[
    { orient: "left", label: "Hour" },
    { orient: "bottom", label: "Day" }
  ]}
  hoverAnnotation={true}
  size={[600, 400]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>frameProps</code> prop on Heatmap lets you pass any XYFrame
        prop without fully graduating:
      </p>

      <CodeBlock
        code={`// Use frameProps as an escape hatch
<Heatmap
  data={activityData}
  xAccessor="day"
  yAccessor="hour"
  valueAccessor="value"
  frameProps={{
    annotations: [
      { type: "highlight", day: 3, hour: 12, label: "Peak" }
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
          <Link to="/charts/scatterplot">Scatterplot</Link> — for individual
          point-level data without aggregation
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> — encode a third
          variable via bubble size instead of cell color
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
