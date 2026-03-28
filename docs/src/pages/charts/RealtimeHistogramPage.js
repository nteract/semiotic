import React, { useRef, useEffect, useState, useMemo } from "react"
import { RealtimeTemporalHistogram, LineChart, AreaChart, LinkedCharts, useFilteredData } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
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
// Live streaming demos
// ---------------------------------------------------------------------------

function BasicBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: Math.floor(Math.random() * 39) + 1,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeTemporalHistogram
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          fill="#007bff"
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StackedBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const categories = ["errors", "warnings", "info"]

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        const cat = categories[i % categories.length]
        const ranges = { errors: 5, warnings: 10, info: 20 }
        chartRef.current.push({
          time: Math.floor(i / 3),
          value: Math.floor(Math.random() * ranges[cat]) + 1,
          category: cat,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeTemporalHistogram
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          categoryAccessor="category"
          colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

function StyledBarDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: Math.floor(Math.abs(Math.sin(i * 0.04)) * 50) + 5,
        })
      }
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
      {containerWidth && (
        <RealtimeTemporalHistogram
          ref={chartRef}
          size={[containerWidth, 280]}
          binSize={20}
          fill="#28a745"
          stroke="#1e7e34"
          gap={2}
          windowSize={200}
          showAxes={true}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Brush demos
// ---------------------------------------------------------------------------

function StaticDataDemo() {
  const [containerRef, containerWidth] = useContainerWidth()
  const [brushExtent, setBrushExtent] = useState(null)
  const [mode, setMode] = useState("static")
  const chartRef = useRef()
  const indexRef = useRef(0)

  const staticData = useMemo(() => {
    const points = []
    for (let i = 0; i < 100; i++) {
      points.push({ time: i, value: Math.floor(Math.random() * 40) + 1 })
    }
    return points
  }, [])

  useEffect(() => {
    if (mode !== "streaming") return
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({ time: i, value: Math.floor(Math.random() * 39) + 1 })
      }
    }, 30)
    return () => clearInterval(id)
  }, [mode])

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
      <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
        {containerWidth && mode === "static" && (
          <RealtimeTemporalHistogram
            data={staticData}
            size={[containerWidth, 280]}
            binSize={10}
            fill="#007bff"
            showAxes={true}
            brush="x"
            onBrush={(extent) => setBrushExtent(extent)}
          />
        )}
        {containerWidth && mode === "streaming" && (
          <RealtimeTemporalHistogram
            ref={chartRef}
            size={[containerWidth, 280]}
            binSize={20}
            fill="#007bff"
            windowSize={200}
            showAxes={true}
            brush="x"
            onBrush={(extent) => setBrushExtent(extent)}
          />
        )}
      </div>
      {brushExtent && (
        <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}>
          Selected time range: [{brushExtent.x[0].toFixed(1)}, {brushExtent.x[1].toFixed(1)}]
        </div>
      )}
    </div>
  )
}

function StreamingBrushDemo() {
  const chartRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [brushExtent, setBrushExtent] = useState(null)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({ time: i, value: Math.floor(Math.random() * 39) + 1 })
      }
    }, 50)
    return () => clearInterval(id)
  }, [])

  const binCount = brushExtent
    ? Math.round((brushExtent.x[1] - brushExtent.x[0]) / 20)
    : 0

  return (
    <div>
      <div ref={containerRef} style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
        {containerWidth && (
          <RealtimeTemporalHistogram
            ref={chartRef}
            size={[containerWidth, 280]}
            binSize={20}
            fill="#6f42c1"
            windowSize={200}
            showAxes={true}
            brush={{ dimension: "x", snap: "bin" }}
            onBrush={(extent) => setBrushExtent(extent)}
          />
        )}
      </div>
      <div style={{ marginTop: 8, padding: "8px 12px", background: "var(--surface-2)", borderRadius: 4, fontFamily: "monospace", fontSize: 13 }}>
        {brushExtent
          ? `Brush: [${brushExtent.x[0].toFixed(0)}, ${brushExtent.x[1].toFixed(0)}] (${binCount} bins)`
          : "Drag on the chart to brush. The selection tracks and shrinks as data scrolls."}
      </div>
    </div>
  )
}

/**
 * Inner component that consumes the "timeRange" selection via useFilteredData.
 * Must be rendered inside <LinkedCharts> so the SelectionProvider is available.
 */
