import React from "react"
import {
  SparkXYFrame,
  SparkOrdinalFrame,
  SparkNetworkFrame,
  XYFrame,
  OrdinalFrame,
} from "semiotic"
import { curveMonotoneX } from "d3-shape"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

function generatePoints(start, count) {
  const points = []
  let value = start
  for (let i = 0; i <= count; i++) {
    points.push({ step: i, value })
    value += Math.random() * 10 - 5
  }
  return points
}

const sparkLineData = [
  {
    label: "#ac58e5",
    coordinates: generatePoints(40, 40),
  },
]

const sparkStackedData = [
  { label: "#ac58e5", coordinates: generatePoints(40, 40) },
  { label: "#E0488B", coordinates: generatePoints(40, 40) },
]

const sparkBarData = [8, 4, 12, 3, 4, 5, 6, 7]

const sparkNetworkEdges = [
  { source: "a", target: "b" },
  { source: "a", target: "c" },
  { source: "a", target: "d" },
  { source: "a", target: "g" },
  { source: "a", target: "h" },
  { source: "a", target: "i" },
  { source: "a", target: "j" },
]

const treeData = {
  id: "root",
  children: [
    {
      id: "a",
      children: [{ id: "aa" }, { id: "ab" }, { id: "ac" }],
    },
    { id: "b", children: [{ id: "ba" }, { id: "bb" }] },
    { id: "c", children: [{ id: "ca" }] },
  ],
}

// Larger dataset for the Frame-based example
const fullLineData = [
  {
    label: "Revenue",
    coordinates: generatePoints(50, 30),
  },
]

// ---------------------------------------------------------------------------
// Spark prop definitions
// ---------------------------------------------------------------------------

