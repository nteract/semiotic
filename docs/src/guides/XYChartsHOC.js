import React from "react"
import MarkdownText from "../MarkdownText"
import {
  Scatterplot,
  LineChart,
  AreaChart,
  Heatmap,
  BubbleChart,
  Tooltip,
  MultiLineTooltip
} from "semiotic"

// Sample data
const scatterData = [
  { x: 1, y: 5, category: "A", size: 10 },
  { x: 2, y: 8, category: "B", size: 15 },
  { x: 3, y: 3, category: "A", size: 8 },
  { x: 4, y: 12, category: "B", size: 20 },
  { x: 5, y: 7, category: "A", size: 12 },
  { x: 6, y: 15, category: "B", size: 18 },
  { x: 7, y: 9, category: "A", size: 14 },
  { x: 8, y: 11, category: "B", size: 16 }
]

const lineData = [
  { x: 1, y: 5, series: "Product A" },
  { x: 2, y: 8, series: "Product A" },
  { x: 3, y: 6, series: "Product A" },
  { x: 4, y: 12, series: "Product A" },
  { x: 5, y: 10, series: "Product A" },
  { x: 1, y: 3, series: "Product B" },
  { x: 2, y: 6, series: "Product B" },
  { x: 3, y: 9, series: "Product B" },
  { x: 4, y: 7, series: "Product B" },
  { x: 5, y: 11, series: "Product B" }
]

const areaData = [
  { x: 1, y: 5, category: "Sales" },
  { x: 2, y: 8, category: "Sales" },
  { x: 3, y: 6, category: "Sales" },
  { x: 4, y: 12, category: "Sales" },
  { x: 5, y: 10, category: "Sales" },
  { x: 1, y: 3, category: "Marketing" },
  { x: 2, y: 6, category: "Marketing" },
  { x: 3, y: 4, category: "Marketing" },
  { x: 4, y: 7, category: "Marketing" },
  { x: 5, y: 5, category: "Marketing" },
  { x: 1, y: 2, category: "R&D" },
  { x: 2, y: 4, category: "R&D" },
  { x: 3, y: 3, category: "R&D" },
  { x: 4, y: 5, category: "R&D" },
  { x: 5, y: 4, category: "R&D" }
]

const heatmapData = []
for (let x = 0; x < 7; x++) {
  for (let y = 0; y < 5; y++) {
    heatmapData.push({
      x,
      y,
      value: Math.floor(Math.random() * 100)
    })
  }
}

