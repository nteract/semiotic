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

### Heatmap with Gradient Legend

```jsx
import { Heatmap } from "semiotic/ai"

<Heatmap
  data={data}
  xAccessor="hour"
  yAccessor="day"
  valueAccessor="count"
  colorScheme="viridis"
  showLegend
  legendPosition="right"
/>
```

Key props: `showLegend` enables gradient legend, `legendPosition` ("right"|"left"|"top"|"bottom")

### AreaChart

```jsx
import { AreaChart } from "semiotic/ai"

const data = [
  { month: 1, revenue: 4200 },
  { month: 2, revenue: 5800 },
  { month: 3, revenue: 5200 },
  { month: 4, revenue: 7100 },
  { month: 5, revenue: 6800 },
  { month: 6, revenue: 7500 }
]

<AreaChart
  data={data}
  xAccessor="month"
  yAccessor="revenue"
  gradientFill={{
    stops: [
      { offset: 0, opacity: 0.8 },
      { offset: 1, opacity: 0.05 }
    ]
  }}
  xLabel="Month"
  yLabel="Revenue ($)"
/>
```

Key props: `areaBy` (group into multiple areas), `y0Accessor` (band/ribbon), `gradientFill`, `areaOpacity` (0.7)

### AreaChart — Percentile Band with Main Line

**IMPORTANT**: `showLine` on AreaChart only draws the TOP edge of the area (the `yAccessor` line). To render a separate main line (e.g., p50 median), you must layer two charts.

```jsx
import { AreaChart, LineChart } from "semiotic/ai"

const data = [
  { x: 0, p5: 10, p50: 25, p95: 45 },
  { x: 1, p5: 12, p50: 28, p95: 50 },
  { x: 2, p5: 11, p50: 30, p95: 52 },
  { x: 3, p5: 14, p50: 32, p95: 55 },
  { x: 4, p5: 13, p50: 35, p95: 58 },
  { x: 5, p5: 15, p50: 37, p95: 62 },
]

// Band (p5–p95) + main line (p50): two separate charts layered
<div style={{ position: "relative" }}>
  <AreaChart
    data={data}
    xAccessor="x"
    yAccessor="p95"
    y0Accessor="p5"
    showLine={false}
    areaOpacity={0.3}
    gradientFill={{
      stops: [
        { offset: 0, opacity: 0.8 },
        { offset: 1, opacity: 0.05 }
      ]
    }}
    width={600}
    height={400}
  />
  <div style={{ position: "absolute", top: 0, left: 0 }}>
    <LineChart
      data={data}
      xAccessor="x"
      yAccessor="p50"
      lineWidth={2}
      width={600}
      height={400}
    />
  </div>
</div>
```

Key props: `y0Accessor` defines band bottom, `yAccessor` defines band top, `showLine={false}` hides the top edge stroke. Layer a `LineChart` on top for the main metric.

### DifferenceChart

```jsx
import { DifferenceChart } from "semiotic/ai"

const tempData = [
  { month: 1,  actual: 38, normal: 32 },
  { month: 2,  actual: 41, normal: 36 },
  { month: 3,  actual: 45, normal: 48 },
  { month: 4,  actual: 55, normal: 57 },
  { month: 5,  actual: 61, normal: 66 },
  { month: 6,  actual: 70, normal: 75 },
  { month: 7,  actual: 79, normal: 79 },
  { month: 8,  actual: 81, normal: 78 },
  { month: 9,  actual: 74, normal: 70 },
  { month: 10, actual: 64, normal: 58 },
  { month: 11, actual: 52, normal: 47 },
  { month: 12, actual: 42, normal: 37 }
]

<DifferenceChart
  data={tempData}
  xAccessor="month"
  seriesAAccessor="actual"
  seriesBAccessor="normal"
  seriesALabel="Actual"
  seriesBLabel="Normal"
  xLabel="Month"
  yLabel="°F"
/>
```

Fills the region between two series with a color that switches based on which series is higher at each x — `seriesAColor` where A > B, `seriesBColor` where B > A. Crossover x-values are linearly interpolated so adjacent segments meet at zero-width vertices (no jagged seams). Classic uses: temperature anomaly, forecast vs. actual, budget variance, any A/B comparison.

Key props: `seriesALabel` / `seriesBLabel` (legend + tooltip), `seriesAColor` / `seriesBColor` (defaults to `var(--semiotic-danger)` / `var(--semiotic-info)`), `showLines` (default `true` — draws both series on top of the fill), `areaOpacity` (0.6), `gradientFill` (same shape as AreaChart), `windowSize` (max raw rows in push buffer; FIFO eviction). Push API: `ref.current.push({ x, a, b })` — accessor outputs coerce through a `toNumber` helper so `Date` (time series) and numeric strings (CSV/JSON) work transparently.

### BumpChart

```jsx
import { BumpChart } from "semiotic/ai"

const data = [
  { quarter: "Q1", team: "North", sales: 420 },
  { quarter: "Q1", team: "South", sales: 380 },
  { quarter: "Q1", team: "East",  sales: 510 },
  { quarter: "Q1", team: "West",  sales: 290 },
  { quarter: "Q2", team: "North", sales: 460 },
  { quarter: "Q2", team: "South", sales: 500 },
  { quarter: "Q2", team: "East",  sales: 480 },
  { quarter: "Q2", team: "West",  sales: 350 },
  { quarter: "Q3", team: "North", sales: 610 },
  { quarter: "Q3", team: "South", sales: 470 },
  { quarter: "Q3", team: "East",  sales: 520 },
  { quarter: "Q3", team: "West",  sales: 540 }
]

<BumpChart
  data={data}
  xAccessor="quarter"
  yAccessor="sales"
  lineBy="team"
  highlightTop={2}
  xLabel="Quarter"
/>
```

