import React from "react"
import { XYFrame, OrdinalFrame, Tooltip, MultiLineTooltip } from "semiotic"
import { LineChart, BarChart } from "semiotic"

import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import PageLayout from "../../components/PageLayout"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const scatterData = [
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  { x: 40, y: 15, category: "A", value: 80 },
  { x: 55, y: 45, category: "C", value: 200 },
  { x: 70, y: 30, category: "B", value: 120 },
  { x: 85, y: 50, category: "C", value: 180 },
]

const barData = [
  { category: "Product A", sales: 450, profit: 120, units: 230 },
  { category: "Product B", sales: 380, profit: 95, units: 190 },
  { category: "Product C", sales: 520, profit: 145, units: 260 },
  { category: "Product D", sales: 290, profit: 75, units: 145 },
  { category: "Product E", sales: 610, profit: 180, units: 305 },
]

const lineData = [
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  { month: 4, revenue: 22000 },
  { month: 5, revenue: 19000 },
  { month: 6, revenue: 27000 },
]

const colorHash = {
  A: "#6366f1",
  B: "#f59e0b",
  C: "#10b981",
}

// ---------------------------------------------------------------------------
// Tooltip props
// ---------------------------------------------------------------------------

const tooltipUtilityProps = [
  { name: "title", type: "string | function", required: false, default: "auto", description: "Field name or function to display as the tooltip header." },
  { name: "format", type: "function", required: false, default: null, description: "Format function for the displayed value." },
  { name: "style", type: "object", required: false, default: null, description: "Custom CSS styles for the tooltip container." },
  { name: "className", type: "string", required: false, default: null, description: "Custom CSS class for the tooltip container." },
]

