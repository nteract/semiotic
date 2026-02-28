import React from "react"
import { XYFrame, OrdinalFrame } from "semiotic"
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
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  { week: 3, score: 15 },
  { week: 4, score: 24 },
  { week: 5, score: 20 },
  { week: 6, score: 28 },
  { week: 7, score: 32 },
  { week: 8, score: 27 },
  { week: 9, score: 35 },
  { week: 10, score: 30 },
]

const barData = [
  { product: "Alpha", units: 450 },
  { product: "Beta", units: 380 },
  { product: "Gamma", units: 520 },
  { product: "Delta", units: 290 },
  { product: "Epsilon", units: 610 },
]

const frameLineData = [
  {
    label: "Performance",
    coordinates: lineData,
  },
]

const scatterData = [
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AnnotationsPage() {
  return (
    <PageLayout
      title="Annotations"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Annotations", path: "/features/annotations" },
      ]}
      prevPage={{ title: "Axes", path: "/features/axes" }}
      nextPage={{ title: "Tooltips", path: "/features/tooltips" }}
    >
      <p>
        Annotations are first-class citizens in Semiotic. Every Frame supports
        an <code>annotations</code> prop that accepts an array of annotation
        objects. Built-in types include labels, callouts, thresholds,
        enclosures, highlights, and more. You can also write custom annotation
        rules for complete control over rendering.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components support annotations through the{" "}
        <code>frameProps</code> escape hatch. Pass your annotation objects in
        the <code>annotations</code> array:
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "week",
          yAccessor: "score",
          xLabel: "Week",
          yLabel: "Score",
          frameProps: {
            annotations: [
              {
                type: "x",
                week: 7,
                label: "Peak week",
                color: "#e11d48",
                disable: ["connector"],
              },
            ],
          },
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { week: 1, score: 12 },
  { week: 2, score: 18 },
  // ...more data points
]`,
          frameProps: `{
  annotations: [
    { type: "x", week: 7, label: "Peak week", color: "#e11d48", disable: ["connector"] }
  ]
}`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <p>
        Frame components give you direct access to the full annotation system.
        Pass an array of annotation objects to the <code>annotations</code>{" "}
        prop.
      </p>

      <h3 id="xy-annotations">XY Annotations</h3>
      <p>
        The <code>xy</code> type creates a simple circle annotation at a data
        point. The <code>x</code> and <code>y</code> types create threshold
        lines across the chart.
      </p>

      <LiveExample
        frameProps={{
          points: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: { fill: "#6366f1", r: 5 },
          margin: { top: 30, bottom: 60, left: 60, right: 40 },
          axes: [
            { orient: "left", label: "Y Value" },
            { orient: "bottom", label: "X Value" },
          ],
          annotations: [
            { type: "xy", x: 55, y: 45, label: "Peak" },
            { type: "y", y: 35, label: "Target", color: "#e11d48", disable: ["connector"] },
          ],
        }}
        type={XYFrame}
        overrideProps={{
          points: `[
  { x: 10, y: 20, label: "A" },
  { x: 25, y: 35, label: "B" },
  { x: 40, y: 15, label: "C" },
  { x: 55, y: 45, label: "D" },
  { x: 70, y: 30, label: "E" },
  { x: 85, y: 50, label: "F" }
]`,
          annotations: `[
  { type: "xy", x: 55, y: 45, label: "Peak" },
  { type: "y", y: 35, label: "Target", color: "#e11d48", disable: ["connector"] }
]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="enclose-annotations">Enclosure Annotations</h3>
      <p>
        The <code>enclose</code> type draws a circle around a set of data
        points. Pass a <code>coordinates</code> array with the data points to
        enclose.
      </p>

      <LiveExample
        frameProps={{
          points: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: { fill: "#6366f1", r: 5 },
          margin: { top: 30, bottom: 60, left: 60, right: 40 },
          axes: [
            { orient: "left", label: "Y Value" },
            { orient: "bottom", label: "X Value" },
          ],
          annotations: [
            {
              type: "enclose",
              coordinates: [
                { x: 55, y: 45 },
                { x: 70, y: 30 },
                { x: 85, y: 50 },
              ],
              label: "High performers",
              padding: 10,
            },
          ],
        }}
        type={XYFrame}
        overrideProps={{
          points: "scatterData",
          annotations: `[{
  type: "enclose",
  coordinates: [
    { x: 55, y: 45 },
    { x: 70, y: 30 },
    { x: 85, y: 50 }
  ],
  label: "High performers",
  padding: 10
}]`,
        }}
        hiddenProps={{}}
      />

      <h3 id="highlight-annotations">Highlight Annotations</h3>
      <p>
        The <code>highlight</code> type redraws a mark on the annotation layer
        with custom styling. Combined with <code>desaturation-layer</code>,
        this creates a focus+context effect. See the{" "}
        <Link to="/features/interaction">Interaction</Link> page for more on
        cross-highlighting.
      </p>

      <CodeBlock
        code={`<XYFrame
  lines={data}
  hoverAnnotation={[
    { type: "desaturation-layer", style: { fill: "white", opacity: 0.6 } },
    {
      type: "highlight",
      style: d => ({ stroke: colorScale(d.key), strokeWidth: 5 })
    }
  ]}
  lineIDAccessor="title"
/>`}
        language="jsx"
      />

      <h3 id="ordinal-annotations">Ordinal Frame Annotations</h3>
      <p>
        <code>OrdinalFrame</code> supports annotation types like{" "}
        <code>or</code> (circle at a data point), <code>r</code> (threshold
        along the r axis), <code>category</code> (bracket around columns),
        and <code>column-hover</code> (tooltip for an entire column).
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "product",
          rAccessor: "units",
          type: "bar",
          style: { fill: "#6366f1", stroke: "white" },
          oLabel: true,
          margin: { top: 20, bottom: 60, left: 60, right: 20 },
          axes: [{ orient: "left", label: "Units Sold" }],
          annotations: [
            {
              type: "category",
              categories: ["Alpha", "Beta", "Gamma"],
              label: "Original Products",
              position: "top",
              depth: 30,
              offset: 10,
            },
          ],
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { product: "Alpha", units: 450 },
  { product: "Beta", units: 380 },
  { product: "Gamma", units: 520 },
  { product: "Delta", units: 290 },
  { product: "Epsilon", units: 610 }
]`,
          annotations: `[{
  type: "category",
  categories: ["Alpha", "Beta", "Gamma"],
  label: "Original Products",
  position: "top",
  depth: 30,
  offset: 10
}]`,
        }}
        hiddenProps={{}}
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <h3 id="built-in-types">Built-in Annotation Types</h3>

      <p>
        The following types are recognized by all Frame components:
      </p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Type</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Frame</th>
            <th style={{ padding: "12px 16px", textAlign: "left", borderBottom: "1px solid var(--surface-3)" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["label", "All", "SVG annotation with note and connector"],
            ["callout / callout-circle / callout-rect", "All", "Callout annotations with different subject shapes"],
            ["frame-hover", "All", "Tooltip div centered on data point"],
            ["highlight", "All", "Redraws mark on annotation layer with custom style"],
            ["desaturation-layer", "All", "Semi-transparent overlay for focus+context"],
            ["enclose / enclose-rect / enclose-hull", "All", "Enclose data points with circle, rect, or convex hull"],
            ["xy", "XYFrame", "Circle at a data point"],
            ["x / y", "XYFrame", "Threshold line along x or y axis"],
            ["bounds", "XYFrame", "Rectangle bounding box"],
            ["horizontal-points / vertical-points", "XYFrame", "Show all points along an axis"],
            ["or", "OrdinalFrame", "Circle at a data point"],
            ["r", "OrdinalFrame", "Threshold along r axis"],
            ["category", "OrdinalFrame", "Bracket annotation around columns"],
            ["column-hover", "OrdinalFrame", "Tooltip for entire column"],
            ["node", "NetworkFrame", "Callout annotation centered on a node"],
          ].map(([type, frame, desc], i) => (
            <tr key={type} style={{ background: i % 2 ? "var(--surface-1)" : "transparent" }}>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)", fontFamily: "var(--font-code)", fontSize: "0.9em" }}>{type}</td>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)" }}>{frame}</td>
              <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--surface-3)" }}>{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 id="annotation-settings">Annotation Settings</h3>
      <p>
        Use the <code>annotationSettings</code> prop to control automatic
        positioning of annotations:
      </p>

      <CodeBlock
        code={`<XYFrame
  annotationSettings={{
    type: "marginalia",        // "bump" or "marginalia"
    orient: "right",           // "nearest", "left", "right", "top", "bottom"
    characterWidth: 8,         // Approximate character width in pixels
    lineHeight: 20,            // Line height for annotation text
    padding: 2,                // Padding around annotations (bump mode)
    iterations: 500,           // Force simulation iterations (bump mode)
    marginOffset: 15           // Additional margin offset (marginalia mode)
  }}
  annotations={annotations}