Ranks every series within each x-column and connects each series' rank across columns — the classic "who's leading over time" chart. `yAccessor` is the magnitude used to rank (highest value = rank 1 by default; use `rankDirection="ascending"` when lower is better). `highlightTop` colors only the N best series by mean rank and greys the rest via `neutralColor`. Set `ribbon={true}` to encode the raw magnitude as true perpendicular-offset ribbon width instead of fixed-width lines — line and ribbon share the same centerline geometry, so `animate` tweens only the width. Endpoint labels show by default (`showLabels`).

### StackedAreaChart

```jsx
import { StackedAreaChart } from "semiotic/ai"

// IMPORTANT: Use a flat array with an areaBy field for grouping.
// Do NOT use lineBy or lineDataAccessor — those are LineChart props.
const data = [
  { month: 1, value: 20, category: "Product" },
  { month: 2, value: 25, category: "Product" },
  { month: 3, value: 30, category: "Product" },
  { month: 1, value: 15, category: "Service" },
  { month: 2, value: 12, category: "Service" },
  { month: 3, value: 18, category: "Service" },
  { month: 1, value: 8, category: "Consulting" },
  { month: 2, value: 10, category: "Consulting" },
  { month: 3, value: 7, category: "Consulting" }
]

<StackedAreaChart
  data={data}
  xAccessor="month"
  yAccessor="value"
  areaBy="category"
  colorBy="category"
  showLegend
/>
```

Key props: **`areaBy`** (required — groups flat data into stacked areas), `colorBy`, `normalize` (100% stacked). Data must be a flat array, not pre-grouped objects.

### ConnectedScatterplot

```jsx
import { ConnectedScatterplot } from "semiotic/ai"

const data = [
  { year: 2018, unemployment: 3.9, inflation: 2.4 },
  { year: 2019, unemployment: 3.7, inflation: 1.8 },
  { year: 2020, unemployment: 8.1, inflation: 1.2 },
  { year: 2021, unemployment: 5.4, inflation: 4.7 },
  { year: 2022, unemployment: 3.6, inflation: 8.0 },
  { year: 2023, unemployment: 3.6, inflation: 4.1 }
]

<ConnectedScatterplot
  data={data}
  xAccessor="unemployment"
  yAccessor="inflation"
  orderAccessor="year"
  xLabel="Unemployment Rate (%)"
  yLabel="Inflation Rate (%)"
/>
```

Key props: `orderAccessor` sequences points along the path, Viridis gradient from start→end

### TemporalHistogram

```jsx
import { TemporalHistogram } from "semiotic/ai"

// One row per event; the chart bins events into `binSize` time buckets.
const events = [
  { time: 1700000000000, value: 1, category: "errors" },
  { time: 1700000005000, value: 1, category: "warnings" },
  { time: 1700000007000, value: 1, category: "errors" },
  { time: 1700000020000, value: 1, category: "info" },
  { time: 1700000022000, value: 1, category: "info" },
  { time: 1700000040000, value: 1, category: "errors" },
  { time: 1700000045000, value: 1, category: "warnings" }
]

<TemporalHistogram
  data={events}
  binSize={15000}
  categoryAccessor="category"
  colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
  enableHover
/>
```

Static-data sibling of `RealtimeHistogram` — accepts a bounded `data` array instead of a push-mode ref. Same props minus `windowSize` / `windowMode`. Use for backfilled or historical temporal histograms where the time range is fixed; reach for `RealtimeHistogram` when events arrive over time and you want a sliding window.

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

### Histogram

```jsx
import { Histogram } from "semiotic/ai"

const data = [
  { category: "Group A", value: 12 },
  { category: "Group A", value: 15 },
  { category: "Group A", value: 18 },
  { category: "Group A", value: 22 },
  { category: "Group A", value: 25 },
  { category: "Group B", value: 30 },
  { category: "Group B", value: 35 },
  { category: "Group B", value: 28 },
  { category: "Group B", value: 42 },
  { category: "Group B", value: 38 }
]

<Histogram
  data={data}
  categoryAccessor="category"
  valueAccessor="value"
  bins={10}
  colorBy="category"
  valueLabel="Frequency"
/>
```

Key props: `bins` (default 25), `relative` (normalize per-category)

### ViolinPlot

```jsx
import { ViolinPlot } from "semiotic/ai"

const data = [
  { department: "Engineering", salary: 95000 },
  { department: "Engineering", salary: 110000 },
  { department: "Engineering", salary: 125000 },
  { department: "Engineering", salary: 140000 },
  { department: "Marketing", salary: 65000 },
  { department: "Marketing", salary: 75000 },
  { department: "Marketing", salary: 85000 },
  { department: "Marketing", salary: 95000 }
]

<ViolinPlot
  data={data}
  categoryAccessor="department"
  valueAccessor="salary"
  colorBy="department"
  showIQR
  categoryLabel="Department"
  valueLabel="Salary ($)"
/>
```

Key props: `bins`, `curve` (default "catmullRom"), `showIQR` (default true)

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

