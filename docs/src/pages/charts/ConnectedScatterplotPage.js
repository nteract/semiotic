import React, { useRef, useEffect } from "react"
import { ConnectedScatterplot } from "semiotic"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import StreamingToggle from "../../components/StreamingToggle"
import StreamingDemo from "../../components/StreamingDemo"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data — country trajectory over time
// ---------------------------------------------------------------------------

const trajectoryData = Array.from({ length: 20 }, (_, i) => ({
  x: 30 + i * 3 + Math.sin(i * 0.5) * 5,
  y: 60 + i * 1.5 + Math.cos(i * 0.4) * 8,
  year: 2000 + i,
}))

const spiralData = Array.from({ length: 30 }, (_, i) => {
  const t = i * 0.3
  return {
    x: Math.cos(t) * (50 + i * 3) + 100,
    y: Math.sin(t) * (50 + i * 3) + 100,
    step: i,
  }
})

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const chartProps = [
  {
    name: "data",
    type: "array",
    required: true,
    default: null,
    description: "Array of data points in order. Consecutive points are connected by lines.",
  },
  {
    name: "xAccessor",
    type: "string | function",
    required: false,
    default: '"x"',
    description: "Field name or function to access x values.",
  },
  {
    name: "yAccessor",
    type: "string | function",
    required: false,
    default: '"y"',
    description: "Field name or function to access y values.",
  },
  {
    name: "orderAccessor",
    type: "string | function",
    required: false,
    default: null,
    description:
      "Field or function for point ordering (number or Date). Data is sorted ascending. Shown in tooltip.",
  },
  {
    name: "orderLabel",
    type: "string",
    required: false,
    default: "field name",
    description: "Label for the ordering metric in tooltips.",
  },
  {
    name: "pointRadius",
    type: "number",
    required: false,
    default: "4",
    description: "Circle radius. Connecting lines match this width.",
  },
  {
    name: "enableHover",
    type: "boolean",
    required: false,
    default: "true",
    description: "Enable hover tooltips.",
  },
  {
    name: "showGrid",
    type: "boolean",
    required: false,
    default: "false",
    description: "Show grid lines.",
  },
  {
    name: "tooltip",
    type: "object | function",
    required: false,
    default: null,
    description: "Tooltip configuration.",
  },
  {
    name: "responsiveWidth",
    type: "boolean",
    required: false,
    default: "false",
    description: "Auto-match width to container.",
  },
  { name: "width", type: "number", required: false, default: "600", description: "Chart width." },
  { name: "height", type: "number", required: false, default: "400", description: "Chart height." },
]

// ---------------------------------------------------------------------------
// Streaming demo
// ---------------------------------------------------------------------------

// Pre-compute Fibonacci spiral points: quarter-circle arcs through
// Fibonacci-sized squares. Each arc is ~25% larger than the last.
function buildFibSpiralPoints(arcCount, pointsPerArc) {
  const pts = []
  let a = 1,
    b = 1
  // Center of the current arc
  let cx = 0,
    cy = 0
  // Direction rotates 90° each arc: 0=right, 1=up, 2=left, 3=down
  for (let arc = 0; arc < arcCount; arc++) {
    const dir = arc % 4
    const startAngle =
      dir === 0
        ? Math.PI // right-side arc
        : dir === 1
          ? Math.PI * 1.5 // top arc
          : dir === 2
            ? 0 // left arc
            : Math.PI * 0.5 // bottom arc
    for (let j = 0; j < pointsPerArc; j++) {
      const frac = j / pointsPerArc
      const angle = startAngle + frac * (Math.PI / 2)
      pts.push({
        x: cx + b * Math.cos(angle),
        y: cy + b * Math.sin(angle),
        step: pts.length,
      })
    }
    // Move center for next arc
    if (dir === 0)
      cx += b // was drawing right, shift center right
    else if (dir === 1)
      cy += b // shift up
    else if (dir === 2)
      cx -= b // shift left
    else cy -= b // shift down
    const next = a + b
    a = b
    b = next
  }
  return pts
}

// Generate plenty of arcs — each grows by φ ≈ 1.618× so this covers a huge range
const spiralPoints = buildFibSpiralPoints(40, 8)

const streamingConnectedCode = `import { useRef, useEffect, useMemo } from "react"
import { ConnectedScatterplot } from "semiotic"

// Fibonacci spiral: quarter-circle arcs through Fibonacci-sized
// squares, each ~25% larger than the last
function StreamingConnectedScatterplot() {
  const chartRef = useRef()
  const tickRef = useRef(0)
  const spiral = useMemo(() => buildFibSpiralPoints(14, 8), [])

  useEffect(() => {
    const id = setInterval(() => {
      if (chartRef.current && tickRef.current < spiral.length) {
        chartRef.current.push(spiral[tickRef.current++])
      }
    }, 80)
    return () => clearInterval(id)
  }, [spiral])

  return (
    <ConnectedScatterplot
      ref={chartRef}
      xAccessor="x"
      yAccessor="y"
      orderAccessor="step"
      pointRadius={3}
      width={600}
      height={300}
      frameProps={{ windowSize: 50 }}
    />
  )
}`

