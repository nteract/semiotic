import React from "react"
import { XYFrame, OrdinalFrame, NetworkFrame } from "semiotic"
import { curveMonotoneX } from "d3-shape"

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
    label: "Series A",
    color: "#ac58e5",
    coordinates: Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 15) * 30 + 50 + Math.random() * 10,
    })),
  },
  {
    label: "Series B",
    color: "#E0488B",
    coordinates: Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: Math.cos(i / 12) * 25 + 40 + Math.random() * 10,
    })),
  },
]

const barData = Array.from({ length: 50 }, (_, i) => ({
  category: `Item ${i + 1}`,
  value: Math.random() * 100,
  color: i % 2 === 0 ? "#ac58e5" : "#E0488B",
}))

const networkNodes = Array.from({ length: 40 }, (_, i) => ({
  id: `node-${i}`,
  r: Math.random() * 8 + 3,
}))

const networkEdges = Array.from({ length: 60 }, (_, i) => ({
  source: `node-${Math.floor(Math.random() * 40)}`,
  target: `node-${Math.floor(Math.random() * 40)}`,
})).filter((e) => e.source !== e.target)

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const canvasProps = [
  {
    name: "canvasLines",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "When true, renders lines on a canvas element instead of SVG. Can also be a function that evaluates each line and returns true to render in canvas.",
  },
  {
    name: "canvasPoints",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "When true, renders points on a canvas element. A function receives each point and returns true to render in canvas.",
  },
  {
    name: "canvasSummaries",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "When true, renders summaries (areas, contours, hexbins) on canvas. Available on both XYFrame and OrdinalFrame.",
  },
  {
    name: "canvasPieces",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "OrdinalFrame only. When true, renders pieces (bars, points, swarm items) on canvas.",
  },
  {
    name: "canvasConnectors",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "OrdinalFrame only. When true, renders connectors between ordinal pieces on canvas.",
  },
  {
    name: "canvasNodes",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "NetworkFrame only. When true, renders nodes on canvas.",
  },
  {
    name: "canvasEdges",
    type: "boolean | function",
    required: false,
    default: "false",
    description:
      "NetworkFrame only. When true, renders edges on canvas.",
  },
  {
    name: "canvasPostProcess",
    type: '"chuckClose" | function',
    required: false,
    default: "undefined",
    description:
      'Post-processing function applied to the canvas after rendering. Receives (canvas, context, size). The built-in "chuckClose" option applies a Chuck Close-style pixel filter.',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CanvasRenderingPage() {
  return (
    <PageLayout
      title="Canvas Rendering"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Canvas Rendering", path: "/features/canvas-rendering" },
      ]}
      prevPage={{ title: "Accessibility", path: "/features/accessibility" }}
      nextPage={{ title: "Sparklines", path: "/features/sparklines" }}
    >
      <p>
        By default, Semiotic renders all data visualization marks as SVG
        elements. While SVG is excellent for interactivity, accessibility, and
        styling, it can become slow when rendering thousands of elements. Canvas
        rendering provides a significant performance boost for large datasets by
        drawing marks onto an HTML5 Canvas element instead of creating individual
        DOM nodes.
      </p>

      <p>
        Every Frame type in Semiotic supports canvas rendering for its primary
        visual marks. You can also mix SVG and canvas in the same frame,
        rendering dense background marks in canvas while keeping interactive
        foreground elements in SVG.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components (the simplified API) do not directly expose canvas
        props. To enable canvas rendering on a Chart component, use the{" "}
        <code>frameProps</code> escape hatch to pass canvas properties through
        to the underlying Frame.
      </p>

      <CodeBlock
        code={`import { LineChart } from "semiotic"

<LineChart
  data={largeDataset}
  xAccessor="x"
  yAccessor="y"
  lineBy="series"
  frameProps={{
    canvasLines: true,
    canvasPoints: true,
  }}
/>`}
        language="jsx"
      />

      <p>
        This approach lets you keep the simple Chart API while opting into
        canvas when your dataset grows large enough to benefit from it.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="xy-frame-canvas">XYFrame</h3>
      <p>
        XYFrame supports <code>canvasLines</code>, <code>canvasPoints</code>,
        and <code>canvasSummaries</code>. Each accepts a boolean or a function
        that evaluates each data element and returns <code>true</code> if it
        should be rendered in canvas.
      </p>

      <LiveExample
        frameProps={{
          lines: lineData,
          xAccessor: "x",
          yAccessor: "y",
          lineDataAccessor: "coordinates",
          lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1.5 }),
          lineType: { type: "line", interpolator: curveMonotoneX },
          canvasLines: true,
          axes: [
            { orient: "left", tickFormat: (d) => d },
            { orient: "bottom", ticks: 5 },
          ],
          margin: { top: 20, bottom: 40, left: 50, right: 20 },
          title: "200 Points Per Line (Canvas)",
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[
  {
    label: "Series A",
    color: "#ac58e5",
    coordinates: Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 15) * 30 + 50 + Math.random() * 10,
    })),
  },
  {
    label: "Series B",
    color: "#E0488B",
    coordinates: /* ...similar data... */,
  },
]`,
          lineType: `{ type: "line", interpolator: curveMonotoneX }`,
          lineStyle: `d => ({ stroke: d.color, strokeWidth: 1.5 })`,
          axes: `[
  { orient: "left", tickFormat: d => d },
  { orient: "bottom", ticks: 5 }
]`,
        }}
        functions={{
          lineStyle: (d) => ({ stroke: d.color, strokeWidth: 1.5 }),
        }}
        pre={`import { curveMonotoneX } from "d3-shape"`}
        hiddenProps={{}}
        startHidden
      />

      <h3 id="ordinal-frame-canvas">OrdinalFrame</h3>
      <p>
        OrdinalFrame supports <code>canvasPieces</code>,{" "}
        <code>canvasSummaries</code>, and <code>canvasConnectors</code>. This
        is useful when you have hundreds of bars or a swarm plot with many
        items.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "value",
          type: "bar",
          style: (d) => ({ fill: d.color }),
          canvasPieces: true,
          oPadding: 2,
          margin: { top: 20, bottom: 40, left: 50, right: 20 },
          axes: [{ orient: "left" }],
          title: "50 Bars (Canvas)",
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `Array.from({ length: 50 }, (_, i) => ({
  category: "Item " + (i + 1),
  value: Math.random() * 100,
  color: i % 2 === 0 ? "#ac58e5" : "#E0488B",
}))`,
          style: `d => ({ fill: d.color })`,
        }}
        functions={{
          style: (d) => ({ fill: d.color }),
        }}
        hiddenProps={{}}
        startHidden
      />

      <h3 id="network-frame-canvas">NetworkFrame</h3>
      <p>
        NetworkFrame supports <code>canvasNodes</code> and{" "}
        <code>canvasEdges</code>. This is especially valuable for large
        force-directed graphs where hundreds of nodes and edges would create
        prohibitive numbers of SVG elements.
      </p>

      <LiveExample
        frameProps={{
          nodes: networkNodes,
          edges: networkEdges,
          networkType: { type: "force", iterations: 300 },
          nodeSizeAccessor: (d) => d.r || 5,
          nodeStyle: () => ({ fill: "#ac58e5", stroke: "#fff", strokeWidth: 1 }),
          edgeStyle: () => ({ stroke: "#E0488B", strokeWidth: 0.5, opacity: 0.4 }),
          canvasNodes: true,
          canvasEdges: true,
          margin: 20,
          title: "40 Nodes, 60 Edges (Canvas)",
        }}
        type={NetworkFrame}
        overrideProps={{
          nodes: `Array.from({ length: 40 }, (_, i) => ({
  id: "node-" + i,
  r: Math.random() * 8 + 3,
}))`,
          edges: `Array.from({ length: 60 }, (_, i) => ({
  source: "node-" + Math.floor(Math.random() * 40),
  target: "node-" + Math.floor(Math.random() * 40),
})).filter(e => e.source !== e.target)`,
          networkType: `{ type: "force", iterations: 300 }`,
          nodeSizeAccessor: `d => d.r || 5`,
          nodeStyle: `() => ({ fill: "#ac58e5", stroke: "#fff", strokeWidth: 1 })`,
          edgeStyle: `() => ({ stroke: "#E0488B", strokeWidth: 0.5, opacity: 0.4 })`,
        }}
        functions={{
          nodeSizeAccessor: (d) => d.r || 5,
          nodeStyle: () => ({ fill: "#ac58e5", stroke: "#fff", strokeWidth: 1 }),
          edgeStyle: () => ({ stroke: "#E0488B", strokeWidth: 0.5, opacity: 0.4 }),
        }}
        hiddenProps={{}}
        startHidden
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <PropTable componentName="Canvas Rendering" props={canvasProps} />

      <h3 id="boolean-vs-function">Boolean vs. Function</h3>
      <p>
        All canvas props accept either <code>true</code> (to render everything
        in canvas) or a function that receives each data element and returns a
        boolean. This lets you selectively render some marks in canvas and
        others in SVG.
      </p>

      <CodeBlock
        code={`// Render all lines in canvas
