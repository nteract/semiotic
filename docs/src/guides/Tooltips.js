import React from "react"
import Tooltips from "../markdown/tooltips.mdx"
import DocumentFrame, { propertyToString } from "../DocumentFrame"
import { XYFrame, OrdinalFrame, Tooltip, MultiLineTooltip } from "semiotic"
import lines from "./sharedTooltipData"
import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"
import MarkdownText from "../MarkdownText"
import theme from "../theme"

// Example data for simplified tooltips
const scatterData = [
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  { x: 40, y: 15, category: "A", value: 80 },
  { x: 55, y: 45, category: "C", value: 200 },
  { x: 70, y: 30, category: "B", value: 120 },
  { x: 85, y: 50, category: "C", value: 180 }
]

const barData = [
  { category: "Product A", sales: 450, profit: 120, units: 230 },
  { category: "Product B", sales: 380, profit: 95, units: 190 },
  { category: "Product C", sales: 520, profit: 145, units: 260 },
  { category: "Product D", sales: 290, profit: 75, units: 145 },
  { category: "Product E", sales: 610, profit: 180, units: 305 }
]

const colorHash = {
  A: theme[0],
  B: theme[1],
  C: theme[2]
}

// Simplified tooltip examples using new utilities with Frame components
const simpleTooltipScatter = {
  size: [600, 400],
  points: scatterData,
  xAccessor: "x",
  yAccessor: "y",
  pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
  axes: [
    { orient: "left", label: "Y Value" },
    { orient: "bottom", label: "X Value" }
  ],
  margin: { top: 50, bottom: 60, left: 60, right: 20 },
  hoverAnnotation: true,
  tooltipContent: Tooltip({ title: "category" })
}

const multiFieldTooltipScatter = {
  size: [600, 400],
  points: scatterData,
  xAccessor: "x",
  yAccessor: "y",
  pointStyle: (d) => ({ fill: colorHash[d.category], r: 5 }),
  axes: [
    { orient: "left", label: "Y Value" },
    { orient: "bottom", label: "X Value" }
  ],
  margin: { top: 50, bottom: 60, left: 60, right: 20 },
  hoverAnnotation: true,
  tooltipContent: MultiLineTooltip({
    title: "category",
    fields: ["x", "y", "value"]
  })
}

const formattedTooltipBar = {
  size: [600, 400],
  data: barData,
  oAccessor: "category",
  rAccessor: "sales",
  style: { fill: theme[0], stroke: "white" },
  type: "bar",
  oLabel: true,
  axes: [{ orient: "left", label: "Sales ($)" }],
  margin: { top: 50, bottom: 80, left: 60, right: 20 },
  hoverAnnotation: true,
  tooltipContent: MultiLineTooltip({
    title: "category",
    fields: [
      { key: "sales", label: "Sales", format: (v) => `$${v}` },
      { key: "profit", label: "Profit", format: (v) => `$${v}` },
      { key: "units", label: "Units Sold" }
    ]
  })
}

const tooltipStyles = {
  header: {
    fontWeight: "bold",
    borderBottom: "thin solid black",
    marginBottom: "10px",
    textAlign: "center",
  },
  lineItem: { position: "relative", display: "block", textAlign: "left" },
  title: { display: "inline-block", margin: "0 5px 0 15px" },
  value: { display: "inline-block", fontWeight: "bold", margin: "0" },
  wrapper: {
    background: "rgba(255,255,255,0.8)",
    minWidth: "max-content",
    whiteSpace: "nowrap",
  },
}

const sharedTooltipChart = {
  size: [700, 300],
  className: "sharedTooltip",
  lineDataAccessor: "data",
  xAccessor: (d) => new Date(d.x),
  xScaleType: scaleTime(),
  yAccessor: "y",
  lines: lines,
  lineStyle: (d) => {
    return { stroke: d.color, strokeWidth: "2px", fill: "none" }
  },
  axes: [
    { orient: "left" },
    { orient: "bottom", ticks: 6, tickFormat: (d) => timeFormat("%m/%d")(d) },
  ],
  margin: { top: 10, left: 40, right: 10, bottom: 60 },
  pointStyle: {
    fill: "none",
    stroke: "black",
    strokeWidth: "1.5px",
  },
  hoverAnnotation: [
    { type: "x", disable: ["connector", "note"] },
    { type: "frame-hover" },
    { type: "vertical-points", threshold: 0.1, r: () => 5 },
  ],
  tooltipContent: (d) => {
    const points = lines
      .map((point) => {
        return {
          id: point.id,
          color: point.color,
          data: point.data.find((i) => {
            // Search the lines for a similar x value for vertical shared tooltip
            // Can implement a 'close enough' conditional here too (fuzzy equality)
            return new Date(i.x).getTime() === new Date(d.x).getTime()
          }),
        }
      })
      .sort((a, b) => b.data.y - a.data.y)

    const returnArray = [
      <div key={"header_multi"} style={tooltipStyles.header}>
        {`Records for: ${timeFormat("%m/%d/%Y")(new Date(d.x))}`}
      </div>,
    ]

    points.forEach((point, i) => {
      const title = point.id
      const valString = `${point.data.y} units`

      returnArray.push([
        <div key={`tooltip_line_${i}`} style={tooltipStyles.lineItem}>
          <p
            key={`tooltip_color_${i}`}
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: point.color,
              display: "inline-block",
              position: "absolute",
              top: "8px",
              left: "0",
              margin: "0",
            }}
          />
          <p key={`tooltip_p_${i}`} style={tooltipStyles.title}>{`${title} =`}</p>
          <p key={`tooltip_p_val_${i}`} style={tooltipStyles.value}>
            {valString}
          </p>
        </div>,
      ])
    })

    return (
      <div className="tooltip-content" style={tooltipStyles.wrapper}>
        {returnArray}
      </div>
    )
  },
}

