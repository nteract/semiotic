import React from "react"
import { StreamXYFrame, StreamOrdinalFrame, Tooltip, MultiLineTooltip } from "semiotic"
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
      prevPage={{ title: "Axes", path: "/features/axes" }}
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
      {/* Format cascade */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="format-cascade">Format Cascade</h2>

      <p>
        When you set an axis formatter on a chart — <code>valueFormat</code>{" "}
        on ordinal charts (BarChart, StackedBarChart, GroupedBarChart,
        DotPlot, SwarmPlot, SwimlaneChart) or <code>xFormat</code>/
        <code>yFormat</code> on XY charts (LineChart, AreaChart,
        Scatterplot, BubbleChart, etc.) — the same formatter is applied
        to the default tooltip. One function, both places, so a bar chart
        that reads "$450k" on its axis also reads "$450k" on hover.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          categoryAccessor: "category",
          valueAccessor: "sales",
          valueFormat: (d) => `$${(d / 1000).toFixed(1)}k`,
          valueLabel: "Sales",
          showGrid: true,
        }}
        type={BarChart}
        overrideProps={{
          data: "barData",
          valueFormat: "d => `$${(d / 1000).toFixed(1)}k`",
          showGrid: "true",
        }}
        hiddenProps={{}}
        title="valueFormat applies to both axis and tooltip"
      />

      <h3 id="precedence">Precedence</h3>
      <p>
        The cascade only drives the <em>default</em> tooltip. Passing{" "}
        <code>tooltip</code> explicitly takes over:
      </p>
      <ul>
        <li>
          <code>tooltip={"{false}"}</code> — no tooltip is rendered.
        </li>
        <li>
          <code>tooltip={"{customFn}"}</code>, <code>{"{\"multi\"}"}</code>,
          or <code>{"{Tooltip({...})}"}</code>/
          <code>{"{MultiLineTooltip({...})}"}</code> — your content fully
          replaces the default. Axis formatters do <strong>not</strong>{" "}
          apply automatically; re-pass <code>valueFormat</code>/
          <code>xFormat</code> inside your tooltip if you want them.
        </li>
        <li>
          Default tooltip active — the chart's <code>valueFormat</code>{" "}
          or <code>xFormat</code>/<code>yFormat</code> is applied to the
          matching field.
        </li>
        <li>
          A few charts format internally (Histogram, FunnelChart,
          LikertChart, GaugeChart) and don't participate in the cascade —
          customize via the <code>tooltip</code> prop if needed.
        </li>
      </ul>

      <h3 id="override-examples">Supplementing or overriding</h3>
      <p>
        To keep the default tooltip but add a custom format for one
        field, pass a function and call the formatter yourself:
      </p>
      <CodeBlock
        code={`const money = d => \`$\${(d / 1000).toFixed(1)}k\`

<BarChart
  data={data}
  categoryAccessor="category"
  valueAccessor="sales"
  valueFormat={money}           // → axis + default tooltip
/>

// Or override the tooltip entirely — cascade is bypassed, so
// re-apply the formatter explicitly:
<BarChart
  data={data}
  categoryAccessor="category"
  valueAccessor="sales"
  valueFormat={money}           // → axis only (tooltip is custom)
  tooltip={MultiLineTooltip({
    title: "category",
    fields: [
      { key: "sales", label: "Sales", format: money },
      { key: "profit", label: "Profit", format: money },
    ]
  })}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components enable hover tooltips by default. You can customize
        the tooltip content using the <code>tooltip</code> prop with the{" "}
        <code>Tooltip</code> or <code>MultiLineTooltip</code> utilities:
      </p>

      <h3 id="smart-defaults">Smart defaults for custom &amp; network charts</h3>
      <p>
        When a chart can't declare tooltip fields — a{" "}
        <code>NetworkCustomChart</code> layout, a recipe like the Mermaid or
        lineage DAG, anything "weird" — the default tooltip is a concise summary of
        every property in object order. It picks a meaningful{" "}
        <strong>title</strong> (a <code>name</code>/<code>label</code>/
        <code>title</code> field, falling back to <code>id</code>), then a{" "}
        <strong>type</strong> (<code>type</code>/<code>kind</code>/
        <code>category</code>/<code>shape</code>…), then a{" "}
        <strong>value</strong>, then the rest — skipping positional and internal
        bookkeeping (<code>x</code>/<code>y</code>/<code>layer</code>/
        <code>row</code>/<code>depth</code>, <code>_</code>-prefixed keys, nested
        objects). So a Mermaid node shows its name and{" "}
        <em>type: decision</em> rather than a bare id. The same heuristic backs
        the generic <code>MultiLineTooltip</code> default (and the XY/ordinal
        custom-layout fallbacks) — anywhere a tooltip would otherwise dump every
        field, it now leads with a title and orders the rest by role. To steer
        it, give your datum a <code>name</code> (or <code>label</code>) and a{" "}
        <code>type</code> field; to override entirely, pass a{" "}
        <code>tooltip</code> function. The same heuristic is exposed as the pure{" "}
        <code>smartTooltipEntries(datum)</code> helper (from{" "}
        <code>semiotic</code>).
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
          data: scatterData,
          chartType: "scatter",
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
          margin: { top: 30, bottom: 60, left: 60, right: 20 },
          showAxes: true,
          xLabel: "X Value",
          yLabel: "Y Value",
          enableHover: true,
          tooltipContent: (hover) => Tooltip({ title: "category" })(hover.data || hover),
        }}
        type={StreamXYFrame}
        overrideProps={{
          data: `[
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  // ...more points
]`,
          pointStyle: `d => ({ fill: colorHash[d.category], r: 5 })`,
          tooltipContent: `hover => Tooltip({ title: "category" })(hover.data || hover)`,
        }}
        hiddenProps={{}}
        pre={`import { StreamXYFrame, Tooltip } from "semiotic"`}
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
          chartType: "bar",
          pieceStyle: () => ({ fill: "#6366f1", stroke: "white" }),
          showAxes: true,
          margin: { top: 20, bottom: 80, left: 60, right: 20 },
          enableHover: true,
          tooltipContent: (hover) => {
            const d = hover.data || hover
            return MultiLineTooltip({
              title: "category",
              fields: [
                { key: "sales", label: "Sales", format: (v) => `$${v}` },
                { key: "profit", label: "Profit", format: (v) => `$${v}` },
                { key: "units", label: "Units Sold" },
              ],
            })(d)
          },
        }}
        type={StreamOrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Product A", sales: 450, profit: 120, units: 230 },
  { category: "Product B", sales: 380, profit: 95, units: 190 },
  { category: "Product C", sales: 520, profit: 145, units: 260 },
  { category: "Product D", sales: 290, profit: 75, units: 145 },
  { category: "Product E", sales: 610, profit: 180, units: 305 }
]`,
          tooltipContent: `hover => {
  const d = hover.data || hover
  return MultiLineTooltip({
    title: "category",
    fields: [
      { key: "sales", label: "Sales", format: v => \`$\${v}\` },
      { key: "profit", label: "Profit", format: v => \`$\${v}\` },
      { key: "units", label: "Units Sold" }
    ]
  })(d)
}`,
        }}
        hiddenProps={{}}
        pre={`import { StreamOrdinalFrame, MultiLineTooltip } from "semiotic"`}
      />

      <h3 id="custom-tooltip">Custom Tooltip Function</h3>
      <p>
        For complete control over tooltip rendering, pass a custom function to{" "}
        <code>tooltipContent</code>. The function receives the
        Stream Frame's <code>HoverData</code> wrapper —{" "}
        <code>{`{ data, x, y, ... }`}</code> — where <code>data</code> is the
        raw datum the user pushed or passed. Read fields off{" "}
        <code>d.data</code> directly:
      </p>

      <CodeBlock
        code={`<StreamXYFrame
  data={data}
  chartType="scatter"
  enableHover={true}
  tooltipContent={d => {
    const datum = d.data
    return (
      <div style={{
        background: "var(--surface-1)",
        border: "1px solid #ccc",
        padding: "8px 12px",
        borderRadius: 4,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        <strong>{datum.category}</strong>
        <div>X: {datum.x}</div>
        <div>Y: {datum.y}</div>
        <div>Value: {datum.value.toLocaleString()}</div>
      </div>
    )
  }}
  xAccessor="x"
  yAccessor="y"
/>`}
        language="jsx"
      />
      <p style={{ fontSize: "0.9em", opacity: 0.85, marginTop: 8 }}>
        Higher-level HOC props like <code>tooltip</code> (on{" "}
        <code>BarChart</code>, <code>LineChart</code>, etc.) auto-unwrap the
        wrapper for you, so the function there receives the datum directly —{" "}
        <code>{`tooltip={d => d.category}`}</code>. The raw{" "}
        <code>tooltipContent</code> form on Stream Frames is the unwrapped
        path for callers that need the full hover context.
      </p>

      <h3 id="advanced-hover">Advanced hoverAnnotation</h3>
      <p>
        The <code>hoverAnnotation</code> prop can accept an array of
        annotation types for richer hover behavior. This lets you combine
        tooltips with guide lines and point highlights:
      </p>

      <LiveExample
        frameProps={{
          data: scatterData,
          chartType: "scatter",
          xAccessor: "x",
          yAccessor: "y",
          pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
          margin: { top: 30, bottom: 60, left: 60, right: 20 },
          showAxes: true,
          xLabel: "X Value",
          yLabel: "Y Value",
          hoverAnnotation: [
            { type: "x", disable: ["connector", "note"] },
            { type: "y", disable: ["connector", "note"] },
            { type: "frame-hover" },
          ],
        }}
        type={StreamXYFrame}
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

// For StreamOrdinalFrame, use pieceHoverAnnotation for individual pieces
// vs hoverAnnotation for entire columns
<StreamOrdinalFrame pieceHoverAnnotation={true} />
<StreamOrdinalFrame hoverAnnotation={true} />  // column-level hover`}
        language="jsx"
      />

      <h3 id="tooltip-positioning">Tooltip Positioning</h3>
      <p>
        Tooltips are positioned automatically near the hovered data point.
        They render in an HTML layer above the SVG visualization, so they
        can contain any HTML content. For point-based data,{" "}
        <code>StreamXYFrame</code> uses Voronoi tesselation to determine the
        nearest data point on hover, providing smooth and responsive tooltip
        behavior even when points are small.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/annotations/overview">Annotations</Link> — the full
          annotation system that powers tooltips
        </li>
        <li>
          <Link to="/features/interaction">Interaction</Link> — highlighting,
          cross-highlighting, and custom click/hover behaviors
        </li>
        <li>
          <Link to="/frames/xy-frame">StreamXYFrame</Link> — point, line, and area
          tooltips with Voronoi hover
        </li>
        <li>
          <Link to="/frames/ordinal-frame">StreamOrdinalFrame</Link> — piece-level
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
