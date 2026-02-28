import React from "react"
import { OrdinalFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const barData = [
  { department: "Engineering", employees: 52, color: "#6366f1" },
  { department: "Design", employees: 28, color: "#f59e0b" },
  { department: "Marketing", employees: 34, color: "#10b981" },
  { department: "Sales", employees: 41, color: "#ef4444" },
  { department: "Support", employees: 19, color: "#8b5cf6" },
  { department: "HR", employees: 12, color: "#ec4899" },
]

const stackedBarData = [
  { region: "North", revenue: 12000, product: "Widget" },
  { region: "North", revenue: 8000, product: "Gadget" },
  { region: "North", revenue: 5000, product: "Doohickey" },
  { region: "South", revenue: 9000, product: "Widget" },
  { region: "South", revenue: 11000, product: "Gadget" },
  { region: "South", revenue: 3000, product: "Doohickey" },
  { region: "East", revenue: 15000, product: "Widget" },
  { region: "East", revenue: 6000, product: "Gadget" },
  { region: "East", revenue: 7000, product: "Doohickey" },
  { region: "West", revenue: 7000, product: "Widget" },
  { region: "West", revenue: 13000, product: "Gadget" },
  { region: "West", revenue: 9000, product: "Doohickey" },
]

const swarmData = []
const categories = ["Q1", "Q2", "Q3", "Q4"]
categories.forEach((cat) => {
  for (let i = 0; i < 30; i++) {
    swarmData.push({
      quarter: cat,
      value: Math.random() * 80 + 10 + (categories.indexOf(cat) * 15),
    })
  }
})

const violinData = []
const groups = ["Control", "Treatment A", "Treatment B"]
groups.forEach((group) => {
  const center = group === "Control" ? 50 : group === "Treatment A" ? 65 : 75
  for (let i = 0; i < 60; i++) {
    violinData.push({
      group,
      value: center + (Math.random() - 0.5) * 40 + (Math.random() - 0.5) * 20,
    })
  }
})

const productColors = { Widget: "#6366f1", Gadget: "#f59e0b", Doohickey: "#10b981" }

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const ordinalFrameProps = [
  // --- General ---
  { name: "size", type: "array", required: false, default: "[500, 500]", description: "Sets the width and height of the frame as [width, height]." },
  { name: "data", type: "array", required: true, default: "[]", description: "Array of data objects. Each object's column is based on oAccessor, height on rAccessor." },
  { name: "oAccessor", type: "string | function", required: false, default: null, description: "Determines how ordinal (categorical) values are accessed from the data." },
  { name: "rAccessor", type: "string | function", required: false, default: null, description: "Determines how range (numerical) values are accessed from the data." },
  { name: "oSort", type: "function", required: false, default: null, description: "Sorting function for columns. Receives ordinal string values." },
  { name: "projection", type: "string", required: false, default: '"vertical"', description: 'Orientation of the chart: "vertical", "horizontal", or "radial".' },
  { name: "title", type: "string | JSX", required: false, default: null, description: "Centers a title at the top of the chart." },
  { name: "margin", type: "number | object", required: false, default: null, description: "Margin around the chart area." },
  { name: "rScaleType", type: "function", required: false, default: "scaleLinear()", description: "Custom d3-scale for the range axis." },
  { name: "oScaleType", type: "function", required: false, default: "scaleBand()", description: "Custom d3-scale for ordinal values." },
  { name: "rExtent", type: "array | object", required: false, default: null, description: "Sets min/max for the range axis. Supports [min, max] or { extent, onChange }." },
  { name: "invertR", type: "boolean", required: false, default: "false", description: "Inverts the range axis." },
  { name: "oPadding", type: "number", required: false, default: null, description: "Distance in pixels between each column." },
  { name: "dynamicColumnWidth", type: "string | function", required: false, default: null, description: "Column width proportional to a data property (Marimekko-style) or a function." },
  { name: "pixelColumnWidth", type: "number", required: false, default: null, description: "Fixed pixel width for each column. Overrides the size setting for that dimension." },
  { name: "renderKey", type: "string | function", required: false, default: null, description: "Key for animated transitions." },

  // --- Piece Rendering ---
  { name: "type", type: "string | object", required: false, default: '"none"', description: 'Piece type: "bar", "clusterbar", "point", "swarm", "timeline", "barpercent", or "none". Object form adds type-specific options.' },
  { name: "style", type: "object | function", required: false, default: null, description: "Inline style for each piece element." },
  { name: "pieceClass", type: "string | function", required: false, default: null, description: "CSS class for each piece element." },
  { name: "canvasPieces", type: "boolean | function", required: false, default: "false", description: "Render pieces to Canvas instead of SVG." },
  { name: "renderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for pieces (e.g. "sketchy").' },
  { name: "connectorType", type: "function", required: false, default: null, description: "Function returning a key for connecting elements in adjacent columns (slope charts, funnels)." },
  { name: "connectorStyle", type: "object | function", required: false, default: null, description: "Inline style for connector elements. Has access to source and target data." },
  { name: "canvasConnectors", type: "boolean | function", required: false, default: "false", description: "Render connectors to Canvas instead of SVG." },
  { name: "connectorRenderMode", type: "string | object | function", required: false, default: null, description: "Non-photorealistic render mode for connectors." },

  // --- Summary Rendering ---
  { name: "summaryType", type: "string | object", required: false, default: null, description: 'Summary visualization: "violin", "boxplot", "histogram", "ridgeline", "contour", "heatmap". Object form adds type-specific options.' },
  { name: "summaryStyle", type: "object | function", required: false, default: null, description: "Inline style for summary elements." },
  { name: "summaryClass", type: "string | function", required: false, default: null, description: "CSS class for summary elements." },
  { name: "summaryPosition", type: "function", required: false, default: null, description: "Function to position summaries within their column." },
  { name: "canvasSummaries", type: "boolean | function", required: false, default: "false", description: "Render summaries to Canvas instead of SVG." },
  { name: "summaryRenderMode", type: "string | object | function", required: false, default: null, description: "Non-photorealistic render mode for summaries." },

  // --- Annotation & Decoration ---
  { name: "axes", type: "array | object", required: false, default: null, description: "Axis configuration objects for the range axis. Use oLabel for column labels." },
  { name: "oLabel", type: "boolean | function | object", required: false, default: "false", description: "Column labels. Boolean for simple labels, function for custom JSX, object for placement options." },
  { name: "annotations", type: "array", required: false, default: "[]", description: "Array of annotation objects positioned in o/r data space." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip renderer for hovered pieces or columns." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation renderer." },
  { name: "htmlAnnotationRules", type: "function", required: false, default: null, description: "Custom HTML annotation renderer." },
  { name: "annotationSettings", type: "object", required: false, default: null, description: "Layout settings for annotation collision avoidance." },
  { name: "matte", type: "boolean", required: false, default: "false", description: "Adds a border matte to hide overflow." },
  { name: "backgroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered behind the chart." },
  { name: "foregroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered in front of the chart." },
  { name: "additionalDefs", type: "JSX", required: false, default: null, description: "SVG defs injected into the visualization layer." },

  // --- Interaction ---
  { name: "hoverAnnotation", type: "boolean", required: false, default: "false", description: "Enable automatic column-level tooltips." },
  { name: "pieceHoverAnnotation", type: "boolean | object", required: false, default: "false", description: "Enable tooltips for individual pieces with voronoi overlay." },
  { name: "customHoverBehavior", type: "function", required: false, default: null, description: "Callback fired on hover." },
  { name: "customClickBehavior", type: "function", required: false, default: null, description: "Callback fired on click." },
  { name: "customDoubleClickBehavior", type: "function", required: false, default: null, description: "Callback fired on double-click." },
  { name: "interaction", type: "object", required: false, default: null, description: "Column brush configuration: { columnsBrush, start, during, end, extent }." },

  // --- Miscellaneous ---
  { name: "name", type: "string", required: false, default: null, description: "Internal name for linking frames together." },
  { name: "multiAxis", type: "boolean", required: false, default: "false", description: "Enable multiple axes for the frame." },
  { name: "renderOrder", type: "array", required: false, default: null, description: 'Rendering order of data layers: ["pieces", "summaries", "connectors"].' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OrdinalFramePage() {
  return (
    <PageLayout
      title="OrdinalFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "OrdinalFrame", path: "/frames/ordinal-frame" },
      ]}
      prevPage={{ title: "XYFrame", path: "/frames/xy-frame" }}
      nextPage={{ title: "NetworkFrame", path: "/frames/network-frame" }}
    >
      <ComponentMeta
        componentName="OrdinalFrame"
        importStatement='import { OrdinalFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "BarChart", path: "/charts/bar-chart" },
          { name: "PieChart", path: "/charts/pie-chart" },
          { name: "XYFrame", path: "/frames/xy-frame" },
        ]}
      />

      <p>
        OrdinalFrame displays categorical data along the{" "}
        <strong>ordinal</strong> (categorical) axis and continuous data along
        the <strong>range</strong> (numerical) axis. It powers bar charts,
        clustered bars, timelines, swarm plots, pie charts, and a rich set of
        statistical summaries (violin plots, boxplots, ridgeline plots, and
        more). Use OrdinalFrame directly when you need full control over piece
        rendering, summary overlays, connectors between columns, or brush
        interactions.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Concepts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="concepts">Concepts</h2>

      <p>
        OrdinalFrame processes data through a pipeline designed for categorical
        grouping:
      </p>

      <ol>
        <li>
          <strong>Data input</strong> -- A single <code>data</code> array is
          split into columns based on <code>oAccessor</code> (the ordinal
          accessor) and measured by <code>rAccessor</code> (the range
          accessor).
        </li>
        <li>
          <strong>Column layout</strong> -- Columns are evenly distributed
          across the available space (controlled by <code>oPadding</code>,{" "}
          <code>dynamicColumnWidth</code>, and <code>pixelColumnWidth</code>).
          The <code>projection</code> prop flips the layout to horizontal or
          radial.
        </li>
        <li>
          <strong>Piece rendering</strong> -- The <code>type</code> prop
          determines how data is drawn within each column: bars, clustered
          bars, points, swarm plots, or timelines. Each "piece" is one bar
          segment, one dot, or one timeline block.
        </li>
        <li>
          <strong>Summary rendering</strong> -- <code>summaryType</code>{" "}
          overlays statistical summaries on each column: violin plots,
          boxplots, histograms, ridgelines, contours, or heatmaps.
        </li>
        <li>
          <strong>Connectors</strong> -- <code>connectorType</code> draws links
          between pieces in adjacent columns, useful for slope charts and
          funnel diagrams.
        </li>
      </ol>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A basic bar chart needs <code>data</code>, <code>oAccessor</code>,{" "}
        <code>rAccessor</code>, and <code>type="bar"</code>.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "department",
          rAccessor: "employees",
          type: "bar",
          style: (d) => ({ fill: d.color }),
          oLabel: true,
          axes: [{ orient: "left", label: "Employees" }],
          oPadding: 8,
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
        }}
        type={OrdinalFrame}
        startHidden={false}
        overrideProps={{
          data: `[
  { department: "Engineering", employees: 52, color: "#6366f1" },
  { department: "Design", employees: 28, color: "#f59e0b" },
  { department: "Marketing", employees: 34, color: "#10b981" },
  // ...more departments
]`,
          style: `(d) => ({ fill: d.color })`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="stacked-bar">Stacked Bar Chart</h3>
      <p>
        When multiple data objects share the same ordinal value, bars are
        automatically stacked. Use a function for <code>style</code> to
        color each segment by category.
      </p>

      <LiveExample
        frameProps={{
          data: stackedBarData,
          oAccessor: "region",
          rAccessor: "revenue",
          type: "bar",
          style: (d) => ({
            fill: productColors[d.product] || "#999",
          }),
          oLabel: true,
          oPadding: 12,
          axes: [{ orient: "left", label: "Revenue ($)" }],
          margin: { top: 20, bottom: 60, left: 80, right: 20 },
          hoverAnnotation: true,
          tooltipContent: (d) => (
            <div style={{ background: "var(--surface-1)", padding: "8px 12px", border: "1px solid var(--surface-3)", borderRadius: 4, fontSize: 13 }}>
              <strong>{d.product}</strong>: ${d.revenue.toLocaleString()}
            </div>
          ),
          pieceHoverAnnotation: true,
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { region: "North", revenue: 12000, product: "Widget" },
  { region: "North", revenue: 8000, product: "Gadget" },
  // ...more data with shared region values
]`,
          style: `(d) => ({ fill: productColors[d.product] })`,
          tooltipContent: `(d) => (
  <div>
    <strong>{d.product}</strong>: \${d.revenue.toLocaleString()}
  </div>
)`,
        }}
        hiddenProps={{}}
      />

      <h3 id="swarm-plot">Swarm Plot</h3>
      <p>
        Set <code>type</code> to <code>"swarm"</code> to display individual
        data points as a beeswarm within each column. This is useful for
        showing distributions while preserving individual observations.
      </p>

      <LiveExample
        frameProps={{
          data: swarmData,
          oAccessor: "quarter",
          rAccessor: "value",
          type: { type: "swarm", r: 4 },
          style: { fill: "#6366f1", fillOpacity: 0.7, stroke: "#6366f1", strokeWidth: 0.5 },
          oLabel: true,
          oPadding: 16,
          axes: [{ orient: "left", label: "Score" }],
          margin: { top: 20, bottom: 50, left: 60, right: 20 },
          pieceHoverAnnotation: true,
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { quarter: "Q1", value: 42 },
  { quarter: "Q1", value: 67 },
  // ...30 points per quarter
]`,
          type: '{ type: "swarm", r: 4 }',
        }}
        hiddenProps={{}}
      />

      <h3 id="horizontal-with-summaries">Horizontal Projection with Violin Summaries</h3>
      <p>
        Set <code>projection="horizontal"</code> and add a{" "}
        <code>summaryType</code> to overlay statistical summaries. This example
        shows violin plots with the underlying data points visible.
      </p>

      <LiveExample
        frameProps={{
          data: violinData,
          oAccessor: "group",
          rAccessor: "value",
          projection: "horizontal",
          type: { type: "point", r: 2 },
          style: { fill: "#6366f1", fillOpacity: 0.4 },
          summaryType: "violin",
          summaryStyle: { fill: "#6366f1", fillOpacity: 0.15, stroke: "#6366f1", strokeWidth: 1 },
          oLabel: true,
          oPadding: 20,
          axes: [{ orient: "bottom", label: "Value" }],
          margin: { top: 20, bottom: 50, left: 100, right: 20 },
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { group: "Control", value: 42 },
  { group: "Treatment A", value: 71 },
  // ...60 observations per group
]`,
          type: '{ type: "point", r: 2 }',
          summaryType: '"violin"',
          summaryStyle: `{
  fill: "#6366f1",
  fillOpacity: 0.15,
  stroke: "#6366f1",
  strokeWidth: 1
}`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="OrdinalFrame" props={ordinalFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/bar-chart">BarChart</Link> -- simplified Chart
          component that wraps OrdinalFrame for bar visualizations
        </li>
        <li>
          <Link to="/charts/pie-chart">PieChart</Link> -- simplified Chart
          component for radial projection bar charts
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> -- for continuous x/y
          data (line charts, scatterplots, etc.)
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> -- for
          topological data (force layouts, hierarchies, etc.)
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> -- adding
          callouts, highlights, and notes to any visualization
        </li>
      </ul>
    </PageLayout>
  )
}
