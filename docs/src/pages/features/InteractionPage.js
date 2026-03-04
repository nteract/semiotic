import React, { useState } from "react"
import { StreamXYFrame, StreamOrdinalFrame, MinimapChart } from "semiotic"
import { LineChart, BarChart } from "semiotic"
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

// Flat data for StreamXYFrame line examples
const frameLineData = [
  ...[1,2,3,4,5,6,7,8,9,10].map(s => ({ group: "Widget", step: s, value: [12,18,14,22,19,27,24,31,28,35][s-1] })),
  ...[1,2,3,4,5,6,7,8,9,10].map(s => ({ group: "Gadget", step: s, value: [8,11,15,13,17,21,19,25,22,29][s-1] })),
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
  { name: "columnsBrush", type: "boolean", required: false, default: "false", description: "For StreamOrdinalFrame: enable per-column brushes (parallel coordinates style)." },
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
          data: frameLineData,
          chartType: "line",
          xAccessor: "step",
          yAccessor: "value",
          groupAccessor: "group",
          lineStyle: (d, group) => ({
            stroke: group === "Widget" ? colors[0] : colors[1],
            strokeWidth: 2,
            fill: "none",
          }),
          margin: { top: 20, bottom: 50, left: 50, right: 20 },
          showAxes: true,
          enableHover: true,
          size: [500, 300],
        }}
        type={StreamXYFrame}
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
        code={`<StreamXYFrame
  data={data}
  chartType="line"
  lineDataAccessor="coordinates"
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
import { StreamXYFrame } from "semiotic"

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
      <StreamXYFrame
        data={revenueData}
        chartType="line"
        lineDataAccessor="coordinates"
        enableHover={true}
        customHoverBehavior={handleHover}
        annotations={annotations}
        lineIDAccessor="title"
        size={[400, 300]}
      />
      <StreamXYFrame
        data={profitData}
        chartType="line"
        lineDataAccessor="coordinates"
        enableHover={true}
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
        The <code>interaction</code> prop on <code>StreamXYFrame</code> enables
        brushing for selecting regions of the chart. Choose between{" "}
        <code>xBrush</code>, <code>yBrush</code>, or <code>xyBrush</code>:
      </p>

      <CodeBlock
        code={`import React, { useState } from "react"
import { StreamXYFrame } from "semiotic"

function BrushExample() {
  const [extent, setExtent] = useState([2, 8])

  return (
    <StreamXYFrame
      data={data}
      chartType="line"
      lineDataAccessor="coordinates"
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

      <h3 id="minimap">MinimapChart</h3>
      <p>
        <code>MinimapChart</code> automates the common pattern of a main
        chart with a smaller brush-enabled overview below it. It manages
        brush state internally and updates the main chart's extent
        automatically:
      </p>

      <CodeBlock
        code={`import { MinimapChart } from "semiotic"

<MinimapChart
  data={data}
  xAccessor="step"
  yAccessor="value"
  lineBy="series"
  colorBy="series"
  curve="monotoneX"
  width={700}
  height={300}
  margin={{ left: 50, top: 10, bottom: 40, right: 20 }}
  minimap={{
    height: 50,
    margin: { left: 50, top: 0, bottom: 10, right: 20 }
  }}
/>`}
        language="jsx"
      />

      <h3 id="ordinal-brushing">Ordinal Brushing</h3>
      <p>
        <code>StreamOrdinalFrame</code> supports brushing within columns using the{" "}
        <code>interaction</code> prop with <code>columnsBrush: true</code>.
        This is useful for parallel-coordinates-style filtering:
      </p>

      <CodeBlock
        code={`import React, { useState } from "react"
import { StreamOrdinalFrame } from "semiotic"

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
      <StreamOrdinalFrame
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

      <h3 id="ordinal-highlighting">StreamOrdinalFrame Highlighting</h3>
      <p>
        In <code>StreamOrdinalFrame</code>, use{" "}
        <code>pieceHoverAnnotation</code> for individual piece highlighting,
        or <code>hoverAnnotation</code> for column-level highlighting. Define
        a <code>pieceIDAccessor</code> to target specific pieces:
      </p>

      <CodeBlock
        code={`<StreamOrdinalFrame
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

      <h3 id="interaction-prop">interaction Prop (StreamXYFrame)</h3>

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
        code={`<StreamXYFrame
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

      <h3 id="minimap-config">MinimapChart Configuration</h3>
      <p>
        The <code>minimap</code> prop on <code>MinimapChart</code> configures
        the overview chart and brush behavior:
      </p>

      <CodeBlock
        code={`minimap={{
  height: 50,               // Height of the overview chart
  brushDirection: "x",      // "x" (default) or "y"
  showAxes: false,          // Show axes in overview (default: false)
  background: "#f5f5f5",    // Background color for overview
  margin: { left: 50, top: 0, bottom: 10, right: 20 },
  lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1 })
}}

// Controlled brush state:
<MinimapChart
  brushExtent={[startDate, endDate]}
  onBrush={(extent) => setExtent(extent)}
  ...
/>`}
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
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — brushing, minimap,
          and point-based interactions
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — column
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
