import React, { useRef, useEffect, useState, useCallback } from "react"
import { SwimlaneChart } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import ChartGrounding from "../../components/ChartGrounding"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Responsive container hook
// ---------------------------------------------------------------------------

function useContainerWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const STATIC_DATA = [
  { lane: "Backend", task: "Auth", value: 3 },
  { lane: "Backend", task: "DB Migration", value: 5 },
  { lane: "Backend", task: "Auth", value: 2 },
  { lane: "Backend", task: "API", value: 4 },
  { lane: "Frontend", task: "Auth", value: 2 },
  { lane: "Frontend", task: "UI", value: 6 },
  { lane: "Frontend", task: "API", value: 3 },
  { lane: "Frontend", task: "UI", value: 2 },
]

const TASK_COLORS = {
  Auth: "#007bff",
  "DB Migration": "#6f42c1",
  API: "#28a745",
  UI: "#fd7e14",
}

// ---------------------------------------------------------------------------
// Static demo
// ---------------------------------------------------------------------------

function StaticDemo() {
  const [containerRef, containerWidth] = useContainerWidth()

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <SwimlaneChart
          data={STATIC_DATA}
          categoryAccessor="lane"
          subcategoryAccessor="task"
          valueAccessor="value"
          colorBy="task"
          colorScheme={Object.values(TASK_COLORS)}
          width={containerWidth}
          height={200}
          orientation="horizontal"
          enableHover
          showLegend
          showGrid
          margin={{ left: 90 }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

const STREAM_LANES = ["Ingest", "Transform"]
const STREAM_TASKS = ["parse", "validate", "enrich", "write"]
const STREAM_COLORS = { parse: "#007bff", validate: "#dc3545", enrich: "#28a745", write: "#fd7e14" }

function StreamingDemo() {
  const chartRef = useRef()
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const lane = STREAM_LANES[Math.floor(Math.random() * STREAM_LANES.length)]
        const task = STREAM_TASKS[Math.floor(Math.random() * STREAM_TASKS.length)]
        chartRef.current.push({
          lane,
          task,
          value: Math.floor(Math.random() * 4) + 1,
        })
      }
    }, 120)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <SwimlaneChart
          ref={chartRef}
          categoryAccessor="lane"
          subcategoryAccessor="task"
          valueAccessor="value"
          colorBy="task"
          colorScheme={Object.values(STREAM_COLORS)}
          width={containerWidth}
          height={200}
          orientation="horizontal"
          enableHover
          showLegend
          showGrid
          margin={{ left: 90 }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle demo (static / streaming)
// ---------------------------------------------------------------------------

function QuickStartDemo() {
  const [mode, setMode] = useState("static")

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <button
          onClick={() => setMode(mode === "static" ? "streaming" : "static")}
          style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid var(--surface-3)", background: "var(--surface-2)", cursor: "pointer" }}
        >
          Switch to {mode === "static" ? "streaming" : "static"} mode
        </button>
      </div>
      {mode === "static" ? <StaticDemo /> : <StreamingDemo />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brush + Zoom demo
// ---------------------------------------------------------------------------

const BRUSH_LANES = ["Pipeline A", "Pipeline B", "Pipeline C", "Pipeline D"]
const BRUSH_TASKS = ["fetch", "parse", "validate", "transform", "enrich", "write", "notify"]
const BRUSH_COLORS = {
  fetch: "#1f77b4", parse: "#ff7f0e", validate: "#2ca02c", transform: "#d62728",
  enrich: "#9467bd", write: "#8c564b", notify: "#e377c2"
}

// Generate dense data — ~120 items across 4 lanes
const DENSE_DATA = (() => {
  const data = []
  for (const lane of BRUSH_LANES) {
    const count = 25 + Math.floor(Math.random() * 10)
    for (let i = 0; i < count; i++) {
      const task = BRUSH_TASKS[Math.floor(Math.random() * BRUSH_TASKS.length)]
      data.push({ lane, task, value: 1 + Math.floor(Math.random() * 5) })
    }
  }
  return data
})()

function BrushZoomDemo() {
  const [containerRef, containerWidth] = useContainerWidth()
  const [brushExtent, setBrushExtent] = useState(null)

  const handleBrush = useCallback((extent) => {
    setBrushExtent(extent)
  }, [])

  const sharedProps = {
    categoryAccessor: "lane",
    subcategoryAccessor: "task",
    valueAccessor: "value",
    colorBy: "task",
    colorScheme: Object.values(BRUSH_COLORS),
    orientation: "horizontal",
    enableHover: true,
    showGrid: true,
    margin: { left: 100 },
  }

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <>
          <div style={{ marginBottom: 4, fontSize: 12, color: "var(--text-2)" }}>
            Drag to select a region {brushExtent && `\u2014 viewing ${brushExtent.r[0].toFixed(0)}\u2013${brushExtent.r[1].toFixed(0)}`}
          </div>
          <SwimlaneChart
            data={DENSE_DATA}
            {...sharedProps}
            brush
            onBrush={handleBrush}
            width={containerWidth}
            height={140}
            showLegend
            showCategoryTicks={false}
            showGrid={false}
            barPadding={10}
            legendPosition="top"
            margin={{ left: 15, bottom: 15 }}
            frameProps={{ showAxes: false }}
          />
          <div style={{ marginTop: 12, marginBottom: 4, fontSize: 12, color: "var(--text-2)" }}>
            {brushExtent ? "Detail view (zoomed to brushed region)" : "Detail view (brush above to zoom)"}
          </div>
          <SwimlaneChart
            data={DENSE_DATA}
            {...sharedProps}
            width={containerWidth}
            height={220}
            showLegend={false}
            frameProps={brushExtent ? { rExtent: [brushExtent.r[0], brushExtent.r[1]] } : undefined}
          />
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition
// ---------------------------------------------------------------------------

const SwimlaneChartPropsTable = [
  { name: "data", type: "array", required: false, default: null, description: "Data array. Omit for push API mode." },
  { name: "categoryAccessor", type: "string | function", required: false, default: '"category"', description: "Accessor for lane categories (swim lanes)." },
  { name: "subcategoryAccessor", type: "string | function", required: true, default: null, description: "Accessor for item subcategory (color grouping within lanes). Duplicate subcategories in the same lane stack sequentially." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Accessor for item size/duration along the value axis." },
  { name: "orientation", type: '"horizontal" | "vertical"', required: false, default: '"horizontal"', description: "Horizontal renders lanes as rows; vertical as columns." },
  { name: "colorBy", type: "string | function", required: false, default: "subcategoryAccessor", description: "Color accessor. Defaults to subcategoryAccessor." },
  { name: "colorScheme", type: "string | string[]", required: false, default: '"category10"', description: "Color scheme for subcategories." },
  { name: "barPadding", type: "number", required: false, default: "40", description: "Padding between lanes in pixels." },
  { name: "roundedTop", type: "number", required: false, default: null, description: "Rounded corner radius (px) applied to the outermost ends of each lane — left+right for horizontal, top+bottom for vertical. Middle segments stay square; single-segment lanes round all four corners." },
  { name: "enableHover", type: "boolean", required: false, default: null, description: "Enable hover annotations on items." },
  { name: "showGrid", type: "boolean", required: false, default: null, description: "Show grid lines." },
  { name: "showCategoryTicks", type: "boolean", required: false, default: null, description: "Show lane labels on the category axis." },
  { name: "showLegend", type: "boolean", required: false, default: null, description: "Show a legend keyed to subcategory colors." },
  { name: "legendPosition", type: '"right" | "left" | "top" | "bottom"', required: false, default: '"right"', description: "Legend position." },
  { name: "tooltip", type: "boolean | function | object", required: false, default: null, description: "Tooltip configuration." },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins: { top, right, bottom, left }." },
  { name: "brush", type: "boolean", required: false, default: null, description: "Enable value-axis brush selection." },
  { name: "onBrush", type: "function", required: false, default: null, description: "Callback with { r: [min, max] } or null when brush clears." },
  { name: "linkedBrush", type: "string | object", required: false, default: null, description: "LinkedCharts brush integration name." },
  { name: "gradientFill", type: "{ stops }", required: false, default: null, description: "Gradient fill along each segment's growth direction using { stops: [{ offset: 0–1, color?, opacity? }] }." },
  { name: "trackFill", type: "string | { color, opacity }", required: false, default: null, description: 'Lane "track" fill — a rect drawn behind each lane spanning the full value-axis range, sized to the lane\'s bandwidth. CSS vars supported (e.g. "var(--semiotic-grid)").' },
  { name: "annotations", type: "array", required: false, default: null, description: "Annotation objects. Supports x-threshold for unlabeled dashed vertical reference lines (omit label)." },
  { name: "frameProps", type: "object", required: false, default: null, description: "Pass-through props to StreamOrdinalFrame for advanced control." },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SwimlaneChartPage() {
  return (
    <PageLayout
      title="SwimlaneChart"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Categorical", path: "/charts" },
        { label: "SwimlaneChart", path: "/charts/swimlane-chart" },
      ]}
      prevPage={{ title: "Funnel Chart", path: "/charts/funnel-chart" }}
      nextPage={{ title: "Force Directed Graph", path: "/charts/force-directed-graph" }}
    >
      <ComponentMeta
        componentName="SwimlaneChart"
        importStatement='import { SwimlaneChart } from "semiotic"'
        tier="charts"
        wraps="StreamOrdinalFrame"
        wrapsPath="/frames/ordinal-frame"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "StackedBarChart", path: "/charts/stacked-bar-chart" },
          { name: "StreamOrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        SwimlaneChart renders categorical lanes with items stacked sequentially
        within each lane, colored by subcategory. Unlike a stacked bar chart,
        the same subcategory can appear multiple times in the same lane —
        items stack left-to-right (horizontal) or bottom-to-top (vertical)
        in the order they appear in data. It wraps{" "}
        <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> with{" "}
        <code>chartType="swimlane"</code> and supports both static data and
        the push API for streaming.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <ChartGrounding component="SwimlaneChart" />

      <h2 id="quick-start">Quick Start</h2>

      <p>
        Pass <code>data</code> for static mode, or omit it and use{" "}
        <code>ref.current.push()</code> for streaming. Each datum needs a
        lane (<code>categoryAccessor</code>), a subcategory
        (<code>subcategoryAccessor</code>), and a size (<code>valueAccessor</code>).
      </p>

      <QuickStartDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { SwimlaneChart } from "semiotic"

// Static
<SwimlaneChart
  data={[
    { lane: "Backend",  task: "Auth",  value: 3 },
    { lane: "Backend",  task: "DB",    value: 5 },
    { lane: "Backend",  task: "Auth",  value: 2 },
    { lane: "Frontend", task: "UI",    value: 6 },
    { lane: "Frontend", task: "API",   value: 3 },
  ]}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  colorBy="task"
  orientation="horizontal"
  enableHover
  showLegend
/>

// Streaming
const ref = useRef()
ref.current.push({ lane: "Backend", task: "Auth", value: 2 })

<SwimlaneChart
  ref={ref}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  colorBy="task"
  orientation="horizontal"
  enableHover
  showLegend
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Brush + Zoom */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="brush-zoom">Brush + Zoom</h2>

      <p>
        Use <code>brush</code> to enable value-axis selection on the overview
        chart, then pass the brushed range as <code>frameProps.rExtent</code> to
        a detail chart to zoom in.
      </p>

      <BrushZoomDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`const [extent, setExtent] = useState(null)

{/* Overview — brushable */}
<SwimlaneChart
  data={tasks}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  brush
  onBrush={setExtent}
  height={180}
/>

{/* Detail — zoomed to brushed region */}
<SwimlaneChart
  data={tasks}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  frameProps={extent ? { rExtent: extent.r } : undefined}
  height={220}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Themed Borders */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="themed-borders">Themed Borders</h2>

      <p>
        Use <code>frameProps.pieceStyle</code> to add a stroke between swimlane
        items that adapts to dark and light mode. The CSS custom property{" "}
        <code>var(--semiotic-bg)</code> resolves to the chart background color,
        so borders always match the surrounding area.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden", marginBottom: 16 }}>
        <SwimlaneChart
          data={STATIC_DATA}
          categoryAccessor="lane"
          subcategoryAccessor="task"
          valueAccessor="value"
          colorBy="task"
          colorScheme={Object.values(TASK_COLORS)}
          width={600}
          height={200}
          orientation="horizontal"
          enableHover
          showGrid
          margin={{ left: 90 }}
          frameProps={{
            pieceStyle: () => ({
              stroke: "var(--semiotic-bg, #fff)",
              strokeWidth: 1,
            }),
          }}
        />
      </div>

      <CodeBlock
        code={`<SwimlaneChart
  data={data}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  colorBy="task"
  orientation="horizontal"
  frameProps={{
    pieceStyle: () => ({
      stroke: "var(--semiotic-bg, #fff)",  // adapts to dark/light mode
      strokeWidth: 1,
    }),
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Gradient Fill + Threshold */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="gradient-fill">Gradient Fill + Threshold</h2>

      <p>
        Pass <code>gradientFill</code> with <code>stops</code> to render a
        multi-stop gradient along each segment&rsquo;s growth direction
        (left&rarr;right horizontal, bottom&rarr;top vertical). The shape
        matches <Link to="/charts/bar-chart">BarChart</Link> and{" "}
        <Link to="/charts/area-chart">AreaChart</Link>. Combine with an{" "}
        <code>x-threshold</code> annotation to drop an unlabeled dashed
        vertical line at any value &mdash; useful for SLO/budget markers.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden", marginBottom: 16 }}>
        <SwimlaneChart
          data={[{ lane: "Budget", phase: "spend", value: 75 }]}
          categoryAccessor="lane"
          subcategoryAccessor="phase"
          valueAccessor="value"
          width={600}
          height={120}
          orientation="horizontal"
          showCategoryTicks
          showLegend={false}
          margin={{ left: 90, right: 20, top: 10, bottom: 30 }}
          frameProps={{ rExtent: [0, 100] }}
          // Track sized to the lane's bandwidth (not the full plot area),
          // spanning the full value axis, drawn behind the gradient bar.
          // Semi-transparent neutral grey naturally contrasts on both
          // light and dark backgrounds — appears as light grey over white
          // and mid grey over near-black.
          trackFill="rgba(127, 127, 127, 0.25)"
          gradientFill={{
            stops: [
              { offset: 0, color: "#9ca3af" },
              { offset: 50 / 75, color: "#9ca3af" },
              { offset: 50 / 75, color: "#fbbf24" },
              { offset: 62.5 / 75, color: "#f97316" },
              { offset: 1, color: "#dc2626" },
            ],
          }}
          annotations={[
            { type: "x-threshold", value: 50, color: "var(--semiotic-text, #374151)", strokeWidth: 1.5 },
          ]}
        />
      </div>

      <p>
        The same gradient + threshold combo also works in <code>sparkline</code>
        mode &mdash; decoration strips off but the track, gradient, and dashed
        threshold remain. Useful for inline status indicators in tables and
        dashboards.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--text-2)", minWidth: 80 }}>Q3 budget</span>
        <SwimlaneChart
          mode="sparkline"
          data={[{ lane: "spend", phase: "spend", value: 75 }]}
          categoryAccessor="lane"
          subcategoryAccessor="phase"
          valueAccessor="value"
          width={240}
          height={20}
          orientation="horizontal"
          frameProps={{ rExtent: [0, 100] }}
          trackFill="rgba(127, 127, 127, 0.25)"
          gradientFill={{
            stops: [
              { offset: 0, color: "#9ca3af" },
              { offset: 50 / 75, color: "#9ca3af" },
              { offset: 50 / 75, color: "#fbbf24" },
              { offset: 62.5 / 75, color: "#f97316" },
              { offset: 1, color: "#dc2626" },
            ],
          }}
          annotations={[
            { type: "x-threshold", value: 50, color: "var(--semiotic-text, #374151)", strokeWidth: 1.5 },
          ]}
        />
        <span style={{ fontSize: 13, color: "var(--text-2)" }}>75% of $1.2M</span>
      </div>

      <CodeBlock
        code={`<SwimlaneChart
  data={[{ lane: "Budget", phase: "spend", value: 75 }]}
  categoryAccessor="lane"
  subcategoryAccessor="phase"
  valueAccessor="value"
  orientation="horizontal"
  frameProps={{ rExtent: [0, 100] }}
  // Track sized to the lane's bandwidth, full value-axis width.
  // Semi-transparent grey naturally contrasts in both light and dark mode.
  trackFill="rgba(127, 127, 127, 0.25)"
  gradientFill={{
    stops: [
      { offset: 0,       color: "#9ca3af" }, // grey from 0%...
      { offset: 50/75,   color: "#9ca3af" }, // ...to 50% (hard transition)
      { offset: 50/75,   color: "#fbbf24" }, // yellow from 50%...
      { offset: 62.5/75, color: "#f97316" }, // ...through orange...
      { offset: 1,       color: "#dc2626" }, // ...to red at 75%
    ],
  }}
  annotations={[
    { type: "x-threshold", value: 50, color: "var(--semiotic-text)" },
  ]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Rounded corners */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="rounded-corners">Rounded Corners</h2>

      <p>
        Pass <code>roundedTop</code> (pixels) to round the outermost ends of
        each lane &mdash; left and right in horizontal orientation, top and
        bottom in vertical. Middle segments of multi-segment lanes stay square
        so adjacent pieces visually butt against each other. Single-segment
        lanes round all four corners.
      </p>

      <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden", marginBottom: 16 }}>
        <SwimlaneChart
          data={[
            { team: "Design",  task: "Spec",   value: 8 },
            { team: "Design",  task: "Mocks",  value: 12 },
            { team: "Eng",     task: "API",    value: 16 },
            { team: "Eng",     task: "Client", value: 10 },
            { team: "QA",      task: "Plan",   value: 14 },
          ]}
          categoryAccessor="team"
          subcategoryAccessor="task"
          valueAccessor="value"
          width={600}
          height={220}
          roundedTop={8}
          colorBy="task"
          showLegend
          margin={{ left: 80, right: 20, top: 10, bottom: 30 }}
        />
      </div>

      <CodeBlock
        code={`<SwimlaneChart
  data={projectTasks}
  categoryAccessor="team"
  subcategoryAccessor="task"
  valueAccessor="value"
  roundedTop={8}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="SwimlaneChart" props={SwimlaneChartPropsTable} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        For full control — custom item rendering, mixed chart types, or
        advanced annotation logic — graduate to{" "}
        <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> directly.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { SwimlaneChart } from "semiotic"

<SwimlaneChart
  data={tasks}
  categoryAccessor="lane"
  subcategoryAccessor="task"
  valueAccessor="value"
  colorBy="task"
  orientation="horizontal"
  enableHover
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamOrdinalFrame } from "semiotic"

<StreamOrdinalFrame
  chartType="swimlane"
  data={tasks}
  oAccessor="lane"
  rAccessor="value"
  stackBy="task"
  projection="horizontal"
  pieceStyle={(d) => ({
    fill: colorMap[d.task]
  })}
  enableHover
  size={[600, 300]}
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
          <Link to="/charts/bar-chart">BarChart</Link> — simple categorical bars
        </li>
        <li>
          <Link to="/charts/stacked-bar-chart">StackedBarChart</Link> — aggregated stacked bars (one rect per subcategory per lane)
        </li>
        <li>
          <Link to="/charts/grouped-bar-chart">GroupedBarChart</Link> — side-by-side grouped bars
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
      </ul>
    </PageLayout>
  )
}
