import React, { useRef, useEffect } from "react"
import { LineChart, BarChart, Scatterplot, StreamXYFrame } from "semiotic"

import LiveExample from "../../components/LiveExample"
import StreamingDemo from "../../components/StreamingDemo"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  { week: 3, score: 15 },
  { week: 4, score: 24 },
  { week: 5, score: 20 },
  { week: 6, score: 28 },
  { week: 7, score: 32 },
  { week: 8, score: 27 },
  { week: 9, score: 35 },
  { week: 10, score: 30 },
]

const barData = [
  { product: "Alpha", units: 450 },
  { product: "Beta", units: 380 },
  { product: "Gamma", units: 520 },
  { product: "Delta", units: 290 },
  { product: "Epsilon", units: 610 },
]

const scatterData = [
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" },
]

// ---------------------------------------------------------------------------
// Streaming annotation demo
// ---------------------------------------------------------------------------

const streamingAnnotationCode = `import { useRef, useEffect } from "react"
import { StreamXYFrame } from "semiotic"

function StreamingAnnotatedChart() {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.05) * 25 + (Math.random() - 0.5) * 10,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="line"
      runtimeMode="streaming"
      size={[600, 300]}
      timeAccessor="time"
      valueAccessor="value"
      windowSize={150}
      showAxes
      lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
      annotations={[
        { type: "y-threshold", y: 70, label: "Warning", color: "#f97316" },
        { type: "y-threshold", y: 30, label: "Low", color: "#ef4444" },
        { type: "band", y0: 40, y1: 60, fill: "#22c55e", fillOpacity: 0.1, label: "Normal range" },
      ]}
    />
  )
}`