### OrbitDiagram

```jsx
import { OrbitDiagram } from "semiotic/ai"

const pipeline = {
  name: "ML Pipeline",
  children: [
    {
      name: "Data Ingestion",
      children: [
        { name: "API Feed" },
        { name: "CSV Upload" },
        { name: "DB Connector" }
      ]
    },
    {
      name: "Processing",
      children: [
        { name: "Clean" },
        { name: "Feature Eng" },
        { name: "Normalize" }
      ]
    },
    {
      name: "Model",
      children: [
        { name: "Train" },
        { name: "Evaluate" },
        { name: "Deploy" }
      ]
    }
  ]
}

<OrbitDiagram
  data={pipeline}
  childrenAccessor="children"
  nodeIdAccessor="name"
  orbitMode="solar"
  showLabels
  colorByDepth
/>
```

Key props: `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed`, `animated`, `showRings`

---

## Network Data — Nodes + Edges Arrays

### ForceDirectedGraph

```jsx
import { ForceDirectedGraph } from "semiotic/ai"

const nodes = [
  { id: "Alice", team: "Engineering", influence: 10 },
  { id: "Bob", team: "Engineering", influence: 6 },
  { id: "Carol", team: "Design", influence: 8 },
  { id: "Dave", team: "Design", influence: 4 },
  { id: "Eve", team: "Product", influence: 12 }
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
  nodeSize="influence"
  nodeSizeRange={[5, 25]}
  showLabels
  showLegend
  edgeOpacity={0.4}
  tooltip={(d) => <div><strong>{d.data.id}</strong><br/>Team: {d.data.team}</div>}
/>
```

Key props: **`nodes`** and **`edges`** (both required), `nodeIDAccessor` (default "id"), `sourceAccessor` (default "source"), `targetAccessor` (default "target"), `colorBy`, `nodeSize` (number, string field name, or function), `nodeSizeRange`, `showLabels`, `showLegend`, `tooltip`

**Note**: Always use `ForceDirectedGraph` (not `StreamNetworkFrame`) unless you need sophisticated control it doesn't expose. `StreamNetworkFrame` is a low-level escape hatch whose callbacks receive internal `RealtimeNode` wrappers — access your data via `.data` (e.g., `nodeStyle={(d) => ({ fill: d.data?.color })}`). HOC components like `ForceDirectedGraph` handle this automatically.

### ForceDirectedGraph with custom click/hover

```jsx
import { useState } from "react"
import { ForceDirectedGraph } from "semiotic/ai"

const [selected, setSelected] = useState(null)

<ForceDirectedGraph
  nodes={nodes}
  edges={edges}
  colorBy="team"
  nodeSize="influence"
  nodeSizeRange={[5, 25]}
  showLabels
  width={800}
  height={600}
  frameProps={{
    customClickBehavior: (d) => {
      // d is { type: "node"|"edge", data: <your raw node/edge>, x, y } or null
      if (d?.type === "node") setSelected(d.data)
    },
    customHoverBehavior: (d) => {
      // same shape as click — d.data is your original object
      if (d?.type === "node") console.log("Hovering:", d.data.id)
    },
    background: "#1a1a2e",
  }}
/>
```

Key props: `frameProps` passes through to the underlying `StreamNetworkFrame` for advanced control (custom click/hover, background, annotations). Callback `d.data` is always your original node/edge object.

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

### ProcessSankey

```jsx
import { ProcessSankey } from "semiotic/ai"

const nodes = [
  { id: "Alice", category: "Person", xExtent: ["2026-01-06", "2026-01-06"] },
  { id: "Bob",   category: "Person", xExtent: ["2026-02-01", "2026-02-01"] },
  { id: "Eng",     category: "Team" },
  { id: "Release", category: "Milestone", xExtent: ["2026-04-15", "2026-05-30"] },
]

const edges = [
  { id: "alice-eng", source: "Alice", target: "Eng", value: 8,
    startTime: "2026-01-20", endTime: "2026-02-10" },
  { id: "bob-eng",   source: "Bob",   target: "Eng", value: 5,
    startTime: "2026-02-15", endTime: "2026-03-15" },
  { id: "eng-rel",   source: "Eng",   target: "Release", value: 13,
    startTime: "2026-04-15", endTime: "2026-05-15" },
]

<ProcessSankey
  nodes={nodes}
  edges={edges}
  domain={["2026-01-01", "2026-05-31"]}
  colorBy="category"
  showLegend
/>
```

Key props: **`edges`** with `startTime`/`endTime`, **`domain`** (required `[t0, t1]`); nodes optionally carry `xExtent: [start, end]` to bound the lane (`min(xExtent[0], earliestEdge)` to `max(xExtent[1], latestEdge)`). Use when flow events have timestamps; use SankeyDiagram for static total-flow snapshots.

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

---

## Realtime — Push API via Ref

### RealtimeLineChart

```jsx
import { useRef, useEffect } from "react"
import { RealtimeLineChart } from "semiotic/ai"

const chartRef = useRef()

// Push data — MUST include a time field
useEffect(() => {
  const interval = setInterval(() => {
    chartRef.current?.push({ time: Date.now(), value: Math.random() * 100 })
  }, 500)
  return () => clearInterval(interval)
}, [])

<RealtimeLineChart
  ref={chartRef}
  size={[600, 300]}
  timeAccessor="time"
  valueAccessor="value"
  windowSize={120}
  stroke="#76b7b2"
/>
```