const sparkProps = [
  {
    name: "SparkXYFrame",
    type: "component",
    required: false,
    default: null,
    description:
      "A span-based XYFrame designed to be embedded inline in text. Inherits line-height for sizing. Accepts all XYFrame props.",
  },
  {
    name: "SparkOrdinalFrame",
    type: "component",
    required: false,
    default: null,
    description:
      "A span-based OrdinalFrame for inline ordinal visualizations. Accepts all OrdinalFrame props.",
  },
  {
    name: "SparkNetworkFrame",
    type: "component",
    required: false,
    default: null,
    description:
      "A span-based NetworkFrame for inline network diagrams. Accepts all NetworkFrame props.",
  },
  {
    name: "size",
    type: "array | number",
    required: false,
    default: "Inherited from line-height",
    description:
      "Optional explicit [width, height] or single number for size. When omitted, the sparkline sizes itself from the inherited CSS line-height.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SparklinesPage() {
  return (
    <PageLayout
      title="Sparklines"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Sparklines", path: "/features/sparklines" },
      ]}
      prevPage={{
        title: "Canvas Rendering",
        path: "/features/canvas-rendering",
      }}
      nextPage={{
        title: "Small Multiples",
        path: "/features/small-multiples",
      }}
    >
      <p>
        Sparklines are small, word-sized graphics embedded directly in text.
        Semiotic provides three sparkline components — <code>SparkXYFrame</code>
        , <code>SparkOrdinalFrame</code>, and <code>SparkNetworkFrame</code> —
        that render inside <code>&lt;span&gt;</code> elements instead of{" "}
        <code>&lt;div&gt;</code> elements, so they flow naturally within
        paragraphs. They inherit their height from the surrounding{" "}
        <code>line-height</code> CSS property, making them feel like a natural
        part of the text.
      </p>

      <p style={{ fontSize: "18px", lineHeight: "2.4" }}>
        You can embed a tiny line chart{" "}
        <SparkXYFrame
          lines={sparkLineData}
          lineType="line"
          xAccessor="step"
          yAccessor="value"
          lineStyle={() => ({
            stroke: "#ac58e5",
            strokeWidth: 1.5,
            fill: "none",
          })}
        />{" "}
        right in your text, or a small bar chart{" "}
        <SparkOrdinalFrame
          data={sparkBarData}
          style={{ fill: "#E0488B", stroke: "none" }}
          type="bar"
        />{" "}
        alongside your analysis, or even a network diagram{" "}
        <SparkNetworkFrame
          size={[40, 20]}
          edges={sparkNetworkEdges}
          edgeStyle={{ stroke: "#333" }}
          nodeStyle={(d) => ({
            fill: d.id === "a" ? "#ac58e5" : "#9fd0cb",
            stroke: "none",
          })}
        />{" "}
        to illustrate a point about graph structure.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        While sparklines are standalone components (not wrappers around Chart
        components), you can achieve a similar small-chart effect using regular
        Chart components with small <code>size</code> values and minimal
        margins. However, the Spark components are purpose-built for inline use
        since they render as <code>&lt;span&gt;</code> elements with automatic
        line-height sizing.
      </p>

      <CodeBlock
        code={`import { LineChart } from "semiotic"

// A small chart that looks like a sparkline, but is a div (not inline)
<LineChart
  data={dailyRevenue}
  xAccessor="day"
  yAccessor="revenue"
  size={[120, 30]}
  margin={{ top: 2, bottom: 2, left: 2, right: 2 }}
  frameProps={{
    axes: [],  // no axes for sparkline effect
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="spark-xy-frame">SparkXYFrame</h3>
      <p>
        <code>SparkXYFrame</code> accepts all the same props as{" "}
        <code>XYFrame</code>. The most common use is a simple line sparkline.
      </p>

      <LiveExample
        frameProps={{
          lines: sparkLineData,
          lineType: { type: "line", interpolator: curveMonotoneX },
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: () => ({
            stroke: "#ac58e5",
            strokeWidth: 1.5,
            fill: "none",
          }),
          size: [100, 20],
        }}
        type={SparkXYFrame}
        overrideProps={{
          lines: `[{
  label: "Series A",
  coordinates: generatePoints(40, 40),
}]`,
          lineType: `{ type: "line", interpolator: curveMonotoneX }`,
          lineStyle: `() => ({
  stroke: "#ac58e5",
  strokeWidth: 1.5,
  fill: "none",
})`,
        }}
        functions={{
          lineStyle: () => ({
            stroke: "#ac58e5",
            strokeWidth: 1.5,
            fill: "none",
          }),
        }}
        pre={`import { curveMonotoneX } from "d3-shape"`}
        hiddenProps={{}}
        startHidden={false}
      />

      <h3 id="stacked-area-sparkline">Stacked Area Sparkline</h3>
      <p>
        Sparklines are not limited to simple lines. You can use any{" "}
        <code>lineType</code> including stacked areas:
      </p>

      <LiveExample
        frameProps={{
          lines: sparkStackedData,
          lineType: { type: "stackedarea", interpolator: curveMonotoneX },
          xAccessor: "step",
          yAccessor: "value",
          lineStyle: (d) => ({
            fill: d.label,
            stroke: d.label,
            fillOpacity: 0.75,
          }),
          size: [100, 20],
        }}
        type={SparkXYFrame}
        overrideProps={{
          lines: `[
  { label: "#ac58e5", coordinates: generatePoints(40, 40) },
  { label: "#E0488B", coordinates: generatePoints(40, 40) },
]`,
          lineType: `{ type: "stackedarea", interpolator: curveMonotoneX }`,
          lineStyle: `d => ({
  fill: d.label,
  stroke: d.label,
  fillOpacity: 0.75,
})`,
        }}
        functions={{
          lineStyle: (d) => ({
            fill: d.label,
            stroke: d.label,
            fillOpacity: 0.75,
          }),
        }}
        pre={`import { curveMonotoneX } from "d3-shape"`}
        hiddenProps={{}}
        startHidden
      />

      <h3 id="spark-ordinal-frame">SparkOrdinalFrame</h3>
      <p>
        <code>SparkOrdinalFrame</code> supports bars, boxplots, violins, and
        all other ordinal visualization types at sparkline size.
      </p>

      <LiveExample
        frameProps={{
          data: sparkBarData,
          style: { fill: "#E0488B", stroke: "none" },
          type: "bar",
        }}
        type={SparkOrdinalFrame}
        overrideProps={{
          data: "[8, 4, 12, 3, 4, 5, 6, 7]",
        }}
        hiddenProps={{}}
        startHidden={false}
      />

      <h3 id="spark-network-frame">SparkNetworkFrame</h3>
      <p>
        <code>SparkNetworkFrame</code> lets you embed force-directed graphs,
        dendrograms, sankey diagrams, and other network layouts inline.
      </p>

      <LiveExample
        frameProps={{
          edges: treeData,
          edgeStyle: { stroke: "#ac58e5" },
          networkType: { type: "dendrogram" },
          margin: 4,
          size: [60, 60],
          nodeStyle: () => ({
            fill: "#533f82",
            stroke: "#333",
          }),
        }}
        type={SparkNetworkFrame}
        overrideProps={{
          edges: `{
  id: "root",
  children: [
    { id: "a", children: [{ id: "aa" }, { id: "ab" }, { id: "ac" }] },
    { id: "b", children: [{ id: "ba" }, { id: "bb" }] },
    { id: "c", children: [{ id: "ca" }] },
  ],
}`,
          networkType: `{ type: "dendrogram" }`,
          nodeStyle: `() => ({ fill: "#533f82", stroke: "#333" })`,
        }}
        functions={{
          nodeStyle: () => ({ fill: "#533f82", stroke: "#333" }),
        }}
        hiddenProps={{}}
        startHidden
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <PropTable componentName="Sparkline Components" props={sparkProps} />

      <h3 id="sizing">Sizing</h3>
      <p>
        By default, sparklines inherit their dimensions from the surrounding
        text&apos;s <code>line-height</code>. If the default aspect ratio does
        not fit your needs, pass an explicit <code>size</code> prop:
      </p>

      <CodeBlock
        code={`// Default: sizes from line-height
<SparkXYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
/>

// Explicit size override
<SparkXYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
  size={[120, 24]}
/>`}
        language="jsx"
      />

      <h3 id="inline-usage">Inline Usage in Text</h3>
      <p>
        Because sparklines render as <code>&lt;span&gt;</code> elements, they
        can be placed directly inside paragraphs, table cells, list items, or
        any other inline context:
      </p>

      <CodeBlock
        code={`<p>
  Revenue has been trending upward{" "}
  <SparkXYFrame
    lines={[{ coordinates: revenueData }]}
    xAccessor="day"
    yAccessor="revenue"
    lineType="line"
    lineStyle={() => ({ stroke: "#4CAF50", fill: "none" })}
  />{" "}
  while costs remain stable{" "}
  <SparkXYFrame
    lines={[{ coordinates: costData }]}
    xAccessor="day"
    yAccessor="cost"
    lineType="line"
    lineStyle={() => ({ stroke: "#F44336", fill: "none" })}
  />.
</p>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="in-tables">Sparklines in Tables</h3>
      <p>
        Sparklines are especially useful in data tables where you want to show
        a trend alongside a summary value:
      </p>

      <CodeBlock
        code={`<table>
  <thead>
    <tr>
      <th>Product</th>
      <th>Revenue</th>
      <th>Trend</th>
    </tr>
  </thead>
  <tbody>
    {products.map(product => (
      <tr key={product.name}>
        <td>{product.name}</td>
        <td>\${product.total.toLocaleString()}</td>
        <td>
          <SparkXYFrame
            lines={[{ coordinates: product.dailyRevenue }]}
            xAccessor="day"
            yAccessor="revenue"
            lineType="line"
            size={[80, 20]}
            lineStyle={() => ({
              stroke: product.trending > 0 ? "#4CAF50" : "#F44336",
              fill: "none",
            })}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="all-frame-props">Full Frame API</h3>
      <p>
        Each sparkline component accepts every prop from its corresponding Frame
        component. This means you can use hover annotations, custom styles,
        sketchy rendering, and any other Frame feature at sparkline scale:
      </p>

      <CodeBlock
        code={`// Sparkline with hover annotation
<SparkXYFrame
  lines={data}
  xAccessor="step"
  yAccessor="value"
  hoverAnnotation={true}
  lineRenderMode="sketchy"
  lineType={{ type: "line", interpolator: curveMonotoneX }}
  lineStyle={() => ({
    stroke: "#ac58e5",
    strokeWidth: 1.5,
    fill: "none",
  })}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — the full-size frame that
          SparkXYFrame wraps
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — the full-size
          frame that SparkOrdinalFrame wraps
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — the full-size
          frame that SparkNetworkFrame wraps
        </li>
        <li>
          <Link to="/features/small-multiples">Small Multiples</Link> —
          coordinated grid layouts for comparing multiple visualizations
        </li>
        <li>
          <Link to="/features/canvas-rendering">Canvas Rendering</Link> — for
          performance with large sparkline datasets
        </li>
      </ul>
    </PageLayout>
  )
}