function StreamingConnectedDemo({ width }) {
  const chartRef = useRef()
  const tickRef = useRef(0)

  useEffect(() => {
    const id = setInterval(() => {
      if (!chartRef.current || tickRef.current >= spiralPoints.length) return
      chartRef.current.push(spiralPoints[tickRef.current++])
    }, 80)
    return () => clearInterval(id)
  }, [])

  return (
    <ConnectedScatterplot
      ref={chartRef}
      xAccessor="x"
      yAccessor="y"
      orderAccessor="step"
      pointRadius={3}
      width={width}
      height={300}
      frameProps={{ windowSize: 50 }}
    />
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ConnectedScatterplotPage() {
  return (
    <PageLayout
      title="ConnectedScatterplot"
      tier="charts"
      breadcrumbs={[
        { label: "Charts", path: "/charts" },
        { label: "XY Charts", path: "/charts" },
        { label: "ConnectedScatterplot", path: "/charts/connected-scatterplot" },
      ]}
      prevPage={{ title: "Scatterplot", path: "/charts/scatterplot" }}
      nextPage={{ title: "Bubble Chart", path: "/charts/bubble-chart" }}
    >
      <p>
        A connected scatterplot draws lines between consecutive data points, revealing the
        trajectory through a two-dimensional space. Points are colored using a viridis gradient from
        start (purple) to end (yellow), and connecting lines match the color and width of their
        source point. When fewer than 100 points are plotted, a semi-transparent white halo is drawn
        under each line for legibility.
      </p>

      <h2 id="quick-start">Quick Start</h2>

      <StreamingToggle
        staticContent={
          <LiveExample
            frameProps={{
              data: trajectoryData,
              xAccessor: "x",
              yAccessor: "y",
              orderAccessor: "year",
              orderLabel: "Year",
              pointRadius: 5,
              xLabel: "GDP per capita",
              yLabel: "Life Expectancy",
              showGrid: true,
            }}
            type={ConnectedScatterplot}
            startHidden={false}
            overrideProps={{
              data: `[
  { x: 30, y: 60, year: 2000 },
  { x: 33, y: 62, year: 2001 },
  // ...20 points tracing a trajectory
]`,
            }}
            hiddenProps={{}}
          />
        }
        streamingContent={
          <StreamingDemo
            renderChart={(w) => <StreamingConnectedDemo width={w} />}
            code={streamingConnectedCode}
          />
        }
      />

      <h2 id="examples">Examples</h2>

      <h3 id="spiral">Spiral Trajectory</h3>
      <p>
        With 30 points, the white halo under each line improves readability where the path crosses
        itself.
      </p>

      <LiveExample
        frameProps={{
          data: spiralData,
          xAccessor: "x",
          yAccessor: "y",
          pointRadius: 4,
          showGrid: true,
        }}
        type={ConnectedScatterplot}
        overrideProps={{
          data: `Array.from({ length: 30 }, (_, i) => {
  const t = i * 0.3
  return {
    x: Math.cos(t) * (50 + i * 3) + 100,
    y: Math.sin(t) * (50 + i * 3) + 100,
  }
})`,
        }}
        hiddenProps={{}}
      />

      <h3 id="larger-radius">Larger Points</h3>
      <p>
        Increase <code>pointRadius</code> for bolder connections. The line width always matches the
        point radius so the circle (diameter = 2×radius) remains visually distinct from the line.
      </p>

      <LiveExample
        frameProps={{
          data: trajectoryData.slice(0, 12),
          xAccessor: "x",
          yAccessor: "y",
          pointRadius: 8,
          xLabel: "X",
          yLabel: "Y",
        }}
        type={ConnectedScatterplot}
        overrideProps={{
          data: "trajectoryData.slice(0, 12)",
          pointRadius: "8",
        }}
        hiddenProps={{}}
      />

      <h2 id="streaming">Streaming</h2>

      <p>
        <code>ConnectedScatterplot</code> supports <code>forwardRef</code> with <code>push</code>/
        <code>pushMany</code>/<code>clear</code>/<code>getData</code>. Push new points and the
        viridis gradient and connecting lines update automatically.
      </p>

      <StreamingDemo
        renderChart={(w) => <StreamingConnectedDemo width={w} />}
        code={streamingConnectedCode}
      />

      <h2 id="design">Design Choices</h2>

      <ul>
        <li>
          <strong>Viridis color scale</strong> — encodes sequence position. Purple = start, yellow =
          end. No legend needed; the color gradient itself communicates directionality.
        </li>
        <li>
          <strong>Line width = point radius</strong> — a circle with radius 4 is 8px in diameter,
          connected by a 4px line. The circle is always wider than the line, maintaining visual
          hierarchy.
        </li>
        <li>
          <strong>White halo (&lt;100 points)</strong> — when paths cross, the semi-transparent
          white underline separates overlapping segments. Disabled for large datasets to maintain
          rendering performance.
        </li>
        <li>
          <strong>No size encoding</strong> — point radius is fixed. This is intentional: in a
          connected scatterplot, varying point size would also vary line width, creating visual
          noise.
        </li>
      </ul>

      <h2 id="props">Props</h2>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Prop</th>
            <th style={{ textAlign: "left", padding: 8 }}>Type</th>
            <th style={{ textAlign: "left", padding: 8 }}>Default</th>
            <th style={{ textAlign: "left", padding: 8 }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {chartProps.map(({ name, type, required, default: def, description }) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--surface-3)" }}>
              <td style={{ padding: 8 }}>
                <code>{name}</code>
                {required && <span style={{ color: "red" }}> *</span>}
              </td>
              <td style={{ padding: 8 }}>
                <code>{type}</code>
              </td>
              <td style={{ padding: 8 }}>{def || "—"}</td>
              <td style={{ padding: 8 }}>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> — without connecting lines
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — for time series without the scatter
          emphasis
        </li>
        <li>
          <Link to="/charts/bubble-chart">BubbleChart</Link> — scatter with size encoding
        </li>
      </ul>
    </PageLayout>
  )
}