Key props: `timeAccessor`, `valueAccessor`, `windowSize`, `stroke`, `strokeWidth`

### RealtimeHistogram

```jsx
import { useRef, useEffect } from "react"
import { RealtimeHistogram } from "semiotic/ai"

const chartRef = useRef()

// IMPORTANT: Include time field even though this shows a distribution — it's used for windowing
useEffect(() => {
  const interval = setInterval(() => {
    chartRef.current?.push({
      time: Date.now(),
      value: Math.random() * 1000
    })
  }, 200)
  return () => clearInterval(interval)
}, [])

<RealtimeHistogram
  ref={chartRef}
  size={[400, 250]}
  timeAccessor="time"
  valueAccessor="value"
  binSize={100}
/>
```

Key props: **`binSize`** (required), `timeAccessor` ("time"), `valueAccessor` ("value"). Without a time field in your data, the chart renders blank.

### RealtimeHeatmap

```jsx
import { useRef, useEffect } from "react"
import { RealtimeHeatmap } from "semiotic/ai"

const chartRef = useRef()

// IMPORTANT: Data must have fields matching timeAccessor and valueAccessor (defaults: "time" and "value")
useEffect(() => {
  const interval = setInterval(() => {
    chartRef.current?.push({
      time: Date.now(),
      value: Math.random() * 500
    })
  }, 100)
  return () => clearInterval(interval)
}, [])

<RealtimeHeatmap
  ref={chartRef}
  size={[400, 250]}
  timeAccessor="time"
  valueAccessor="value"
  heatmapXBins={30}
  heatmapYBins={10}
/>
```

Key props: `timeAccessor` ("time"), `valueAccessor` ("value"), `heatmapXBins`, `heatmapYBins`. Both accessors must match your data fields or the chart renders blank.

### Streaming Sankey with Particles (StreamNetworkFrame)

Use `StreamNetworkFrame` only when you need low-level control that HOC charts don't expose. For most cases, use `ForceDirectedGraph`, `SankeyDiagram`, or `ChordDiagram` instead.

```jsx
import { useRef, useEffect } from "react"
import { StreamNetworkFrame } from "semiotic"

const chartRef = useRef()

useEffect(() => {
  // Push individual edges — NOT a full snapshot.
  // Each push adds one edge event to the streaming sankey.
  chartRef.current.push({ source: "Salary", target: "Budget", value: 5000 })
  chartRef.current.push({ source: "Freelance", target: "Budget", value: 1500 })

  // Or batch multiple edges at once:
  chartRef.current.pushMany([
    { source: "Budget", target: "Rent", value: 2000 },
    { source: "Budget", target: "Food", value: 800 },
    { source: "Budget", target: "Savings", value: 1500 },
  ])
}, [])

<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  size={[800, 400]}
  edgeOpacity={0.4}
  showParticles={true}
  particleStyle={{
    radius: 2,
    opacity: 0.8,
    speedMultiplier: 1.5,
    maxPerEdge: 4,
    colorBy: "source"
  }}
/>
```

Key props: `chartType="sankey"`, `showParticles` (boolean — enables animated particles flowing along edges), `particleStyle` (`{ radius, opacity, speedMultiplier, maxPerEdge, colorBy }`), push via ref (`push` for single edge, `pushMany` for batch, `clear` to reset)

### Streaming any chart type via Stream Frames

The Realtime* HOCs are convenience wrappers. For streaming versions of scatter, stacked area, bar, or any other chart, use the corresponding Stream Frame with `runtimeMode="streaming"`:

```jsx
import { useRef } from "react"
import { StreamXYFrame } from "semiotic/xy"

const chartRef = useRef()

// Push data via ref — same push API as Realtime* HOCs
chartRef.current?.push({ time: Date.now(), size: 42, category: "A" })

<StreamXYFrame
  ref={chartRef}
  chartType="scatter"
  runtimeMode="streaming"
  xAccessor="time"
  yAccessor="size"
  colorAccessor="category"
  size={[600, 300]}
  margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
/>
```

Available Stream Frames: `StreamXYFrame` (line, area, stackedArea, scatter), `StreamOrdinalFrame` (bar, grouped bar), `StreamNetworkFrame` (sankey, force, chord)

---

## Server-Side Rendering

### renderToStaticSVG (Node.js)

```ts
// IMPORTANT: frameType is "xy" | "ordinal" | "network" — NOT a component name like "BarChart"
import { renderOrdinalToStaticSVG } from "semiotic/server"

const data = [
  { category: "Q1", value: 120 },
  { category: "Q2", value: 148 },
  { category: "Q3", value: 135 },
  { category: "Q4", value: 162 },
]

const svg: string = renderOrdinalToStaticSVG({
  data,
  categoryAccessor: "category",
  valueAccessor: "value",
  width: 600,
  height: 400,
})

// Or use the generic function:
import { renderToStaticSVG } from "semiotic/server"
const svg2 = renderToStaticSVG("ordinal", { data, categoryAccessor: "category", valueAccessor: "value" })
```

Key: `renderToStaticSVG(frameType, props)` where frameType is `"xy"` | `"ordinal"` | `"network"`. Type-specific shortcuts: `renderXYToStaticSVG`, `renderOrdinalToStaticSVG`, `renderNetworkToStaticSVG`.

---

## Export

### exportChart (browser)

