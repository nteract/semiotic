import React, { useState } from "react"
import {
  StreamXYFrame,
  BarChart,
  LineChart,
  Scatterplot,
} from "semiotic"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  {
    label: "Revenue",
    coordinates: [
      { month: 1, value: 12 },
      { month: 2, value: 18 },
      { month: 3, value: 14 },
      { month: 4, value: 22 },
      { month: 5, value: 19 },
      { month: 6, value: 27 },
      { month: 7, value: 24 },
      { month: 8, value: 31 },
    ],
  },
]

const multiLineData = [
  {
    id: "Product A",
    coordinates: [
      { x: 1, y: 12 },
      { x: 2, y: 18 },
      { x: 3, y: 14 },
      { x: 4, y: 22 },
      { x: 5, y: 26 },
      { x: 6, y: 30 },
    ],
  },
  {
    id: "Product B",
    coordinates: [
      { x: 1, y: 8 },
      { x: 2, y: 15 },
      { x: 3, y: 20 },
      { x: 4, y: 18 },
      { x: 5, y: 22 },
      { x: 6, y: 25 },
    ],
  },
]

const barData = [
  { region: "North", quarter: "Q1", revenue: 120, target: 100 },
  { region: "South", quarter: "Q1", revenue: 90, target: 100 },
  { region: "East", quarter: "Q1", revenue: 145, target: 130 },
  { region: "West", quarter: "Q1", revenue: 110, target: 120 },
  { region: "North", quarter: "Q2", revenue: 135, target: 110 },
  { region: "South", quarter: "Q2", revenue: 88, target: 105 },
  { region: "East", quarter: "Q2", revenue: 160, target: 140 },
  { region: "West", quarter: "Q2", revenue: 115, target: 125 },
]

const scatterData = Array.from({ length: 30 }, (_, i) => ({
  x: Math.round(10 + Math.random() * 80),
  y: Math.round(10 + Math.random() * 80),
  size: Math.round(5 + Math.random() * 25),
  group: ["Engineering", "Design", "Marketing"][i % 3],
  above: Math.random() > 0.5,
}))

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const stylingProps = [
  {
    name: "colorBy",
    type: "string | function",
    required: false,
    default: "undefined",
    description:
      "Field name or function to map data to categorical colors. Used by all HOC charts.",
  },
  {
    name: "colorScheme",
    type: "string[]",
    required: false,
    default: "theme categorical",
    description:
      "Array of colors for the categorical scale. Overrides theme colors for a single chart.",
  },
  {
    name: "pieceStyle / lineStyle / pointStyle / nodeStyle / edgeStyle",
    type: "object | function",
    required: false,
    default: "{}",
    description:
      "Inline SVG style applied to marks. When a function, receives the data element. Use for fill, stroke, opacity, etc. On HOC charts, pass via frameProps (e.g. frameProps={{ pieceStyle: fn }} for ordinal, frameProps={{ pointStyle: fn }} for XY). Omitting 'fill' lets colorBy colors show through.",
  },
  {
    name: "className / lineClass / pointClass",
    type: "string | function",
    required: false,
    default: '""',
    description:
      "CSS class applied to marks. When a function, receives the data element. Use for external CSS styling.",
  },
  {
    name: "foregroundGraphics",
    type: "ReactNode | function",
    required: false,
    default: "null",
    description:
      "SVG elements rendered on top of all data marks. Can be a function receiving { size, margin }. Coordinates are in the chart area coordinate space (origin at top-left of chart area, not the SVG edge).",
  },
  {
    name: "backgroundGraphics",
    type: "ReactNode | function",
    required: false,
    default: "null",
    description:
      "SVG elements rendered behind all data marks. Can be a function receiving { size, margin }. Same coordinate space as foregroundGraphics.",
  },
  {
    name: "renderMode",
    type: '"sketchy" | function',
    required: false,
    default: "undefined",
    description:
      'Set to "sketchy" to render marks in a hand-drawn style. Can be a function that returns "sketchy" per data item. Pass via frameProps on HOC charts.',
  },
  {
    name: "additionalDefs",
    type: "array",
    required: false,
    default: "[]",
    description:
      "Array of SVG <defs> elements (gradients, patterns, filters) injected into the frame's SVG. Reference via url(#id) in style props.",
  },
]

// ---------------------------------------------------------------------------
// Interactive styling demo
// ---------------------------------------------------------------------------

