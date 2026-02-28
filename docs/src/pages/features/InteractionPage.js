import React, { useState } from "react"
import { XYFrame, OrdinalFrame, MinimapXYFrame } from "semiotic"
import { LineChart, BarChart } from "semiotic"
import { curveMonotoneX } from "d3-shape"

import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  { month: 3, revenue: 14000, product: "Widget" },
  { month: 4, revenue: 22000, product: "Widget" },
  { month: 5, revenue: 19000, product: "Widget" },
  { month: 6, revenue: 27000, product: "Widget" },
  { month: 1, revenue: 8000, product: "Gadget" },
  { month: 2, revenue: 11000, product: "Gadget" },
  { month: 3, revenue: 15000, product: "Gadget" },
  { month: 4, revenue: 13000, product: "Gadget" },
  { month: 5, revenue: 17000, product: "Gadget" },
  { month: 6, revenue: 21000, product: "Gadget" },
]

const frameLineData = [
  {
    title: "Widget",
    coordinates: [
      { step: 1, value: 12 },
      { step: 2, value: 18 },
      { step: 3, value: 14 },
      { step: 4, value: 22 },
      { step: 5, value: 19 },
      { step: 6, value: 27 },
      { step: 7, value: 24 },
      { step: 8, value: 31 },
      { step: 9, value: 28 },
      { step: 10, value: 35 },
    ],
  },
  {
    title: "Gadget",
    coordinates: [
      { step: 1, value: 8 },
      { step: 2, value: 11 },
      { step: 3, value: 15 },
      { step: 4, value: 13 },
      { step: 5, value: 17 },
      { step: 6, value: 21 },
      { step: 7, value: 19 },
      { step: 8, value: 25 },
      { step: 9, value: 22 },
      { step: 10, value: 29 },
    ],
  },
]

const barData = [
  { category: "Alpha", value: 45, group: "A" },
  { category: "Beta", value: 38, group: "A" },
  { category: "Gamma", value: 52, group: "B" },
  { category: "Delta", value: 29, group: "B" },
  { category: "Epsilon", value: 61, group: "A" },
]

const swarmData = Array.from({ length: 80 }, () => ({
  value: Math.floor(Math.random() * 100),
}))

const colors = ["#6366f1", "#f59e0b"]

// ---------------------------------------------------------------------------
// Interaction props
// ---------------------------------------------------------------------------

const interactionProps = [
  { name: "brush", type: "string", required: true, default: null, description: 'Brush type: "xBrush", "yBrush", or "xyBrush".' },
  { name: "start", type: "function", required: false, default: null, description: "Callback fired at the start of a brush. Receives the extent." },
  { name: "during", type: "function", required: false, default: null, description: "Callback fired during brushing. Receives the extent." },
  { name: "end", type: "function", required: false, default: null, description: "Callback fired at the end of a brush. Receives the extent." },
  { name: "extent", type: "array", required: false, default: null, description: "Initial or controlled brush extent. Format depends on brush type." },
  { name: "columnsBrush", type: "boolean", required: false, default: "false", description: "For OrdinalFrame: enable per-column brushes (parallel coordinates style)." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InteractionPage() {
  return (
    <PageLayout
      title="Interaction"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Interaction", path: "/features/interaction" },
      ]}
      prevPage={{ title: "Tooltips", path: "/features/tooltips" }}
      nextPage={{ title: "Responsive", path: "/features/responsive" }}
    >
      <p>
        Semiotic provides a rich set of interaction capabilities including
        brushing, cross-highlighting between frames, and custom click/hover
        behaviors. These features let you build coordinated views, data
        filtering interfaces, and exploratory visualizations.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components support basic hover interaction out of the box.
        For highlighting behavior, use the <code>frameProps</code> escape
        hatch to configure <code>hoverAnnotation</code> with highlight types:
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "revenue",
          lineBy: "product",
          colorBy: "product",
          xLabel: "Month",
          yLabel: "Revenue ($)",
          frameProps: {
            hoverAnnotation: [
              {
                type: "highlight",
                style: { strokeWidth: 8 },
              },
              { type: "frame-hover" },
            ],
            lineIDAccessor: "product",
          },
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000, product: "Widget" },
  { month: 2, revenue: 18000, product: "Widget" },
  // ...more data
]`,
          frameProps: `{
  hoverAnnotation: [
    { type: "highlight", style: { strokeWidth: 8 } },
    { type: "frame-hover" }
  ],
  lineIDAccessor: "product"
}`,
        }}
        hiddenProps={{}}
        title="Line Highlighting on Hover"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="highlight-hover">Highlight on Hover</h3>
      <p>
        Pass an array to <code>hoverAnnotation</code> with a{" "}
        <code>highlight</code> type to redraw the hovered mark on the
        annotation layer with custom styling. Use{" "}
        <code>lineIDAccessor</code> to tell the frame how to identify which
        line to highlight.
      </p>

      <LiveExample
        frameProps={{
          lines: frameLineData,
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: (d, i) => ({
            stroke: colors[i],
            strokeWidth: 2,
            fill: "none",
          }),
          margin: { top: 20, bottom: 50, left: 50, right: 20 },
          axes: [
            { orient: "left" },
            { orient: "bottom" },
          ],
          hoverAnnotation: [
            {
              type: "highlight",
              style: (d) => ({
                strokeWidth: 6,
                stroke: d.parentLine
                  ? colors[frameLineData.findIndex((l) => l.title === d.parentLine.title)]
                  : colors[frameLineData.findIndex((l) => l.title === d.title)],
              }),
            },
            { type: "frame-hover" },
          ],
          lineIDAccessor: "title",
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[
  { title: "Widget", coordinates: [...] },
  { title: "Gadget", coordinates: [...] }
]`,
          lineStyle: `(d, i) => ({ stroke: colors[i], strokeWidth: 2, fill: "none" })`,
          hoverAnnotation: `[
  {
    type: "highlight",
    style: d => ({
      strokeWidth: 6,
      stroke: colorForLine(d)
    })
  },
  { type: "frame-hover" }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="desaturation-layer">Desaturation Layer</h3>
      <p>
        Combine <code>highlight</code> with <code>desaturation-layer</code>{" "}
        to dim the background and bring the hovered element into focus:
      </p>

      <CodeBlock
        code={`<XYFrame
  lines={data}
  hoverAnnotation={[
    {
      type: "desaturation-layer",
      style: { fill: "white", opacity: 0.6 }
    },
    {
      type: "highlight",
      style: d => ({
        stroke: colorScale(d.key),
        strokeWidth: 5
      })
    }
  ]}
  lineIDAccessor="title"
