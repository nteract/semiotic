import React, { useRef, useEffect } from "react"
import { QuadrantChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — BCG Growth-Share Matrix (0–1 unitized scale)
// ---------------------------------------------------------------------------

const bcgData = [
  { product: "TurboEncabulator 9000", growth: 0.82, share: 0.75, revenue: 120, category: "Stars" },
  { product: "Quantum Flavor Crystals", growth: 0.91, share: 0.68, revenue: 95, category: "Stars" },
  { product: "Cromulent Pipe Fittings", growth: 0.22, share: 0.85, revenue: 200, category: "Cash Cows" },
  { product: "Industrial Strength Muffin Bearings", growth: 0.15, share: 0.92, revenue: 300, category: "Cash Cows" },
  { product: "AI-Powered Toaster Firmware", growth: 0.88, share: 0.18, revenue: 40, category: "Question Marks" },
  { product: "Blockchain Dog Walker", growth: 0.95, share: 0.12, revenue: 55, category: "Question Marks" },
  { product: "Artisanal Fax Machine", growth: 0.08, share: 0.15, revenue: 15, category: "Dogs" },
  { product: "Organic USB Cables", growth: 0.05, share: 0.22, revenue: 20, category: "Dogs" },
  { product: "SynergyOS Enterprise Edition", growth: 0.72, share: 0.55, revenue: 80, category: "Stars" },
  { product: "Cloud-Native Stapler", growth: 0.65, share: 0.30, revenue: 35, category: "Question Marks" },
]

const bcgQuadrants = {
  topLeft: { label: "Question Marks", color: "#FF9800" },
  topRight: { label: "Stars", color: "#4CAF50" },
  bottomLeft: { label: "Dogs", color: "#F44336" },
  bottomRight: { label: "Cash Cows", color: "#2196F3" },
}

// Priority matrix data (0–1 unitized scale)
const priorityData = [
  { task: "Rewrite everything in Rust", effort: 0.85, impact: 0.90 },
  { task: "Fix the login bug from 2019", effort: 0.15, impact: 0.95 },
  { task: "Update the README again", effort: 0.25, impact: 0.35 },
  { task: "Alphabetize the CSS", effort: 0.70, impact: 0.20 },
  { task: "Add caching (for real this time)", effort: 0.50, impact: 0.72 },
  { task: "Redesign onboarding flow", effort: 0.60, impact: 0.80 },
  { task: "Dark mode (the sequel)", effort: 0.35, impact: 0.48 },
  { task: "Fix the three typos nobody noticed", effort: 0.08, impact: 0.12 },
  { task: "API v2: The Reckoning", effort: 0.92, impact: 0.55 },
  { task: "Performance audit we keep deferring", effort: 0.30, impact: 0.68 },
]

const priorityQuadrants = {
  topLeft: { label: "Quick Wins", color: "#4CAF50" },
  topRight: { label: "Major Projects", color: "#FF9800" },
  bottomLeft: { label: "Fill-ins", color: "#9E9E9E" },
  bottomRight: { label: "Thankless Tasks", color: "#F44336" },
}

// Asymmetric quadrant data — risk matrix with real-valued scales
const riskData = [
  { item: "Deploying on Friday afternoon", likelihood: 8.5, severity: 9.2 },
  { item: "Forgetting to update .env", likelihood: 7.0, severity: 8.8 },
  { item: "npm audit finding something scary", likelihood: 6.5, severity: 3.0 },
  { item: "Intern refactoring auth", likelihood: 2.0, severity: 9.5 },
  { item: "Dependency bot PR avalanche", likelihood: 9.0, severity: 2.5 },
  { item: "Prod DB has 'test' in the name", likelihood: 1.5, severity: 8.0 },
  { item: "Someone replies-all to the outage email", likelihood: 8.0, severity: 1.5 },
  { item: "Caching bug returns", likelihood: 5.5, severity: 7.5 },
  { item: "That one flaky test", likelihood: 9.5, severity: 1.0 },
  { item: "Forgot to cancel the staging instance", likelihood: 7.5, severity: 4.5 },
]

const riskQuadrants = {
  topLeft: { label: "Low Likelihood / High Impact", color: "#9C27B0", opacity: 0.10 },
  topRight: { label: "Critical", color: "#F44336", opacity: 0.12 },
  bottomLeft: { label: "Negligible", color: "#9E9E9E", opacity: 0.06 },
  bottomRight: { label: "Annoying but Survivable", color: "#FF9800", opacity: 0.08 },
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const quadrantChartProps = [
  { name: "data", type: "array", required: false, default: null, description: "Array of data points. Omit when using push API." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "quadrants", type: "QuadrantsConfig", required: true, default: null, description: "Configuration for the four quadrants: { topRight, topLeft, bottomRight, bottomLeft }. Each quadrant has label, color, and optional opacity." },
  { name: "xCenter", type: "number", required: false, default: "midpoint of x domain", description: "X-coordinate of the vertical center line in data units." },
  { name: "yCenter", type: "number", required: false, default: "midpoint of y domain", description: "Y-coordinate of the horizontal center line in data units." },
  { name: "centerlineStyle", type: "object", required: false, default: '{ stroke: "#999", strokeWidth: 1 }', description: "Style for center lines: { stroke, strokeWidth, strokeDasharray }." },
  { name: "showQuadrantLabels", type: "boolean", required: false, default: "true", description: "Show quadrant labels in the corners." },
  { name: "quadrantLabelSize", type: "number", required: false, default: "12", description: "Font size for quadrant labels." },
  { name: "colorBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point color." },
  { name: "colorScheme", type: "string | array", required: false, default: '"category10"', description: "Color scheme name or custom colors array." },
  { name: "sizeBy", type: "string | function", required: false, default: null, description: "Field name or function to determine point size." },
  { name: "sizeRange", type: "[number, number]", required: false, default: "[3, 15]", description: "Min and max radius for points when sizeBy is specified." },
  { name: "pointRadius", type: "number", required: false, default: "5", description: "Default point radius." },
  { name: "pointOpacity", type: "number", required: false, default: "0.8", description: "Opacity of the points." },
  { name: "enableHover", type: "boolean", required: false, default: "true", description: "Enable hover tooltips." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show background grid lines." },
  { name: "showLegend", type: "boolean", required: false, default: "true (when colorBy)", description: "Show a legend." },
  { name: "tooltip", type: "boolean | object | function", required: false, default: null, description: "Enable/disable default tooltip (boolean), or provide a config object or render function." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width in pixels." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height in pixels." },
  { name: "margin", type: "object", required: false, default: "auto", description: "Margin around the chart area." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x-axis." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Label for the y-axis." },
  { name: "title", type: "string", required: false, default: null, description: "Chart title." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Additional StreamXYFrame props for advanced customization." },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const streamingCode = `import { useRef, useEffect } from "react"
import { QuadrantChart } from "semiotic"

function StreamingQuadrant() {
  const chartRef = useRef()

  useEffect(() => {
    const interval = setInterval(() => {
      chartRef.current?.push({
        x: Math.random(),
        y: Math.random(),
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <QuadrantChart
      ref={chartRef}
      xAccessor="x" yAccessor="y"
      xCenter={0.5} yCenter={0.5}
      pointRadius={6}
      quadrants={{
        topRight: { label: "High/High", color: "#4CAF50" },
        topLeft: { label: "Low X / High Y", color: "#FF9800" },
        bottomRight: { label: "High X / Low Y", color: "#2196F3" },
        bottomLeft: { label: "Low/Low", color: "#F44336" },
      }}
      xLabel="X Metric" yLabel="Y Metric"
      width={500} height={400}
    />
  )
}`

function StreamingQuadrantDemo({ width }) {
  const chartRef = useRef()

  useEffect(() => {
    const interval = setInterval(() => {
      chartRef.current?.push({
        x: Math.random(),
        y: Math.random(),
      })
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <QuadrantChart
      ref={chartRef}
      xAccessor="x" yAccessor="y"
      xCenter={0.5} yCenter={0.5}
      pointRadius={6}
      quadrants={{
        topRight: { label: "High/High", color: "#4CAF50" },
        topLeft: { label: "Low X / High Y", color: "#FF9800" },
        bottomRight: { label: "High X / Low Y", color: "#2196F3" },
        bottomLeft: { label: "Low/Low", color: "#F44336" },
      }}
      xLabel="X Metric" yLabel="Y Metric"
      width={width || 500} height={400}
    />
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function QuadrantChartPage() {
  return (
    <PageLayout
      title="Quadrant Chart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Quadrant Chart", path: "/charts/quadrant-chart" },
      ]}
      prevPage={{ title: "Scatterplot Matrix", path: "/charts/scatterplot-matrix" }}
      nextPage={{ title: "Multi-Axis Line Chart", path: "/charts/multi-axis-line-chart" }}
    >
      <ComponentMeta
        componentName="QuadrantChart"
        importStatement='import { QuadrantChart } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/xy-frame"
        related={[
          { name: "Scatterplot", path: "/charts/scatterplot" },
          { name: "Bubble Chart", path: "/charts/bubble-chart" },
        ]}
      />

      <p>
        A scatterplot divided into four labeled, colored quadrants by center lines.
        Use it for BCG growth-share matrices, priority/effort grids, risk matrices,
        or any 2D categorization where the quadrant a point falls in carries meaning.
      </p>

      <h2 id="quick-start">Quick Start</h2>
      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: bcgData,
              xAccessor: "share",
              yAccessor: "growth",
              xCenter: 0.5,
              yCenter: 0.5,
              sizeBy: "revenue",
              sizeRange: [5, 30],
              colorBy: "category",
              colorScheme: ["#4CAF50", "#2196F3", "#FF9800", "#F44336"],
              quadrants: bcgQuadrants,
              xLabel: "Relative Market Share",
              yLabel: "Market Growth Rate",
              title: "BCG Growth-Share Matrix",
              tooltip: true,
              showLegend: true,
            }}
            type={QuadrantChart}
            overrideProps={{
              data: `[
  { product: "TurboEncabulator 9000", growth: 0.82, share: 0.75, revenue: 120, category: "Stars" },
  { product: "Cromulent Pipe Fittings", growth: 0.22, share: 0.85, revenue: 200, category: "Cash Cows" },
  { product: "Blockchain Dog Walker", growth: 0.95, share: 0.12, revenue: 55, category: "Question Marks" },
  { product: "Artisanal Fax Machine", growth: 0.08, share: 0.15, revenue: 15, category: "Dogs" },
  // ... 10 items total
]`,
              quadrants: `{
  topLeft: { label: "Question Marks", color: "#FF9800" },
  topRight: { label: "Stars", color: "#4CAF50" },
  bottomLeft: { label: "Dogs", color: "#F44336" },
  bottomRight: { label: "Cash Cows", color: "#2196F3" },
}`,
            }}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={({ width }) => <StreamingQuadrantDemo width={width} />}
            code={streamingCode}
          />
        }
      />

      <h2 id="examples">Examples</h2>

      <h3>Priority Matrix</h3>
      <p>
        An Eisenhower-style effort/impact grid. Both axes use a 0–1 unitized scale
        with the center lines at 0.5, giving each quadrant equal area and making it
        easy to see which quadrant a task falls in at a glance.
      </p>
      <LiveExample
        frameProps={{
          data: priorityData,
          xAccessor: "effort",
          yAccessor: "impact",
          xCenter: 0.5,
          yCenter: 0.5,
          quadrants: priorityQuadrants,
          pointRadius: 7,
          xLabel: "Effort",
          yLabel: "Impact",
          tooltip: true,
        }}
        type={QuadrantChart}
        overrideProps={{
          data: `[
  { task: "Fix the login bug from 2019", effort: 0.15, impact: 0.95 },
  { task: "Rewrite everything in Rust", effort: 0.85, impact: 0.90 },
  { task: "Dark mode (the sequel)", effort: 0.35, impact: 0.48 },
  // ... 10 items total
]`,
          quadrants: `{
  topLeft: { label: "Quick Wins", color: "#4CAF50" },
  topRight: { label: "Major Projects", color: "#FF9800" },
  bottomLeft: { label: "Fill-ins", color: "#9E9E9E" },
  bottomRight: { label: "Thankless Tasks", color: "#F44336" },
}`,
          tooltip: "true",
        }}
      />

      <h3>Asymmetric Quadrants</h3>
      <p>
        Quadrants don't have to be evenly sized. Here{" "}
        <code>xCenter</code> and <code>yCenter</code> are set to 6.0 on a 0–10 scale,
        pushing the center lines off-center so the "Critical" quadrant (high likelihood{" "}
        <em>and</em> high severity) is intentionally smaller — reflecting that truly
        critical risks should be rare. The per-quadrant <code>opacity</code> is also
        varied to draw the eye toward the danger zone.
      </p>
      <LiveExample
        frameProps={{
          data: riskData,
          xAccessor: "likelihood",
          yAccessor: "severity",
          xCenter: 6.0,
          yCenter: 6.0,
          quadrants: riskQuadrants,
          centerlineStyle: { stroke: "#666", strokeWidth: 2, strokeDasharray: [6, 4] },
          pointRadius: 7,
          xLabel: "Likelihood",
          yLabel: "Severity",
          tooltip: true,
        }}
        type={QuadrantChart}
        overrideProps={{
          data: `[
  { item: "Deploying on Friday afternoon", likelihood: 8.5, severity: 9.2 },
  { item: "Intern refactoring auth", likelihood: 2.0, severity: 9.5 },
  { item: "That one flaky test", likelihood: 9.5, severity: 1.0 },
  // ... 10 items total
]`,
          quadrants: `{
  topLeft: { label: "Low Likelihood / High Impact", color: "#9C27B0", opacity: 0.10 },
  topRight: { label: "Critical", color: "#F44336", opacity: 0.12 },
  bottomLeft: { label: "Negligible", color: "#9E9E9E", opacity: 0.06 },
  bottomRight: { label: "Annoying but Survivable", color: "#FF9800", opacity: 0.08 },
}`,
          xCenter: "6.0",
          yCenter: "6.0",
          centerlineStyle: '{ stroke: "#666", strokeWidth: 2, strokeDasharray: [6, 4] }',
          tooltip: "true",
        }}
      />

      <h2 id="props">Props</h2>
      <PropTable props={quadrantChartProps} />

      <h2 id="graduating">Graduating to the Frame</h2>
      <p>
        QuadrantChart uses <code>canvasPreRenderers</code> to draw quadrant fills and labels
        on the canvas layer under the scatter points. You can achieve the same result directly
        on <code>StreamXYFrame</code>:
      </p>
      <CodeBlock language="jsx" code={`// HOC (simple)
<QuadrantChart
  data={data} xAccessor="x" yAccessor="y"
  xCenter={0.5} yCenter={0.5}
  quadrants={{
    topRight: { label: "High", color: "green" },
    topLeft: { label: "Risky", color: "orange" },
    bottomRight: { label: "Stable", color: "blue" },
    bottomLeft: { label: "Low", color: "red" },
  }}
/>

// Frame (full control)
<StreamXYFrame
  chartType="scatter"
  data={data}
  xAccessor="x" yAccessor="y"
  size={[600, 400]}
  canvasPreRenderers={[
    (ctx, nodes, scales, layout) => {
      const cx = scales.x(0.5)
      const cy = scales.y(0.5)
      // Draw quadrant fills
      ctx.fillStyle = "green"
      ctx.globalAlpha = 0.08
      ctx.fillRect(cx, 0, layout.width - cx, cy)
      // ... other quadrants, center lines, labels
      ctx.globalAlpha = 1
    }
  ]}
/>`} />

      <h2 id="related">Related</h2>
      <ul>
        <li><Link to="/charts/scatterplot">Scatterplot</Link> — basic two-variable plot</li>
        <li><Link to="/charts/bubble-chart">Bubble Chart</Link> — size-encoded scatterplot</li>
        <li><Link to="/charts/heatmap">Heatmap</Link> — binned 2D distribution</li>
        <li><Link to="/frames/xy-frame">StreamXYFrame</Link> — full control with canvasPreRenderers</li>
      </ul>
    </PageLayout>
  )
}