```jsx
import { useRef } from "react"
import { Scatterplot } from "semiotic/ai"
import { exportChart } from "semiotic"

const containerRef = useRef<HTMLDivElement>(null)

// Pass the WRAPPER DIV, not the SVG element — exportChart finds canvas+SVG internally
<div ref={containerRef}>
  <Scatterplot data={data} xAccessor="x" yAccessor="y" width={600} height={400} />
</div>
<button onClick={() => exportChart(containerRef.current!, { format: "png" })}>
  Download PNG
</button>
```

Key: `exportChart(wrapperDiv, { format, filename, scale, background })`. It queries the wrapper for canvas and SVG elements internally. Default format: PNG with 2x scale.

---

## Theming & Brand Styling

### CSS Custom Properties (no React context needed)

```jsx
// Dark theme via CSS custom properties on a wrapper div
<div style={{
  "--semiotic-bg": "#1a1a2e",
  "--semiotic-text": "#ededed",
  "--semiotic-text-secondary": "#aaa",
  "--semiotic-grid": "#333",
  "--semiotic-border": "#555",
  "--semiotic-font-family": "'Georgia', serif",
  "--semiotic-tooltip-bg": "#1a1a2e",
  "--semiotic-tooltip-text": "#ededed",
  "--semiotic-tooltip-radius": "8px",
  "--semiotic-tooltip-shadow": "0 4px 12px rgba(0,0,0,0.4)",
  "--semiotic-primary": "#ff6b6b",
  "--semiotic-focus": "#ff6b6b",
}}>
  <LineChart
    data={[{ x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 }]}
    xAccessor="x" yAccessor="y"
    showGrid
    annotations={[{ type: "y-threshold", value: 18, label: "Target" }]}
  />
</div>
```

### ThemeProvider (React context)

```jsx
import { ThemeProvider, DARK_THEME, COLOR_BLIND_SAFE_CATEGORICAL } from "semiotic"

// Preset dark theme
<ThemeProvider theme="dark">
  <BarChart data={data} categoryAccessor="name" valueAccessor="value" />
</ThemeProvider>

// Custom brand theme (partial merge with defaults)
<ThemeProvider theme={{
  mode: "light",
  colors: {
    primary: "#cc0000",
    categorical: ["#cc0000", "#333333", "#c8a415", "#4682b4"],
    background: "#fafafa",
    text: "#1a1a1a",
    textSecondary: "#666",
    grid: "#e0e0e0",
    border: "#e0e0e0",
  },
  typography: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    titleSize: 16, labelSize: 12, tickSize: 10,
  },
  tooltip: {
    background: "#fafafa",
    text: "#1a1a1a",
    borderRadius: "4px",
  },
}}>
  <GroupedBarChart data={data} categoryAccessor="quarter" valueAccessor="revenue"
    groupBy="region" colorBy="region" showGrid showLegend />
</ThemeProvider>

// Color-blind safe palette (Wong 2011 — 8 colors)
<Scatterplot data={data} xAccessor="x" yAccessor="y"
  colorBy="category" colorScheme={COLOR_BLIND_SAFE_CATEGORICAL} />
```

### Annotations with Theme Colors

```jsx
// Annotations inherit --semiotic-primary and --semiotic-text-secondary from theme
<LineChart
  data={salesData}
  xAccessor="month" yAccessor="revenue"
  annotations={[
    // Threshold line — defaults to --semiotic-primary if no color set
    { type: "y-threshold", value: 50000, label: "Q3 Target" },
    // Widget annotation at specific data point
    { type: "widget", month: "Jul", revenue: 72000, dy: -15, content: (
      <span style={{ fontSize: 11, fontWeight: 700 }}>Record month</span>
    )},
    // Enclose a cluster of outliers
    { type: "enclose", coordinates: outlierPoints, label: "Outlier cluster", padding: 15 },
  ]}
  showGrid
/>
```

---

## Click Handlers

### onClick on BarChart

```jsx
import { BarChart } from "semiotic/ai"

<BarChart
  data={salesData}
  categoryAccessor="region"
  valueAccessor="revenue"
  onClick={(datum, { x, y }) => {
    console.log(`Clicked ${datum.region}: $${datum.revenue}`)
    setSelectedRegion(datum.region)
  }}
/>
```

Key props: `onClick` receives the original datum and pixel coordinates. Works on all chart types.

---

## Linked Crosshair (Multi-chart Hover Sync)

### Synced crosshair across time-series charts

```jsx
import { LineChart, LinkedCharts } from "semiotic/ai"

<LinkedCharts>
  <LineChart
    data={cpuData}
    xAccessor="time" yAccessor="cpu"
    linkedHover={{ name: "metrics", mode: "x-position", xField: "time" }}
    selection={{ name: "metrics" }}
  />
  <LineChart
    data={memoryData}
    xAccessor="time" yAccessor="memory"
    linkedHover={{ name: "metrics", mode: "x-position", xField: "time" }}
    selection={{ name: "metrics" }}
  />
</LinkedCharts>
```

Key props: `linkedHover` with `mode: "x-position"` broadcasts the hovered X value. Each chart shows its own tooltip with its own Y values. Use for multi-metric dashboards.

---

## Category Format (Custom Tick Labels)

### Truncated category labels

```jsx
import { BarChart } from "semiotic/ai"

<BarChart
  data={data}
  categoryAccessor="department"
  valueAccessor="headcount"
  orientation="horizontal"
  categoryFormat={(label) => label.length > 12 ? label.slice(0, 12) + "…" : label}
/>
```