/>`}
        language="jsx"
      />

      <h3 id="cross-highlighting">Cross-Highlighting Between Frames</h3>
      <p>
        Use <code>customHoverBehavior</code> to capture hover events from one
        frame and pass highlight annotations to another. This creates
        coordinated views where hovering on one chart highlights the
        corresponding data in another.
      </p>

      <CodeBlock
        code={`import React, { useState } from "react"
import { XYFrame } from "semiotic"

function CoordinatedViews() {
  const [annotations, setAnnotations] = useState([])

  const handleHover = (d) => {
    if (d) {
      setAnnotations([{
        type: "highlight",
        ...d,
        style: { stroke: "black", strokeWidth: 5 }
      }])
    } else {
      setAnnotations([])
    }
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      <XYFrame
        lines={revenueData}
        hoverAnnotation={true}
        customHoverBehavior={handleHover}
        annotations={annotations}
        lineIDAccessor="title"
        size={[400, 300]}
      />
      <XYFrame
        lines={profitData}
        hoverAnnotation={true}
        customHoverBehavior={handleHover}
        annotations={annotations}
        lineIDAccessor="title"
        size={[400, 300]}
      />
    </div>
  )
}`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="xy-brushing">XY Brushing</h3>
      <p>
        The <code>interaction</code> prop on <code>XYFrame</code> enables
        brushing for selecting regions of the chart. Choose between{" "}
        <code>xBrush</code>, <code>yBrush</code>, or <code>xyBrush</code>:
      </p>

      <CodeBlock
        code={`import React, { useState } from "react"
import { XYFrame } from "semiotic"

function BrushExample() {
  const [extent, setExtent] = useState([2, 8])

  return (
    <XYFrame
      lines={data}
      xAccessor="step"
      yAccessor="value"
      interaction={{
        brush: "xBrush",
        end: (e) => setExtent(e),
        extent: extent
      }}
      size={[700, 200]}
      margin={{ left: 50, top: 10, bottom: 50, right: 20 }}
    />
  )
}`}
        language="jsx"
      />

      <h3 id="minimap">MinimapXYFrame</h3>
      <p>
        <code>MinimapXYFrame</code> automates the common pattern of a main
        chart with a smaller brush-enabled overview below it. It manages
        brush state internally and updates the main chart's extent
        automatically:
      </p>

      <CodeBlock
        code={`import { MinimapXYFrame } from "semiotic"

<MinimapXYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
  lineType={{ type: "line", interpolator: curveMonotoneX }}
  size={[700, 300]}
  margin={{ left: 50, top: 10, bottom: 40, right: 20 }}
  matte={true}
  minimap={{
    brushEnd: (e) => handleExtentChange(e),
    yBrushable: false,
    xBrushExtent: selectedExtent,
    margin: { left: 50, top: 0, bottom: 10, right: 20 },
    axes: [{ orient: "left", ticks: 2 }],
    size: [700, 50]
  }}
