# Semiotic Examples

Copy-paste-ready examples for every data shape.

---

## Flat Array — XY Charts

### LineChart (single line)

```jsx
import { LineChart } from "semiotic/ai"

const data = [
  { month: "Jan", revenue: 4200 },
  { month: "Feb", revenue: 5800 },
  { month: "Mar", revenue: 5200 },
  { month: "Apr", revenue: 7100 },
  { month: "May", revenue: 6800 }
]

<LineChart
  data={data}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  xLabel="Month"
  yLabel="Revenue ($)"
/>
```

Key props: `xAccessor`, `yAccessor`, `curve`, `showPoints`, `fillArea`

### LineChart (multi-line)

```jsx
import { LineChart } from "semiotic/ai"

const data = [
  { quarter: 1, sales: 120, region: "East" },
  { quarter: 2, sales: 180, region: "East" },
  { quarter: 3, sales: 150, region: "East" },
  { quarter: 1, sales: 90, region: "West" },
  { quarter: 2, sales: 140, region: "West" },
  { quarter: 3, sales: 200, region: "West" }
]

<LineChart
  data={data}
  xAccessor="quarter"
  yAccessor="sales"
  lineBy="region"
  colorBy="region"
  showLegend
/>
```

Key props: `lineBy` groups flat array into separate lines, `colorBy` colors them

### Scatterplot

```jsx
import { Scatterplot } from "semiotic/ai"

const data = [
  { sepalLength: 5.1, petalLength: 1.4, species: "setosa" },
  { sepalLength: 7.0, petalLength: 4.7, species: "versicolor" },
  { sepalLength: 6.3, petalLength: 6.0, species: "virginica" },
  { sepalLength: 4.9, petalLength: 1.5, species: "setosa" },
  { sepalLength: 6.4, petalLength: 4.5, species: "versicolor" }
]

<Scatterplot
  data={data}
  xAccessor="sepalLength"
  yAccessor="petalLength"
  colorBy="species"
  xLabel="Sepal Length"
  yLabel="Petal Length"
/>
```

Key props: `colorBy`, `sizeBy`, `pointRadius`, `pointOpacity`

### Heatmap

```jsx
import { Heatmap } from "semiotic/ai"

const data = [
  { day: "Mon", hour: "9am", count: 12 },
  { day: "Mon", hour: "12pm", count: 45 },
  { day: "Mon", hour: "3pm", count: 32 },
  { day: "Tue", hour: "9am", count: 18 },
  { day: "Tue", hour: "12pm", count: 52 },
  { day: "Tue", hour: "3pm", count: 28 },
  { day: "Wed", hour: "9am", count: 15 },
  { day: "Wed", hour: "12pm", count: 48 },
  { day: "Wed", hour: "3pm", count: 35 }
]

<Heatmap
  data={data}
  xAccessor="hour"
  yAccessor="day"
  valueAccessor="count"
  colorScheme="viridis"
  showValues
/>
```

Key props: `valueAccessor`, `colorScheme` ("blues"|"reds"|"greens"|"viridis"), `showValues`

---

## Flat Array — Ordinal Charts

### BarChart

```jsx
import { BarChart } from "semiotic/ai"

const data = [
  { region: "North", total: 4200 },
  { region: "South", total: 3800 },
  { region: "East", total: 5100 },
  { region: "West", total: 4600 }
]

<BarChart
  data={data}
  categoryAccessor="region"
  valueAccessor="total"
  sort="desc"
  colorBy="region"
  categoryLabel="Region"
  valueLabel="Sales ($)"
/>
```

Key props: `categoryAccessor`, `valueAccessor`, `orientation`, `sort`

### StackedBarChart

```jsx
import { StackedBarChart } from "semiotic/ai"

const data = [
  { question: "Q1", response: "Agree", count: 45 },
  { question: "Q1", response: "Neutral", count: 30 },
  { question: "Q1", response: "Disagree", count: 25 },
  { question: "Q2", response: "Agree", count: 60 },
  { question: "Q2", response: "Neutral", count: 20 },
  { question: "Q2", response: "Disagree", count: 20 },
  { question: "Q3", response: "Agree", count: 35 },
  { question: "Q3", response: "Neutral", count: 40 },
  { question: "Q3", response: "Disagree", count: 25 }
]

<StackedBarChart
  data={data}
  categoryAccessor="question"
  stackBy="response"
  valueAccessor="count"
  normalize
/>
```

Key props: **`stackBy`** (required), `normalize` for 100% stacked bars

### GroupedBarChart