Key props: `categoryFormat` receives each tick label and returns a formatted string. Available on all ordinal HOCs except Pie/Donut.

---

## Ordinal Annotations

### Threshold + category highlight on BarChart

```jsx
import { BarChart } from "semiotic/ai"

<BarChart
  data={quarterlyData}
  categoryAccessor="quarter"
  valueAccessor="revenue"
  annotations={[
    { type: "y-threshold", value: 50000, label: "Target", color: "#e45050", labelPosition: "left" },
    { type: "category-highlight", category: "Q3 2024", color: "#4589ff", opacity: 0.15, label: "Current" },
  ]}
/>
```

Key props: `y-threshold` works on vertical ordinal charts. `category-highlight` highlights a category column. `labelPosition` controls label placement.

---

## Recipe Layouts — Explicit Semantics Without Bespoke Geometry

### Word Trails (source-aware color + progressive reveal)

```jsx
import { useState } from "react"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { wordTrailsLayout, wordTrailsProgressiveReveal } from "semiotic/recipes"

// One source row per topic / word / recorded model iteration.
const topicWordRuns = [
  { topic: "Topic A", word: "archive", iteration: 0, probability: 0.08, distinctiveness: 0.28 },
  { topic: "Topic A", word: "archive", iteration: 1, probability: 0.14, distinctiveness: 0.56 },
  { topic: "Topic A", word: "archive", iteration: 2, probability: 0.19, distinctiveness: 0.84 },
  { topic: "Topic A", word: "document", iteration: 2, probability: 0.13, distinctiveness: 0.62 },
  { topic: "Topic B", word: "labor", iteration: 0, probability: 0.09, distinctiveness: 0.35 },
  { topic: "Topic B", word: "labor", iteration: 1, probability: 0.16, distinctiveness: 0.72 },
  { topic: "Topic B", word: "factory", iteration: 2, probability: 0.18, distinctiveness: 0.91 },
]

const topicColors = { "Topic A": "#2563eb", "Topic B": "#db2777" }

function distinctivenessColor({ datum, resolvedColumnColor }) {
  // The callback receives the exact source row, plus canonical layout fields.
  const strength =
    datum.distinctiveness >= 0.75 ? 100 :
    datum.distinctiveness >= 0.5 ? 50 :
    datum.distinctiveness >= 0.25 ? 25 : 0
  return `color-mix(in srgb, ${resolvedColumnColor} ${strength}%, var(--surface-0, white))`
}

export default function ProgressiveTopicTrails() {
  const [iteration, setIteration] = useState(2)

  return (
    <>
      <label>
        Model iteration {iteration}
        <input
          type="range"
          min={0}
          max={2}
          value={iteration}
          onChange={(event) => setIteration(Number(event.target.value))}
        />
      </label>
      <OrdinalCustomChart
        data={topicWordRuns}
        layout={wordTrailsLayout}
        layoutConfig={{
          textAccessor: "word",
          weightAccessor: "probability",
          columnAccessor: "topic",
          segmentAccessor: "iteration",
          segmentDomain: [0, 2],
          columnOrder: ["Topic A", "Topic B"],
          repeatWords: true,
          wordColor: distinctivenessColor,
          columnColor: (topic) => topicColors[topic],
          ...wordTrailsProgressiveReveal({
            currentSegment: iteration,
            segmentDomain: [0, 2],
            oldestOpacity: 0.25,
          }),
        }}
        categoryAccessor="topic"
        valueAccessor="probability"
        width={760}
        height={460}
        tooltip
      />
    </>
  )
}
```

Key APIs: `WordTrailsWordInfo` gives `word`, `column`, `weight`, and `segment` plus the exact `datum`, `dataIndex`, `columnIndex`, and `resolvedColumnColor`. `wordTrailsProgressiveReveal` hides future segments, fades reached history, and reserves every row's layout slot so playback never reflows. Set `combineWeightOpacity: true` only when opacity should also encode word weight.

---

## Physics Charts — Motion With A Settled Projection

### GaltonBoardChart (distribution drop)

```jsx
import { GaltonBoardChart } from "semiotic/physics"

<GaltonBoardChart
  data={[
    { id: "a", score: 42, cohort: "observed" },
    { id: "b", score: 57, cohort: "forecast" },
    { id: "c", score: 68, cohort: "observed" },
    { id: "d", score: 75, cohort: "forecast" },
  ]}
  valueAccessor="score"
  colorBy="cohort"
  bins={8}
  size={[640, 320]}
/>
```

Key props: `valueAccessor` maps rows to bins, `bins` controls the settled projection, and `seed` keeps the simulation deterministic. Use when the falling motion explains sampling/distribution; use Histogram when exact bin counts are the task.

### EventDropChart (arrival replay + watermark)

```jsx
import { EventDropChart } from "semiotic/physics"

<EventDropChart
  data={[
    { id: "e0", time: 2, arrivalTime: 3, source: "api" },
    { id: "e1", time: 8, arrivalTime: 11, source: "api" },
    { id: "e2", time: 4, arrivalTime: 33, source: "late" },
  ]}
  timeAccessor="time"
  arrivalAccessor="arrivalTime"
  windows={{ size: 10 }}
  watermark={{ delay: 8 }}
  colorBy="source"
  timeScale={0.05}
  size={[640, 320]}
/>
```

