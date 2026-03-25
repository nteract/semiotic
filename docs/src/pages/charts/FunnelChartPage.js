import React, { useState, useRef, useEffect } from "react"
import { FunnelChart } from "semiotic"

import { Link } from "react-router-dom"
import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"

// ---------------------------------------------------------------------------
// Sample data — single category
// ---------------------------------------------------------------------------

const singleCategoryData = [
  { step: "Awareness", value: 1900 },
  { step: "Interest", value: 1577 },
  { step: "Consideration", value: 1100 },
  { step: "Intent", value: 890 },
  { step: "Evaluation", value: 480 },
  { step: "Purchase", value: 160 },
]

// ---------------------------------------------------------------------------
// Sample data — 2 categories
// ---------------------------------------------------------------------------

const twoCategoryData = [
  { step: "Awareness", category: "control", value: 1000 },
  { step: "Awareness", category: "treatment", value: 900 },
  { step: "Interest", category: "control", value: 800 },
  { step: "Interest", category: "treatment", value: 777 },
  { step: "Consideration", category: "control", value: 600 },
  { step: "Consideration", category: "treatment", value: 500 },
  { step: "Intent", category: "control", value: 400 },
  { step: "Intent", category: "treatment", value: 490 },
  { step: "Evaluation", category: "control", value: 200 },
  { step: "Evaluation", category: "treatment", value: 280 },
  { step: "Purchase", category: "control", value: 100 },
  { step: "Purchase", category: "treatment", value: 60 },
]

// ---------------------------------------------------------------------------
// Sample data — 4 categories
// ---------------------------------------------------------------------------

const fourCategoryData = [
  { step: "Awareness", category: "organic", value: 5000 },
  { step: "Awareness", category: "paid", value: 4000 },
  { step: "Awareness", category: "referral", value: 2000 },
  { step: "Awareness", category: "direct", value: 1500 },
  { step: "Interest", category: "organic", value: 3800 },
  { step: "Interest", category: "paid", value: 2800 },
  { step: "Interest", category: "referral", value: 1500 },
  { step: "Interest", category: "direct", value: 1100 },
  { step: "Consideration", category: "organic", value: 2200 },
  { step: "Consideration", category: "paid", value: 1500 },
  { step: "Consideration", category: "referral", value: 800 },
  { step: "Consideration", category: "direct", value: 600 },
  { step: "Intent", category: "organic", value: 1200 },
  { step: "Intent", category: "paid", value: 800 },
  { step: "Intent", category: "referral", value: 400 },
  { step: "Intent", category: "direct", value: 300 },
  { step: "Purchase", category: "organic", value: 600 },
  { step: "Purchase", category: "paid", value: 350 },
  { step: "Purchase", category: "referral", value: 150 },
  { step: "Purchase", category: "direct", value: 100 },
]

// ---------------------------------------------------------------------------
// Code examples
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Props table
// ---------------------------------------------------------------------------

const funnelChartProps = [
  { name: "data", type: "array", required: true, default: null, description: "Array of data points. Each point should have a step name and numeric value." },
  { name: "stepAccessor", type: "string | function", required: false, default: '"step"', description: "Field name or function to access the funnel step/stage name." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value per step." },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Field name or function for multi-category funnels. Horizontal: categories mirror around center axis. Vertical: categories render as grouped bars." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine bar color per category." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "orientation", type: '"horizontal" | "vertical"', required: false, default: '"horizontal"', description: 'Horizontal (default): centered bars narrowing top-to-bottom with trapezoid connectors. Vertical: vertical bars with hatched dropoff stacking — solid = retained value, hatched = dropoff from previous step.' },
  { name: "connectorOpacity", type: "number", required: false, default: "0.3", description: "Opacity of trapezoid connectors between funnel steps (0–1). Horizontal orientation only." },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Show step name and value/percent labels on funnel bars. Labels are suppressed on bars narrower than 50px." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover tooltips on bars and connectors." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy set)", description: "Show a legend. Defaults to true when colorBy is specified." },
  { name: "tooltip", type: "object | function", required: false, default: null, description: "Tooltip configuration or render function. Default shows step name, value, and % of first step." },
  { name: "annotations", type: "array", required: false, default: null, description: "Annotation objects to render on the chart. Supports widget, label, y-threshold, enclose, and other annotation types." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "{ top: 50, bottom: 15, left: 70, right: 40 }", description: "Margin around the chart area." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title displayed at the top." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamOrdinalFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const funnelSteps = ["Awareness", "Interest", "Consideration", "Intent", "Evaluation", "Purchase"]

const streamingFunnelCode = `import { useRef, useEffect } from "react"
import { FunnelChart } from "semiotic"

const steps = ["Awareness", "Interest", "Consideration", "Intent", "Evaluation", "Purchase"]

function StreamingFunnelDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const step = steps[i % steps.length]
        // Earlier steps get higher values to maintain funnel shape
        const stepIdx = steps.indexOf(step)
        const base = 1900 - stepIdx * 300
        chartRef.current.push({
          step,
          value: Math.round(base + (Math.random() - 0.5) * 200),
        })
      }
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <FunnelChart
      ref={chartRef}
      stepAccessor="step"
      valueAccessor="value"
      width={600}
      height={400}
      frameProps={{ windowSize: 200 }}
    />
  )
}`

function StreamingFunnelDemo({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const step = funnelSteps[i % funnelSteps.length]
        const stepIdx = funnelSteps.indexOf(step)
        const base = 1900 - stepIdx * 300
        chartRef.current.push({
          step,
          value: Math.round(base + (Math.random() - 0.5) * 200),
        })
      }
    }, 400)
    return () => clearInterval(id)
  }, [])

  return (
    <FunnelChart
      ref={chartRef}
      stepAccessor="step"
      valueAccessor="value"
      width={width}
      height={400}
      frameProps={{ windowSize: 200 }}
    />
  )
}