<XYFrame canvasLines={true} />

// Only render lines with more than 500 points in canvas
<XYFrame
  canvasLines={d => d.coordinates.length > 500}
/>`}
        language="jsx"
      />

      <h3 id="mixing-svg-and-canvas">Mixing SVG and Canvas</h3>
      <p>
        A powerful pattern is to render dense background data in canvas for
        performance while keeping interactive foreground elements in SVG. For
        example, you can render thousands of background points in canvas and a
        highlighted selection in SVG:
      </p>

      <CodeBlock
        code={`<XYFrame
  points={allPoints}
  canvasPoints={d => !d.highlighted}
  pointStyle={d => ({
    fill: d.highlighted ? "#E0488B" : "#ccc",
    r: d.highlighted ? 6 : 2,
  })}
  hoverAnnotation={true}
/>`}
        language="jsx"
      />

      <h3 id="canvas-post-processing">Canvas Post-Processing</h3>
      <p>
        The <code>canvasPostProcess</code> prop lets you apply visual effects
        to the canvas after marks have been drawn. It receives the canvas
        element, its 2D context, and the size array. Semiotic includes a
        built-in <code>"chuckClose"</code> filter, or you can write your own.
      </p>

      <CodeBlock
        code={`// Built-in Chuck Close filter
<OrdinalFrame
  canvasPieces={true}
  canvasPostProcess="chuckClose"