function StreamingAnnotatedChart({ width }) {
  const chartRef = useRef()
  const indexRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current) {
        const i = indexRef.current++
        chartRef.current.push({
          time: i,
          value: 50 + Math.sin(i * 0.05) * 25 + (Math.random() - 0.5) * 10,
        })
      }
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <StreamXYFrame
      ref={chartRef}
      chartType="line"
      runtimeMode="streaming"
      size={[width || 600, 300]}
      timeAccessor="time"
      valueAccessor="value"
      windowSize={150}
      showAxes
      lineStyle={{ stroke: "#6366f1", strokeWidth: 2 }}
      annotations={[
        { type: "y-threshold", y: 70, label: "Warning", color: "#f97316" },
        { type: "y-threshold", y: 30, label: "Low", color: "#ef4444" },
        { type: "band", y0: 40, y1: 60, fill: "#22c55e", fillOpacity: 0.1, label: "Normal range" },
      ]}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnotationsPage() {
  return (
    <PageLayout
      title="Annotations"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Annotations", path: "/features/annotations" },
      ]}
      prevPage={{ title: "Axes", path: "/features/axes" }}
      nextPage={{ title: "Tooltips", path: "/features/tooltips" }}
    >
      <p>
        Annotations are first-class citizens in Semiotic. Every chart component
        accepts an <code>annotations</code> prop — an array of annotation
        objects that are rendered automatically based on their{" "}
        <code>type</code>. Built-in types like thresholds, labels, callouts,
        enclosures, trend lines, and bands all work out of the box. No{" "}
        <code>frameProps</code> wrapping needed.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Thresholds */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="thresholds">Thresholds</h2>

      <p>
        Thresholds are the most common annotation type. Use{" "}
        <code>y-threshold</code> for a horizontal reference line at a target
        value, and <code>x-threshold</code> for a vertical line at a specific
        data point.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "week",
          yAccessor: "score",
          xLabel: "Week",
          yLabel: "Score",
          annotations: [
            { type: "y-threshold", y: 25, label: "Target", color: "#22c55e" },
            { type: "x-threshold", week: 7, label: "Launch", color: "#6366f1" },
          ],
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  { week: 3, score: 15 },
  { week: 4, score: 24 },
  { week: 5, score: 20 },
  { week: 6, score: 28 },
  { week: 7, score: 32 },
  { week: 8, score: 27 },
  { week: 9, score: 35 },
  { week: 10, score: 30 }
]`,
          annotations: `[
  { type: "y-threshold", y: 25, label: "Target", color: "#22c55e" },
  { type: "x-threshold", week: 7, label: "Launch", color: "#6366f1" }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Labels & Callouts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="labels-callouts">Labels & Callouts</h2>

      <p>
        Point annotations let you call attention to individual data points. Use{" "}
        <code>label</code> for a text annotation with a connector line, or{" "}
        <code>callout</code> for a callout with a circular subject highlight.
        Offset the label position with <code>dx</code> and <code>dy</code>.
      </p>

      <LiveExample
        frameProps={{
          data: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          xLabel: "X Value",
          yLabel: "Y Value",
          annotations: [
            { type: "label", x: 55, y: 45, label: "Outlier", dx: 30, dy: -30 },
            { type: "callout", x: 85, y: 50, label: "Peak", radius: 15 },
          ],
        }}
        type={Scatterplot}
        startHidden={false}
        overrideProps={{
          data: `[
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" }
]`,
          annotations: `[
  { type: "label", x: 55, y: 45, label: "Outlier", dx: 30, dy: -30 },
  { type: "callout", x: 85, y: 50, label: "Peak", radius: 15 }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Enclosures */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="enclosures">Enclosures</h2>

      <p>
        Enclosure annotations group clusters of data points visually. Use{" "}
        <code>enclose</code> to draw a circle around a set of points, or{" "}
        <code>rect-enclose</code> for a rectangular bounding box. Pass a{" "}
        <code>coordinates</code> array with the data points to enclose.
      </p>

      <LiveExample
        frameProps={{
          data: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          xLabel: "X Value",
          yLabel: "Y Value",
          annotations: [
            {
              type: "enclose",
              coordinates: [
                { x: 55, y: 45 },
                { x: 70, y: 30 },
                { x: 85, y: 50 },
              ],
              label: "High performers",
              padding: 10,
            },
            {
              type: "rect-enclose",
              coordinates: [
                { x: 10, y: 20 },
                { x: 25, y: 35 },
              ],
              label: "Early stage",
              padding: 8,
            },
          ],
        }}
        type={Scatterplot}
        startHidden={false}
        overrideProps={{
          data: `[
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" }
]`,
          annotations: `[
  {
    type: "enclose",
    coordinates: [
      { x: 55, y: 45 },
      { x: 70, y: 30 },
      { x: 85, y: 50 }
    ],
    label: "High performers",
    padding: 10
  },
  {
    type: "rect-enclose",
    coordinates: [
      { x: 10, y: 20 },
      { x: 25, y: 35 }
    ],
    label: "Early stage",
    padding: 8
  }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Analytical Annotations */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="analytical-annotations">Analytical Annotations</h2>

      <p>
        Semiotic includes built-in analytical annotations that compute derived
        visuals from your data. Use <code>trend</code> for a linear regression
        line on a scatterplot, or <code>band</code> for a shaded target range
        on a line chart.
      </p>

      <h3 id="trend-line">Trend Line</h3>

      <LiveExample
        frameProps={{
          data: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          xLabel: "X Value",
          yLabel: "Y Value",
          annotations: [
            { type: "trend", method: "linear", color: "#ef4444", label: "Trend" },
          ],
        }}
        type={Scatterplot}
        startHidden={false}
        overrideProps={{
          data: `[
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" }
]`,
          annotations: `[
  { type: "trend", method: "linear", color: "#ef4444", label: "Trend" }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="target-band">Target Band</h3>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "week",
          yAccessor: "score",
          xLabel: "Week",
          yLabel: "Score",
          annotations: [
            {
              type: "band",
              y0: 20,
              y1: 30,
              fill: "#22c55e",
              fillOpacity: 0.15,
              label: "Target range",
            },
          ],
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  // ...more data points
]`,
          annotations: `[
  {
    type: "band",
    y0: 20,
    y1: 30,
    fill: "#22c55e",
    fillOpacity: 0.15,
    label: "Target range"
  }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Ordinal Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="ordinal-charts">Ordinal Charts</h2>

      <p>
        Ordinal chart components like <code>BarChart</code> also accept
        the <code>annotations</code> prop directly. A common use is adding a
        goal line with <code>y-threshold</code>.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          categoryAccessor: "product",
          valueAccessor: "units",
          annotations: [
            { type: "y-threshold", y: 400, label: "Goal", color: "#f97316" },
          ],
        }}
        type={BarChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { product: "Alpha", units: 450 },
  { product: "Beta", units: 380 },
  { product: "Gamma", units: 520 },
  { product: "Delta", units: 290 },
  { product: "Epsilon", units: 610 }
]`,
          annotations: `[
  { type: "y-threshold", y: 400, label: "Goal", color: "#f97316" }
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Streaming Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="streaming">Streaming Charts</h2>

      <p>
        Annotations work identically on streaming charts. Thresholds and bands
        stay fixed while data scrolls past them — useful for monitoring
        dashboards where reference lines mark normal operating ranges, warning
        levels, or SLA targets.
      </p>

      <StreamingDemo
        renderChart={(w) => <StreamingAnnotatedChart width={w} />}
        code={streamingAnnotationCode}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Custom Rules */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="custom-rules">Custom Rules</h2>

      <p>
        For cases where the built-in types are not enough, use the{" "}
        <code>frameProps</code> escape hatch to pass{" "}
        <code>svgAnnotationRules</code> or <code>htmlAnnotationRules</code>.
        These receive the annotation data, scales, and frame state. Return
        JSX for custom rendering, or <code>null</code> to fall through to
        default handling.
      </p>

      <CodeBlock
        code={`<LineChart
  data={lineData}
  xAccessor="week"
  yAccessor="score"
  annotations={[
    { type: "custom-marker", week: 5, score: 20, note: "Review" }
  ]}
  frameProps={{
    svgAnnotationRules: ({ d, xScale, yScale }) => {
      if (d.type === "custom-marker") {
        const cx = xScale(d.week)
        const cy = yScale(d.score)
        return (
          <g>
            <circle cx={cx} cy={cy} r={12} fill="none" stroke="#ef4444" strokeWidth={2} />
            <text x={cx} y={cy - 18} textAnchor="middle" fill="#ef4444" fontSize={12}>
              {d.note}
            </text>
          </g>
        )
      }
      return null  // Fall through to default handling
    }
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Built-in Types Reference */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="built-in-types">Built-in Types Reference</h2>

      <p>
        The following annotation types are recognized automatically by chart
        and frame components. Pass them in the <code>annotations</code> array
        with the corresponding <code>type</code> value.
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Charts</th>
            <th style={thStyle}>Key Props</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["y-threshold", "All", "y, label, color", "Horizontal reference line at a value"],
            ["x-threshold", "XY", "x (or data key), label, color", "Vertical reference line at a data point"],
            ["label", "All", "x, y, label, dx, dy", "Text annotation with connector line"],
            ["callout", "All", "x, y, label, radius", "Callout with circular subject highlight"],
            ["callout-circle", "All", "x, y, label, radius", "Same as callout with explicit circle subject"],
            ["callout-rect", "All", "x, y, label, width, height", "Callout with rectangular subject"],
            ["enclose", "All", "coordinates, label, padding", "Circle enclosing a set of data points"],
            ["rect-enclose", "All", "coordinates, label, padding", "Rectangle enclosing a set of data points"],
            ["enclose-hull", "All", "coordinates, label", "Convex hull enclosing data points"],
            ["trend", "XY", "method, color, label", "Linear regression line computed from data"],
            ["band", "XY", "y0, y1, fill, fillOpacity, label", "Shaded horizontal band between two values"],
            ["highlight", "All", "style", "Redraws a mark on annotation layer with custom style"],
            ["desaturation-layer", "All", "style", "Semi-transparent overlay for focus+context"],
            ["frame-hover", "All", "(none)", "Tooltip div centered on the hovered data point"],
            ["category", "Ordinal", "categories, label, position, depth", "Bracket annotation around columns"],
          ].map(([type, charts, props, desc], i) => (
            <tr key={type} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={tdCodeStyle}>{type}</td>
              <td style={tdStyle}>{charts}</td>
              <td style={tdCodeStyle}>{props}</td>
              <td style={tdStyle}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — simplified tooltip
          configuration using <code>Tooltip</code> and{" "}
          <code>MultiLineTooltip</code> utilities
        </li>
        <li>
          <Link to="/features/interaction">Interaction</Link> — highlighting,
          cross-highlighting, and brushing
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — full annotation
          system with custom rules and hover annotations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — category
          brackets and ordinal annotations
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> — node
          annotations and enclosures
        </li>
      </ul>
    </PageLayout>
  )
}

// ---------------------------------------------------------------------------
// Table styles
// ---------------------------------------------------------------------------

const thStyle = {
  padding: "12px 16px",
  textAlign: "left",
  borderBottom: "1px solid var(--surface-3)",
  fontWeight: 600,
}

const tdStyle = {
  padding: "8px 16px",
  borderBottom: "1px solid var(--surface-3)",
}

const tdCodeStyle = {
  padding: "8px 16px",
  borderBottom: "1px solid var(--surface-3)",
  fontFamily: "var(--font-code)",
  fontSize: "0.9em",
}
