import React from "react"
import MarkdownText from "../MarkdownText"
import {
  BarChart,
  StackedBarChart,
  SwarmPlot,
  BoxPlot,
  DotPlot,
  Tooltip,
  MultiLineTooltip
} from "semiotic"

// Sample data
const barData = [
  { category: "Product A", value: 45 },
  { category: "Product B", value: 38 },
  { category: "Product C", value: 52 },
  { category: "Product D", value: 29 },
  { category: "Product E", value: 61 }
]

const stackedBarData = [
  { category: "Q1", subcategory: "Sales", value: 45 },
  { category: "Q1", subcategory: "Marketing", value: 30 },
  { category: "Q1", subcategory: "R&D", value: 25 },
  { category: "Q2", subcategory: "Sales", value: 52 },
  { category: "Q2", subcategory: "Marketing", value: 35 },
  { category: "Q2", subcategory: "R&D", value: 28 },
  { category: "Q3", subcategory: "Sales", value: 48 },
  { category: "Q3", subcategory: "Marketing", value: 32 },
  { category: "Q3", subcategory: "R&D", value: 30 },
  { category: "Q4", subcategory: "Sales", value: 58 },
  { category: "Q4", subcategory: "Marketing", value: 40 },
  { category: "Q4", subcategory: "R&D", value: 35 }
]

const swarmData = [
  { category: "Group A", value: 5 },
  { category: "Group A", value: 8 },
  { category: "Group A", value: 3 },
  { category: "Group A", value: 12 },
  { category: "Group A", value: 7 },
  { category: "Group A", value: 9 },
  { category: "Group B", value: 15 },
  { category: "Group B", value: 18 },
  { category: "Group B", value: 13 },
  { category: "Group B", value: 22 },
  { category: "Group B", value: 17 },
  { category: "Group B", value: 20 },
  { category: "Group C", value: 25 },
  { category: "Group C", value: 28 },
  { category: "Group C", value: 23 },
  { category: "Group C", value: 32 },
  { category: "Group C", value: 27 },
  { category: "Group C", value: 30 }
]

const boxPlotData = [
  { category: "Dataset A", value: 5 },
  { category: "Dataset A", value: 8 },
  { category: "Dataset A", value: 12 },
  { category: "Dataset A", value: 15 },
  { category: "Dataset A", value: 18 },
  { category: "Dataset A", value: 22 },
  { category: "Dataset A", value: 25 },
  { category: "Dataset A", value: 7 },
  { category: "Dataset A", value: 10 },
  { category: "Dataset A", value: 13 },
  { category: "Dataset B", value: 10 },
  { category: "Dataset B", value: 15 },
  { category: "Dataset B", value: 20 },
  { category: "Dataset B", value: 25 },
  { category: "Dataset B", value: 30 },
  { category: "Dataset B", value: 35 },
  { category: "Dataset B", value: 40 },
  { category: "Dataset B", value: 12 },
  { category: "Dataset B", value: 18 },
  { category: "Dataset B", value: 28 }
]

