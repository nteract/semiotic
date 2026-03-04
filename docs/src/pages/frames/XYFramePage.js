import React from "react"
import { StreamXYFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

// Flat data — StreamXYFrame needs flat arrays with groupAccessor, not nested coordinates
const lineData = [
  { group: "Revenue", month: 1, value: 12000 },
  { group: "Revenue", month: 2, value: 18000 },
  { group: "Revenue", month: 3, value: 14000 },
  { group: "Revenue", month: 4, value: 22000 },
  { group: "Revenue", month: 5, value: 19000 },
  { group: "Revenue", month: 6, value: 27000 },
  { group: "Revenue", month: 7, value: 24000 },
  { group: "Revenue", month: 8, value: 31000 },
  { group: "Revenue", month: 9, value: 28000 },
  { group: "Revenue", month: 10, value: 35000 },
  { group: "Revenue", month: 11, value: 32000 },
  { group: "Revenue", month: 12, value: 41000 },
]

const multiLineData = [
  ...[1,2,3,4,5,6].map(m => ({ group: "Widget", month: m, value: [12000,18000,14000,22000,19000,27000][m-1] })),
  ...[1,2,3,4,5,6].map(m => ({ group: "Gadget", month: m, value: [8000,11000,15000,13000,17000,21000][m-1] })),
  ...[1,2,3,4,5,6].map(m => ({ group: "Doohickey", month: m, value: [5000,7000,9000,8000,12000,14000][m-1] })),
]

const scatterData = [
  { x: 1, y: 3 }, { x: 2, y: 7 }, { x: 3, y: 2 },
  { x: 4, y: 9 }, { x: 5, y: 5 }, { x: 6, y: 11 },
  { x: 7, y: 4 }, { x: 8, y: 13 }, { x: 9, y: 8 },
  { x: 10, y: 15 }, { x: 3, y: 10 }, { x: 5, y: 1 },
  { x: 7, y: 12 }, { x: 2, y: 6 }, { x: 9, y: 3 },
]

const stackedData = [
  ...[1,2,3,4,5,6].map(m => ({ group: "Product A", month: m, value: [5000,7000,6000,8000,9000,11000][m-1] })),
  ...[1,2,3,4,5,6].map(m => ({ group: "Product B", month: m, value: [3000,4000,5000,6000,5000,7000][m-1] })),
  ...[1,2,3,4,5,6].map(m => ({ group: "Product C", month: m, value: [2000,3000,2000,4000,3000,5000][m-1] })),
]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const xyFrameProps = [
  { name: "chartType", type: "string", required: true, default: null, description: 'Chart type: "line", "area", "stackedarea", "scatter", "bubble", "heatmap", "bar", "swarm", "waterfall", "candlestick".' },
  { name: "runtimeMode", type: '"bounded" | "streaming"', required: false, default: '"bounded"', description: "Whether data is static (bounded) or pushed via ref (streaming)." },
  { name: "data", type: "array", required: false, default: null, description: "Data array. For line/area, each object has a coordinates array. For scatter, flat array of points." },
  { name: "size", type: "[number, number]", required: false, default: "[500, 300]", description: "Chart dimensions as [width, height]." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values." },
  { name: "groupAccessor", type: "string | function", required: false, default: null, description: "Groups data into separate lines/areas by this field." },
  { name: "lineDataAccessor", type: "string", required: false, default: '"coordinates"', description: "How to access the coordinates array from each line object." },
  { name: "lineStyle", type: "object | function", required: false, default: null, description: "Style for line marks. Object or (datum, group) => Style." },
  { name: "pointStyle", type: "function", required: false, default: null, description: "Style for point marks. (datum) => Style & { r? }." },
  { name: "showAxes", type: "boolean", required: false, default: "true", description: "Show axes on the chart." },
  { name: "xLabel", type: "string", required: false, default: null, description: "Label for the x axis." },
  { name: "yLabel", type: "string", required: false, default: null, description: "Label for the y axis." },
  { name: "margin", type: "object", required: false, default: "{ top: 20, right: 20, bottom: 30, left: 40 }", description: "Chart margins: { top, right, bottom, left }." },
  { name: "enableHover", type: "boolean", required: false, default: null, description: "Enable hover tooltips." },
  { name: "showGrid", type: "boolean", required: false, default: "false", description: "Show grid lines." },
  { name: "colorScheme", type: "string | string[]", required: false, default: null, description: "Color scheme for multi-series data." },
  { name: "background", type: "string", required: false, default: null, description: "Background fill color." },
  { name: "xExtent", type: "array", required: false, default: null, description: "Fixed x-axis domain as [min, max]." },
  { name: "yExtent", type: "array", required: false, default: null, description: "Fixed y-axis domain as [min, max]." },
  { name: "annotations", type: "array", required: false, default: null, description: "Array of annotation objects." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation render function." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function XYFramePage() {
  return (
    <PageLayout
      title="StreamXYFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "StreamXYFrame", path: "/frames/xy-frame" },
      ]}
      prevPage={null}
      nextPage={{ title: "StreamOrdinalFrame", path: "/frames/ordinal-frame" }}
    >
      <ComponentMeta
        componentName="StreamXYFrame"
        importStatement='import { StreamXYFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "Scatterplot", path: "/charts/scatterplot" },
        ]}
      />

      <p>
        StreamXYFrame is the foundational frame for all continuous x/y data
        visualization in Semiotic. It renders lines, areas, points, heatmaps,
        bars, and more on a canvas for high performance. Use StreamXYFrame
        directly when you need full control over mark rendering, multi-layer
        compositions, or features beyond what the simpler Chart components offer.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest StreamXYFrame needs <code>chartType</code>,{" "}
        <code>data</code>, <code>xAccessor</code>, and{" "}
        <code>yAccessor</code>.
      </p>

      <LiveExample
        frameProps={{
          chartType: "line",
          data: lineData,
          xAccessor: "month",
          yAccessor: "value",
          groupAccessor: "group",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 40, left: 60, right: 20 },
          size: [500, 300],
        }}
        type={StreamXYFrame}
        startHidden={false}
        overrideProps={{
          data: `[
  { group: "Revenue", month: 1, value: 12000 },
  { group: "Revenue", month: 2, value: 18000 },
  // ...more data
]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="multi-line">Multi-Line with Color</h3>
      <p>
        Pass multiple line objects and use <code>groupAccessor</code> to
        separate them. Use a <code>lineStyle</code> function to color each
        line differently.
      </p>

      <LiveExample
        frameProps={{
          chartType: "line",
          data: multiLineData,
          xAccessor: "month",
          yAccessor: "value",
          groupAccessor: "group",
          lineStyle: (d, group) => ({
            stroke: group === "Widget" ? "#6366f1" : group === "Gadget" ? "#f59e0b" : "#10b981",
            strokeWidth: 2,
          }),
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 40, left: 60, right: 20 },
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[
  { group: "Widget", month: 1, value: 12000 },
  { group: "Widget", month: 2, value: 18000 },
  { group: "Gadget", month: 1, value: 8000 },
  // ...flat data with group field
]`,
          lineStyle: `(d, group) => ({
  stroke: group === "Widget" ? "#6366f1"
    : group === "Gadget" ? "#f59e0b" : "#10b981",
  strokeWidth: 2
})`,
        }}
        hiddenProps={{}}
      />

      <h3 id="scatterplot">Scatterplot</h3>
      <p>
        Use <code>chartType="scatter"</code> with a flat data array.
        Customize appearance with <code>pointStyle</code>.
      </p>

      <LiveExample
        frameProps={{
          chartType: "scatter",
          data: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: () => ({
            fill: "#6366f1",
            opacity: 0.6,
            r: 6,
          }),
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 40, left: 60, right: 20 },
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[
  { x: 1, y: 3 }, { x: 2, y: 7 },
  { x: 3, y: 2 }, { x: 4, y: 9 },
  // ...more points
]`,
          pointStyle: `() => ({
  fill: "#6366f1",
  opacity: 0.6,
  r: 6
})`,
        }}
        hiddenProps={{}}
      />

      <h3 id="stacked-area">Stacked Area Chart</h3>
      <p>
        Set <code>chartType="stackedarea"</code> to stack multiple series.
        Use <code>lineStyle</code> with a fill to create colored areas.
      </p>

      <LiveExample
        frameProps={{
          chartType: "stackedarea",
          data: stackedData,
          xAccessor: "month",
          yAccessor: "value",
          groupAccessor: "group",
          lineStyle: (d, group) => ({
            fill: group === "Product A" ? "#6366f1" : group === "Product B" ? "#f59e0b" : "#10b981",
            fillOpacity: 0.6,
            stroke: group === "Product A" ? "#6366f1" : group === "Product B" ? "#f59e0b" : "#10b981",
            strokeWidth: 1,
          }),
          showAxes: true,
          enableHover: true,
          margin: { top: 20, bottom: 40, left: 60, right: 20 },
          size: [500, 300],
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[
  { id: "Product A", coordinates: [...] },
  { id: "Product B", coordinates: [...] },
  { id: "Product C", coordinates: [...] }
]`,
          lineStyle: `(d, group) => ({
  fill: colors[group],
  fillOpacity: 0.6,
  stroke: colors[group],
  strokeWidth: 1
})`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="StreamXYFrame" props={xyFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> -- simplified Chart
          component that wraps StreamXYFrame for line visualizations
        </li>
        <li>
          <Link to="/charts/area-chart">AreaChart</Link> -- simplified Chart
          component for filled area charts
        </li>
        <li>
          <Link to="/charts/scatterplot">Scatterplot</Link> -- simplified Chart
          component for point-based visualizations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> -- for
          categorical data (bar charts, violin plots, etc.)
        </li>
        <li>
          <Link to="/frames/network-frame">StreamNetworkFrame</Link> -- for
          topological data (force layouts, hierarchies, etc.)
        </li>
      </ul>
    </PageLayout>
  )
}