Key props: `timeAccessor` assigns the event-time window, `arrivalAccessor` controls arrival replay, `windows.size` creates barriers, and `watermark.delay` sends late events to the late path.

### PhysicsPileChart (unitized category piles)

```jsx
import { PhysicsPileChart } from "semiotic/physics"

<PhysicsPileChart
  data={[
    { category: "Orders", value: 18 },
    { category: "Queued", value: 11 },
    { category: "Done", value: 24 },
  ]}
  categoryAccessor="category"
  valueAccessor="value"
  unitValue={1}
  colorBy="category"
  size={[640, 320]}
/>
```

Key props: `unitValue` controls how many simulated bodies appear. Increase it for large values so the settled piles remain readable and the frame budget stays bounded.

### CollisionSwarmChart (axis-preserving collision layout)

```jsx
import { CollisionSwarmChart } from "semiotic/physics"

<CollisionSwarmChart
  data={[
    { id: "a", latency: 42, service: "api", weight: 4 },
    { id: "b", latency: 45, service: "api", weight: 6 },
    { id: "c", latency: 63, service: "worker", weight: 5 },
    { id: "d", latency: 68, service: "worker", weight: 7 },
  ]}
  xAccessor="latency"
  groupAccessor="service"
  radiusAccessor="weight"
  colorBy="service"
  settle
  size={[640, 320]}
/>
```

Key props: `xAccessor` preserves the quantitative position, `groupAccessor` creates lanes, and collision settings separate overlapping records without losing the axis.


### PhysicalFlowChart (packet flow over routes)

```jsx
import { PhysicalFlowChart } from "semiotic/physics"

<PhysicalFlowChart
  nodes={[
    { id: "Inbound", x: 0.08, y: 0.5 },
    { id: "Queue", x: 0.45, y: 0.32 },
    { id: "Shipped", x: 0.88, y: 0.58 },
  ]}
  links={[
    { source: "Inbound", target: "Queue", value: 40 },
    { source: "Queue", target: "Shipped", value: 28 },
  ]}
  coordinateMode="normalized"
  throughputAccessor="value"
  maxParticles={90}
  showStaticFlow
  size={[700, 360]}
/>
```

Key props: `nodes` provide route geometry, `links`/`edges` provide throughput, and `showStaticFlow` keeps the route quantities readable while packet bodies move.

### ProcessFlowChart (capacitated multi-body process lane)

```jsx
import { ProcessFlowChart } from "semiotic/physics"

<ProcessFlowChart
  data={[
    { id: "pr-1", stage: "coding", featureId: "auth" },
    { id: "pr-2", stage: "review", featureId: "auth", work: 2 },
    { id: "pr-3", stage: "merged", featureId: "auth" },
  ]}
  idAccessor="id"
  stageAccessor="stage"
  groupBy="featureId"
  workAccessor="work"
  stages={[
    { id: "coding", label: "Coding", force: 14 },
    { id: "review", label: "Review", capacity: { unitsPerSecond: 4 }, pressure: true },
    { id: "merged", label: "Merged", absorb: true },
  ]}
  liveCapacity
  size={[900, 420]}
/>
```

Key props: `stages` declare force / capacity / absorb behavior, `groupBy` forms feature sockets that complete when every member is absorbed, and `liveCapacity` installs FIFO queue controllers for capacitated stages. Prefer ProcessFlowChart for many independent work items; use GauntletChart for one compound project degraded by gates.

### GauntletChart (compound project through timed gates)

```jsx
import { GauntletChart } from "semiotic/physics"

<GauntletChart
  data={[
    {
      id: "plan-a",
      positives: ["homes", "jobs"],
      negatives: ["cost"],
    },
  ]}
  positiveProperties={[
    { id: "homes", label: "Homes", radius: 10 },
    { id: "jobs", label: "Jobs", radius: 10 },
  ]}
  negativeProperties={[{ id: "cost", label: "Cost", load: 1.2, radius: 8 }]}
  gates={[
    { id: "review", label: "Review" },
    { id: "budget", label: "Budget" },
  ]}
  showProjection
  size={[720, 380]}
/>
```

Key props: `positiveProperties` / `negativeProperties` define satellite marks on each project core, `gates` place timed obstacles along the route, and the settled projection strip summarizes viability. Prefer GauntletChart for one plan with many attached attributes; use ProcessFlowChart for many independent work items.

### CrucibleChart (explicit product lifecycle + immediate replay)