/>

// Custom glow filter
const glowyCanvas = (canvas, context, size) => {
  const dataURL = canvas.toDataURL("image/png")
  const baseImage = document.createElement("img")
  baseImage.src = dataURL
  baseImage.onload = () => {
    context.clearRect(0, 0, size[0] + 120, size[1] + 120)
    context.filter = "blur(10px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "blur(5px)"
    context.drawImage(baseImage, 0, 0)
    context.filter = "none"
    context.drawImage(baseImage, 0, 0)
  }
}

<OrdinalFrame
  canvasPieces={true}
  canvasPostProcess={glowyCanvas}
/>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="custom-marks-limitation">Custom Marks Limitation</h3>
      <p>
        Canvas rendering does not support custom mark components. On XYFrame,{" "}
        <code>customPointMark</code>, <code>customLineMark</code>, and{" "}
        <code>customSummaryMark</code> will not be rendered when canvas is
        enabled. Similarly, <code>customMark</code> on OrdinalFrame and{" "}
        <code>customNodeIcon</code> / <code>customEdgeIcon</code> on
        NetworkFrame are not honored for canvas-rendered elements.
      </p>

      <h3 id="when-to-use">When to Use Canvas</h3>
      <p>
        Use canvas rendering when:
      </p>
      <ul>
        <li>
          Your dataset has <strong>hundreds to thousands of marks</strong> and
          you notice sluggish rendering or scrolling.
        </li>
        <li>
          You want to apply <strong>post-processing effects</strong> like blur,
          glow, or pixelation via <code>canvasPostProcess</code>.
        </li>
        <li>
          Your visualization is <strong>static or read-only</strong> and does
          not require per-element hover or click interactions on the
          canvas-rendered marks.
        </li>
      </ul>
      <p>
        Stick with SVG (the default) when:
      </p>
      <ul>
        <li>
          You need <strong>per-element hover, click, or keyboard</strong>{" "}
          interactions on marks.
        </li>
        <li>
          You use <strong>custom mark components</strong> (JSX elements) for
          rendering.
        </li>
        <li>
          You need <strong>CSS animations or transitions</strong> on data marks.
        </li>
        <li>
          <strong>Accessibility</strong> is critical and you need screen readers
          to navigate individual marks.
        </li>
      </ul>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — supports canvasLines,
          canvasPoints, canvasSummaries
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — supports
          canvasPieces, canvasSummaries, canvasConnectors
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — supports
          canvasNodes, canvasEdges
        </li>
        <li>
          <Link to="/features/styling">Styling</Link> — sketchy rendering,
          patterns, and other visual effects
        </li>
        <li>
          <Link to="/features/sparklines">Sparklines</Link> — small inline
          charts that can also benefit from canvas
        </li>
      </ul>
    </PageLayout>
  )
}
