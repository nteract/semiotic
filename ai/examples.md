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
  gradientFill
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
    gradientFill
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