```jsx
import { GroupedBarChart } from "semiotic/ai"

const data = [
  { year: "2022", product: "Widget", revenue: 120 },
  { year: "2022", product: "Gadget", revenue: 95 },
  { year: "2023", product: "Widget", revenue: 150 },
  { year: "2023", product: "Gadget", revenue: 130 },
  { year: "2024", product: "Widget", revenue: 180 },
  { year: "2024", product: "Gadget", revenue: 165 }
]

<GroupedBarChart
  data={data}
  categoryAccessor="year"
  groupBy="product"
  valueAccessor="revenue"
  valueLabel="Revenue ($K)"
/>
```

Key props: **`groupBy`** (required), side-by-side bars within each category

---

## Hierarchical Data — Single Root Object

### TreeDiagram

```jsx
import { TreeDiagram } from "semiotic/ai"

const orgChart = {
  name: "CEO",
  children: [
    {
      name: "CTO",
      children: [
        { name: "Engineering Lead" },
        { name: "Data Lead" }
      ]
    },
    {
      name: "CFO",
      children: [
        { name: "Accounting" },
        { name: "Finance" }
      ]
    }
  ]
}

<TreeDiagram
  data={orgChart}
  childrenAccessor="children"
  nodeIdAccessor="name"
  orientation="horizontal"
  colorByDepth
/>
```

Key props: `data` is a single root object, `childrenAccessor`, `layout`, `orientation`

### Treemap

```jsx
import { Treemap } from "semiotic/ai"

const diskUsage = {
  name: "root",
  children: [
    {
      name: "src",
      children: [
        { name: "components", value: 450 },
        { name: "utils", value: 120 },
        { name: "styles", value: 80 }
      ]
    },
    {
      name: "assets",
      children: [
        { name: "images", value: 800 },
        { name: "fonts", value: 200 }
      ]
    },
    { name: "config", value: 50 }
  ]
}

<Treemap
  data={diskUsage}
  childrenAccessor="children"
  valueAccessor="value"
  nodeIdAccessor="name"
  colorByDepth
/>
```

Key props: `valueAccessor` controls rectangle size, `colorByDepth`

### CirclePack

```jsx
import { CirclePack } from "semiotic/ai"

const taxonomy = {
  name: "Life",
  children: [
    {
      name: "Animals",
      children: [
        { name: "Mammals", count: 5500 },
        { name: "Birds", count: 10000 },
        { name: "Reptiles", count: 10700 }
      ]
    },
    {
      name: "Plants",
      children: [
        { name: "Flowering", count: 300000 },
        { name: "Ferns", count: 10500 }
      ]
    }
  ]
}

<CirclePack
  data={taxonomy}
  childrenAccessor="children"
  valueAccessor="count"
  nodeIdAccessor="name"
  colorByDepth
/>
```

Key props: `valueAccessor` controls circle size, nested circles for hierarchy

---

## Network Data — Nodes + Edges Arrays

### ForceDirectedGraph

```jsx
import { ForceDirectedGraph } from "semiotic/ai"

const nodes = [
  { id: "Alice", team: "Engineering" },
  { id: "Bob", team: "Engineering" },
  { id: "Carol", team: "Design" },
  { id: "Dave", team: "Design" },
  { id: "Eve", team: "Product" }
]

const edges = [
  { source: "Alice", target: "Bob" },
  { source: "Alice", target: "Carol" },
  { source: "Bob", target: "Dave" },
  { source: "Carol", target: "Dave" },
  { source: "Eve", target: "Alice" },
  { source: "Eve", target: "Carol" }
]

<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  colorBy="team"
  nodeSize={10}
  showLabels
/>
```

Key props: **`nodes`** and **`edges`** (both required), `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`

### SankeyDiagram

```jsx
import { SankeyDiagram } from "semiotic/ai"

const edges = [
  { source: "Salary", target: "Budget", value: 5000 },
  { source: "Freelance", target: "Budget", value: 2000 },
  { source: "Budget", target: "Rent", value: 2500 },
  { source: "Budget", target: "Food", value: 1200 },
  { source: "Budget", target: "Transport", value: 800 },
  { source: "Budget", target: "Savings", value: 2500 }
]

<SankeyDiagram
  edges={edges}
  sourceAccessor="source"
  targetAccessor="target"
  valueAccessor="value"
/>
```

Key props: **`edges`** (required, nodes inferred), `valueAccessor` controls band width

### ChordDiagram

```jsx
import { ChordDiagram } from "semiotic/ai"

const edges = [
  { source: "US", target: "EU", value: 500 },
  { source: "US", target: "Asia", value: 300 },
  { source: "EU", target: "US", value: 400 },
  { source: "EU", target: "Asia", value: 200 },
  { source: "Asia", target: "US", value: 350 },
  { source: "Asia", target: "EU", value: 250 }
]

<ChordDiagram
  edges={edges}
  sourceAccessor="source"
  targetAccessor="target"
  valueAccessor="value"
/>
```

Key props: **`edges`** (required), shows bidirectional relationships in a circle
