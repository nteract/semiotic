import React from "react"
import { XYFrame, OrdinalFrame, NetworkFrame } from "semiotic"

import PageLayout from "../../components/PageLayout"
import LiveExample from "../../components/LiveExample"
import CodeBlock from "../../components/CodeBlock"
import PropTable from "../../components/PropTable"
import { Link } from "react-router-dom"

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const theme = [
  "#ac58e5",
  "#E0488B",
  "#9fd0cb",
  "#e0d33a",
  "#7566ff",
  "#533f82",
]

const multiLineData = [
  {
    label: "Revenue",
    color: theme[0],
    coordinates: [
      { month: 1, value: 12 },
      { month: 2, value: 18 },
      { month: 3, value: 14 },
      { month: 4, value: 22 },
      { month: 5, value: 19 },
      { month: 6, value: 27 },
    ],
  },
  {
    label: "Costs",
    color: theme[1],
    coordinates: [
      { month: 1, value: 8 },
      { month: 2, value: 11 },
      { month: 3, value: 10 },
      { month: 4, value: 14 },
      { month: 5, value: 13 },
      { month: 6, value: 16 },
    ],
  },
  {
    label: "Profit",
    color: theme[2],
    coordinates: [
      { month: 1, value: 4 },
      { month: 2, value: 7 },
      { month: 3, value: 4 },
      { month: 4, value: 8 },
      { month: 5, value: 6 },
      { month: 6, value: 11 },
    ],
  },
]

const barData = [
  { category: "Q1", value: 35, region: "North" },
  { category: "Q2", value: 42, region: "North" },
  { category: "Q3", value: 28, region: "North" },
  { category: "Q4", value: 51, region: "North" },
  { category: "Q1", value: 22, region: "South" },
  { category: "Q2", value: 31, region: "South" },
  { category: "Q3", value: 38, region: "South" },
  { category: "Q4", value: 29, region: "South" },
  { category: "Q1", value: 18, region: "East" },
  { category: "Q2", value: 25, region: "East" },
  { category: "Q3", value: 33, region: "East" },
  { category: "Q4", value: 27, region: "East" },
]

const regionColors = {
  North: theme[0],
  South: theme[1],
  East: theme[2],
}

// ---------------------------------------------------------------------------
// Prop definitions
// ---------------------------------------------------------------------------