const overrideProps = {
  axes: `[
  { orient: "left" },
  { orient: "bottom", ticks: 6, tickFormat: d => timeFormat("%m/%d")(d) }
]`,
  lines: "lines",
  xScaleType: "scaleTime()",
  tooltipContent: `d => {
    const points = lines
      .map(point => {
        return {
          id: point.id,
          color: point.color,
          data: point.data.find(i => {
            // Search the lines for a similar x value for vertical shared tooltip
            // Can implement a 'close enough' conditional here too (fuzzy equality)
            return new Date(i.x).getTime() === new Date(d.x).getTime();
          })
        };
      })
      .sort((a, b) => b.data.y - a.data.y);

    const returnArray = [
      <div key={"header_multi"} style={tooltipStyles.header}>
        {\`Records for: \${timeFormat("%m/%d/%Y")(new Date(d.x))}\`}
      </div>
    ];

    points.forEach((point, i) => {
      const title = point.id;
      const valString = \`\${point.data.y} units\`;

      returnArray.push([
        <div key={\`tooltip_line_\${i}\`} style={tooltipStyles.lineItem}>
          <p
            key={\`tooltip_color_\${i}\`}
            style={{
              width: "10px",
              height: "10px",
              backgroundColor: point.color,
              display: "inline-block",
              position: "absolute",
              top: "8px",
              left: "0",
              margin: "0"
            }}
          />
          <p
            key={\`tooltip_p_\${i}\`}
            style={tooltipStyles.title}
          >{\`\${title} =\`}</p>
          <p key={\`tooltip_p_val_\${i}\`} style={tooltipStyles.value}>
            {valString}
          </p>
        </div>
      ]);
    });

    return (
      <div className="tooltip-content" style={tooltipStyles.wrapper}>
        {returnArray}
      </div>
    );
}`,
}

export default () => {
  return (
    <div>
      <h1>Annotations - Tooltips</h1>

      <MarkdownText
        text={`
## Simplified Tooltip API (Recommended)

Semiotic provides two higher-order utilities for creating tooltips without needing to work directly with the low-level annotation system:

- **\`Tooltip()\`** - Simple tooltip showing a single value or title
- **\`MultiLineTooltip()\`** - Multi-field tooltip with labels and formatting

These utilities work with the \`tooltipContent\` prop on all frame components.

### Simple Tooltip

Show a single field from your data:
`}
      />
      <DocumentFrame
        frameProps={simpleTooltipScatter}
        type={XYFrame}
        overrideProps={{
          points: `[
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  { x: 40, y: 15, category: "A", value: 80 },
  { x: 55, y: 45, category: "C", value: 200 },
  { x: 70, y: 30, category: "B", value: 120 },
  { x: 85, y: 50, category: "C", value: 180 }
]`,
          pointStyle: `d => ({ fill: colorHash[d.category], r: 5 })`,
          tooltipContent: `Tooltip({ title: "category" })`
        }}
        pre={`import { XYFrame, Tooltip } from "semiotic"

const colorHash = {
  A: "#00a2ce",
  B: "#4d430c",
  C: "#b3331d"
}`}
      />

      <MarkdownText
        text={`
### Multi-Field Tooltip

Show multiple fields with automatic formatting:
`}
      />
      <DocumentFrame
        frameProps={multiFieldTooltipScatter}
        type={XYFrame}
        overrideProps={{
          points: `[
  { x: 10, y: 20, category: "A", value: 100 },
  { x: 25, y: 35, category: "B", value: 150 },
  { x: 40, y: 15, category: "A", value: 80 },
  { x: 55, y: 45, category: "C", value: 200 },
  { x: 70, y: 30, category: "B", value: 120 },
  { x: 85, y: 50, category: "C", value: 180 }
]`,
          pointStyle: `d => ({ fill: colorHash[d.category], r: 5 })`,
          tooltipContent: `MultiLineTooltip({
  title: "category",
  fields: ["x", "y", "value"]
})`
        }}
        pre={`import { XYFrame, MultiLineTooltip } from "semiotic"

const colorHash = {
  A: "#00a2ce",
  B: "#4d430c",
  C: "#b3331d"
}`}
      />

      <MarkdownText
        text={`
### Custom Field Formatting

Use field objects to customize labels and formatting:
`}
      />
      <DocumentFrame
        frameProps={formattedTooltipBar}
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
})`
        }}
        pre={`import { OrdinalFrame, MultiLineTooltip } from "semiotic"`}
      />

      <MarkdownText
        text={`