/>`}
        language="jsx"
      />

      <h3 id="ordinal-brushing">Ordinal Brushing</h3>
      <p>
        <code>OrdinalFrame</code> supports brushing within columns using the{" "}
        <code>interaction</code> prop with <code>columnsBrush: true</code>.
        This is useful for parallel-coordinates-style filtering:
      </p>

      <CodeBlock
        code={`import React, { useState } from "react"
import { OrdinalFrame } from "semiotic"

function OrdinalBrushExample() {
  const [selectedCount, setSelectedCount] = useState(data.length)
  const [extent, setExtent] = useState([20, 70])

  const handleBrush = (e) => {
    setSelectedCount(
      data.filter(d => d.value >= e[0] && d.value <= e[1]).length
    )
  }

  return (
    <>
      <p>Points in brushed region: {selectedCount}</p>
      <OrdinalFrame
        data={data}
        rAccessor="value"
        oAccessor={() => "singleColumn"}
        type="swarm"
        projection="horizontal"
        interaction={{
          columnsBrush: true,
          extent: { singleColumn: extent },
          end: handleBrush
        }}
        size={[700, 200]}
      />
    </>
  )
}`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="ordinal-highlighting">OrdinalFrame Highlighting</h3>
      <p>
        In <code>OrdinalFrame</code>, use{" "}
        <code>pieceHoverAnnotation</code> for individual piece highlighting,
        or <code>hoverAnnotation</code> for column-level highlighting. Define
        a <code>pieceIDAccessor</code> to target specific pieces:
      </p>

      <CodeBlock
        code={`<OrdinalFrame
  data={stackedData}
  oAccessor="category"
  rAccessor="value"
  type="bar"
  pieceHoverAnnotation={[
    {
      type: "highlight",
      style: d => ({
        fill: d.group === "A" ? "#6366f1" : "#f59e0b",
        stroke: "white"
      })
    }
  ]}
  pieceIDAccessor="group"

  // Static highlights via annotations prop
  annotations={[
    {
      type: "highlight",
      category: "Beta",
      style: { fill: "#e11d48", stroke: "none" }
    }
  ]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <h3 id="interaction-prop">interaction Prop (XYFrame)</h3>

      <PropTable componentName="interaction" props={interactionProps} />

      <h3 id="custom-behaviors">Custom Behavior Callbacks</h3>
      <p>
        All Frame components accept these callback props for custom
        interaction handling:
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Prop</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["customHoverBehavior", "Called with the hovered data point (or null on hover-out). Use for cross-highlighting."],
            ["customClickBehavior", "Called with the clicked data point. Use for selection, filtering, or navigation."],
            ["customDoubleClickBehavior", "Called with the double-clicked data point. Use for drill-down or zoom."],
          ].map(([prop, desc], i) => (
            <tr key={prop} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)", fontFamily: "var(--font-code)", fontSize: "0.9em" }}>{prop}</td>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <CodeBlock
        code={`<XYFrame
  customHoverBehavior={(d) => {
    // d is the data point on hover, null on hover-out
    if (d) {
      setHighlighted(d.id)
    } else {
      setHighlighted(null)
    }
  }}
  customClickBehavior={(d) => {
    // d is the clicked data point
    setSelected(d.id)
    navigateToDetail(d)
  }}
  customDoubleClickBehavior={(d) => {
    // d is the double-clicked data point
    zoomToRegion(d)
  }}
/>`}
        language="jsx"
      />

      <h3 id="minimap-config">MinimapXYFrame Configuration</h3>
      <p>
        The <code>minimap</code> prop on <code>MinimapXYFrame</code> accepts
        the following additional properties beyond standard XYFrame props:
      </p>

      <CodeBlock
        code={`minimap={{
  // Brush behavior
  xBrushable: true,       // Enable horizontal brushing
  yBrushable: false,      // Enable vertical brushing
  xBrushExtent: [5, 15],  // Initial/controlled horizontal extent
  yBrushExtent: [0, 100], // Initial/controlled vertical extent

  // Brush callbacks
  brushStart: (e) => {},  // Start of brush
  brush: (e) => {},       // During brush
  brushEnd: (e) => {},    // End of brush

  // Override any XYFrame prop for the minimap rendering
  size: [700, 50],
  margin: { left: 50, top: 0, bottom: 10, right: 20 },
  axes: [{ orient: "left", ticks: 2 }]
}}`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/annotations">Annotations</Link> — the highlight
          and desaturation-layer types used for interaction effects
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — tooltip
          configuration that works alongside hover interactions
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — brushing, minimap,
          and point-based interactions
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — column
          brushes, piece hover, and ordinal highlighting
        </li>
        <li>
          <Link to="/features/responsive">Responsive</Link> — making
          interactive frames responsive to container size
        </li>
      </ul>
    </PageLayout>
  )
}