function FilteredLineOverlay({ allData, chartWidth }) {
  const filteredData = useFilteredData(allData, "timeRange")
  const hasBrush = filteredData.length < allData.length

  const timeExtent = allData.length > 1
    ? [allData[0].time, allData[allData.length - 1].time]
    : undefined
  const valueExtent = [0, 50]

  return (
    <div style={{ position: "relative", "--semiotic-border": "rgba(204,204,204,0.25)", "--semiotic-grid": "rgba(224,224,224,0.25)" }}>
      {/* Filtered data: gradient-filled area (only when brush is active) */}
      {hasBrush && filteredData.length > 1 && (
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <AreaChart
            data={filteredData}
            xAccessor="time"
            yAccessor="value"
            width={chartWidth}
            height={200}
            color="#007bff"
            areaOpacity={0.5}
            gradientFill
            showLine={false}
            frameProps={{
              xExtent: timeExtent,
              yExtent: valueExtent,
              showAxes: false,
            }}
          />
        </div>
      )}
      {/* Unfiltered data: thin gray line (always visible) */}
      <LineChart
        data={allData}
        xAccessor="time"
        yAccessor="value"
        width={chartWidth}
        height={200}
        color="#999"
        lineWidth={1}
        frameProps={{
          xExtent: timeExtent,
          yExtent: valueExtent,
          showAxes: true,
        }}
      />
    </div>
  )
}

