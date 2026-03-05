import React, { useRef, useEffect } from "react"
import { StreamOrdinalFrame } from "semiotic"
import { ViolinPlot } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Generate dense sample data for visible distribution shapes
function generateNormal(mean, std, n) {
  const data = []
  for (let i = 0; i < n; i++) {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    data.push(Math.round(mean + z * std))
  }
  return data
}

const sampleData = [
  ...generateNormal(63, 8, 80).map(v => ({ category: "Morning", value: v })),
  ...generateNormal(83, 6, 80).map(v => ({ category: "Afternoon", value: v })),
  ...generateNormal(47, 10, 80).map(v => ({ category: "Evening", value: v })),
]

const colorData = [
  ...generateNormal(128, 10, 50).map(v => ({ category: "Region A", value: v, zone: "Urban" })),
  ...generateNormal(95, 8, 50).map(v => ({ category: "Region B", value: v, zone: "Suburban" })),
  ...generateNormal(68, 7, 50).map(v => ({ category: "Region C", value: v, zone: "Rural" })),
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const violinTimeSlots = ["Morning", "Afternoon", "Evening"]

const streamingViolinCode = `import { useRef, useEffect } from "react"
import { StreamOrdinalFrame } from "semiotic"

function StreamingViolinDemo() {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const slot = violinTimeSlots[Math.floor(Math.random() * 3)]
        // Different distributions per time slot
        const base = slot === "Morning" ? 63
          : slot === "Afternoon" ? 83 : 47
        const spread = 12
        const noise = (Math.random() + Math.random() + Math.random()) / 3 - 0.5
        chartRef.current.push({
          category: slot,
          value: Math.round(base + noise * spread * 2),
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamOrdinalFrame
      ref={chartRef}
      chartType="violin"
      runtimeMode="streaming"
      size={[600, 300]}
      oAccessor="category"
      rAccessor="value"
      windowSize={300}
      showAxes
      showIQR
      summaryStyle={() => ({ fill: "#6366f1", stroke: "#6366f1", fillOpacity: 0.6 })}
    />
  )
}`

function StreamingViolinDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const slot = violinTimeSlots[Math.floor(Math.random() * 3)]
        const base = slot === "Morning" ? 63
          : slot === "Afternoon" ? 83 : 47
        const spread = 12
        const noise = (Math.random() + Math.random() + Math.random()) / 3 - 0.5
        chartRef.current.push({
          category: slot,
          value: Math.round(base + noise * spread * 2),
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamOrdinalFrame
      ref={chartRef}
      chartType="violin"
      runtimeMode="streaming"
      size={[width, 300]}
      oAccessor="category"
      rAccessor="value"
      windowSize={300}
      showAxes
      showIQR
      summaryStyle={() => ({ fill: "#6366f1", stroke: "#6366f1", fillOpacity: 0.6 })}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const violinPlotProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Multiple points per category are used to estimate the density distribution." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"vertical" | "horizontal"', required: false, default: '"vertical"', description: "Chart orientation." },
  { name: "bins", type: "number", required: false, default: "25", description: "Number of bins for density estimation. More bins = smoother shape." },
  { name: "curve", type: "string", required: false, default: '"catmullRom"', description: "Interpolation curve for the violin shape." },
  { name: "showIQR", type: "boolean", required: false, default: "true", description: "Show interquartile range lines inside the violin." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine violin color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "categoryPadding", type: "number", required: false, default: "20", description: "Padding between categories in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations showing distribution details." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy set)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 60, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamOrdinalFrame props for advanced customization. Escape hatch to the full Frame API." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ViolinPlotPage() {
  return (
    <PageLayout
      title="ViolinPlot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "ViolinPlot", path: "/charts/violin-plot" },
      ]}
      prevPage={{ title: "Histogram", path: "/charts/histogram" }}
      nextPage={{ title: "Dot Plot", path: "/charts/dot-plot" }}
    >
      <ComponentMeta
        componentName="ViolinPlot"
        importStatement='import { ViolinPlot } from "semiotic"'
        tier="charts"
        wraps="StreamOrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "Histogram", path: "/charts/histogram" },
          { name: "BoxPlot", path: "/charts/box-plot" },
          { name: "SwarmPlot", path: "/charts/swarm-plot" },
          { name: "StreamOrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        ViolinPlot shows the full distribution shape of numeric data per
        category using kernel density estimation. The symmetric area shape
        reveals the probability density at different values — wider sections
        represent more common values. Unlike a box plot which only shows summary
        statistics, a violin plot shows the entire distribution shape including
        bimodality and skew.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A violin plot requires just <code>data</code> — provide multiple data
        points per category and the component estimates the density
        automatically.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: sampleData,
              categoryAccessor: "category",
              valueAccessor: "value",
              categoryLabel: "Time of Day",
              valueLabel: "Response Time (ms)",
            }}
            type={ViolinPlot}
            startHidden={false}
            overrideProps={{
              data: `[
  { category: "Morning", value: 62 },
  { category: "Morning", value: 58 },
  { category: "Morning", value: 71 },
  // ...multiple data points per category
  { category: "Afternoon", value: 78 },
  { category: "Afternoon", value: 85 },
  // ...more data points
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingViolinDemo width={w} />}
            code={streamingViolinCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="no-iqr">Without IQR Lines</h3>
      <p>
        Set <code>showIQR</code> to <code>false</code> to hide the
        interquartile range lines inside the violin.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          showIQR: false,
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={ViolinPlot}
        overrideProps={{
          data: "responseTimeData",
          showIQR: "false",
        }}
        hiddenProps={{}}
      />

      <h3 id="colored-violin">Colored by Category</h3>
      <p>
        Use <code>colorBy</code> to give each violin a distinct color.
      </p>

      <LiveExample
        frameProps={{
          data: colorData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "zone",
          categoryLabel: "Region",
          valueLabel: "Latency (ms)",
        }}
        type={ViolinPlot}
        overrideProps={{
          data: `[
  { category: "Region A", value: 120, zone: "Urban" },
  { category: "Region A", value: 135, zone: "Urban" },
  // ...data with zone field for coloring
]`,
          colorBy: '"zone"',
        }}
        hiddenProps={{}}
      />

      <h3 id="horizontal-violin">Horizontal Violin Plot</h3>
      <p>
        Set <code>orientation</code> to <code>"horizontal"</code> for
        horizontal violins.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          orientation: "horizontal",
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={ViolinPlot}
        overrideProps={{
          data: "responseTimeData",
          orientation: '"horizontal"',
        }}
        hiddenProps={{}}
      />

      <h3 id="with-grid">With Grid Lines</h3>
      <p>
        Enable grid lines for easier value reading.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          showGrid: true,
          showIQR: true,
          categoryLabel: "Time of Day",
          valueLabel: "Response Time (ms)",
        }}
        type={ViolinPlot}
        overrideProps={{
          data: "responseTimeData",
          showGrid: "true",
          showIQR: "true",
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="ViolinPlot" props={violinPlotProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom density rendering, overlaid data
        points, annotations — graduate to{" "}
        <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> directly.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { ViolinPlot } from "semiotic"

<ViolinPlot
  data={responseTimeData}
  categoryAccessor="category"
  valueAccessor="value"
  showIQR
  categoryLabel="Time of Day"
  valueLabel="Response Time (ms)"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamOrdinalFrame } from "semiotic"

<StreamOrdinalFrame
  data={responseTimeData}
  oAccessor="category"
  rAccessor="value"
  summaryType={{
    type: "violin",
    bins: 25,
    curve: "catmullRom"
  }}
  summaryStyle={d => ({
    fill: "#6366f1",
    stroke: "#6366f1",
    fillOpacity: 0.6
  })}
  oPadding={20}
  axes={[
    { orient: "left", label: "Response Time (ms)" },
    { orient: "bottom", label: "Time of Day" }
  ]}
  summaryHoverAnnotation={true}
  size={[600, 400]}
  margin={{ top: 50, bottom: 60, left: 70, right: 40 }}
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
          <Link to="/charts/histogram">Histogram</Link> — discrete binned
          frequency distribution
        </li>
        <li>
          <Link to="/charts/box-plot">BoxPlot</Link> — summary statistics
          (median, quartiles, outliers) per category
        </li>
        <li>
          <Link to="/charts/swarm-plot">SwarmPlot</Link> — show every individual
          data point as non-overlapping circles
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the underlying
          Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
