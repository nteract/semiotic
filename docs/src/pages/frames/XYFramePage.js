import React from "react"
import { XYFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const lineData = [
  {
    title: "Revenue",
    coordinates: [
      { month: 1, value: 12000 },
      { month: 2, value: 18000 },
      { month: 3, value: 14000 },
      { month: 4, value: 22000 },
      { month: 5, value: 19000 },
      { month: 6, value: 27000 },
      { month: 7, value: 24000 },
      { month: 8, value: 31000 },
      { month: 9, value: 28000 },
      { month: 10, value: 35000 },
      { month: 11, value: 32000 },
      { month: 12, value: 41000 },
    ],
  },
]

const multiLineData = [
  {
    title: "Widget",
    coordinates: [
      { month: 1, value: 12000 },
      { month: 2, value: 18000 },
      { month: 3, value: 14000 },
      { month: 4, value: 22000 },
      { month: 5, value: 19000 },
      { month: 6, value: 27000 },
    ],
  },
  {
    title: "Gadget",
    coordinates: [
      { month: 1, value: 8000 },
      { month: 2, value: 11000 },
      { month: 3, value: 15000 },
      { month: 4, value: 13000 },
      { month: 5, value: 17000 },
      { month: 6, value: 21000 },
    ],
  },
  {
    title: "Doohickey",
    coordinates: [
      { month: 1, value: 5000 },
      { month: 2, value: 7000 },
      { month: 3, value: 9000 },
      { month: 4, value: 8000 },
      { month: 5, value: 12000 },
      { month: 6, value: 14000 },
    ],
  },
]

const scatterData = [
  { x: 1, y: 3, size: 8 },
  { x: 2, y: 7, size: 12 },
  { x: 3, y: 2, size: 6 },
  { x: 4, y: 9, size: 15 },
  { x: 5, y: 5, size: 10 },
  { x: 6, y: 11, size: 18 },
  { x: 7, y: 4, size: 7 },
  { x: 8, y: 13, size: 20 },
  { x: 9, y: 8, size: 11 },
  { x: 10, y: 15, size: 25 },
  { x: 3, y: 10, size: 14 },
  { x: 5, y: 1, size: 5 },
  { x: 7, y: 12, size: 16 },
  { x: 2, y: 6, size: 9 },
  { x: 9, y: 3, size: 8 },
]

const stackedData = [
  {
    title: "Product A",
    coordinates: [
      { month: 1, value: 5000 },
      { month: 2, value: 7000 },
      { month: 3, value: 6000 },
      { month: 4, value: 8000 },
      { month: 5, value: 9000 },
      { month: 6, value: 11000 },
    ],
  },
  {
    title: "Product B",
    coordinates: [
      { month: 1, value: 3000 },
      { month: 2, value: 4000 },
      { month: 3, value: 5000 },
      { month: 4, value: 6000 },
      { month: 5, value: 5000 },
      { month: 6, value: 7000 },
    ],
  },
  {
    title: "Product C",
    coordinates: [
      { month: 1, value: 2000 },
      { month: 2, value: 3000 },
      { month: 3, value: 2000 },
      { month: 4, value: 4000 },
      { month: 5, value: 3000 },
      { month: 6, value: 5000 },
    ],
  },
]

const colors = ["#6366f1", "#f59e0b", "#10b981"]

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const xyFrameProps = [
  // --- General ---
  { name: "size", type: "array", required: false, default: "[500, 500]", description: "Sets the width and height of the frame as [width, height]." },
  { name: "xAccessor", type: "string | function", required: false, default: '"x"', description: "Field name or function to access x values from each data point." },
  { name: "yAccessor", type: "string | function", required: false, default: '"y"', description: "Field name or function to access y values from each data point." },
  { name: "title", type: "string | JSX", required: false, default: null, description: "Centers a title at the top of the chart. Accepts a string or JSX element." },
  { name: "margin", type: "number | object", required: false, default: null, description: "Margin around the chart area. A single number applies to all sides, or pass { top, bottom, left, right }." },
  { name: "xScaleType", type: "function", required: false, default: "scaleLinear()", description: "Custom d3-scale for the x axis." },
  { name: "yScaleType", type: "function", required: false, default: "scaleLinear()", description: "Custom d3-scale for the y axis." },
  { name: "xExtent", type: "array | object", required: false, default: null, description: "Sets min/max for the x axis. Supports [min, max] or { extent, onChange }." },
  { name: "yExtent", type: "array | object", required: false, default: null, description: "Sets min/max for the y axis. Supports [min, max] or { extent, onChange }." },
  { name: "invertX", type: "boolean", required: false, default: "false", description: "Inverts the x axis so min and max are transposed." },
  { name: "invertY", type: "boolean", required: false, default: "false", description: "Inverts the y axis so min and max are transposed." },
  { name: "showLinePoints", type: "boolean", required: false, default: "false", description: "Displays the points that make up line elements, styled via pointStyle." },
  { name: "showSummaryPoints", type: "boolean", required: false, default: "false", description: "Displays the points that make up summary elements." },
  { name: "renderKey", type: "string | function", required: false, default: null, description: "Key for animated transitions. A string prop name or function returning a string." },

  // --- Points ---
  { name: "points", type: "array", required: false, default: null, description: "Array of data objects representing individual points on a chart." },
  { name: "pointStyle", type: "object | function", required: false, default: null, description: "Inline style for each point element. Object or function returning a style object." },
  { name: "pointClass", type: "string | function", required: false, default: null, description: "CSS class for each point element." },
  { name: "canvasPoints", type: "boolean | function", required: false, default: "false", description: "Render points to Canvas instead of SVG. Boolean or per-point function." },
  { name: "customPointMark", type: "function | JSX", required: false, default: null, description: "Custom SVG mark for each point. Receives { d, i, xScale, yScale, styleFn }." },
  { name: "pointRenderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for points. Use "sketchy" or roughjs options.' },

  // --- Lines ---
  { name: "lines", type: "array", required: false, default: null, description: "Array of line objects, each containing a coordinates array." },
  { name: "lineDataAccessor", type: "string | function", required: false, default: '"coordinates"', description: "How to access the coordinates array from each line object." },
  { name: "lineType", type: "string | object", required: false, default: '"line"', description: 'Line rendering type: "line", "stackedarea", "stackedpercent", "bumpline", "bumparea", "cumulative", "difference", "linepercent".' },
  { name: "lineStyle", type: "object | function", required: false, default: null, description: "Inline style for each line element. Object or function returning a style object." },
  { name: "lineClass", type: "string | function", required: false, default: null, description: "CSS class for each line element." },
  { name: "lineIDAccessor", type: "string | function", required: false, default: '"semioticLineID"', description: "Identifies each line for annotation placement." },
  { name: "customLineMark", type: "function", required: false, default: null, description: "Custom SVG mark for each line. Receives { d, i, xScale, yScale, styleFn }." },
  { name: "canvasLines", type: "boolean | function", required: false, default: "false", description: "Render lines to Canvas instead of SVG." },
  { name: "lineRenderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for lines. Use "sketchy" or roughjs options.' },
  { name: "defined", type: "function", required: false, default: null, description: "Accessor controlling where the line is defined. Lines render gaps where undefined." },

  // --- Summaries ---
  { name: "summaries", type: "array", required: false, default: null, description: "Array of summary data objects (areas, contours, heatmaps, hexbins)." },
  { name: "summaryDataAccessor", type: "string | function", required: false, default: '"coordinates"', description: "How to access coordinates from each summary object." },
  { name: "summaryType", type: "string | object", required: false, default: '"basic"', description: 'Summary rendering type: "contour", "heatmap", "hexbin", "basic".' },
  { name: "summaryStyle", type: "object | function", required: false, default: null, description: "Inline style for each summary element." },
  { name: "summaryClass", type: "string | function", required: false, default: null, description: "CSS class for each summary element." },
  { name: "customSummaryMark", type: "function", required: false, default: null, description: "Custom SVG mark for each summary." },
  { name: "canvasSummaries", type: "boolean | function", required: false, default: "false", description: "Render summaries to Canvas instead of SVG." },
  { name: "summaryRenderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for summaries.' },

  // --- Annotation & Decoration ---
  { name: "axes", type: "array", required: false, default: null, description: "Array of axis configuration objects (orient, label, tickFormat, etc.)." },
  { name: "annotations", type: "array", required: false, default: "[]", description: "Array of annotation objects positioned in data space." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip renderer. Receives the hovered data point and returns JSX." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation renderer. Return null to fall back to defaults." },
  { name: "htmlAnnotationRules", type: "function", required: false, default: null, description: "Custom HTML annotation renderer for overlay elements." },
  { name: "annotationSettings", type: "object", required: false, default: null, description: "Layout settings for annotation collision avoidance (marginalia)." },
  { name: "matte", type: "boolean", required: false, default: "false", description: "Adds a border matte that covers the margin area to hide overflow." },
  { name: "backgroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered behind the chart." },
  { name: "foregroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered in front of the chart." },
  { name: "canvasPostProcess", type: "string | function", required: false, default: null, description: 'Canvas post-processing. Use "chuckClose" or a custom function.' },
  { name: "additionalDefs", type: "JSX", required: false, default: null, description: "SVG defs injected into the visualization layer (gradients, patterns, etc.)." },

  // --- Interaction ---
  { name: "hoverAnnotation", type: "boolean | array", required: false, default: "false", description: "Enable automatic tooltips with voronoi overlay. Pass an array of annotation types for complex hover." },
  { name: "customHoverBehavior", type: "function", required: false, default: null, description: "Callback fired on hover with the data point." },
  { name: "customClickBehavior", type: "function", required: false, default: null, description: "Callback fired on click with the data point." },
  { name: "customDoubleClickBehavior", type: "function", required: false, default: null, description: "Callback fired on double-click with the data point." },
  { name: "interaction", type: "object", required: false, default: null, description: 'Brush interaction configuration: { brush: "xBrush" | "yBrush" | "xyBrush", start, during, end, extent }.' },

  // --- Miscellaneous ---
  { name: "name", type: "string", required: false, default: '"xyframe"', description: "Internal name for linking frames together." },
  { name: "dataVersion", type: "string", required: false, default: null, description: "Optimization flag. Frame skips re-render until this string changes." },
  { name: "renderOrder", type: "array", required: false, default: null, description: 'Rendering order of data layers: ["lines", "points", "summaries"].' },
  { name: "baseMarkProps", type: "object", required: false, default: null, description: "Base props passed to all rendered marks." },
  { name: "download", type: "boolean", required: false, default: "false", description: "Enables SVG download of the frame." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function XYFramePage() {
  return (
    <PageLayout
      title="XYFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "XYFrame", path: "/frames/xy-frame" },
      ]}
      prevPage={null}
      nextPage={{ title: "OrdinalFrame", path: "/frames/ordinal-frame" }}
    >
      <ComponentMeta
        componentName="XYFrame"
        importStatement='import { XYFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "LineChart", path: "/charts/line-chart" },
          { name: "AreaChart", path: "/charts/area-chart" },
          { name: "Scatterplot", path: "/charts/scatterplot" },
        ]}
      />

      <p>
        XYFrame is the foundational frame for all continuous x/y data
        visualization in Semiotic. It renders <strong>points</strong>,{" "}
        <strong>lines</strong>, and <strong>summaries</strong> (areas, contours,
        heatmaps) in a single coordinate space. Use XYFrame directly when you
        need full control over mark rendering, multi-layer compositions, custom
        annotations, or brush interactions that go beyond what the simpler Chart
        components offer.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Concepts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="concepts">Concepts</h2>

      <p>
        XYFrame processes data through a pipeline that transforms raw arrays
        into positioned SVG or Canvas marks:
      </p>

      <ol>
        <li>
          <strong>Data input</strong> -- You provide one or more of{" "}
          <code>lines</code>, <code>points</code>, and <code>summaries</code>.
          Each layer is independent and rendered in the order specified by{" "}
          <code>renderOrder</code>.
        </li>
        <li>
          <strong>Accessor mapping</strong> -- <code>xAccessor</code> and{" "}
          <code>yAccessor</code> extract numeric values from your data objects.
          For lines, <code>lineDataAccessor</code> extracts the coordinate
          array from each line object.
        </li>
        <li>
          <strong>Scale computation</strong> -- XYFrame auto-computes extents
          from your data (or uses <code>xExtent</code>/<code>yExtent</code>)
          and builds d3 scales to map data space to pixel space.
        </li>
        <li>
          <strong>Mark rendering</strong> -- Each data element is rendered as
          SVG or Canvas depending on <code>canvasPoints</code>,{" "}
          <code>canvasLines</code>, and <code>canvasSummaries</code> flags.
          Custom marks override default rendering.
        </li>
        <li>
          <strong>Annotation overlay</strong> -- Annotations, tooltips, and
          interaction layers are positioned on top of the rendered marks.
        </li>
      </ol>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        The simplest XYFrame needs <code>lines</code> (or <code>points</code>),{" "}
        <code>xAccessor</code>, <code>yAccessor</code>, and a{" "}
        <code>lineStyle</code>.
      </p>

      <LiveExample
        frameProps={{
          lines: lineData,
          xAccessor: "month",
          yAccessor: "value",
          lineDataAccessor: "coordinates",
          lineStyle: { stroke: "#6366f1", strokeWidth: 2 },
          axes: [
            { orient: "left", label: "Revenue ($)" },
            { orient: "bottom", label: "Month" },
          ],
          hoverAnnotation: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
        }}
        type={XYFrame}
        startHidden={false}
        overrideProps={{
          lines: `[{
  title: "Revenue",
  coordinates: [
    { month: 1, value: 12000 },
    { month: 2, value: 18000 },
    // ...more data
  ]
}]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="multi-line-with-custom-styles">Multi-Line with Custom Styles</h3>
      <p>
        Pass multiple line objects and use a function for{" "}
        <code>lineStyle</code> to color each line differently. Set{" "}
        <code>showLinePoints</code> to render dots at each data point along the
        lines.
      </p>

      <LiveExample
        frameProps={{
          lines: multiLineData,
          xAccessor: "month",
          yAccessor: "value",
          lineDataAccessor: "coordinates",
          showLinePoints: true,
          lineStyle: (d, i) => ({
            stroke: colors[i % colors.length],
            strokeWidth: 2,
          }),
          pointStyle: (d) => ({
            fill: colors[
              multiLineData.findIndex(
                (line) => line.title === (d.parentLine && d.parentLine.title)
              ) % colors.length
            ] || "#6366f1",
            r: 3,
          }),
          axes: [
            { orient: "left", label: "Revenue ($)" },
            { orient: "bottom", label: "Month" },
          ],
          hoverAnnotation: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[
  { title: "Widget", coordinates: [...] },
  { title: "Gadget", coordinates: [...] },
  { title: "Doohickey", coordinates: [...] }
]`,
          lineStyle: `(d, i) => ({
  stroke: colors[i],
  strokeWidth: 2
})`,
          pointStyle: `(d) => ({
  fill: colors[d.parentLine.index],
  r: 3
})`,
        }}
        hiddenProps={{}}
      />

      <h3 id="scatterplot-with-custom-marks">Scatterplot with Custom Point Marks</h3>
      <p>
        Use <code>points</code> instead of <code>lines</code> and{" "}
        <code>customPointMark</code> to render variable-size circles based on a
        data property.
      </p>

      <LiveExample
        frameProps={{
          points: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          customPointMark: ({ d }) => (
            <circle
              r={d.size / 3}
              fill="#6366f1"
              fillOpacity={0.6}
              stroke="#6366f1"
              strokeWidth={1}
            />
          ),
          axes: [
            { orient: "left", label: "Y Value" },
            { orient: "bottom", label: "X Value" },
          ],
          hoverAnnotation: true,
          margin: { top: 20, bottom: 60, left: 60, right: 20 },
        }}
        type={XYFrame}
        overrideProps={{
          points: `[
  { x: 1, y: 3, size: 8 },
  { x: 2, y: 7, size: 12 },
  // ...more points
]`,
          customPointMark: `({ d }) => (
  <circle
    r={d.size / 3}
    fill="#6366f1"
    fillOpacity={0.6}
    stroke="#6366f1"
    strokeWidth={1}
  />
)`,
        }}
        hiddenProps={{}}
      />

      <h3 id="stacked-area">Stacked Area Chart</h3>
      <p>
        Set <code>lineType</code> to <code>"stackedarea"</code> and use{" "}
        <code>lineStyle</code> with a fill to create stacked area charts. This
        is a capability that goes beyond the basic Chart components.
      </p>

      <LiveExample
        frameProps={{
          lines: stackedData,
          xAccessor: "month",
          yAccessor: "value",
          lineDataAccessor: "coordinates",
          lineType: "stackedarea",
          lineStyle: (d, i) => ({
            fill: colors[i % colors.length],
            fillOpacity: 0.6,
            stroke: colors[i % colors.length],
            strokeWidth: 1,
          }),
          axes: [
            { orient: "left", label: "Revenue ($)" },
            { orient: "bottom", label: "Month" },
          ],
          hoverAnnotation: true,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[
  { title: "Product A", coordinates: [...] },
  { title: "Product B", coordinates: [...] },
  { title: "Product C", coordinates: [...] }
]`,
          lineType: '"stackedarea"',
          lineStyle: `(d, i) => ({
  fill: colors[i],
  fillOpacity: 0.6,
  stroke: colors[i],
  strokeWidth: 1
})`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="XYFrame" props={xyFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> -- simplified Chart
          component that wraps XYFrame for line visualizations
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
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> -- for
          categorical data (bar charts, violin plots, etc.)
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> -- for
          topological data (force layouts, hierarchies, etc.)
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> -- adding
          callouts, highlights, and notes to any visualization
        </li>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> -- custom tooltip
          content and positioning
        </li>
      </ul>
    </PageLayout>
  )
}