function LinkedBrushDemo() {
  const histRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [allData, setAllData] = useState([])

  useEffect(() => {
    const id = setInterval(() => {
      const i = indexRef.current++
      const val = Math.floor(Math.random() * 39) + 1
      const point = { time: i, value: val }

      // Push to streaming histogram
      if (histRef.current) {
        histRef.current.push(point)
      }

      // Accumulate for the static line/area overlay (keep last 200)
      setAllData((prev) => {
        const next = [...prev, point]
        return next.length > 200 ? next.slice(next.length - 200) : next
      })
    }, 50)
    return () => clearInterval(id)
  }, [])

  const chartWidth = containerWidth ? containerWidth - 32 : 500

  return (
    <div ref={containerRef}>
      <LinkedCharts>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Histogram (brush to filter)</div>
            {containerWidth && (
              <RealtimeTemporalHistogram
                ref={histRef}
                size={[chartWidth, 200]}
                binSize={20}
                fill="#007bff"
                windowSize={200}
                showAxes={true}
                brush={{ dimension: "x", snap: "bin" }}
                linkedBrush="timeRange"
              />
            )}
          </div>
          <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Line Chart (filtered by brush)</div>
            {containerWidth && allData.length > 1 && (
              <FilteredLineOverlay allData={allData} chartWidth={chartWidth} />
            )}
          </div>
        </div>
      </LinkedCharts>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stacked brush → multi-line demo
// ---------------------------------------------------------------------------

const CATEGORIES = ["errors", "warnings", "info"]
const CATEGORY_COLORS = { errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }

const CATEGORY_SCHEME = [CATEGORY_COLORS.errors, CATEGORY_COLORS.warnings, CATEGORY_COLORS.info]

/**
 * Consumes the "catBrush" selection and renders:
 * - Faded thin lines per category (unfiltered, always visible) with legend
 * - Bold thick lines per category (filtered subset, overlay, no legend)
 * Both use the same colorBy/colorScheme so colors match.
 */
function FilteredMultiLineOverlay({ allData, chartWidth }) {
  const filteredData = useFilteredData(allData, "catBrush")
  const hasBrush = filteredData.length < allData.length

  const timeExtent = allData.length > 1
    ? [allData[0].time, allData[allData.length - 1].time]
    : undefined
  const valueExtent = [0, 25]

  // Shared margin so overlaid charts align (110 right for legend)
  const sharedMargin = { top: 10, right: 110, bottom: 40, left: 50 }

  return (
    <div style={{ position: "relative", "--semiotic-border": "rgba(204,204,204,0.25)", "--semiotic-grid": "rgba(224,224,224,0.25)" }}>
      {/* Filtered: bold colored lines (only when brush is active) */}
      {hasBrush && filteredData.length > 1 && (
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <LineChart
            data={filteredData}
            xAccessor="time"
            yAccessor="value"
            lineBy="category"
            colorBy="category"
            colorScheme={CATEGORY_SCHEME}
            lineWidth={3}
            width={chartWidth}
            height={220}
            margin={sharedMargin}
            showLegend={false}
            frameProps={{
              xExtent: timeExtent,
              yExtent: valueExtent,
              showAxes: false,
            }}
          />
        </div>
      )}
      {/* Unfiltered: thin colored lines (always visible) + legend */}
      <LineChart
        data={allData}
        xAccessor="time"
        yAccessor="value"
        lineBy="category"
        colorBy="category"
        colorScheme={CATEGORY_SCHEME}
        lineWidth={1}
        width={chartWidth}
        height={220}
        margin={sharedMargin}
        showLegend
        showGrid
        frameProps={{
          xExtent: timeExtent,
          yExtent: valueExtent,
          showAxes: true,
        }}
      />
    </div>
  )
}

function StackedBrushDemo() {
  const histRef = useRef()
  const indexRef = useRef(0)
  const [containerRef, containerWidth] = useContainerWidth()
  const [allData, setAllData] = useState([])

  useEffect(() => {
    const id = setInterval(() => {
      if (histRef.current) {
        const i = indexRef.current++
        // Emit one point per category per tick so lines stay in sync
        const batch = CATEGORIES.map((cat) => {
          const ranges = { errors: 5, warnings: 12, info: 22 }
          return { time: i, value: Math.floor(Math.random() * ranges[cat]) + 1, category: cat }
        })
        histRef.current.pushMany(batch)

        setAllData((prev) => {
          const next = [...prev, ...batch]
          // Keep last ~200 ticks worth (200 * 3 categories = 600 points)
          return next.length > 600 ? next.slice(next.length - 600) : next
        })
      }
    }, 60)
    return () => clearInterval(id)
  }, [])

  const chartWidth = containerWidth ? containerWidth - 32 : 500

  return (
    <div ref={containerRef}>
      <LinkedCharts>
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Stacked Histogram (brush to filter)</div>
            {containerWidth && (
              <RealtimeTemporalHistogram
                ref={histRef}
                size={[chartWidth, 200]}
                binSize={20}
                categoryAccessor="category"
                colors={CATEGORY_COLORS}
                windowSize={200}
                showAxes={true}
                brush={{ dimension: "x", snap: "bin" }}
                linkedBrush="catBrush"
              />
            )}
          </div>
          <div style={{ background: "var(--surface-1)", borderRadius: 8, padding: 16, border: "1px solid var(--surface-3)", overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>Per-Category Lines (filtered by brush)</div>
            {containerWidth && allData.length > 1 && (
              <FilteredMultiLineOverlay allData={allData} chartWidth={chartWidth} />
            )}
          </div>
        </div>
      </LinkedCharts>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const RealtimeHistogramProps = [
  { name: "binSize", type: "number", required: true, default: null, description: "Time interval for binning data points into bars. Points within the same bin are aggregated." },
  { name: "data", type: "array", required: false, default: "[]", description: "Controlled data array. Each object should contain fields matched by timeAccessor and valueAccessor." },
  { name: "timeAccessor", type: "string | function", required: false, default: '"time"', description: "Field name or function to access the time value from each data point." },
  { name: "valueAccessor", type: "string | function", required: false, default: '"value"', description: "Field name or function to access the numeric value from each data point." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "margin", type: "object", required: false, default: null, description: "Chart margins: { top, right, bottom, left }." },
  { name: "arrowOfTime", type: '"left" | "right"', required: false, default: '"right"', description: "Direction that time flows across the chart." },
  { name: "windowMode", type: '"sliding" | "growing"', required: false, default: '"sliding"', description: 'Data retention strategy. "sliding" discards old points beyond windowSize.' },
  { name: "windowSize", type: "number", required: false, default: "200", description: "Ring buffer capacity when using sliding window mode." },
  { name: "timeExtent", type: "[number, number]", required: false, default: null, description: "Fixed time domain. Defaults to auto-fit." },
  { name: "valueExtent", type: "[number, number]", required: false, default: null, description: "Fixed value domain. Defaults to auto-fit." },
  { name: "extentPadding", type: "number", required: false, default: null, description: "Padding factor applied to auto-computed extents." },
  { name: "categoryAccessor", type: "string | function", required: false, default: null, description: "Category accessor for stacked bars. When provided, bars are stacked by category within each bin." },
  { name: "colors", type: "object", required: false, default: null, description: "Category-to-color map for stacked bars. Keys also determine stack order." },
  { name: "fill", type: "string", required: false, default: null, description: "Bar fill color in non-stacked mode." },
  { name: "stroke", type: "string", required: false, default: null, description: "Bar stroke (outline) color." },
  { name: "strokeWidth", type: "number", required: false, default: null, description: "Bar stroke width." },
  { name: "gap", type: "number", required: false, default: null, description: "Gap between bars in pixels." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show canvas-drawn axes." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color for the chart area." },
  { name: "enableHover", type: "boolean | object", required: false, default: null, description: "Enable hover annotations on bars." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip render function. Receives hover data." },
  { name: "onHover", type: "function", required: false, default: null, description: "Callback fired on hover. Receives hover data or null." },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects rendered on the chart." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation render function." },
  { name: "tickFormatTime", type: "function", required: false, default: null, description: "Custom formatter for time axis tick labels." },
  { name: "tickFormatValue", type: "function", required: false, default: null, description: "Custom formatter for value axis tick labels." },
  { name: "className", type: "string", required: false, default: null, description: "CSS class name for the chart container." },
  { name: "brush", type: 'boolean | "x" | object', required: false, default: null, description: 'Brush configuration. `true` defaults to `{ dimension: "x", snap: "bin" }`. Object form accepts `dimension` ("x"|"y"|"xy") and `snap` ("continuous"|"bin").' },
  { name: "onBrush", type: "function", required: false, default: null, description: "Callback when brush selection changes. Receives `{ x: [min, max], y: [min, max] }` or `null` when cleared." },
  { name: "linkedBrush", type: "string | object", required: false, default: null, description: "Linked brush for cross-chart coordination via LinkedCharts. String shorthand sets the selection name." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RealtimeHistogramPage() {
  return (
    <PageLayout
      title="RealtimeTemporalHistogram"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "Realtime", path: "/charts" },
        { label: "RealtimeHistogram", path: "/charts/realtime-bar-chart" },
      ]}
      prevPage={{ title: "Realtime Line Chart", path: "/charts/realtime-line-chart" }}
      nextPage={{ title: "Realtime Swarm Chart", path: "/charts/realtime-swarm-chart" }}
    >
      <ComponentMeta
        componentName="RealtimeHistogram"
        importStatement='import { RealtimeHistogram } from "semiotic"'
        tier="charts"
        wraps="StreamXYFrame"
        wrapsPath="/frames/realtime-frame"
        related={[
          { name: "RealtimeLineChart", path: "/charts/realtime-line-chart" },
          { name: "RealtimeSwarmChart", path: "/charts/realtime-swarm-chart" },
          { name: "RealtimeWaterfallChart", path: "/charts/realtime-waterfall-chart" },
          { name: "StreamXYFrame", path: "/frames/realtime-frame" },
        ]}
      />

      <p>
        RealtimeHistogram renders a streaming temporal histogram. Incoming data
        points are binned by time interval and rendered as bars that scroll
        across the chart. It wraps{" "}
        <Link to="/frames/realtime-frame">StreamXYFrame</Link> with{" "}
        <code>chartType="bar"</code> and supports both simple and stacked
        (categorical) modes. Edge bins that only partially fall within the
        visible time window are rendered at proportionally narrower widths.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        Create a ref, push data points on an interval, and
        RealtimeHistogram bins and renders them as bars. The{" "}
        <code>binSize</code> prop defines the time interval for aggregation.
      </p>

      <BasicBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { RealtimeHistogram } from "semiotic"
import { useRef, useEffect } from "react"

function StreamingBars() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      chartRef.current?.push({
        time: indexRef.current++,
        value: Math.floor(Math.random() * 39) + 1
      })
    }, 30)
    return () => clearInterval(id)
  }, [])

  return (
    <RealtimeTemporalHistogram
      ref={chartRef}
      binSize={20}
      fill="#007bff"
      windowSize={200}
      showAxes={true}
    />
  )
}`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="stacked-bars">Stacked Bars by Category</h3>
      <p>
        Use <code>categoryAccessor</code> and <code>colors</code> to stack
        bars by category within each bin. The stack order follows the key
        order of the <code>colors</code> object.
      </p>

      <StackedBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`const categories = ["errors", "warnings", "info"]

useEffect(() => {
  const id = setInterval(() => {
    const cat = categories[indexRef.current % 3]
    chartRef.current?.push({
      time: Math.floor(indexRef.current++ / 3),
      value: Math.floor(Math.random() * 10) + 1,
      category: cat
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeTemporalHistogram
  ref={chartRef}
  binSize={20}
  categoryAccessor="category"
  colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
  windowSize={200}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="styled-bars">Custom Bar Styling</h3>
      <p>
        Control the appearance with <code>fill</code>, <code>stroke</code>,
        and <code>gap</code> to create distinct visual styles.
      </p>

      <StyledBarDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`useEffect(() => {
  const id = setInterval(() => {
    const i = indexRef.current++
    chartRef.current?.push({
      time: i,
      value: Math.floor(Math.abs(Math.sin(i * 0.04)) * 50) + 5
    })
  }, 30)
  return () => clearInterval(id)
}, [])

<RealtimeTemporalHistogram
  ref={chartRef}
  binSize={20}
  fill="#28a745"
  stroke="#1e7e34"
  gap={2}
  windowSize={200}
/>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Brush */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="brush">Brushable Selection</h2>

      <h3 id="static-brush">Static Data with Brush</h3>
      <p>
        Toggle between static <code>data</code> and streaming push API. In static
        mode, 100 pre-generated points are rendered with <code>brush="x"</code>.
        The selected time range is displayed below the chart.
      </p>

      <StaticDataDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeTemporalHistogram
  data={staticData}
  binSize={10}
  fill="#007bff"
  brush="x"
  onBrush={(extent) => console.log(extent)}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="streaming-brush">Streaming Brush with Bin Snapping</h3>
      <p>
        In streaming mode, the brush tracks with the data. When selected bins
        scroll off the left edge, the brush shrinks. When all selected bins are
        evicted, the brush clears automatically. Use{" "}
        <code>snap: "bin"</code> to snap to bin boundaries on mouse-up.
      </p>

      <StreamingBrushDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`<RealtimeTemporalHistogram
  ref={chartRef}
  binSize={20}
  fill="#6f42c1"
  brush={{ dimension: "x", snap: "bin" }}
  onBrush={(extent) => setBrushExtent(extent)}
/>`}
          language="jsx"
        />
      </div>

      <h3 id="linked-brush">Cross-Chart Brush Filtering</h3>
      <p>
        Wrap both charts in <code>&lt;LinkedCharts&gt;</code>. The histogram
        writes its brush extent to the <code>"timeRange"</code> selection via{" "}
        <code>linkedBrush</code>. A child component reads it with{" "}
        <code>useFilteredData</code> and overlays a gradient-filled area
        (filtered subset) on a thin gray line (all data).
      </p>

      <LinkedBrushDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { LinkedCharts, RealtimeTemporalHistogram,
  LineChart, AreaChart, useFilteredData } from "semiotic"

// Consumer component — must be inside <LinkedCharts>
function FilteredOverlay({ allData, width }) {
  const filtered = useFilteredData(allData, "timeRange")
  const hasBrush = filtered.length < allData.length

  return (
    <div style={{ position: "relative" }}>
      {hasBrush && filtered.length > 1 && (
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <AreaChart data={filtered} xAccessor="time" yAccessor="value"
            color="#007bff" gradientFill areaOpacity={0.5} showLine={false}
            width={width} height={200}
            frameProps={{ xExtent, yExtent, showAxes: false }} />
        </div>
      )}
      <LineChart data={allData} xAccessor="time" yAccessor="value"
        color="#999" lineWidth={1} width={width} height={200}
        frameProps={{ xExtent, yExtent, showAxes: true }} />
    </div>
  )
}

// Dashboard
<LinkedCharts>
  <RealtimeTemporalHistogram ref={histRef} binSize={20}
    brush={{ dimension: "x", snap: "bin" }}
    linkedBrush="timeRange" />
  <FilteredOverlay allData={allData} width={600} />
</LinkedCharts>`}
          language="jsx"
        />
      </div>

      <h3 id="stacked-brush">Stacked Histogram → Multi-Line Filtering</h3>
      <p>
        A stacked histogram with three categories (<code>errors</code>,{" "}
        <code>warnings</code>, <code>info</code>) drives a line chart
        that splits into three colored lines. Both layers use the same{" "}
        <code>colorBy</code>/<code>colorScheme</code>; the unfiltered
        lines are thin (1px) and the brushed subset is bold (3px). A
        fixed <code>margin</code> on both charts keeps them aligned, with{" "}
        <code>showLegend=&#123;false&#125;</code> on the overlay to
        prevent double legend/margin mismatch.
      </p>

      <StackedBrushDemo />
      <div style={{ marginTop: 8 }}>
        <CodeBlock
          code={`import { LinkedCharts, RealtimeTemporalHistogram,
  LineChart, useFilteredData } from "semiotic"

const COLORS = { errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }
const SCHEME = Object.values(COLORS)
const MARGIN = { top: 10, right: 110, bottom: 40, left: 50 }

function FilteredMultiLineOverlay({ allData, width }) {
  const filtered = useFilteredData(allData, "catBrush")
  const hasBrush = filtered.length < allData.length

  return (
    <div style={{ position: "relative" }}>
      {/* Overlay: bold colored lines for brushed range */}
      {hasBrush && filtered.length > 1 && (
        <div style={{ position: "absolute", top: 0, left: 0 }}>
          <LineChart data={filtered} xAccessor="time" yAccessor="value"
            lineBy="category" colorBy="category" colorScheme={SCHEME}
            lineWidth={3} width={width} height={220}
            margin={MARGIN} showLegend={false}
            frameProps={{ xExtent, yExtent, showAxes: false }} />
        </div>
      )}
      {/* Base: thin colored lines + axes + legend */}
      <LineChart data={allData} xAccessor="time" yAccessor="value"
        lineBy="category" colorBy="category" colorScheme={SCHEME}
        lineWidth={1} width={width} height={220}
        margin={MARGIN} showLegend showGrid
        frameProps={{ xExtent, yExtent, showAxes: true }} />
    </div>
  )
}

<LinkedCharts>
  <RealtimeTemporalHistogram ref={histRef} binSize={20}
    categoryAccessor="category" colors={COLORS}
    brush={{ dimension: "x", snap: "bin" }}
    linkedBrush="catBrush" />
  <FilteredMultiLineOverlay allData={allData} width={600} />
</LinkedCharts>`}
          language="jsx"
        />
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="RealtimeHistogram" props={RealtimeHistogramProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Graduating to the Frame */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="graduating">Graduating to the Frame</h2>

      <p>
        When you need more control — custom bin aggregation, mixed chart
        types, or advanced annotation logic — graduate to{" "}
        <Link to="/frames/realtime-frame">StreamXYFrame</Link> directly.
        Every <code>RealtimeHistogram</code> is just a configured{" "}
        <code>StreamXYFrame</code> under the hood.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-charts)" }}>Chart (simple)</h4>
          <CodeBlock
            code={`import { RealtimeHistogram } from "semiotic"

<RealtimeTemporalHistogram
  ref={chartRef}
  data={eventStream}
  binSize={5000}
  timeAccessor="time"
  valueAccessor="count"
  fill="#007bff"
  gap={2}
  enableHover
/>`}
            language="jsx"
          />
        </div>
        <div>
          <h4 style={{ marginTop: 0, color: "var(--tier-frames)" }}>Frame (full control)</h4>
          <CodeBlock
            code={`import { StreamXYFrame } from "semiotic"

<StreamXYFrame
  ref={frameRef}
  chartType="bar"
  data={eventStream}
  binSize={5000}
  timeAccessor="time"
  valueAccessor="count"
  barStyle={{
    fill: "#007bff",
    gap: 2
  }}
  hoverAnnotation={true}
  showAxes={true}
  size={[500, 300]}
/>`}
            language="jsx"
          />
        </div>
      </div>

      <p>
        The <code>categoryAccessor</code> and <code>colors</code> props on
        RealtimeHistogram map directly to <code>categoryAccessor</code> and{" "}
        <code>barColors</code> on StreamXYFrame for stacked bar support.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/realtime-line-chart">RealtimeLineChart</Link> —
          streaming continuous line for time-series data
        </li>
        <li>
          <Link to="/charts/realtime-swarm-chart">RealtimeSwarmChart</Link> —
          individual data points as a streaming scatter/swarm
        </li>
        <li>
          <Link to="/charts/realtime-waterfall-chart">RealtimeWaterfallChart</Link> —
          cumulative deltas as connected rising and falling bars
        </li>
        <li>
          <Link to="/frames/realtime-frame">StreamXYFrame</Link> — the
          underlying Frame with full control over every rendering detail
        </li>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> — for static (non-realtime)
          bar chart visualization
        </li>
      </ul>
    </PageLayout>
  )
}