```jsx
import { useRef } from "react"
import { CrucibleChart, buildCrucibleProductEvents } from "semiotic/physics"

const evidence = [
  { id: "deploy-log", label: "Deploy log", kind: "record" },
  { id: "trace", label: "Request trace", kind: "telemetry" },
  { id: "rollback", label: "Rollback result", kind: "experiment" },
  { id: "traffic", label: "Traffic spike", kind: "counterclaim" },
]

const phases = [
  { id: "charge", label: "Charge", duration: 1, motion: "charge" },
  { id: "test", label: "Test mechanism", duration: 2.4, motion: "mix" },
  { id: "publish", label: "Publish", duration: 1.6, motion: "pour" },
]

const products = [
  { id: "finding", label: "Deploy caused regression", outletId: "findings" },
]

const events = [
  ...buildCrucibleProductEvents({
    productId: "finding",
    form: {
      at: { phaseId: "test", progress: 0.25 },
      sourceIds: ["deploy-log", "trace"],
      label: "Chronology and mechanism agree",
    },
    contributions: [{
      at: { phaseId: "test", progress: 0.7 },
      sourceIds: ["rollback"],
      label: "Rollback supplies the counterfactual",
    }],
    complete: {
      at: { phaseId: "publish", progress: 0.55 },
      outletId: "findings",
      reason: "Three authored observations support the finding",
    },
  }),
  {
    id: "reject-traffic",
    at: { phaseId: "test", progress: 0.82 },
    effects: [{
      type: "eject",
      select: { ids: ["traffic"] },
      outletId: "contradicted",
      reason: "The regression also occurs at ordinary traffic levels",
    }],
  },
]

export default function IncidentEvidenceCrucible() {
  const chartRef = useRef(null)

  return (
    <>
      <button type="button" onClick={() => chartRef.current?.replay()}>
        Replay evidence
      </button>
      <CrucibleChart
        ref={chartRef}
        data={evidence}
        phases={phases}
        products={products}
        events={events}
        outlets={[
          { id: "findings", label: "Supported finding", side: "bottom" },
          { id: "contradicted", label: "Contradicted", side: "right" },
        ]}
        idAccessor="id"
        labelAccessor="label"
        categoryAccessor="kind"
        projection={{ groupBy: "outlet", measure: "count" }}
        playbackRate={0.8}
        controls={{ playPause: true, reset: true, stepPhase: true, speed: true }}
        size={[820, 400]}
      />
    </>
  )
}
```

Key APIs: `buildCrucibleProductEvents` emits the explicit `combine → contribute* → complete-product` grammar and deterministic fallback event ids. It never infers analysis, timing, product membership, reasons, or routing. The handle's `replay()` atomically restarts the same bounded tape even during a run; `reset()` restores the origin and pauses, while `rerunMS` schedules repetition after settlement.

---

## Value Charts — One Number Is The Visualization

### BigNumber (KPI tile — comparison + target + threshold zones)

```jsx
import { BigNumber } from "semiotic/value"

<BigNumber
  value={1284900}
  label="Q3 Revenue"
  caption="Year-to-date bookings"
  format="currency"
  precision={0}
  comparison={{ value: 980000, label: "vs Q2" }}
  target={{ value: 1500000, label: "Q3 plan" }}
  thresholds={[
    { at: -Infinity, level: "danger"  },
    { at: 1000000,   level: "warning" },
    { at: 1300000,   level: "success" },
  ]}
/>
```

Key props: `value` (the one number), `format` ("number"|"currency"|"percent"|"compact"|"duration"|fn), `comparison` derives a delta with auto-sentiment, `target` renders "X% of goal", `thresholds` map value to a semantic theme role (`--semiotic-{success|warning|danger|info}`). Suppress decoration via `mode="thumbnail"` for dense grids or `mode="inline"` for prose. Stream via `ref.current.push({ value, time })` — pair with `stalenessThreshold` to dim the card when updates stop.

### BigNumber with a Semiotic chart embedded via `trendSlot` (wide / rectangular)

```jsx
import { BigNumber } from "semiotic/value"
import { LineChart } from "semiotic/xy"

<BigNumber
  value={1284900}
  label="Q3 Revenue"
  format="currency"
  comparison={{ value: 980000, label: "vs Q2" }}
  trendSlot={(ctx) => (
    <LineChart
      data={[820000, 870000, 920000, 1010000, 1120000, 1284900].map((y, x) => ({ x, y }))}
      xAccessor="x"
      yAccessor="y"
      mode="sparkline"
      width={260}
      height={32}
      color={ctx.color}
    />
  )}
/>
```

Key props: BigNumber ships NO built-in chart renderer. `trendSlot` accepts any ReactNode (or `(ctx) => ReactNode`); pass a `LineChart`/`AreaChart` in `mode="sparkline"` for wide / rectangular charts. The slot context exposes `ctx.color` (resolved threshold colour) so the embedded chart picks up the BigNumber's level for cohesive theming.

### BigNumber with a square Semiotic chart via `chartSlot`

```jsx
import { BigNumber } from "semiotic/value"
import { DonutChart } from "semiotic/ordinal"

<BigNumber
  value={1284900}
  label="Q3 Revenue by region"
  format="currency"
  chartSlot={
    <DonutChart
      data={[
        { region: "NA",   revenue: 540000 },
        { region: "EU",   revenue: 420000 },
        { region: "APAC", revenue: 324900 },
      ]}
      categoryAccessor="region"
      valueAccessor="revenue"
      width={120}
      height={120}
      innerRadius={32}
    />
  }
/>
```

Key props: `chartSlot` is the square-aspect counterpart to `trendSlot`. The card splits horizontally — text content on the left, square chart on the right (DonutChart / PieChart / Scatterplot / Treemap / CirclePack). Pass both `trendSlot` and `chartSlot` to get the square chart on the right and the wide sparkline at the bottom.

### BigNumber (inverted direction — lower is better)

```jsx
import { BigNumber } from "semiotic/value"

<BigNumber
  value={486}
  label="P99 latency"
  suffix=" ms"
  comparison={{ value: 410, label: "vs last week", direction: "lower-is-better" }}
/>
```

Key props: `direction: "lower-is-better"` flips sentiment colouring — a value that went UP now reads as negative (danger). Same pattern for error rate, churn, complaint count, etc.
