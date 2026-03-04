import React, { useRef, useEffect } from "react"
import { StreamOrdinalFrame, StreamOrdinalFrame } from "semiotic"
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

const sampleData = [
  { category: "Morning", value: 62 },
  { category: "Morning", value: 58 },
  { category: "Morning", value: 71 },
  { category: "Morning", value: 66 },
  { category: "Morning", value: 55 },
  { category: "Morning", value: 73 },
  { category: "Morning", value: 60 },
  { category: "Morning", value: 68 },
  { category: "Morning", value: 50 },
  { category: "Morning", value: 64 },
  { category: "Morning", value: 57 },
  { category: "Morning", value: 75 },
  { category: "Morning", value: 63 },
  { category: "Morning", value: 69 },
  { category: "Afternoon", value: 78 },
  { category: "Afternoon", value: 85 },
  { category: "Afternoon", value: 72 },
  { category: "Afternoon", value: 90 },
  { category: "Afternoon", value: 81 },
  { category: "Afternoon", value: 76 },
  { category: "Afternoon", value: 88 },
  { category: "Afternoon", value: 83 },
  { category: "Afternoon", value: 95 },
  { category: "Afternoon", value: 79 },
  { category: "Afternoon", value: 86 },
  { category: "Afternoon", value: 92 },
  { category: "Afternoon", value: 84 },
  { category: "Afternoon", value: 77 },
  { category: "Evening", value: 45 },
  { category: "Evening", value: 52 },
  { category: "Evening", value: 48 },
  { category: "Evening", value: 39 },
  { category: "Evening", value: 55 },
  { category: "Evening", value: 42 },
  { category: "Evening", value: 50 },
  { category: "Evening", value: 46 },
  { category: "Evening", value: 35 },
  { category: "Evening", value: 58 },
  { category: "Evening", value: 41 },
  { category: "Evening", value: 53 },
  { category: "Evening", value: 44 },
  { category: "Evening", value: 49 },
]

const colorData = [
  { category: "Region A", value: 120, zone: "Urban" },
  { category: "Region A", value: 135, zone: "Urban" },
  { category: "Region A", value: 110, zone: "Urban" },
  { category: "Region A", value: 145, zone: "Urban" },
  { category: "Region A", value: 128, zone: "Urban" },
  { category: "Region A", value: 115, zone: "Urban" },
  { category: "Region A", value: 140, zone: "Urban" },
  { category: "Region A", value: 132, zone: "Urban" },
  { category: "Region A", value: 125, zone: "Urban" },
  { category: "Region A", value: 138, zone: "Urban" },
  { category: "Region B", value: 90, zone: "Suburban" },
  { category: "Region B", value: 105, zone: "Suburban" },
  { category: "Region B", value: 85, zone: "Suburban" },
  { category: "Region B", value: 98, zone: "Suburban" },
  { category: "Region B", value: 112, zone: "Suburban" },
  { category: "Region B", value: 95, zone: "Suburban" },
  { category: "Region B", value: 100, zone: "Suburban" },
  { category: "Region B", value: 88, zone: "Suburban" },
  { category: "Region B", value: 93, zone: "Suburban" },
  { category: "Region B", value: 107, zone: "Suburban" },
  { category: "Region C", value: 65, zone: "Rural" },
  { category: "Region C", value: 72, zone: "Rural" },
  { category: "Region C", value: 58, zone: "Rural" },
  { category: "Region C", value: 80, zone: "Rural" },
  { category: "Region C", value: 68, zone: "Rural" },
  { category: "Region C", value: 75, zone: "Rural" },
  { category: "Region C", value: 62, zone: "Rural" },
  { category: "Region C", value: 70, zone: "Rural" },
  { category: "Region C", value: 77, zone: "Rural" },
  { category: "Region C", value: 66, zone: "Rural" },
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