## Traditional API (Advanced)

For full control over tooltip behavior and styling, you can use the traditional \`hoverAnnotation\` and \`tooltipContent\` props directly with frame components:
`}
      />
      <Tooltips />
      <MarkdownText
        text={`
## Shared Tooltip Example

This example shows how to create a shared tooltip across multiple lines using the traditional API:
`}
      />
      <DocumentFrame
        frameProps={sharedTooltipChart}
        type={XYFrame}
        overrideProps={overrideProps}
        pre={`import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"

const tooltipStyles = {
  header: {
    fontWeight: "bold",
    borderBottom: "thin solid black",
    marginBottom: "10px",
    textAlign: "center"
  },
  lineItem: { position: "relative", display: "block", textAlign: "left" },
  title: { display: "inline-block", margin: "0 5px 0 15px" },
  value: { display: "inline-block", fontWeight: "bold", margin: "0" },
  wrapper: {
    background: "rgba(255,255,255,0.8)",
    minWidth: "max-content",
    whiteSpace: "nowrap"
  }
}

const lines = ${propertyToString(lines, 0, false)}
        `}
      />

      <MarkdownText
        text={`
## Tooltip API Reference

### \`Tooltip(config)\`

Create a simple tooltip showing a single value.

**Parameters:**
- \`title\`: string | function - Field to display (default: auto-detects from data)
- \`format\`: function - Format the value (e.g., \`v => "$" + v\`)
- \`style\`: object - Custom CSS styles
- \`className\`: string - Custom CSS class

**Usage with Frame Components:**
\`\`\`jsx
<XYFrame
  hoverAnnotation={true}
  tooltipContent={Tooltip({ title: "name", format: v => v.toUpperCase() })}
  ...
/>
\`\`\`

**Usage with Higher-Order Components:**
\`\`\`jsx
<Scatterplot
  tooltip={Tooltip({ title: "name", format: v => v.toUpperCase() })}
  ...
/>
\`\`\`

### \`MultiLineTooltip(config)\`

Create a multi-field tooltip with labels and formatting.

**Parameters:**
- \`title\`: string | function - Header field
- \`fields\`: array - Fields to display (strings or objects)
  - String: \`"fieldName"\` (uses field name as label)
  - Object: \`{ key: "fieldName", label: "Display Name", format: v => ... }\`
- \`showLabels\`: boolean - Show field labels (default: true)
- \`separator\`: string - Separator between label and value (default: ": ")
- \`style\`: object - Custom CSS styles
- \`className\`: string - Custom CSS class

**Usage with Frame Components:**
\`\`\`jsx
<XYFrame
  hoverAnnotation={true}
  tooltipContent={MultiLineTooltip({
    title: "product",
    fields: [
      { key: "revenue", label: "Revenue", format: v => \`$\${v.toLocaleString()}\` },
      { key: "units", label: "Units" },
      "category"
    ]
  })}
  ...
/>
\`\`\`

**Usage with Higher-Order Components:**
\`\`\`jsx
<BarChart
  tooltip={MultiLineTooltip({
    title: "product",
    fields: [
      { key: "revenue", label: "Revenue", format: v => \`$\${v.toLocaleString()}\` },
      { key: "units", label: "Units" },
      "category"
    ]
  })}
  ...
/>
\`\`\`

### Custom Tooltip Function

For complete control, pass a custom function to \`tooltipContent\` (or \`tooltip\` for higher-order components):

\`\`\`jsx
<XYFrame
  hoverAnnotation={true}
  tooltipContent={data => (
    <div className="my-tooltip">
      <h3>{data.title}</h3>
      <p>{data.description}</p>
    </div>
  )}
  ...
/>
\`\`\`

## Best Practices

1. **Use simplified API for common cases**: \`Tooltip()\` and \`MultiLineTooltip()\` handle 90% of use cases
2. **Format numbers appropriately**: Use \`format\` functions for currency, percentages, etc.
3. **Keep tooltips concise**: Show 3-5 key fields maximum
4. **Provide context**: Include a title or header to identify what's being shown
5. **Use traditional API for complex cases**: Shared tooltips, nested visualizations, etc.
`}
      />
    </div>
  )
}