const legendProps = [
  {
    name: "legend",
    type: "boolean | object",
    required: false,
    default: "undefined",
    description:
      "Enables and configures the legend. When set to true, Semiotic auto-generates legend items from the data. When an object, allows full customization of legend groups, positioning, and behavior.",
  },
  {
    name: "legend.legendGroups",
    type: "array",
    required: false,
    default: "Auto-generated",
    description:
      'Array of legend group objects. Each group has: type ("fill" | "line" | function), styleFn (function returning style object for each item), items (array of { label, ...data }), and label (group label string).',
  },
  {
    name: "legend.title",
    type: "string | false",
    required: false,
    default: '"Legend"',
    description:
      "Title displayed above the legend. Set to false to hide the title.",
  },
  {
    name: "legend.width",
    type: "number",
    required: false,
    default: "100",
    description: "Width of the legend area in pixels.",
  },
  {
    name: "legend.height",
    type: "number",
    required: false,
    default: "20",
    description:
      "Height of the legend area (primarily used for horizontal orientation).",
  },
  {
    name: "legend.orientation",
    type: '"vertical" | "horizontal"',
    required: false,
    default: '"vertical"',
    description:
      "Layout direction of the legend items. Vertical stacks items, horizontal places them in a row.",
  },
  {
    name: "legend.position",
    type: '"left" | "right"',
    required: false,
    default: '"right"',
    description:
      "Which side of the frame the legend appears on.",
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LegendsPage() {
  return (
    <PageLayout
      title="Legends"
      breadcrumbs={[
        { label: "Features", path: "/features" },
        { label: "Legends", path: "/features/legends" },
      ]}
      prevPage={{ title: "Styling", path: "/features/styling" }}
      nextPage={null}
    >
      <p>
        Legends help viewers understand the color, shape, and line encodings in
        your visualization. Semiotic supports legends on all Frame types through
        the <code>legend</code> prop. When set to <code>true</code>, Semiotic
        auto-generates legend entries from your data. You can also pass a
        configuration object for full control over legend groups, styling, and
        positioning.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Charts */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-charts">With Charts</h2>

      <p>
        Chart components (LineChart, BarChart, etc.) automatically generate
        legends when you use <code>colorBy</code> to color data by category.
        The legend is shown by default when multiple series are detected. You
        can control it with the <code>showLegend</code> prop:
      </p>

      <CodeBlock
        code={`import { LineChart } from "semiotic"

// Legend auto-generated from colorBy categories
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  lineBy="region"
  colorBy="region"
  showLegend={true}
/>

// Disable the auto-legend
<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  lineBy="region"
  colorBy="region"
  showLegend={false}
/>`}
        language="jsx"
      />

      <p>
        For more control over the legend from a Chart component, use the{" "}
        <code>frameProps</code> escape hatch to pass a full legend
        configuration object.
      </p>

      {/* ----------------------------------------------------------------- */}
      {/* With Frames */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="with-frames">With Frames</h2>

      <h3 id="auto-legend-xy">Auto-Generated Legend (XYFrame)</h3>
      <p>
        On <code>XYFrame</code>, setting <code>legend={`{true}`}</code>{" "}
        automatically creates legend items from the lines in your data. The
        legend type (line swatch vs. fill swatch) is determined by the line
        type: stacked area types use fill swatches, while regular lines use
        line swatches. The label for each item comes from the{" "}
        <code>lineIDAccessor</code>.
      </p>

      <LiveExample
        frameProps={{
          lines: multiLineData,
          xAccessor: "month",
          yAccessor: "value",
          lineDataAccessor: "coordinates",
          lineStyle: (d) => ({ stroke: d.color, strokeWidth: 2 }),
          lineIDAccessor: "label",
          axes: [
            { orient: "left", label: "Value" },
            { orient: "bottom", label: "Month" },
          ],
          margin: { top: 20, bottom: 50, left: 60, right: 120 },
          legend: true,
          title: "Revenue, Costs, and Profit",
        }}
        type={XYFrame}
        overrideProps={{
          lines: `[
  {
    label: "Revenue",
    color: "#ac58e5",
    coordinates: [
      { month: 1, value: 12 },
      { month: 2, value: 18 },
      // ...more data
    ],
  },
  {
    label: "Costs",
    color: "#E0488B",
    coordinates: [/* ... */],
  },
  {
    label: "Profit",
    color: "#9fd0cb",
    coordinates: [/* ... */],
  },
]`,
          lineStyle: `d => ({ stroke: d.color, strokeWidth: 2 })`,
          axes: `[
  { orient: "left", label: "Value" },
  { orient: "bottom", label: "Month" }
]`,
        }}
        functions={{
          lineStyle: (d) => ({ stroke: d.color, strokeWidth: 2 }),
        }}
        hiddenProps={{}}
        startHidden={false}
      />

      <h3 id="custom-legend">Custom Legend Configuration</h3>
      <p>
        For full control, pass an object with <code>legendGroups</code> to
        define exactly what appears in the legend, how it is styled, and how
        items are labeled.
      </p>

      <LiveExample
        frameProps={{
          data: barData,
          oAccessor: "category",
          rAccessor: "value",
          type: "clusterbar",
          style: (d) => ({
            fill: regionColors[d.region],
            stroke: "white",
            strokeWidth: 1,
          }),
          oPadding: 10,
          axes: [{ orient: "left", label: "Sales ($K)" }],
          margin: { top: 20, bottom: 40, left: 60, right: 130 },
          legend: {
            title: "Region",
            legendGroups: [
              {
                type: "fill",
                label: "",
                styleFn: (d) => ({
                  fill: regionColors[d.label],
                  stroke: regionColors[d.label],
                }),
                items: [
                  { label: "North" },
                  { label: "South" },
                  { label: "East" },
                ],
              },
            ],
          },
          title: "Quarterly Sales by Region",
        }}
        type={OrdinalFrame}
        overrideProps={{
          data: `[
  { category: "Q1", value: 35, region: "North" },
  { category: "Q2", value: 42, region: "North" },
  // ...more data for North, South, East
]`,
          style: `d => ({
  fill: regionColors[d.region],
  stroke: "white",
  strokeWidth: 1,
})`,
          legend: `{
  title: "Region",
  legendGroups: [
    {
      type: "fill",
      label: "",
      styleFn: d => ({
        fill: regionColors[d.label],
        stroke: regionColors[d.label],
      }),
      items: [
        { label: "North" },
        { label: "South" },
        { label: "East" },
      ],
    },
  ],
}`,
          axes: `[{ orient: "left", label: "Sales ($K)" }]`,
        }}
        functions={{
          style: (d) => ({
            fill: regionColors[d.region],
            stroke: "white",
            strokeWidth: 1,
          }),
        }}
        hiddenProps={{}}
        startHidden
      />

      {/* ----------------------------------------------------------------- */}
      {/* Configuration */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="configuration">Configuration</h2>

      <PropTable componentName="Legend" props={legendProps} />

      <h3 id="legend-groups">Legend Groups</h3>
      <p>
        A <code>legendGroups</code> array lets you define one or more groups of
        legend items. Each group has its own type, style function, and items.
        This is useful when a single visualization encodes multiple dimensions
        (e.g., color for category and size for magnitude).
      </p>

      <CodeBlock
        code={`<XYFrame
  legend={{
    title: "Legend",
    legendGroups: [
      {
        type: "line",            // "fill" for filled swatches, "line" for strokes
        label: "Series",
        styleFn: d => ({
          stroke: d.color,
          strokeWidth: 2,
          fill: "none",
        }),
        items: [
          { label: "Revenue", color: "#ac58e5" },
          { label: "Costs", color: "#E0488B" },
        ],
      },
      {
        type: "fill",
        label: "Region",
        styleFn: d => ({ fill: d.color }),
        items: [
          { label: "North", color: "#9fd0cb" },
          { label: "South", color: "#e0d33a" },
        ],
      },
    ],
  }}
/>`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="legend-item-types">Legend Item Types</h3>
      <p>
        The <code>type</code> property on a legend group determines the shape
        of the swatch:
      </p>
      <ul>
        <li>
          <code>"fill"</code> — renders a 20x20 filled rectangle. Best for
          area charts, bars, and filled marks.
        </li>
        <li>
          <code>"line"</code> — renders a diagonal line stroke. Best for line
          charts and stroked marks.
        </li>
        <li>
          <strong>Function</strong> — pass a custom render function that
          receives the item data and returns SVG elements for complete control.
        </li>
      </ul>

      <CodeBlock
        code={`// Custom legend glyph using a function type
{
  type: item => (
    <circle
      r={item.size || 8}
      fill={item.color}
      cx={10}
      cy={10}
    />
  ),
  styleFn: () => ({}),
  items: [
    { label: "Small", color: "#ac58e5", size: 4 },
    { label: "Medium", color: "#E0488B", size: 8 },
    { label: "Large", color: "#9fd0cb", size: 12 },
  ],
  label: "Size",
}`}
        language="jsx"
      />

      <h3 id="horizontal-legend">Horizontal Legends</h3>
      <p>
        Set <code>orientation: "horizontal"</code> to lay out legend items in
        a row. This works well when placed above or below a chart:
      </p>

      <CodeBlock
        code={`<XYFrame
  legend={{
    orientation: "horizontal",
    title: false,         // hide title for horizontal layout
    legendGroups: [{
      type: "fill",
      styleFn: d => ({ fill: d.color }),
      items: [
        { label: "Revenue", color: "#ac58e5" },
        { label: "Costs", color: "#E0488B" },
        { label: "Profit", color: "#9fd0cb" },
      ],
      label: "",
    }],
  }}
/>`}
        language="jsx"
      />

      <h3 id="click-behavior">Interactive Legends</h3>
      <p>
        While the <code>legend</code> prop itself does not include built-in
        toggle behavior, Semiotic&apos;s Legend component supports a{" "}
        <code>customClickBehavior</code> callback. You can use this in
        combination with state management to create interactive legends that
        filter or highlight data:
      </p>

      <CodeBlock
        code={`import { useState } from "react"

function InteractiveChart({ data }) {
  const [hiddenSeries, setHiddenSeries] = useState(new Set())

  const toggleSeries = item => {
    setHiddenSeries(prev => {
      const next = new Set(prev)
      if (next.has(item.label)) {
        next.delete(item.label)
      } else {
        next.add(item.label)
      }
      return next
    })
  }

  const visibleLines = data.filter(
    d => !hiddenSeries.has(d.label)
  )

  return (
    <XYFrame
      lines={visibleLines}
      xAccessor="month"
      yAccessor="value"
      lineDataAccessor="coordinates"
      lineStyle={d => ({ stroke: d.color, strokeWidth: 2 })}
      lineIDAccessor="label"
      legend={{
        customClickBehavior: toggleSeries,
        legendGroups: [{
          type: "line",
          styleFn: d => ({
            stroke: d.color,
            opacity: hiddenSeries.has(d.label) ? 0.3 : 1,
          }),
          items: data.map(d => ({
            label: d.label,
            color: d.color,
          })),
          label: "",
        }],
      }}
    />
  )
}`}
        language="jsx"
        showLineNumbers
      />

      <h3 id="legend-with-charts-api">Legend with Chart API</h3>
      <p>
        Chart components auto-generate legends from your <code>colorBy</code>{" "}
        and data. To customize the auto-generated legend further, pass a legend
        configuration through <code>frameProps</code>:
      </p>

      <CodeBlock
        code={`import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  lineBy="product"
  colorBy="product"
  frameProps={{
    legend: {
      title: "Products",
      orientation: "horizontal",
    },
  }}
/>`}
        language="jsx"
      />

      {/* ----------------------------------------------------------------- */}
      {/* Related */}
      {/* ----------------------------------------------------------------- */}
      <h2 id="related">Related</h2>

      <ul>
        <li>
          <Link to="/charts/line-chart">LineChart</Link> — auto-legends for
          multi-line charts
        </li>
        <li>
          <Link to="/frames/xy-frame">XYFrame</Link> — legend support for
          lines, areas, and points
        </li>
        <li>
          <Link to="/frames/ordinal-frame">OrdinalFrame</Link> — legend
          support for bars, swarms, and distributions
        </li>
        <li>
          <Link to="/frames/network-frame">NetworkFrame</Link> — legend
          support for nodes and edges
        </li>
        <li>
          <Link to="/features/styling">Styling</Link> — customizing colors,
          patterns, and visual encodings
        </li>
        <li>
          <Link to="/features/small-multiples">Small Multiples</Link> — shared
          legends across multiple coordinated frames
        </li>
      </ul>
    </PageLayout>
  )
}
