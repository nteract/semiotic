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

Most React charting libraries give you bar charts, line charts, and pie charts.
Semiotic gives you those too — but it's built for the projects where those
aren't enough.

### When you need more than standard charts

**Network visualization.** Show how things connect — org charts,
dependency graphs, budget flows, taxonomies. Semiotic has force-directed
graphs, Sankey diagrams, chord diagrams, tree layouts, treemaps, and circle
packing as React components with the same prop API as LineChart.

**Streaming data.** Monitor live systems — server metrics, sensor feeds,
financial tickers. Semiotic's realtime charts render on canvas at 60fps with
a ref-based push API. Old data fades out (decay), new data flashes in
(pulse), and stale feeds are flagged automatically.

**Coordinated dashboards.** Hover one chart, highlight matching data in
others. Brush a scatterplot, filter a bar chart. Semiotic's `LinkedCharts`
and `ScatterplotMatrix` provide crossfilter coordination that other libraries
leave you to build from scratch.

**Statistical summaries.** Box plots, violin plots, swarm plots, ridgeline
plots, histograms — the distribution charts that data scientists need and
most charting libraries skip. Add marginal distribution graphics (histogram,
violin, ridgeline, boxplot) to scatterplot margins with a single prop.

### Start simple, go deep

| Layer | For | Example |
|---|---|---|
| **Charts** | Common visualizations with sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Frames** | Full control over rendering, interaction, and layout | `<StreamXYFrame chartType="line" lineStyle={...} />` |

Every Chart component accepts a `frameProps` prop to access the underlying
Frame API without leaving the simpler interface.

### When to use something else