const bubbleData = [
  { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" },
  { x: 25, y: 35, size: 50, category: "Finance", name: "Company B" },
  { x: 40, y: 15, size: 20, category: "Tech", name: "Company C" },
  { x: 55, y: 45, size: 60, category: "Healthcare", name: "Company D" },
  { x: 70, y: 30, size: 40, category: "Finance", name: "Company E" },
  { x: 20, y: 50, size: 25, category: "Healthcare", name: "Company F" },
  { x: 65, y: 25, size: 45, category: "Tech", name: "Company G" }
]

const CodeBlock = ({ code }) => (
  <pre style={{
    background: "#f5f5f5",
    padding: "16px",
    borderRadius: "4px",
    overflow: "auto",
    fontSize: "14px",
    lineHeight: "1.5"
  }}>
    <code>{code}</code>
  </pre>
)

const ExampleContainer = ({ title, children, code }) => (
  <div style={{ marginBottom: "60px" }}>
    <h3>{title}</h3>
    <div style={{
      border: "1px solid #ddd",
      padding: "20px",
      marginBottom: "16px",
      background: "white"
    }}>
      {children}
    </div>
    <CodeBlock code={code} />
  </div>
)

export default function XYChartsHOC() {
  return (
    <div>
      <h1>XY Chart Components</h1>

      <MarkdownText
        text={`
Higher-order XY chart components provide simplified APIs for common chart types based on \`XYFrame\`. These components handle the complexity of XYFrame configuration while providing intuitive prop names.

## Benefits

- **Intuitive Props**: Use \`xLabel\`, \`yLabel\`, \`colorBy\` instead of Frame internals
- **Smart Defaults**: Pre-configured axes, margins, and styling
- **Built-in Tooltips**: Simple \`tooltip\` prop with Tooltip utilities
- **Type Safety**: Full TypeScript support
- **Progressive Disclosure**: Start simple, access Frame props when needed

---
`}
      />

      <ExampleContainer
        title="Scatterplot"
        code={`import { Scatterplot, Tooltip } from "semiotic"

const scatterData = [
  { x: 1, y: 5, category: "A" },
  { x: 2, y: 8, category: "B" },
  { x: 3, y: 3, category: "A" },
  { x: 4, y: 12, category: "B" }
]

<Scatterplot
  data={scatterData}
  width={600}
  height={400}
  xLabel="X Axis"
  yLabel="Y Axis"
  colorBy="category"
  tooltip={Tooltip({ title: "category" })}
/>`}
      >
        <Scatterplot
          data={scatterData}
          width={600}
          height={400}
          xLabel="X Axis"
          yLabel="Y Axis"
          colorBy="category"
          tooltip={Tooltip({ title: "category" })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{x, y, ...}\` objects
- \`xLabel\`, \`yLabel\`: Axis labels
- \`colorBy\`: Field or function for point colors
- \`sizeBy\`: Field or function for point sizes
- \`tooltip\`: Tooltip configuration (\`Tooltip()\` or \`MultiLineTooltip()\`)

**Advanced:**
Pass any \`XYFrame\` prop for complete control. [See XYFrame API →](/api/xyframe)

---
`}
      />

      <ExampleContainer
        title="LineChart"
        code={`import { LineChart, MultiLineTooltip } from "semiotic"

const lineData = [
  { x: 1, y: 5, series: "Product A" },
  { x: 2, y: 8, series: "Product A" },
  { x: 1, y: 3, series: "Product B" },
  { x: 2, y: 6, series: "Product B" }
]

<LineChart
  data={lineData}
  width={600}
  height={400}
  xLabel="Time"
  yLabel="Value"
  groupBy="series"
  tooltip={MultiLineTooltip({ title: "series", fields: ["x", "y"] })}
/>`}
      >
        <LineChart
          data={lineData}
          width={600}
          height={400}
          xLabel="Time"
          yLabel="Value"
          groupBy="series"
          tooltip={MultiLineTooltip({ title: "series", fields: ["x", "y"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{x, y, series?, ...}\` objects
- \`xLabel\`, \`yLabel\`: Axis labels
- \`groupBy\`: Field to group data into multiple lines
- \`curve\`: Line interpolation ("linear", "monotoneX", "step", "basis", etc.)
- \`showPoints\`: Show data points on lines
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass \`lineType\`, \`lineStyle\`, or other \`XYFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="AreaChart"
        code={`import { AreaChart, MultiLineTooltip } from "semiotic"

const areaData = [
  { x: 1, y: 5, category: "Sales" },
  { x: 2, y: 8, category: "Sales" },
  { x: 1, y: 3, category: "Marketing" },
  { x: 2, y: 6, category: "Marketing" }
]

<AreaChart
  data={areaData}
  width={600}
  height={400}
  xLabel="Time"
  yLabel="Value"
  groupBy="category"
  stacked={true}
  tooltip={MultiLineTooltip({ title: "category", fields: ["x", "y"] })}
/>`}
      >
        <AreaChart
          data={areaData}
          width={600}
          height={400}
          xLabel="Time"
          yLabel="Value"
          groupBy="category"
          stacked={true}
          tooltip={MultiLineTooltip({ title: "category", fields: ["x", "y"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{x, y, category?, ...}\` objects
- \`xLabel\`, \`yLabel\`: Axis labels
- \`groupBy\`: Field to group data into multiple areas
- \`stacked\`: Stack areas on top of each other (default: false)
- \`normalize\`: 100% stacked / proportional (default: false)
- \`curve\`: Area interpolation
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass \`lineType\` settings or other \`XYFrame\` props for complete control.

---
`}
      />

      <ExampleContainer
        title="BubbleChart"
        code={`import { BubbleChart, MultiLineTooltip } from "semiotic"

const bubbleData = [
  { x: 10, y: 20, size: 30, category: "Tech", name: "Company A" },
  { x: 25, y: 35, size: 50, category: "Finance", name: "Company B" }
]

<BubbleChart
  data={bubbleData}
  width={600}
  height={400}
  xLabel="Revenue"
  yLabel="Growth"
  sizeBy="size"
  colorBy="category"
  tooltip={MultiLineTooltip({
    title: "name",
    fields: ["category", "x", "y", "size"]
  })}
/>`}
      >
        <BubbleChart
          data={bubbleData}
          width={600}
          height={400}
          xLabel="Revenue"
          yLabel="Growth"
          sizeBy="size"
          colorBy="category"
          tooltip={MultiLineTooltip({
            title: "name",
            fields: ["category", "x", "y", "size"]
          })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{x, y, size, ...}\` objects
- \`xLabel\`, \`yLabel\`: Axis labels
- \`sizeBy\`: Field or function for bubble size (required)
- \`colorBy\`: Field or function for bubble color
- \`sizeScale\`: \`[min, max]\` radius range (default: [3, 20])
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass \`pointStyle\` or other \`XYFrame\` props for styling control.

---
`}
      />

      <ExampleContainer
        title="Heatmap"
        code={`import { Heatmap, MultiLineTooltip } from "semiotic"

const heatmapData = []
for (let x = 0; x < 7; x++) {
  for (let y = 0; y < 5; y++) {
    heatmapData.push({ x, y, value: Math.random() * 100 })
  }
}

<Heatmap
  data={heatmapData}
  width={600}
  height={400}
  xLabel="X Axis"
  yLabel="Y Axis"
  colorScheme="blues"
  tooltip={MultiLineTooltip({ fields: ["x", "y", "value"] })}
/>`}
      >
        <Heatmap
          data={heatmapData}
          width={600}
          height={400}
          xLabel="X Axis"
          yLabel="Y Axis"
          colorScheme="blues"
          tooltip={MultiLineTooltip({ fields: ["x", "y", "value"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{x, y, value, ...}\` objects
- \`xLabel\`, \`yLabel\`: Axis labels
- \`colorScheme\`: Color scheme name ("blues", "reds", "greens", etc.)
- \`showValues\`: Display value text in cells (default: false)
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass \`summaryType\` settings or other \`XYFrame\` props for customization.

---

## Common Patterns

### Custom Colors

\`\`\`jsx
<Scatterplot
  colorBy={(d) => d.value > 50 ? "#ff0000" : "#0000ff"}
/>
\`\`\`

### Custom Sizes

\`\`\`jsx
<Scatterplot
  sizeBy={(d) => Math.sqrt(d.importance) * 5}
/>
\`\`\`

### Date Axes

\`\`\`jsx
import { scaleTime } from "d3-scale"
import { timeFormat } from "d3-time-format"

<LineChart
  data={timeSeriesData}
  xAccessor={(d) => new Date(d.date)}
  axes={[
    { orient: "bottom", tickFormat: timeFormat("%b %Y") }
  ]}
/>
\`\`\`

### Custom Point Marks

\`\`\`jsx
<Scatterplot
  customPointMark={({ d, i }) => (
    <rect
      x={-5}
      y={-5}
      width={10}
      height={10}
      fill={d.highlighted ? "red" : "blue"}
    />
  )}
/>
\`\`\`

## TypeScript Support

\`\`\`typescript
import type { ScatterplotProps, LineChartProps } from "semiotic"

const props: ScatterplotProps = {
  data: myData,
  xLabel: "X",
  yLabel: "Y",
  colorBy: "category"
}
\`\`\`

## Next Steps

- [Ordinal Chart Components →](/guides/ordinal-charts-hoc) for categorical data
- [Network Chart Components →](/guides/network-charts-hoc) for relationships
- [Tooltips Guide →](/guides/tooltips) for advanced tooltip customization
- [XYFrame API →](/api/xyframe) for complete Frame control
`}
      />
    </div>
  )
}
