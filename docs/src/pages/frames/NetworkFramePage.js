import React from "react"
import { NetworkFrame } from "semiotic"

import ComponentMeta from "../../components/ComponentMeta"
import PropTable from "../../components/PropTable"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const forceNodes = [
  { id: "Alice", group: 1 },
  { id: "Bob", group: 1 },
  { id: "Carol", group: 2 },
  { id: "Dave", group: 2 },
  { id: "Eve", group: 3 },
  { id: "Frank", group: 3 },
  { id: "Grace", group: 1 },
  { id: "Heidi", group: 2 },
]

const forceEdges = [
  { source: "Alice", target: "Bob", weight: 3 },
  { source: "Alice", target: "Carol", weight: 1 },
  { source: "Bob", target: "Dave", weight: 2 },
  { source: "Carol", target: "Dave", weight: 4 },
  { source: "Dave", target: "Eve", weight: 2 },
  { source: "Eve", target: "Frank", weight: 5 },
  { source: "Frank", target: "Alice", weight: 1 },
  { source: "Grace", target: "Alice", weight: 3 },
  { source: "Heidi", target: "Carol", weight: 2 },
  { source: "Heidi", target: "Eve", weight: 1 },
  { source: "Grace", target: "Bob", weight: 2 },
]

const sankeyNodes = [
  { id: "Organic" },
  { id: "Paid Search" },
  { id: "Social" },
  { id: "Direct" },
  { id: "Landing Page" },
  { id: "Product Page" },
  { id: "Checkout" },
  { id: "Purchase" },
  { id: "Bounce" },
]

const sankeyEdges = [
  { source: "Organic", target: "Landing Page", value: 120 },
  { source: "Paid Search", target: "Landing Page", value: 80 },
  { source: "Social", target: "Landing Page", value: 45 },
  { source: "Direct", target: "Product Page", value: 60 },
  { source: "Landing Page", target: "Product Page", value: 180 },
  { source: "Landing Page", target: "Bounce", value: 65 },
  { source: "Product Page", target: "Checkout", value: 140 },
  { source: "Product Page", target: "Bounce", value: 100 },
  { source: "Checkout", target: "Purchase", value: 110 },
  { source: "Checkout", target: "Bounce", value: 30 },
]

const hierarchyData = {
  id: "Company",
  children: [
    {
      id: "Engineering",
      children: [
        { id: "Frontend", value: 18 },
        { id: "Backend", value: 22 },
        { id: "Infra", value: 12 },
      ],
    },
    {
      id: "Product",
      children: [
        { id: "Design", value: 14 },
        { id: "PM", value: 8 },
        { id: "Research", value: 6 },
      ],
    },
    {
      id: "Business",
      children: [
        { id: "Sales", value: 20 },
        { id: "Marketing", value: 16 },
        { id: "Support", value: 10 },
      ],
    },
  ],
}

const groupColors = { 1: "#6366f1", 2: "#f59e0b", 3: "#10b981" }

// ---------------------------------------------------------------------------
// Props definition for PropTable
// ---------------------------------------------------------------------------