Need a standard bar or line chart for a dashboard you'll never need to
customize beyond colors and labels? [Recharts](https://recharts.org) has a
larger ecosystem and more community examples. Need GPU-accelerated rendering
for millions of data points? [Apache ECharts](https://echarts.apache.org)
handles that scale.

Semiotic is for projects that outgrow those libraries — when you need
network graphs alongside time series, streaming data alongside static
snapshots, or coordinated views across chart types.

### Bundle size comparison

| Library | Packed | Unpacked | What you get |
|---|---|---|---|
| Victory | 393 KB | 2.3 MB | Charts only |
| Lightweight Charts | 586 KB | 3.0 MB | Financial charts only |
| **Semiotic** | **668 KB** | **2.5 MB** | **Charts + networks + streaming + coordination** |
| Recharts | 1.4 MB | 6.4 MB | Charts only |
| Chart.js | 1.6 MB | 6.2 MB | Charts only, no React |
| ApexCharts | 1.8 MB | 8.4 MB | Charts only |
| ECharts | 11.4 MB | 57.6 MB | Everything, no React |

**AI-ready.** Semiotic ships with structured schemas (`ai/schema.json`), an
`import from "semiotic/ai"` entry point, and an MCP server — all designed for
LLM code generation. AI coding assistants can generate correct Semiotic code on
the first try. Run `npx semiotic-ai --help` for CLI options, `npx semiotic-ai --doctor`
to validate props from the command line, or add `semiotic-mcp` to your MCP client
config for tool-based chart rendering. Every HOC chart includes a built-in error
boundary and dev-mode validation warnings with actionable fix suggestions.

**Vega-Lite compatible.** Have existing Vega-Lite specs? `fromVegaLite(spec)`
translates them to Semiotic chart configs — instant onboarding from notebooks,
dashboards, or AI-generated specs. Composes with `configToJSX()`,
`copyConfig()`, and `toURL()` for full round-trip interop.

**Streaming system models.** Turn a streaming Sankey into a live system monitor:
click-to-inspect `DetailsPanel`, particle speed proportional to edge throughput,
threshold alerting with animated glow, and automatic topology diffing that
highlights new services as they appear. Visualization as product navigation.

## Install

```bash
npm install semiotic@3.0.0
```

Requires React 18.1+ or React 19.

## Quick Examples

### Coordinated Dashboard

Hover one chart, highlight the same data in another — zero wiring:

```jsx
import { LinkedCharts, Scatterplot, BarChart } from "semiotic"

<LinkedCharts>
  <Scatterplot
    data={data} xAccessor="age" yAccessor="income" colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }}
  />
  <BarChart
    data={summary} categoryAccessor="region" valueAccessor="total"
    selection={{ name: "hl" }}
  />
</LinkedCharts>
```

### Streaming Metrics with Decay

Live data fades old points, flashes new ones, flags stale feeds:

```jsx
import { RealtimeLineChart } from "semiotic"

const chartRef = useRef()
chartRef.current.push({ time: Date.now(), value: cpuLoad })

<RealtimeLineChart
  ref={chartRef}
  timeAccessor="time"
  valueAccessor="value"
  decay={{ type: "exponential", halfLife: 100 }}
  staleness={{ threshold: 5000, showBadge: true }}
/>
```

### Network Graphs

Force-directed graphs and Sankey diagrams — same API as LineChart:

```jsx
import { ForceDirectedGraph, SankeyDiagram } from "semiotic"

<ForceDirectedGraph
  nodes={people} edges={friendships}
  colorBy="team" nodeSize={8} showLabels
/>

<SankeyDiagram
  edges={budgetFlows}
  sourceAccessor="from" targetAccessor="to" valueAccessor="amount"
/>
```

### Streaming System Monitor

Live service topology with threshold alerting and click-to-inspect:

```jsx
import { StreamNetworkFrame, ChartContainer, DetailsPanel, LinkedCharts } from "semiotic"

const chartRef = useRef()
chartRef.current.push({ source: "API", target: "Orders", value: 15 })

<LinkedCharts>
  <ChartContainer title="System Monitor" status="live"
    detailsPanel={
      <DetailsPanel position="right" trigger="click">
        {(datum) => <div>{datum.id}: {datum.value} req/s</div>}
      </DetailsPanel>
    }>
    <StreamNetworkFrame ref={chartRef} chartType="sankey"
      showParticles particleStyle={{ proportionalSpeed: true }}
      thresholds={{ metric: n => n.value, warning: 100, critical: 250 }}
    />
  </ChartContainer>
</LinkedCharts>
```

### Standard Charts

Line, bar, scatter, area — all the basics, with sensible defaults:

```jsx
import { LineChart, BarChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month" yAccessor="revenue"
  curve="monotoneX" showPoints
/>

<BarChart
  data={categoryData}
  categoryAccessor="department" valueAccessor="sales"
  orientation="horizontal" colorBy="region"
/>
```

## All Chart Components

| Category | Components |
|---|---|
| **XY** | `LineChart` `AreaChart` `StackedAreaChart` `Scatterplot` `ConnectedScatterplot` `BubbleChart` `Heatmap` |
| **Categorical** | `BarChart` `StackedBarChart` `GroupedBarChart` `SwarmPlot` `BoxPlot` `Histogram` `ViolinPlot` `DotPlot` `PieChart` `DonutChart` |
| **Network** | `ForceDirectedGraph` `ChordDiagram` `SankeyDiagram` `TreeDiagram` `Treemap` `CirclePack` `OrbitDiagram` |
| **Realtime** | `RealtimeLineChart` `RealtimeHistogram` `RealtimeSwarmChart` `RealtimeWaterfallChart` `RealtimeHeatmap` |
| **Coordination** | `LinkedCharts` `ScatterplotMatrix` |
| **Layout** | `ChartGrid` `ContextLayout` `CategoryColorProvider` |
| **Frames** | `StreamXYFrame` `StreamOrdinalFrame` `StreamNetworkFrame` |

### Vega-Lite Translation

Paste a Vega-Lite spec, get a Semiotic chart:

```jsx
import { fromVegaLite } from "semiotic/data"
import { configToJSX, fromConfig } from "semiotic"

const config = fromVegaLite({
  mark: "bar",
  data: { values: [{ a: "A", b: 28 }, { a: "B", b: 55 }] },
  encoding: {
    x: { field: "a", type: "nominal" },
    y: { field: "b", type: "quantitative" },
  },
})

// Render directly
const { componentName, props } = fromConfig(config)
// → componentName: "BarChart", props: { data, categoryAccessor: "a", valueAccessor: "b" }

// Or generate JSX code
configToJSX(config)
// → <BarChart data={[...]} categoryAccessor="a" valueAccessor="b" />
```

Supports bar, line, area, point, rect, arc, tick marks with encoding translation
for color, size, aggregation, and binning.

## Smaller Bundles

Import only what you need:

```jsx
import { LineChart } from "semiotic/xy"                 // 123 KB
import { BarChart } from "semiotic/ordinal"              // 118 KB
import { ForceDirectedGraph } from "semiotic/network"    // 127 KB
import { LineChart } from "semiotic/ai"                  // HOC-only surface for AI generation
```

Granular entry points export only v3 Stream Frames and HOC charts — no legacy
utilities or backwards-compatibility shims.

## TypeScript

Built with `strict: true`. Full type definitions ship with the package.
Generics for type-safe accessors:

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
- [Features](https://semiotic.nteract.io/features) — axes, annotations, tooltips, styling, Vega-Lite translator
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

The Sankey layout engine is based on [sankey-plus](https://github.com/tomshanley/sankey-plus)
by [Tom Shanley](https://github.com/tomshanley), which improved on his earlier
`d3-sankey-circular` with better cycle detection, hierarchical arc stacking,
and dynamic extent adjustment.

_Semiotic icon based on an icon by Andre Schauer._

## License

[Apache 2.0](./LICENSE)