const dotPlotData = [
  { category: "Metric A", value: 45, comparison: 50 },
  { category: "Metric B", value: 38, comparison: 35 },
  { category: "Metric C", value: 52, comparison: 48 },
  { category: "Metric D", value: 29, comparison: 32 },
  { category: "Metric E", value: 61, comparison: 58 }
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

export default function OrdinalChartsHOC() {
  return (
    <div>
      <h1>Ordinal Chart Components</h1>

      <MarkdownText
        text={`
Higher-order ordinal chart components provide simplified APIs for categorical data visualization based on \`OrdinalFrame\`. These components handle the complexity of ordinal data layout while providing intuitive prop names.

## Benefits

- **Intuitive Props**: Use \`categoryLabel\`, \`valueLabel\`, \`stackBy\` instead of Frame internals
- **Smart Defaults**: Pre-configured axes, margins, and piece types
- **Built-in Tooltips**: Simple \`tooltip\` prop with Tooltip utilities
- **Flexible Orientation**: Vertical or horizontal layouts
- **Type Safety**: Full TypeScript support

---
`}
      />

      <ExampleContainer
        title="BarChart"
        code={`import { BarChart } from "semiotic"

const barData = [
  { category: "Product A", value: 45 },
  { category: "Product B", value: 38 },
  { category: "Product C", value: 52 }
]

<BarChart
  data={barData}
  width={600}
  height={400}
  categoryLabel="Products"
  valueLabel="Sales"
/>`}
      >
        <BarChart
          data={barData}
          width={600}
          height={400}
          categoryLabel="Products"
          valueLabel="Sales"
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{category, value, ...}\` objects
- \`categoryLabel\`, \`valueLabel\`: Axis labels
- \`orientation\`: "vertical" (default) or "horizontal"
- \`colorBy\`: Field or function for bar colors
- \`sort\`: Sort bars (boolean, "asc", "desc", or function)
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass any \`OrdinalFrame\` prop for complete control. [See OrdinalFrame API →](/api/ordinalframe)

---
`}
      />

      <ExampleContainer
        title="StackedBarChart"
        code={`import { StackedBarChart } from "semiotic"

const stackedBarData = [
  { category: "Q1", subcategory: "Sales", value: 45 },
  { category: "Q1", subcategory: "Marketing", value: 30 },
  { category: "Q2", subcategory: "Sales", value: 52 },
  { category: "Q2", subcategory: "Marketing", value: 35 }
]

<StackedBarChart
  data={stackedBarData}
  width={600}
  height={400}
  categoryLabel="Quarter"
  valueLabel="Budget ($M)"
  stackBy="subcategory"
/>`}
      >
        <StackedBarChart
          data={stackedBarData}
          width={600}
          height={400}
          categoryLabel="Quarter"
          valueLabel="Budget ($M)"
          stackBy="subcategory"
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{category, subcategory, value, ...}\` objects
- \`categoryLabel\`, \`valueLabel\`: Axis labels
- \`stackBy\`: Field for subcategories (required)
- \`normalize\`: 100% stacked bars (default: false)
- \`orientation\`: "vertical" (default) or "horizontal"
- \`colorScheme\`: Color scheme for subcategories
- \`tooltip\`: Tooltip configuration

**Advanced:**
Pass \`type\` settings or other \`OrdinalFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="SwarmPlot"
        code={`import { SwarmPlot, Tooltip } from "semiotic"

const swarmData = [
  { category: "Group A", value: 5 },
  { category: "Group A", value: 8 },
  { category: "Group B", value: 15 },
  { category: "Group B", value: 18 }
]

<SwarmPlot
  data={swarmData}
  width={600}
  height={400}
  categoryLabel="Groups"
  valueLabel="Measurements"
  tooltip={Tooltip({ title: "category", fields: ["value"] })}
/>`}
      >
        <SwarmPlot
          data={swarmData}
          width={600}
          height={400}
          categoryLabel="Groups"
          valueLabel="Measurements"
          tooltip={Tooltip({ title: "category", fields: ["value"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{category, value, ...}\` objects
- \`categoryLabel\`, \`valueLabel\`: Axis labels
- \`colorBy\`: Field or function for point colors
- \`sizeBy\`: Field or function for point sizes
- \`orientation\`: "vertical" (default) or "horizontal"
- \`tooltip\`: Tooltip configuration

**Use Case:**
Swarm plots (beeswarm) show distribution of values within categories using force simulation to prevent overlap.

**Advanced:**
Pass \`type\` settings or other \`OrdinalFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="BoxPlot"
        code={`import { BoxPlot, Tooltip } from "semiotic"

const boxPlotData = [
  { category: "Dataset A", value: 5 },
  { category: "Dataset A", value: 8 },
  { category: "Dataset A", value: 12 },
  { category: "Dataset B", value: 15 },
  { category: "Dataset B", value: 20 },
  { category: "Dataset B", value: 25 }
]

<BoxPlot
  data={boxPlotData}
  width={600}
  height={400}
  categoryLabel="Datasets"
  valueLabel="Distribution"
  tooltip={Tooltip({ title: "category", fields: ["value"] })}
/>`}
      >
        <BoxPlot
          data={boxPlotData}
          width={600}
          height={400}
          categoryLabel="Datasets"
          valueLabel="Distribution"
          tooltip={Tooltip({ title: "category", fields: ["value"] })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{category, value, ...}\` objects (raw data points)
- \`categoryLabel\`, \`valueLabel\`: Axis labels
- \`showOutliers\`: Display outlier points (default: true)
- \`orientation\`: "vertical" (default) or "horizontal"
- \`colorBy\`: Field or function for colors
- \`tooltip\`: Tooltip configuration

**Use Case:**
Box plots show statistical distribution (quartiles, median, outliers) for each category.

**Advanced:**
Pass \`summaryType\` settings or other \`OrdinalFrame\` props for customization.

---
`}
      />

      <ExampleContainer
        title="DotPlot"
        code={`import { DotPlot, MultiLineTooltip } from "semiotic"

const dotPlotData = [
  { category: "Metric A", value: 45, comparison: 50 },
  { category: "Metric B", value: 38, comparison: 35 },
  { category: "Metric C", value: 52, comparison: 48 }
]

<DotPlot
  data={dotPlotData}
  width={600}
  height={400}
  categoryLabel="Metrics"
  valueLabel="Score"
  tooltip={MultiLineTooltip({
    title: "category",
    fields: ["value", "comparison"]
  })}
/>`}
      >
        <DotPlot
          data={dotPlotData}
          width={600}
          height={400}
          categoryLabel="Metrics"
          valueLabel="Score"
          tooltip={MultiLineTooltip({
            title: "category",
            fields: ["value", "comparison"]
          })}
        />
      </ExampleContainer>

      <MarkdownText
        text={`
**Key Props:**
- \`data\`: Array of \`{category, value, ...}\` objects
- \`categoryLabel\`, \`valueLabel\`: Axis labels
- \`rangeBy\`: Field for second value (creates range connectors/dumbbells)
- \`colorBy\`: Field or function for dot colors
- \`orientation\`: "vertical" (default) or "horizontal"
- \`tooltip\`: Tooltip configuration

**Use Case:**
Dot plots (Cleveland plots) are excellent for comparing values across categories. Add \`rangeBy\` to show ranges.

**Advanced:**
Pass \`type\` settings or other \`OrdinalFrame\` props for customization.

---

## Common Patterns

### Horizontal Bars

\`\`\`jsx
<BarChart
  data={barData}
  orientation="horizontal"
  categoryLabel="Products"
  valueLabel="Sales"
/>
\`\`\`

### Custom Colors

\`\`\`jsx
<BarChart
  data={barData}
  colorBy={(d) => d.value > 50 ? "#00ff00" : "#ff0000"}
/>
\`\`\`

### Sorted Bars

\`\`\`jsx
<BarChart
  data={barData}
  sort="desc"  // or "asc" or custom function
/>
\`\`\`

### Normalized Stacked Bars

\`\`\`jsx
<StackedBarChart
  data={stackedBarData}
  stackBy="subcategory"
  normalize={true}  // 100% stacked
/>
\`\`\`

### Custom Bar Styling

\`\`\`jsx
<BarChart
  data={barData}
  style={(d) => ({
    fill: d.value > 50 ? "#ff0000" : "#0000ff",
    stroke: "white",
    strokeWidth: 2
  })}
/>
\`\`\`

### Category Labels

\`\`\`jsx
<BarChart
  data={barData}
  oLabel={true}  // Show category labels
/>
\`\`\`

## TypeScript Support

\`\`\`typescript
import type {
  BarChartProps,
  StackedBarChartProps,
  SwarmPlotProps
} from "semiotic"

const props: BarChartProps = {
  data: myData,
  categoryLabel: "Categories",
  valueLabel: "Values"
}
\`\`\`

## Next Steps

- [XY Chart Components →](/guides/xy-charts-hoc) for continuous data
- [Network Chart Components →](/guides/network-charts-hoc) for relationships
- [Tooltips Guide →](/guides/tooltips) for advanced tooltip customization
- [OrdinalFrame API →](/api/ordinalframe) for complete Frame control
`}
      />
    </div>
  )
}
