import React, { useRef, useEffect } from "react"
import { StreamOrdinalFrame } from "semiotic"
import { Histogram } from "semiotic"

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

// Generate dense sample data (~60 points per category) for visible distributions
function generateNormal(mean, std, n) {
  const data = []
  for (let i = 0; i < n; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    data.push(Math.round(mean + z * std))
  }
  return data
}

const sampleData = [
  ...generateNormal(63, 8, 60).map(v => ({ category: "Morning", value: v })),
  ...generateNormal(83, 6, 60).map(v => ({ category: "Afternoon", value: v })),
  ...generateNormal(47, 7, 60).map(v => ({ category: "Evening", value: v })),
]

const colorData = [
  ...generateNormal(128, 10, 40).map(v => ({ category: "Region A", value: v, zone: "Urban" })),
  ...generateNormal(95, 8, 40).map(v => ({ category: "Region B", value: v, zone: "Suburban" })),
  ...generateNormal(68, 7, 40).map(v => ({ category: "Region C", value: v, zone: "Rural" })),
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const histGroups = ["Morning", "Afternoon", "Evening"]

const streamingHistogramCode = `import { useRef, useEffect } from "react"
import { StreamOrdinalFrame } from "semiotic"

function StreamingHistogramDemo() {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const group = histGroups[Math.floor(Math.random() * 3)]
        const base = group === "Morning" ? 63
          : group === "Afternoon" ? 83 : 47
        const spread = 14
        const noise = (Math.random() + Math.random() + Math.random()) / 3 - 0.5
        chartRef.current.push({
          category: group,
          value: Math.round(base + noise * spread * 2),
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamOrdinalFrame
      ref={chartRef}
      chartType="histogram"
      runtimeMode="streaming"
      projection="horizontal"
      size={[600, 300]}
      oAccessor="category"
      rAccessor="value"
      windowSize={300}
      showAxes
      bins={15}
      summaryStyle={() => ({ fill: "#6366f1", stroke: "#6366f1", fillOpacity: 0.8 })}
    />
  )
}`

function StreamingHistogramDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const group = histGroups[Math.floor(Math.random() * 3)]
        const base = group === "Morning" ? 63
          : group === "Afternoon" ? 83 : 47
        const spread = 14
        const noise = (Math.random() + Math.random() + Math.random()) / 3 - 0.5
        chartRef.current.push({
          category: group,
          value: Math.round(base + noise * spread * 2),
        })
      }
    }, 100)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamOrdinalFrame
      ref={chartRef}
      chartType="histogram"
      runtimeMode="streaming"
      projection="horizontal"
      size={[width, 300]}
      oAccessor="category"
      rAccessor="value"
      windowSize={300}
      showAxes
      bins={15}
      summaryStyle={() => ({ fill: "#6366f1", stroke: "#6366f1", fillOpacity: 0.8 })}
    />
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const histogramProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Multiple points per category are binned to show frequency distribution." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Field name or function to access category values." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access numeric values." },
  { name: "orientation", type: '"horizontal"', required: false, default: '"horizontal"', description: "Histograms are always horizontal. This prop is ignored." },
  { name: "bins", type: "number", required: false, default: "25", description: "Number of bins for the histogram." },
  { name: "relative", type: "boolean", required: false, default: "false", description: "Normalize counts per category to show relative frequency instead of absolute counts." },
  { name: "categoryLabel", type: "string", required: false, default: null, description: "Label for the category axis." },
  { name: "valueLabel", type: "string", required: false, default: null, description: "Label for the value axis." },
  { name: "valueFormat", type: "function", required: false, default: null, description: "Format function for value axis tick labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine histogram bar color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "categoryPadding", type: "number", required: false, default: "20", description: "Padding between categories in pixels." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover annotations showing bin details." },
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

export default function HistogramPage() {
  return (
    <PageLayout
      title="Histogram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "Histogram", path: "/charts/histogram" },
      ]}
      prevPage={{ title: "Box Plot", path: "/charts/box-plot" }}
      nextPage={{ title: "Violin Plot", path: "/charts/violin-plot" }}
    >
      <ComponentMeta
        componentName="Histogram"
        importStatement='import { Histogram } from "semiotic"'
        tier="charts"
        wraps="StreamOrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "ViolinPlot", path: "/charts/violin-plot" },
          { name: "BoxPlot", path: "/charts/box-plot" },
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "StreamOrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        Histogram shows the frequency distribution of numeric data within
        categories by binning values and displaying bar heights proportional to
        count. Pass raw data points and the component handles the binning
        automatically. Use <code>bins</code> to control resolution and{" "}
        <code>relative</code> to normalize per-category for comparison.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A histogram requires just <code>data</code> — provide multiple data
        points per category and the component bins them automatically.
      </p>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: sampleData,
              categoryAccessor: "category",
              valueAccessor: "value",
              categoryLabel: "Time of Day",
              valueLabel: "Frequency",
            }}
            type={Histogram}
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
            renderChart={(w) => <StreamingHistogramDemo width={w} />}
            code={streamingHistogramCode}
          />
        }
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="fewer-bins">Fewer Bins</h3>
      <p>
        Reduce the <code>bins</code> count to see a coarser distribution.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          bins: 8,
          categoryLabel: "Time of Day",
          valueLabel: "Frequency",
        }}
        type={Histogram}
        overrideProps={{
          data: "responseTimeData",
          bins: "8",
        }}
        hiddenProps={{}}
      />

      <h3 id="relative-histogram">Relative Frequency</h3>
      <p>
        Set <code>relative</code> to <code>true</code> to normalize bin counts
        per category, making it easier to compare distributions with different
        sample sizes.
      </p>

      <LiveExample
        frameProps={{
          data: sampleData,
          categoryAccessor: "category",
          valueAccessor: "value",
          relative: true,
          categoryLabel: "Time of Day",
          valueLabel: "Relative Frequency",
        }}
        type={Histogram}
        overrideProps={{
          data: "responseTimeData",
          relative: "true",
        }}
        hiddenProps={{}}
      />

      <h3 id="colored-histogram">Colored by Category</h3>
      <p>
        Use <code>colorBy</code> to give each histogram a distinct color based
        on a data field.
      </p>

      <LiveExample
        frameProps={{
          data: colorData,
          categoryAccessor: "category",
          valueAccessor: "value",
          colorBy: "zone",
          categoryLabel: "Region",
          valueLabel: "Frequency",
        }}
        type={Histogram}
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

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="Histogram" props={histogramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom bin rendering, overlaid annotations,
        mixed summary types — graduate to{" "}
        <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> directly.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { Histogram } from "semiotic"

<Histogram
  data={responseTimeData}
  categoryAccessor="category"
  valueAccessor="value"
  bins={15}
  categoryLabel="Time of Day"
  valueLabel="Frequency"
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
    type: "histogram",
    bins: 15
  }}
  summaryStyle={d => ({
    fill: "#6366f1",
    stroke: "#6366f1",
    fillOpacity: 0.8
  })}
  oPadding={20}
  axes={[
    { orient: "left", label: "Frequency" },
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
          <Link to="/charts/violin-plot">ViolinPlot</Link> — smooth density
          estimation instead of discrete bins
        </li>
        <li>
          <Link to="/charts/box-plot">BoxPlot</Link> — summary statistics
          (median, quartiles) per category
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — for aggregated category
          comparisons
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the underlying
          Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
