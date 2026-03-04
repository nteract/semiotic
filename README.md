[![Semiotic](semiotic_logo_horizontal.png "semiotic")](https://semiotic.nteract.io)

[![CI](https://github.com/nteract/semiotic/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/nteract/semiotic/actions/workflows/node.js.yml)
[![npm version](https://img.shields.io/npm/v/semiotic.svg)](https://www.npmjs.com/package/semiotic)
[![TypeScript](https://img.shields.io/badge/TypeScript-built--in-blue.svg)](https://www.typescriptlang.org/)

A React data visualization library for charts, networks, and beyond.

Simple charts in 5 lines. Force-directed graphs, Sankey diagrams, treemaps,
and chord diagrams when you need them. Full D3-level control when you want it.

```jsx
import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
/>
```

## Why Semiotic

**Start simple, go deep.** Semiotic has three layers of abstraction:

| Layer | For | Example |
|---|---|---|
| **Charts** | Common visualizations with sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Frames** | Full control over rendering, interaction, and layout | `<StreamXYFrame lines={d} customLineMark={...} />` |
| **Utilities** | Standalone axes, legends, annotations, brushes | `<Annotation type="react" />` |

Every Chart component accepts a `frameProps` prop to access the underlying
Frame API without giving up the simpler interface.

**Network visualization as a first-class citizen.** Force-directed graphs,
Sankey diagrams, chord diagrams, tree layouts, treemaps, and circle packing
are all React components with the same clean prop API as LineChart.

**What Semiotic does that other libraries don't:**
- Force-directed graphs, Sankey diagrams, chord diagrams, treemaps, and circle packing — as React components with the same clean API as LineChart
- Coordinated views: `LinkedCharts` for cross-highlighting and brushing-and-linking between any charts; `ScatterplotMatrix` with crossfilter brushing
- Real-time streaming charts rendered on canvas at 60fps
- Built-in annotation system with hover, click, and custom annotation types
- Server-side SVG rendering for email, OG images, and PDFs

**When to use something else.** Need a standard line or bar chart for a dashboard that you'll never need to make more interesting?
[Recharts](https://recharts.org) has a larger ecosystem and more community examples.
Semiotic is built for projects that need network visualization, statistical summaries,
or custom charting — capabilities that general-purpose charting libraries don't offer.

**AI-ready.** Semiotic ships with structured schemas (`ai/schema.json`), an
`import from "semiotic/ai"` entry point, and an MCP server — all designed for
LLM code generation. AI coding assistants can generate correct Semiotic code on
the first try. Run `npx semiotic-ai --help` for CLI options or add `semiotic-mcp`
to your MCP client config for tool-based chart rendering.

## Install

```bash
npm install semiotic
```

Requires React 18.1 or later.

## Quick Examples

### Line Chart

```jsx
import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
  curve="monotoneX"
  showPoints={true}
  xLabel="Month"
  yLabel="Revenue"
/>
```

### Bar Chart

```jsx
import { BarChart } from "semiotic"

<BarChart
  data={categoryData}
  categoryAccessor="department"
  valueAccessor="sales"
  orientation="horizontal"
  colorBy="region"
/>
```

### Force-Directed Graph

```jsx
import { ForceDirectedGraph } from "semiotic"

<ForceDirectedGraph
  nodes={teamMembers}
  edges={connections}
  colorBy="department"
  nodeSize={8}
  showLabels={true}
/>
```

### Sankey Diagram

```jsx
import { SankeyDiagram } from "semiotic"

<SankeyDiagram
  nodes={entities}
  edges={flows}
  colorBy="category"
  nodeLabel="name"
/>
```

### Streaming Line

```jsx
import { RealtimeLineChart } from "semiotic"

const chartRef = useRef()

// Push data at any frequency
chartRef.current.push({ time: Date.now(), value: reading })

<RealtimeLineChart
  ref={chartRef}
  timeAccessor="time"
  valueAccessor="value"
  windowSize={200}
/>
```

### Streaming Sankey

```jsx
import { StreamNetworkFrame } from "semiotic"

const chartRef = useRef()

// Push edges to grow the topology
chartRef.current.push({ source: "Budget", target: "Rent", value: 2000 })

<StreamNetworkFrame
  ref={chartRef}
  chartType="sankey"
  showParticles
  enableHover
/>
```

## All Chart Components

| Category | Components |
|---|---|
| **XY** | `LineChart` `AreaChart` `StackedAreaChart` `Scatterplot` `BubbleChart` `Heatmap` |
| **Categorical** | `BarChart` `StackedBarChart` `GroupedBarChart` `SwarmPlot` `BoxPlot` `Histogram` `ViolinPlot` `DotPlot` `PieChart` `DonutChart` |
| **Network** | `ForceDirectedGraph` `ChordDiagram` `SankeyDiagram` `TreeDiagram` `Treemap` `CirclePack` |
| **Realtime** | `RealtimeLineChart` `RealtimeHistogram` `RealtimeSwarmChart` `RealtimeWaterfallChart` |
| **Coordination** | `LinkedCharts` `ScatterplotMatrix` |
| **Frames** | `StreamXYFrame` `StreamOrdinalFrame` `StreamNetworkFrame` |

## Smaller Bundles

Import only what you need:

```jsx
import { LineChart } from "semiotic/xy"        // 125 KB (vs 218 KB full)
import { BarChart } from "semiotic/ordinal"     // 140 KB
import { ForceDirectedGraph } from "semiotic/network"  // 133 KB
import { LineChart } from "semiotic/ai"           // HOC-only surface for AI generation
```

## TypeScript

Full type definitions ship with the package. Generics for type-safe accessors:

```tsx
interface Sale { month: number; revenue: number }

<LineChart<Sale>
  data={sales}
  xAccessor="month"    // TS validates this is keyof Sale
  yAccessor="revenue"
/>
```

## Server-Side Rendering

Static SVG generation for Node.js (email, OG images, PDF):

```js
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

Works with Next.js App Router, Remix, and Astro via `"use client"` directives.

## Documentation

[Interactive docs and examples](https://semiotic.nteract.io)

- [Getting Started](https://semiotic.nteract.io/getting-started)
- [Charts](https://semiotic.nteract.io/charts) — all 27 chart types with live examples
- [Frames](https://semiotic.nteract.io/frames) — full Frame API reference
- [Features](https://semiotic.nteract.io/features) — axes, annotations, tooltips, styling
- [Cookbook](https://semiotic.nteract.io/cookbook) — advanced patterns and recipes
- [Playground](https://semiotic.nteract.io/playground) — interactive prop exploration

## Upgrading

- [Migration Guide](./MIGRATION.md) — upgrading from v1.x or v2.x
- [Changelog](./CHANGELOG.md) — full release history

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Our community follows the nteract
[Code of Conduct](https://github.com/nteract/nteract/blob/main/CODE_OF_CONDUCT.md).

## Acknowledgments

Development of this library owes a lot to Susie Lu, Jason Reid, James Womack,
Matt Herman, Shelby Sturgis, and Tristan Reid.

_Semiotic icon based on an icon by Andre Schauer._

## License

[Apache 2.0](./LICENSE)