const networkFrameProps = [
  // --- General ---
  { name: "size", type: "array", required: false, default: "[500, 500]", description: "Sets the width and height of the frame as [width, height]." },
  { name: "networkType", type: "string | object", required: false, default: '{ type: "force", iterations: 500 }', description: 'Network layout type: "force", "sankey", "chord", "arc", "dagre", "motifs", "matrix", "cluster", "tree", "circlepack", "treemap", "partition". Object form adds layout-specific options.' },
  { name: "title", type: "string | JSX", required: false, default: null, description: "Centers a title at the top of the chart." },
  { name: "margin", type: "number | object", required: false, default: null, description: "Margin around the chart area." },
  { name: "renderKey", type: "string | function", required: false, default: null, description: "Key for animated transitions." },

  // --- Node Rendering ---
  { name: "nodes", type: "array", required: false, default: null, description: "Array of node objects. Nodes are auto-generated from edges if not provided." },
  { name: "nodeIDAccessor", type: "string | function", required: false, default: '"id"', description: "Accessor for unique node identifiers." },
  { name: "nodeStyle", type: "object | function", required: false, default: null, description: "Inline style for each node. Object or function receiving the node data." },
  { name: "nodeClass", type: "string | function", required: false, default: null, description: "CSS class for each node." },
  { name: "nodeRenderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for nodes (e.g. "sketchy").' },
  { name: "nodeLabels", type: "boolean | function", required: false, default: "false", description: "Show text labels on nodes. Boolean for id labels, function for custom JSX." },
  { name: "nodeSizeAccessor", type: "number | function", required: false, default: "5", description: "Fixed radius (number) or dynamic size function for nodes." },
  { name: "customNodeIcon", type: "function", required: false, default: null, description: "Custom SVG JSX for each node. Receives { d, i, renderKeyFn, styleFn, classFn, transform }." },
  { name: "canvasNodes", type: "boolean | function", required: false, default: "false", description: "Render nodes to Canvas instead of SVG." },

  // --- Edge Rendering ---
  { name: "edges", type: "array | object", required: false, default: null, description: "Array of edge objects with source and target references." },
  { name: "sourceAccessor", type: "string | function", required: false, default: '"source"', description: "Accessor for the source node of each edge." },
  { name: "targetAccessor", type: "string | function", required: false, default: '"target"', description: "Accessor for the target node of each edge." },
  { name: "edgeStyle", type: "object | function", required: false, default: null, description: "Inline style for each edge." },
  { name: "edgeClass", type: "string | function", required: false, default: null, description: "CSS class for each edge." },
  { name: "edgeRenderMode", type: "string | object | function", required: false, default: null, description: 'Non-photorealistic render mode for edges.' },
  { name: "edgeType", type: "string | object | function", required: false, default: null, description: 'Edge shape: "curve", "linearc", "ribbon", "arrowhead", "halfarrow", "nail", "comet", "taffy", or custom function.' },
  { name: "edgeWidthAccessor", type: "string | function", required: false, default: '"weight"', description: "Accessor for edge width/thickness." },
  { name: "customEdgeIcon", type: "function", required: false, default: null, description: "Custom SVG JSX for each edge. Receives { d, i, renderKeyFn, styleFn, classFn }." },
  { name: "canvasEdges", type: "boolean | function", required: false, default: "false", description: "Render edges to Canvas instead of SVG." },

  // --- Annotation & Decoration ---
  { name: "annotations", type: "array", required: false, default: "[]", description: "Array of annotation objects." },
  { name: "tooltipContent", type: "function", required: false, default: null, description: "Custom tooltip renderer for hovered nodes." },
  { name: "svgAnnotationRules", type: "function", required: false, default: null, description: "Custom SVG annotation renderer." },
  { name: "htmlAnnotationRules", type: "function", required: false, default: null, description: "Custom HTML annotation renderer." },
  { name: "annotationSettings", type: "object", required: false, default: null, description: "Annotation layout settings." },
  { name: "matte", type: "boolean", required: false, default: "false", description: "Adds a border matte to hide overflow." },
  { name: "backgroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered behind the chart." },
  { name: "foregroundGraphics", type: "JSX | array", required: false, default: null, description: "JSX rendered in front of the chart." },
  { name: "additionalDefs", type: "JSX", required: false, default: null, description: "SVG defs injected into the visualization layer." },

  // --- Interaction ---
  { name: "hoverAnnotation", type: "boolean", required: false, default: "false", description: "Enable automatic tooltips for each node." },
  { name: "customHoverBehavior", type: "function", required: false, default: null, description: "Callback fired on hover." },
  { name: "customClickBehavior", type: "function", required: false, default: null, description: "Callback fired on click." },
  { name: "customDoubleClickBehavior", type: "function", required: false, default: null, description: "Callback fired on double-click." },

  // --- Miscellaneous ---
  { name: "name", type: "string", required: false, default: '"networkframe"', description: "Internal name for linking frames together." },
  { name: "filterRenderedNodes", type: "function", required: false, default: null, description: "Filter function to control which nodes are rendered." },
  { name: "renderOrder", type: "array", required: false, default: '["edges", "nodes"]', description: 'Rendering order of data layers: ["edges", "nodes"].' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkFramePage() {
  return (
    <PageLayout
      title="NetworkFrame"
      tier="frames"
      breadcrumbs={[
        { label: "Frames", path: "/frames" },
        { label: "NetworkFrame", path: "/frames/network-frame" },
      ]}
      prevPage={{ title: "OrdinalFrame", path: "/frames/ordinal-frame" }}
      nextPage={{ title: "RealtimeFrame", path: "/frames/realtime-frame" }}
    >
      <ComponentMeta
        componentName="NetworkFrame"
        importStatement='import { NetworkFrame } from "semiotic"'
        tier="frames"
        related={[
          { name: "XYFrame", path: "/frames/xy-frame" },
          { name: "OrdinalFrame", path: "/frames/ordinal-frame" },
        ]}
      />

      <p>
        NetworkFrame displays topological data where relationships between
        entities matter more than absolute x/y position. It supports a wide
        range of layout algorithms: force-directed graphs, Sankey flow
        diagrams, chord diagrams, arc diagrams, hierarchical trees, treemaps,
        circle packing, partition layouts, and adjacency matrices. Use
        NetworkFrame when your data has <strong>nodes</strong> and{" "}
        <strong>edges</strong> (or a hierarchical structure) rather than
        continuous coordinates.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Concepts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="concepts">Concepts</h2>

      <p>
        NetworkFrame processes data through a layout pipeline:
      </p>

      <ol>
        <li>
          <strong>Data input</strong> -- You provide <code>edges</code> (an
          array of objects with source and target references) and optionally{" "}
          <code>nodes</code> (an array of node objects). Nodes referenced in
          edges but missing from the nodes array are auto-generated.
        </li>
        <li>
          <strong>Layout computation</strong> -- The <code>networkType</code>{" "}
          prop selects the layout algorithm. Force-directed layouts simulate
          physics; Sankey computes flow; hierarchical types (tree, treemap,
          circlepack, partition) require a single root node with children.
        </li>
        <li>
          <strong>Node rendering</strong> -- Each node gets x/y coordinates
          from the layout and is rendered as an SVG circle (default) or a
          custom mark via <code>customNodeIcon</code>. Nodes also receive a{" "}
          <code>degree</code> property (number of connections).
        </li>
        <li>
          <strong>Edge rendering</strong> -- Edges are drawn as paths
          connecting source and target nodes. The <code>edgeType</code> prop
          controls the path shape (curves, ribbons, arrows, etc.).
        </li>
        <li>
          <strong>Annotations and interaction</strong> -- Tooltips,
          annotations, and hover behaviors work on nodes by default.
        </li>
      </ol>

      {/* ----------------------------------------------------------------- */}
      {/* Quick Start */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="quick-start">Quick Start</h2>

      <p>
        A basic force-directed graph needs <code>nodes</code>,{" "}
        <code>edges</code>, <code>nodeIDAccessor</code>, and styling props.
      </p>

      <LiveExample
        frameProps={{
          nodes: forceNodes,
          edges: forceEdges,
          nodeIDAccessor: "id",
          networkType: { type: "force", iterations: 500, forceManyBody: -250 },
          nodeStyle: (d) => ({
            fill: groupColors[d.group] || "#999",
            stroke: "#fff",
            strokeWidth: 2,
          }),
          edgeStyle: {
            stroke: "#ccc",
            strokeWidth: 1,
          },
          nodeSizeAccessor: (d) => Math.max(d.degree * 3, 5),
          nodeLabels: true,
          hoverAnnotation: true,
          margin: 40,
        }}
        type={NetworkFrame}
        startHidden={false}
        overrideProps={{
          nodes: `[
  { id: "Alice", group: 1 },
  { id: "Bob", group: 1 },
  { id: "Carol", group: 2 },
  // ...more nodes
]`,
          edges: `[
  { source: "Alice", target: "Bob", weight: 3 },
  { source: "Alice", target: "Carol", weight: 1 },
  // ...more edges
]`,
          networkType: '{ type: "force", iterations: 500, forceManyBody: -250 }',
          nodeStyle: `(d) => ({
  fill: groupColors[d.group],
  stroke: "#fff",
  strokeWidth: 2
})`,
          nodeSizeAccessor: `(d) => Math.max(d.degree * 3, 5)`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Examples */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="examples">Examples</h2>

      <h3 id="sankey-diagram">Sankey Flow Diagram</h3>
      <p>
        Set <code>networkType</code> to <code>"sankey"</code> to visualize
        flow between stages. Edge width is proportional to the{" "}
        <code>value</code> property on each edge.
      </p>

      <LiveExample
        frameProps={{
          nodes: sankeyNodes,
          edges: sankeyEdges,
          nodeIDAccessor: "id",
          networkType: {
            type: "sankey",
            orient: "LR",
            iterations: 100,
            nodePadding: 12,
            nodeWidth: 12,
          },
          nodeStyle: {
            fill: "#6366f1",
            stroke: "#4f46e5",
            strokeWidth: 1,
          },
          edgeStyle: (d) => ({
            fill: "#6366f1",
            fillOpacity: 0.15,
            stroke: "#6366f1",
            strokeOpacity: 0.3,
            strokeWidth: 0.5,
          }),
          nodeLabels: (d) => (
            <text
              textAnchor={d.x0 < 250 ? "start" : "end"}
              y={d.height / 2}
              x={d.x0 < 250 ? d.width + 6 : -6}
              fontSize={11}
              fill="#333"
            >
              {d.id}
            </text>
          ),
          hoverAnnotation: true,
          margin: { top: 20, bottom: 20, left: 20, right: 20 },
        }}
        type={NetworkFrame}
        overrideProps={{
          nodes: `[
  { id: "Organic" },
  { id: "Paid Search" },
  // ...traffic sources and funnel stages
]`,
          edges: `[
  { source: "Organic", target: "Landing Page", value: 120 },
  { source: "Paid Search", target: "Landing Page", value: 80 },
  // ...flow between stages
]`,
          networkType: `{
  type: "sankey",
  orient: "LR",
  iterations: 100,
  nodePadding: 12,
  nodeWidth: 12
}`,
          nodeLabels: `(d) => (
  <text ...>{d.id}</text>
)`,
          edgeStyle: `(d) => ({
  fill: "#6366f1",
  fillOpacity: 0.15,
  stroke: "#6366f1",
  strokeOpacity: 0.3
})`,
        }}
        hiddenProps={{}}
      />

      <h3 id="treemap">Treemap Layout</h3>
      <p>
        For hierarchical data with a single root, set <code>networkType</code>{" "}
        to <code>"treemap"</code>. Pass the hierarchy as the edges prop (an
        object with <code>children</code> arrays). Each leaf node is sized by
        its <code>value</code> property.
      </p>

      <LiveExample
        frameProps={{
          edges: hierarchyData,
          nodeIDAccessor: "id",
          networkType: { type: "treemap", padding: 3, projection: "vertical" },
          nodeStyle: (d) => {
            const depthColors = ["#e0e7ff", "#a5b4fc", "#818cf8", "#6366f1"]
            return {
              fill: depthColors[d.depth] || "#6366f1",
              stroke: "#fff",
              strokeWidth: 1,
            }
          },
          nodeLabels: (d) => {
            if (d.children) return null
            return (
              <text
                textAnchor="middle"
                y={4}
                fontSize={10}
                fill="#333"
                style={{ pointerEvents: "none" }}
              >
                {d.id}
              </text>
            )
          },
          filterRenderedNodes: (d) => d.id !== "root-generated",
          hoverAnnotation: true,
          margin: 10,
        }}
        type={NetworkFrame}
        overrideProps={{
          edges: `{
  id: "Company",
  children: [
    {
      id: "Engineering",
      children: [
        { id: "Frontend", value: 18 },
        { id: "Backend", value: 22 },
        { id: "Infra", value: 12 }
      ]
    },
    // ...more departments
  ]
}`,
          networkType: '{ type: "treemap", padding: 3, projection: "vertical" }',
          nodeStyle: `(d) => {
  const depthColors = ["#e0e7ff", "#a5b4fc", "#818cf8", "#6366f1"]
  return {
    fill: depthColors[d.depth],
    stroke: "#fff",
    strokeWidth: 1
  }
}`,
          nodeLabels: `(d) => {
  if (d.children) return null
  return <text textAnchor="middle" y={4} fontSize={10}>{d.id}</text>
}`,
        }}
        hiddenProps={{}}
      />

      <h3 id="arc-diagram">Arc Diagram</h3>
      <p>
        Set <code>networkType</code> to <code>"arc"</code> to lay out nodes
        along a line with curved arcs connecting them. This is useful for
        showing connections within an ordered list.
      </p>

      <LiveExample
        frameProps={{
          nodes: forceNodes,
          edges: forceEdges,
          nodeIDAccessor: "id",
          networkType: "arc",
          nodeStyle: (d) => ({
            fill: groupColors[d.group] || "#999",
            stroke: "#fff",
            strokeWidth: 1.5,
          }),
          edgeStyle: (d) => ({
            fill: "none",
            stroke: groupColors[d.source.group] || "#ccc",
            strokeOpacity: 0.4,
            strokeWidth: Math.max(d.weight || 1, 1),
          }),
          nodeSizeAccessor: 6,
          nodeLabels: (d) => (
            <text
              y={18}
              textAnchor="middle"
              fontSize={10}
              fill="#666"
            >
              {d.id}
            </text>
          ),
          hoverAnnotation: true,
          margin: { top: 60, bottom: 40, left: 40, right: 40 },
        }}
        type={NetworkFrame}
        overrideProps={{
          networkType: '"arc"',
          nodeStyle: `(d) => ({
  fill: groupColors[d.group],
  stroke: "#fff",
  strokeWidth: 1.5
})`,
          edgeStyle: `(d) => ({
  fill: "none",
  stroke: groupColors[d.source.group],
  strokeOpacity: 0.4,
  strokeWidth: Math.max(d.weight, 1)
})`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Props */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="props">Props</h2>

      <PropTable componentName="NetworkFrame" props={networkFrameProps} />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> -- for continuous x/y
          data (line charts, scatterplots, areas)
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> -- for
          categorical data (bar charts, swarm plots, violin plots)
        </li>
        <li>
          <Link to="/frames/realtime-frame">RealtimeFrame</Link> -- for
          streaming canvas-based visualizations
        </li>
        <li>
          <Link to="/features/annotations">Annotations</Link> -- adding
          callouts, highlights, and notes to any visualization
        </li>
      </ul>
    </PageLayout>
  )
}