const multiLineTooltipProps = [
  { name: "title", type: "string | function", required: false, default: null, description: "Header field name or function." },
  { name: "fields", type: "array", required: true, default: null, description: 'Array of field names (strings) or objects: { key, label, format }.' },
  { name: "showLabels", type: "boolean", required: false, default: "true", description: "Whether to show field labels." },
  { name: "separator", type: "string", required: false, default: '": "', description: "Separator string between label and value." },
  { name: "style", type: "object", required: false, default: null, description: "Custom CSS styles for the tooltip container." },
  { name: "className", type: "string", required: false, default: null, description: "Custom CSS class for the tooltip container." },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TooltipsPage() {
  return (
    <PageLayout
      title="Tooltips"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Tooltips", path: "/features/tooltips" },
      ]}
      prevPage={{ title: "Annotations", path: "/features/annotations" }}
      nextPage={{ title: "Interaction", path: "/features/interaction" }}
    >
      <p>
        Tooltips in Semiotic are powered by the annotation system. The
        simplest way to enable them is with <code>hoverAnnotation={"{true}"}</code>,
        which adds a default tooltip on hover. For richer content, Semiotic
        provides <code>Tooltip</code> and <code>MultiLineTooltip</code>{" "}
        utility functions that handle common formatting patterns, plus a
        fully custom <code>tooltipContent</code> prop for complete control.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components enable hover tooltips by default. You can customize
        the tooltip content using the <code>tooltip</code> prop with the{" "}
        <code>Tooltip</code> or <code>MultiLineTooltip</code> utilities:
      </p>

      <LiveExample
        frameProps={{
          data: lineData,
          xAccessor: "month",
          yAccessor: "revenue",
          xLabel: "Month",
          yLabel: "Revenue ($)",
        }}
        type={LineChart}
        startHidden={false}
        overrideProps={{
          data: `[
  { month: 1, revenue: 12000 },
  { month: 2, revenue: 18000 },
  { month: 3, revenue: 14000 },
  // ...more data points
]`,
        }}
        hiddenProps={{}}
        title="Default Hover Tooltip"
      />

      <p>
        Use <code>MultiLineTooltip</code> with a Chart's <code>tooltip</code>{" "}
        prop for formatted multi-field tooltips:
      </p>

      <CodeBlock
        code={`import { BarChart, MultiLineTooltip } from "semiotic"

<BarChart
  data={productData}
  categoryKey="category"
  valueKey="sales"
  tooltip={MultiLineTooltip({
    title: "category",
    fields: [
      { key: "sales", label: "Sales", format: v => \`$\${v}\` },
      { key: "profit", label: "Profit", format: v => \`$\${v}\` },
      { key: "units", label: "Units Sold" }
    ]
  })}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="simple-tooltip">Simple Tooltip</h3>
      <p>
        Import <code>Tooltip</code> from Semiotic and pass it to{" "}
        <code>tooltipContent</code> along with{" "}
        <code>hoverAnnotation={"{true}"}</code>:
      </p>

      <LiveExample
        frameProps={{
          points: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
          margin: { top: 30, bottom: 60, left: 60, right: 20 },
          axes: [
            { orient: "left", label: "Y Value" },
            { orient: "bottom", label: "X Value" },
          ],
          hoverAnnotation: true,
          tooltipContent: Tooltip({ title: "category" }),
        }}
        type={XYFrame}
        overrideProps={{
          points: `[
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  // ...more points
]`,
          pointStyle: `d => ({ fill: colorHash[d.category], r: 5 })`,
          tooltipContent: `Tooltip({ title: "category" })`,
        }}
        hiddenProps={{}}
        pre={`import { XYFrame, Tooltip } from "semiotic"`}
      />

      <h3 id="multi-field-tooltip">Multi-Field Tooltip</h3>
      <p>
        <code>MultiLineTooltip</code> displays multiple data fields with
        labels and optional formatting:
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "sales",
          type: "bar",
          style: { fill: "#6366f1", stroke: "white" },
          oLabel: true,
          margin: { top: 20, bottom: 80, left: 60, right: 20 },
          axes: [{ orient: "left", label: "Sales ($)" }],
          hoverAnnotation: true,
          tooltipContent: MultiLineTooltip({
            title: "category",
            fields: [
              { key: "sales", label: "Sales", format: (v) => `$${v}` },
              { key: "profit", label: "Profit", format: (v) => `$${v}` },
              { key: "units", label: "Units Sold" },
            ],
          }),
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Product A", sales: 450, profit: 120, units: 230 },
  { category: "Product B", sales: 380, profit: 95, units: 190 },
  { category: "Product C", sales: 520, profit: 145, units: 260 },
  { category: "Product D", sales: 290, profit: 75, units: 145 },
  { category: "Product E", sales: 610, profit: 180, units: 305 }
]`,
          tooltipContent: `MultiLineTooltip({
  title: "category",
  fields: [
    { key: "sales", label: "Sales", format: v => \`$\${v}\` },
    { key: "profit", label: "Profit", format: v => \`$\${v}\` },
    { key: "units", label: "Units Sold" }
  ]
})`,
        }}
        hiddenProps={{}}
        pre={`import { OrdinalFrame, MultiLineTooltip } from "semiotic"`}
      />

      <h3 id="custom-tooltip">Custom Tooltip Function</h3>
      <p>
        For complete control over tooltip rendering, pass a custom function to{" "}
        <code>tooltipContent</code>. The function receives the hovered data
        point and should return a React element:
      </p>

      <CodeBlock
        code={`<XYFrame
  hoverAnnotation={true}
  tooltipContent={d => (
    <div style={{
      background: "var(--surface-1)",
      border: "1px solid #ccc",
      padding: "8px 12px",
      borderRadius: 4,
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
    }}>
      <strong>{d.category}</strong>
      <div>X: {d.x}</div>
      <div>Y: {d.y}</div>
      <div>Value: {d.value.toLocaleString()}</div>
    </div>
  )}
  points={data}
  xAccessor="x"
  yAccessor="y"
/>`}
        language="jsx"
      />

      <h3 id="advanced-hover">Advanced hoverAnnotation</h3>
      <p>
        The <code>hoverAnnotation</code> prop can accept an array of
        annotation types for richer hover behavior. This lets you combine
        tooltips with guide lines and point highlights:
      </p>

      <LiveExample
        frameProps={{
          points: scatterData,
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
          margin: { top: 30, bottom: 60, left: 60, right: 20 },
          axes: [
            { orient: "left", label: "Y Value" },
            { orient: "bottom", label: "X Value" },
          ],
          hoverAnnotation: [
            { type: "x", disable: ["connector", "note"] },
            { type: "y", disable: ["connector", "note"] },
            { type: "frame-hover" },
          ],
        }}
        type={XYFrame}
        overrideProps={{
          points: "scatterData",
          pointStyle: `d => ({ fill: colorHash[d.category], r: 5 })`,
          hoverAnnotation: `[
  { type: "x", disable: ["connector", "note"] },
  { type: "y", disable: ["connector", "note"] },
  { type: "frame-hover" }
]`,
        }}
        hiddenProps={{}}
        title="Crosshair Tooltip with Guide Lines"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <h3 id="tooltip-utility">Tooltip() API</h3>
      <p>
        A factory function that returns a tooltip renderer for a single value:
      </p>

      <PropTable componentName="Tooltip" props={tooltipUtilityProps} />

      <CodeBlock
        code={`import { Tooltip } from "semiotic"

// Basic usage
Tooltip({ title: "name" })

// With formatting
Tooltip({ title: "category", format: v => v.toUpperCase() })

// With custom styles
Tooltip({ title: "name", style: { background: "#1e293b", color: "white" } })`}
        language="jsx"
      />

      <h3 id="multiline-tooltip-utility">MultiLineTooltip() API</h3>
      <p>
        A factory function that returns a tooltip renderer for multiple fields:
      </p>

      <PropTable componentName="MultiLineTooltip" props={multiLineTooltipProps} />

      <CodeBlock
        code={`import { MultiLineTooltip } from "semiotic"

// String fields (field name = label)
MultiLineTooltip({
  title: "product",
  fields: ["revenue", "units", "category"]
})

// Object fields with formatting
MultiLineTooltip({
  title: "product",
  fields: [
    { key: "revenue", label: "Revenue", format: v => \`$\${v.toLocaleString()}\` },
    { key: "margin", label: "Margin", format: v => \`\${(v * 100).toFixed(1)}%\` },
    { key: "units", label: "Units" }
  ]
})`}
        language="jsx"
      />

      <h3 id="hover-types">hoverAnnotation Options</h3>

      <p>
        The <code>hoverAnnotation</code> prop accepts several forms:
      </p>

      <CodeBlock
        code={`// Boolean: default frame-hover tooltip
hoverAnnotation={true}

// Array: multiple annotation types on hover
hoverAnnotation={[
  { type: "frame-hover" },                           // Tooltip
  { type: "x", disable: ["connector", "note"] },     // Vertical guide
  { type: "y", disable: ["connector", "note"] },     // Horizontal guide
  { type: "highlight", style: { strokeWidth: 5 } },  // Highlight mark
  { type: "vertical-points", threshold: 0.1 },       // Show nearby points
  { type: "desaturation-layer", style: { fill: "white", opacity: 0.5 } }
]}

// For OrdinalFrame, use pieceHoverAnnotation for individual pieces
// vs hoverAnnotation for entire columns
<OrdinalFrame pieceHoverAnnotation={true} />
<OrdinalFrame hoverAnnotation={true} />  // column-level hover`}
        language="jsx"
      />

      <h3 id="tooltip-positioning">Tooltip Positioning</h3>
      <p>
        Tooltips are positioned automatically near the hovered data point.
        They render in an HTML layer above the SVG visualization, so they
        can contain any HTML content. For point-based data,{" "}
        <code>XYFrame</code> uses Voronoi tesselation to determine the
        nearest data point on hover, providing smooth and responsive tooltip
        behavior even when points are small.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/features/annotations">Annotations</Link> — the full
          annotation system that powers tooltips
        </li>
        <li>
          <Link to="/features/interaction">Interaction</Link> — highlighting,
          cross-highlighting, and custom click/hover behaviors
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — point, line, and area
          tooltips with Voronoi hover
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — piece-level
          and column-level hover annotations
        </li>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — simplified tooltip
          via the <code>tooltip</code> prop
        </li>
      </ul>
    </PageLayout>
  )
}