function StylingDemo() {
  const [scheme, setScheme] = useState("default")

  const schemes = {
    default: ["#ac58e5", "#E0488B", "#9fd0cb", "#e0d33a"],
    corporate: ["#2563eb", "#0d9488", "#ea580c", "#6b7280"],
    earth: ["#8b4513", "#556b2f", "#4a5568", "#800020"],
    vibrant: ["#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"],
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.keys(schemes).map((s) => (
          <button
            key={s}
            onClick={() => setScheme(s)}
            style={{
              padding: "6px 14px",
              border: `2px solid ${scheme === s ? "var(--accent, #6366f1)" : "var(--surface-3, #ccc)"}`,
              borderRadius: 6,
              background: scheme === s ? "var(--accent, #6366f1)" : "transparent",
              color: scheme === s ? "#fff" : "var(--text-primary, #333)",
              cursor: "pointer",
              fontWeight: scheme === s ? 600 : 400,
              fontSize: 13,
              textTransform: "capitalize",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {s}
              <span style={{ display: "flex", gap: 2 }}>
                {schemes[s].map((c, i) => (
                  <span
                    key={i}
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: c,
                      display: "inline-block",
                    }}
                  />
                ))}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BarChart
          data={barData}
          categoryAccessor="region"
          valueAccessor="revenue"
          colorBy="region"
          colorScheme={schemes[scheme]}
          title="Revenue by Region"
          height={280}
          width={350}
        />
        <LineChart
          data={multiLineData}
          xAccessor="x"
          yAccessor="y"
          lineBy="id"
          colorBy="id"
          colorScheme={schemes[scheme]}
          title="Product Trends"
          height={280}
          width={350}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data-driven styling demo
// ---------------------------------------------------------------------------

function ConditionalStylingDemo() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>
          Conditional Bar Colors
        </h4>
        <BarChart
          data={barData.filter((d) => d.quarter === "Q2")}
          categoryAccessor="region"
          valueAccessor="revenue"
          height={250}
          width={320}
          frameProps={{
            pieceStyle: (d) => ({
              fill: d.revenue >= d.target ? "#22c55e" : "#ef4444",
              stroke: "white",
              strokeWidth: 1,
            }),
          }}
        />
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          Green = met target, Red = below target
        </p>
      </div>
      <div>
        <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>
          Opacity Encoding
        </h4>
        <Scatterplot
          data={scatterData}
          xAccessor="x"
          yAccessor="y"
          sizeBy="size"
          sizeRange={[4, 18]}
          colorBy="group"
          colorScheme={["#6366f1", "#ec4899", "#14b8a6"]}
          height={250}
          width={320}
          frameProps={{
            pointStyle: (d) => ({
              fillOpacity: d.above ? 0.9 : 0.3,
              stroke: d.above ? "white" : "none",
              strokeWidth: d.above ? 1.5 : 0,
            }),
          }}
        />
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          Bright = above threshold, Faded = below. Colors from <code>colorBy</code>.
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StylingPage() {
  return (
    <PageLayout
      title="Styling"
      breadcrumbs={[
        { label: "Theming", path: "/theming" },
        { label: "Styling", path: "/theming/styling" },
      ]}
      prevPage={{
        title: "Linked Charts",
        path: "/features/linked-charts",
      }}
      nextPage={{ title: "Theme Provider", path: "/theming/theme-provider" }}
    >
      <p>
        Semiotic provides multiple layers of visual control: high-level{" "}
        <code>colorBy</code> / <code>colorScheme</code> on every HOC chart,
        data-driven style functions for per-mark customization, CSS custom
        properties for global theming, and SVG overlay layers for custom
        graphics. These compose freely — set a theme, override one chart's
        palette, then fine-tune individual marks.
      </p>

      {/* ================================================================= */}
      {/* Color Schemes */}
      {/* ================================================================= */}
      <h2 id="color-schemes">Color Schemes</h2>

      <p>
        Every HOC chart accepts <code>colorBy</code> (field name or function)
        and <code>colorScheme</code> (array of colors). These override the
        active theme's categorical palette for a single chart:
      </p>

      <StylingDemo />

      <CodeBlock
        code={`import { BarChart, LineChart } from "semiotic"

const palette = ["#2563eb", "#0d9488", "#ea580c", "#6b7280"]

<BarChart
  data={data}
  categoryAccessor="region"
  valueAccessor="revenue"
  colorBy="region"
  colorScheme={palette}
/>

<LineChart
  data={lines}
  xAccessor="x"
  yAccessor="y"
  lineBy="id"
  colorBy="id"
  colorScheme={palette}
/>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Data-Driven Styling */}
      {/* ================================================================= */}
      <h2 id="data-driven">Data-Driven Styling</h2>

      <p>
        For per-mark customization, use style functions via <code>frameProps</code>.
        The function receives each data element and its index, returning an SVG
        style object. This works on all frame types:
      </p>

      <ConditionalStylingDemo />

      <CodeBlock
        code={`// Conditional fill based on data values
// Use pieceStyle (not style) for ordinal charts via frameProps
<BarChart
  data={data}
  categoryAccessor="region"
  valueAccessor="revenue"
  frameProps={{
    pieceStyle: (d) => ({
      fill: d.revenue >= d.target ? "#22c55e" : "#ef4444",
      stroke: "white",
      strokeWidth: 1,
    }),
  }}
/>

// Layered encoding: colorBy sets fill, pointStyle adds opacity
// pointStyle without a "fill" key preserves colorBy colors
<Scatterplot
  data={points}
  xAccessor="x"
  yAccessor="y"
  sizeBy="size"
  colorBy="group"
  frameProps={{
    pointStyle: (d) => ({
      fillOpacity: d.above ? 0.9 : 0.3,
      stroke: d.above ? "white" : "none",
      strokeWidth: d.above ? 1.5 : 0,
    }),
  }}
/>`}
        language="jsx"
      />

      <h3 id="style-prop-names">Style Prop Names by Frame Type</h3>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #e0e0e0)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Frame</th>
            <th style={{ textAlign: "left", padding: 8 }}>Style Props</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}><code>StreamXYFrame</code></td>
            <td style={{ padding: 8 }}><code>lineStyle</code>, <code>pointStyle</code>, <code>summaryStyle</code></td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}><code>StreamOrdinalFrame</code></td>
            <td style={{ padding: 8 }}><code>pieceStyle</code>, <code>summaryStyle</code>, <code>connectorStyle</code></td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}><code>StreamNetworkFrame</code></td>
            <td style={{ padding: 8 }}><code>nodeStyle</code>, <code>edgeStyle</code></td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}>HOC charts</td>
            <td style={{ padding: 8 }}>Pass any of the above via <code>frameProps</code></td>
          </tr>
        </tbody>
      </table>

      {/* ================================================================= */}
      {/* Foreground & Background Graphics */}
      {/* ================================================================= */}
      <h2 id="graphics-layers">Foreground & Background Graphics</h2>

      <p>
        Every Frame has two SVG layers for custom graphics:{" "}
        <code>backgroundGraphics</code> (behind data marks) and{" "}
        <code>foregroundGraphics</code> (on top). Pass static SVG or a function
        receiving <code>{`{ size, margin }`}</code>.
      </p>

      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
        <strong>Coordinate system:</strong> Graphics render in the{" "}
        <em>chart area</em> coordinate space — (0, 0) is the top-left corner of
        the chart area (inside margins), and the chart area extends to{" "}
        <code>(size[0] - margin.left - margin.right, size[1] - margin.top - margin.bottom)</code>.
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          chartType: "line",
          lineDataAccessor: "coordinates",
          xAccessor: "month",
          yAccessor: "value",
          lineStyle: () => ({ stroke: "#ac58e5", strokeWidth: 2.5 }),
          showAxes: true,
          margin: { top: 30, bottom: 40, left: 50, right: 20 },
          backgroundGraphics: ({ size, margin }) => {
            const w = size[0] - margin.left - margin.right
            const h = size[1] - margin.top - margin.bottom
            return (
              <g>
                <rect x={0} y={0} width={w} height={h} fill="#f4f0ff" rx={4} />
                <text x={w / 2} y={h / 2} textAnchor="middle" fill="#d0c4ee" fontSize={48} fontWeight={700} opacity={0.5}>
                  DRAFT
                </text>
              </g>
            )
          },
          foregroundGraphics: ({ size, margin }) => {
            const w = size[0] - margin.left - margin.right
            const yPos = (size[1] - margin.top - margin.bottom) * 0.42
            return (
              <g>
                <line x1={0} y1={yPos} x2={w} y2={yPos} stroke="#E0488B" strokeWidth={1} strokeDasharray="4 4" />
                <text x={w - 40} y={yPos - 6} fill="#E0488B" fontSize={11} fontWeight={600}>
                  Target
                </text>
              </g>
            )
          },
          title: "Background & Foreground Layers",
        }}
        type={StreamXYFrame}
        overrideProps={{
          lines: `[{
  label: "Revenue",
  coordinates: [
    { month: 1, value: 12 },
    { month: 2, value: 18 },
    // ...more data
  ],
}]`,
          lineStyle: `() => ({ stroke: "#ac58e5", strokeWidth: 2.5 })`,
          backgroundGraphics: `({ size, margin }) => {
  // Coordinates are in chart-area space: (0,0) = top-left of chart area
  const w = size[0] - margin.left - margin.right
  const h = size[1] - margin.top - margin.bottom
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill="#f4f0ff" rx={4} />
      <text x={w / 2} y={h / 2} textAnchor="middle" fill="#d0c4ee"
            fontSize={48} fontWeight={700} opacity={0.5}>
        DRAFT
      </text>
    </g>
  )
}`,
          foregroundGraphics: `({ size, margin }) => {
  const w = size[0] - margin.left - margin.right
  const yPos = (size[1] - margin.top - margin.bottom) * 0.42
  return (
    <g>
      <line x1={0} y1={yPos} x2={w} y2={yPos}
            stroke="#E0488B" strokeWidth={1} strokeDasharray="4 4" />
      <text x={w - 40} y={yPos - 6} fill="#E0488B"
            fontSize={11} fontWeight={600}>
        Target
      </text>
    </g>
  )
}`,
          axes: `[{ orient: "left" }, { orient: "bottom", ticks: 8 }]`,
        }}
        functions={{
          lineStyle: () => ({ stroke: "#ac58e5", strokeWidth: 2.5 }),
        }}
        hiddenProps={{}}
        startHidden
      />

      {/* ================================================================= */}
      {/* CSS Classes */}
      {/* ================================================================= */}
      <h2 id="css-classes">CSS Class Names</h2>

      <p>
        For external stylesheet-driven styling, assign class names to marks.
        These accept strings or functions for data-driven class assignment:
      </p>

      <CodeBlock
        code={`// Static class
<StreamXYFrame lineClass="revenue-line" />

// Dynamic class based on data
<StreamXYFrame
  lineClass={(d) => \`line-\${d.category}\`}
  pointClass={(d) => d.highlighted ? "point-active" : "point-default"}
/>

/* In your stylesheet */
.revenue-line { stroke: #ac58e5; stroke-width: 2; }
.point-active { fill: #E0488B; r: 6; }
.point-default { fill: #ccc; r: 3; }`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Gradients & Patterns */}
      {/* ================================================================= */}
      <h2 id="gradients-patterns">Gradients & Patterns</h2>

      <p>
        Use <code>additionalDefs</code> to inject SVG{" "}
        <code>&lt;defs&gt;</code> (gradients, patterns, filters) into the frame,
        then reference them by ID in style functions:
      </p>

      <CodeBlock
        code={`<BarChart
  data={data}
  categoryAccessor="region"
  valueAccessor="revenue"
  frameProps={{
    additionalDefs: [
      <linearGradient key="g" id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>,
      <pattern key="p" id="stripes" width="6" height="6"
               patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="3" height="6" fill="#06b6d4" />
      </pattern>,
    ],
    pieceStyle: (d) => ({
      fill: d.revenue > 130 ? "url(#bar-gradient)" : "url(#stripes)",
    }),
  }}
/>`}
        language="jsx"
      />

      {/* ================================================================= */}
      {/* Styling Hierarchy */}
      {/* ================================================================= */}
      <h2 id="hierarchy">Styling Hierarchy</h2>

      <p>
        When multiple styling mechanisms are active, they compose in this order
        (later wins):
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ borderBottom: "2px solid var(--surface-3, #e0e0e0)" }}>
            <th style={{ textAlign: "left", padding: 8 }}>Layer</th>
            <th style={{ textAlign: "left", padding: 8 }}>Scope</th>
            <th style={{ textAlign: "left", padding: 8 }}>Mechanism</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}>1. CSS custom properties</td>
            <td style={{ padding: 8 }}>All charts in ancestor</td>
            <td style={{ padding: 8 }}>
              <code>--semiotic-*</code> vars on any ancestor, or{" "}
              <code>ThemeProvider</code>
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}>2. <code>colorScheme</code></td>
            <td style={{ padding: 8 }}>Single chart</td>
            <td style={{ padding: 8 }}>Overrides theme categorical palette</td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}>3. Style functions</td>
            <td style={{ padding: 8 }}>Individual marks</td>
            <td style={{ padding: 8 }}>
              <code>frameProps.style</code>, <code>lineStyle</code>, etc.
            </td>
          </tr>
          <tr style={{ borderBottom: "1px solid var(--surface-3, #e0e0e0)" }}>
            <td style={{ padding: 8 }}>4. CSS classes</td>
            <td style={{ padding: 8 }}>Individual marks</td>
            <td style={{ padding: 8 }}>
              <code>className</code>, <code>lineClass</code> — external CSS
            </td>
          </tr>
        </tbody>
      </table>

      {/* ================================================================= */}
      {/* Props */}
      {/* ================================================================= */}
      <h2 id="props">Props Reference</h2>

      <PropTable componentName="Styling" props={stylingProps} />

      {/* ================================================================= */}
      {/* Related */}
      {/* ================================================================= */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/theming/theme-provider">Theme Provider</Link> — global
          theming with 15 named presets and CSS custom properties
        </li>
        <li>
          <Link to="/theming/theme-explorer">Theme Explorer</Link> — interactive
          playground to design and export custom themes
        </li>
        <li>
          <Link to="/features/legends">Legends</Link> — legend styling that
          responds to colorScheme and theme colors
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — lineStyle,
          pointStyle, summaryStyle, render mode
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — style,
          renderMode, pattern support
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> —
          nodeStyle, edgeStyle, render mode
        </li>
      </ul>
    </PageLayout>
  )
}