/>`}
        language="jsx"
      />

      <h3 id="custom-annotation-rules">Custom Annotation Rules</h3>
      <p>
        Use <code>svgAnnotationRules</code> for SVG-layer annotations and{" "}
        <code>htmlAnnotationRules</code> for HTML-layer annotations. Each
        receives the annotation data, scales, and frame state. Return{" "}
        <code>null</code> to fall through to default handling, or JSX to
        render custom content.
      </p>

      <CodeBlock
        code={`<XYFrame
  svgAnnotationRules={({ d, xScale, yScale, adjustedSize }) => {
    if (d.type === "custom-threshold") {
      const y = yScale(d.value)
      return (
        <g>
          <line
            x1={0}
            x2={adjustedSize[0]}
            y1={y}
            y2={y}
            stroke="#e11d48"
            strokeDasharray="4 4"
          />
          <text x={adjustedSize[0]} y={y - 5} textAnchor="end" fill="#e11d48">
            {d.label}
          </text>
        </g>
      )
    }
    return null  // Fall through to default handling
  }}
  htmlAnnotationRules={({ d, screenCoordinates }) => {
    if (d.type === "custom-tooltip") {
      return (
        <div style={{ position: "absolute", left: screenCoordinates[0], top: screenCoordinates[1] }}>
          <strong>{d.title}</strong>
          <p>{d.description}</p>
        </div>
      )
    }
    return null
  }}
  annotations={[
    { type: "custom-threshold", value: 100, label: "Target" },
    { type: "custom-tooltip", x: 50, y: 200, title: "Important", description: "Details here" }
  ]}
/>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="hover-annotations">Using with hoverAnnotation</h3>
      <p>
        The <code>hoverAnnotation</code> prop can be a boolean or an array of
        annotation types that fire on hover. This integrates with the
        annotation system to create rich hover interactions:
      </p>

      <CodeBlock
        code={`// Simple hover tooltip
<XYFrame hoverAnnotation={true} />

// Multiple hover annotations
<XYFrame
  hoverAnnotation={[
    { type: "frame-hover" },                    // Tooltip
    { type: "x", disable: ["connector", "note"] }, // Vertical guide line
    { type: "vertical-points", threshold: 0.1, r: () => 5 }  // Highlight nearby points
  ]}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/tooltips">Tooltips</Link> — simplified tooltip
          configuration using <code>Tooltip</code> and{" "}
          <code>MultiLineTooltip</code> utilities
        </li>
        <li>
          <Link to="/features/interaction">Interaction</Link> — highlighting,
          cross-highlighting, and brushing
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — XY annotations, threshold
          lines, and point-based annotations
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — category
          brackets, ordinal line annotations
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — node
          annotations and enclosures
        </li>
      </ul>
    </PageLayout>
  )
}