// ---------------------------------------------------------------------------
// Interactive demo
// ---------------------------------------------------------------------------

function CategorySwitcher({ width, orientation }) {
  const [categories, setCategories] = useState(1)

  const dataMap = {
    1: singleCategoryData,
    2: twoCategoryData,
    4: fourCategoryData,
  }

  const data = dataMap[categories] || singleCategoryData

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <label style={{ fontSize: 14 }}>Categories:</label>
        {[1, 2, 4].map(n => (
          <button
            key={n}
            onClick={() => setCategories(n)}
            style={{
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              background: categories === n ? "#4e79a7" : "white",
              color: categories === n ? "white" : "#333",
              cursor: "pointer",
              fontWeight: categories === n ? "bold" : "normal",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <FunnelChart
        data={data}
        stepAccessor="step"
        valueAccessor="value"
        orientation={orientation}
        {...(categories > 1 && {
          categoryAccessor: "category",
          colorBy: "category",
          showLegend: true,
        })}
        width={width || 600}
        height={400}
        tooltip
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FunnelChartPage() {
  return (
    <PageLayout
      title="FunnelChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Ordinal Charts", path: "/charts" },
        { label: "FunnelChart", path: "/charts/funnel-chart" },
      ]}
    >
      <ComponentMeta
        name="FunnelChart"
        description="Visualize sequential conversion steps as a narrowing funnel. Each step shows a bar proportional to its value, with trapezoid connectors showing the flow between steps. Supports single or multi-category funnels — with multiple categories, bars mirror around the center axis."
        import='import { FunnelChart } from "semiotic"'
      />

      <h2>Single Category</h2>
      <p>
        A basic funnel with one value per step. Bars narrow from top to bottom,
        centered horizontally. Hover to see step values and conversion percentages.
      </p>
      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: singleCategoryData,
              stepAccessor: "step",
              valueAccessor: "value",
            }}
            type={FunnelChart}
            startHidden={false}
            overrideProps={{
              data: `[
  { step: "Awareness", value: 10000 },
  { step: "Interest", value: 7500 },
  { step: "Consideration", value: 5000 },
  { step: "Intent", value: 3200 },
  { step: "Evaluation", value: 1800 },
  { step: "Purchase", value: 900 },
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingFunnelDemo width={w} />}
            code={streamingFunnelCode}
          />
        }
      />

      <h2>Multi-Category (A/B Test)</h2>
      <p>
        With a <code>categoryAccessor</code>, each category mirrors around the center axis.
        This is useful for A/B test comparisons, where you want to see how control and
        treatment groups progress through the funnel side by side.
      </p>
      <LiveExample
        frameProps={{
          data: twoCategoryData,
          stepAccessor: "step",
          valueAccessor: "value",
          categoryAccessor: "category",
          colorBy: "category",
          showLegend: true,
        }}
        type={FunnelChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { step: "Awareness", category: "control", value: 900 },
  { step: "Awareness", category: "treatment", value: 1000 },
  { step: "Interest", category: "control", value: 777 },
  { step: "Interest", category: "treatment", value: 800 },
  // ...more data
]`,
        }}
        hiddenProps={{}}
      />

      <h2>Interactive: Category Switching</h2>
      <p>
        Toggle between 1, 2, and 4 categories to see how the funnel adapts.
        Multi-category funnels alternate categories on each side of the center axis.
      </p>
      <CategorySwitcher width={600} />

      {/* ================================================================= */}
      {/* Vertical Orientation (Bar Funnel) */}
      {/* ================================================================= */}
      <h2 id="vertical">Vertical Orientation (Bar Funnel)</h2>
      <p>
        Set <code>orientation="vertical"</code> to render funnel data as
        vertical bars with hatched dropoff stacking. Each bar shows the
        retained value as a solid fill and the dropoff from the previous step
        as a diagonal-hatch pattern. The first step is always 100% solid.
      </p>

      <h3>Vertical: Single Category</h3>
      <FunnelChart
        data={singleCategoryData}
        stepAccessor="step"
        valueAccessor="value"
        orientation="vertical"
        width={600}
        height={400}
        tooltip
      />

      <CodeBlock
        code={`<FunnelChart
  data={data}
  stepAccessor="step"
  valueAccessor="value"
  orientation="vertical"
  width={600}
  height={400}
  tooltip
/>`}
        language="jsx"
      />

      <h3>Vertical: Multi-Category (Grouped Bars)</h3>
      <p>
        With <code>categoryAccessor</code>, each step shows grouped bars —
        one per category, each with its own retained + dropoff stack.
      </p>
      <FunnelChart
        data={twoCategoryData}
        stepAccessor="step"
        valueAccessor="value"
        categoryAccessor="category"
        colorBy="category"
        orientation="vertical"
        showLegend
        width={600}
        height={400}
        tooltip
      />

      <CodeBlock
        code={`<FunnelChart
  data={data}
  stepAccessor="step"
  valueAccessor="value"
  categoryAccessor="category"
  colorBy="category"
  orientation="vertical"
  showLegend
  width={600}
  height={400}
  tooltip
/>`}
        language="jsx"
      />

      <h3>Interactive: Vertical Category Switching</h3>
      <CategorySwitcher width={600} orientation="vertical" />

      {/* ================================================================= */}
      {/* Graduating to the Frame */}
      {/* ================================================================= */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom canvas renderers, mixed chart types,
        or advanced interaction — graduate to{" "}
        <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> directly. Every{" "}
        <code>FunnelChart</code> is a configured <code>StreamOrdinalFrame</code>{" "}
        under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { FunnelChart } from "semiotic"

// Horizontal (default): trapezoid connectors
<FunnelChart
  data={data}
  stepAccessor="step"
  valueAccessor="value"
  categoryAccessor="channel"
  colorBy="channel"
  showLegend
/>

// Vertical: bar chart with dropoff hatching
<FunnelChart
  data={data}
  stepAccessor="step"
  valueAccessor="value"
  orientation="vertical"
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamOrdinalFrame } from "semiotic"

// Horizontal funnel (chartType="funnel")
<StreamOrdinalFrame
  data={data}
  oAccessor="step"
  rAccessor="value"
  chartType="funnel"
  stackBy="channel"
  projection="horizontal"
  pieceStyle={(d) => ({ fill: colorScale(d.channel) })}
  connectorOpacity={0.3}
  showLabels
  size={[600, 400]}
  margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
/>

// Vertical bar-funnel (chartType="bar-funnel")
<StreamOrdinalFrame
  data={data}
  oAccessor="step"
  rAccessor="value"
  chartType="bar-funnel"
  stackBy="channel"
  projection="vertical"
  pieceStyle={(d) => ({ fill: colorScale(d.channel) })}
  showLabels
  showAxes
  size={[600, 400]}
  margin={{ top: 40, bottom: 60, left: 60, right: 20 }}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The key mappings: <code>stepAccessor</code> → <code>oAccessor</code>,{" "}
        <code>valueAccessor</code> → <code>rAccessor</code>,{" "}
        <code>categoryAccessor</code> → <code>stackBy</code>.{" "}
        Horizontal orientation uses <code>chartType="funnel"</code> with{" "}
        <code>projection="horizontal"</code>. Vertical uses{" "}
        <code>chartType="bar-funnel"</code> with{" "}
        <code>projection="vertical"</code>. The bar-funnel chart type
        automatically computes dropoff bars and applies diagonal hatching.
      </p>

      <h2>Props</h2>
      <PropTable componentName="FunnelChart" props={funnelChartProps} />
    </PageLayout>
  )
}
