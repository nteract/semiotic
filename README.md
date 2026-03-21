[![Semiotic](semiotic_logo_horizontal.png "semiotic")](https://semiotic.nteract.io)

[![CI](https://github.com/nteract/semiotic/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/nteract/semiotic/actions/workflows/node.js.yml)
[![npm version](https://img.shields.io/npm/v/semiotic.svg)](https://www.npmjs.com/package/semiotic)
[![TypeScript](https://img.shields.io/badge/TypeScript-built--in-blue.svg)](https://www.typescriptlang.org/)

A React data visualization library designed for AI-assisted development.

Simple charts in 5 lines. Network graphs, streaming data, and coordinated
dashboards when you need them. Structured schemas and an MCP server so
AI coding assistants generate correct chart code on the first try.

```jsx
import { LineChart } from "semiotic"

<LineChart
  data={salesData}
  xAccessor="month"
  yAccessor="revenue"
/>
```

## Why Semiotic

Semiotic is a data visualization library for React that combines broad chart
coverage with first-class AI tooling. It handles the chart types that most
libraries skip — network graphs, streaming data, statistical distributions,
coordinated views — and ships with machine-readable schemas so LLMs can
generate correct code without examples.

### Built for AI-assisted development

Semiotic ships with everything an AI coding assistant needs to generate
correct visualizations without trial and error:

- **`semiotic/ai`** — a single import with all 37 chart components, optimized for LLM code generation
- **`ai/schema.json`** — machine-readable prop schemas for every component
- **`npx semiotic-mcp`** — an MCP server for tool-based chart rendering in any MCP client
- **`npx semiotic-ai --doctor`** — validate component + props JSON from the command line with typo suggestions and anti-pattern detection
- **`diagnoseConfig(component, props)`** — programmatic anti-pattern detector with 12 checks and actionable fixes
- **`CLAUDE.md`** — instruction files auto-synced for Claude, Cursor, Copilot, Windsurf, and Cline
- **`llms.txt`** — machine-readable documentation following the emerging standard

Every chart includes a built-in error boundary, dev-mode validation
warnings with typo suggestions, and accessibility features (canvas
`aria-label`, keyboard-navigable legends, `aria-live` tooltips, SVG
`<title>`/`<desc>`) so AI-generated code fails gracefully with
actionable diagnostics instead of a blank screen.

### Beyond standard charts

**Network visualization.** Force-directed graphs, Sankey diagrams, chord
diagrams, tree layouts, treemaps, circle packing, and orbit diagrams — all
as React components with the same prop API as LineChart.

**Streaming data.** Realtime charts render on canvas at 60fps with a
ref-based push API. Built-in decay, pulse, and staleness encoding for
monitoring dashboards.

**Coordinated views.** `LinkedCharts` provides hover cross-highlighting,
brush cross-filtering, and selection synchronization across any combination
of chart types — zero wiring.

**Geographic visualization.** Choropleth maps, proportional symbol maps, flow
maps with animated particles, and distance cartograms — all canvas-rendered
with d3-geo projections, zoom/pan, tile basemaps, and drag-rotate globe spinning.

**Statistical summaries.** Box plots, violin plots, swarm plots, histograms,
LOESS smoothing, forecast with confidence envelopes, and anomaly detection.
Marginal distribution graphics on scatterplot axes with a single prop.

### Start simple, go deep

| Layer | For | Example |
|---|---|---|
| **Charts** | Common visualizations with sensible defaults | `<LineChart data={d} xAccessor="x" yAccessor="y" />` |
| **Frames** | Full control over rendering, interaction, and layout | `<StreamXYFrame chartType="line" lineStyle={...} />` |

Every Chart component accepts a `frameProps` prop to access the underlying
Frame API without leaving the simpler interface.

### Serialization and interop

Charts serialize to JSON and back: `toConfig`, `fromConfig`, `toURL`,
`copyConfig`, `configToJSX`. Have Vega-Lite specs? `fromVegaLite(spec)`
translates them to Semiotic configs — works with `configToJSX()` for
full round-trip from notebooks and AI-generated specs.

### When to use something else

Need a standard bar or line chart for a dashboard you'll never need to
customize beyond colors and labels? [Recharts](https://recharts.org) has a
larger ecosystem and more community examples. Need GPU-accelerated rendering
for millions of data points? [Apache ECharts](https://echarts.apache.org)
handles that scale.

Semiotic is for projects that outgrow those libraries — when you need
network graphs alongside time series, streaming data alongside static
snapshots, or coordinated views across chart types.

## Install

```bash
npm install semiotic
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

### Geographic Visualization

Choropleth maps, flow maps, and distance cartograms with canvas rendering,
zoom/pan, tile basemaps, and animated particles:

```jsx
import { ChoroplethMap, FlowMap, DistanceCartogram } from "semiotic/geo"

<ChoroplethMap
  areas={geoJsonFeatures} valueAccessor="gdp"
  colorScheme="viridis" projection="equalEarth" zoomable tooltip
/>

<FlowMap
  nodes={airports} flows={routes} valueAccessor="passengers"
  showParticles particleStyle={{ color: "source", speedMultiplier: 1.5 }}
/>

<DistanceCartogram
  points={cities} center="rome" costAccessor="travelDays"
  showRings costLabel="days" lines={routes}
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
| **XY** | `LineChart` `AreaChart` `StackedAreaChart` `Scatterplot` `ConnectedScatterplot` `BubbleChart` `Heatmap` `QuadrantChart` `MinimapChart` |
| **Categorical** | `BarChart` `StackedBarChart` `GroupedBarChart` `SwarmPlot` `BoxPlot` `Histogram` `ViolinPlot` `RidgelinePlot` `DotPlot` `PieChart` `DonutChart` |
| **Network** | `ForceDirectedGraph` `ChordDiagram` `SankeyDiagram` `TreeDiagram` `Treemap` `CirclePack` `OrbitDiagram` |
| **Geo** | `ChoroplethMap` `ProportionalSymbolMap` `FlowMap` `DistanceCartogram` |
| **Realtime** | `RealtimeLineChart` `RealtimeHistogram` `RealtimeSwarmChart` `RealtimeWaterfallChart` `RealtimeHeatmap` |
| **Coordination** | `LinkedCharts` `ScatterplotMatrix` |
| **Layout** | `ChartGrid` `ContextLayout` `CategoryColorProvider` |
| **Frames** | `StreamXYFrame` `StreamOrdinalFrame` `StreamNetworkFrame` `StreamGeoFrame` |

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
import { LineChart } from "semiotic/xy"                 // ~156 KB
import { BarChart } from "semiotic/ordinal"              // ~124 KB
import { ForceDirectedGraph } from "semiotic/network"    // ~123 KB
import { ChoroplethMap } from "semiotic/geo"             // ~102 KB (+ d3-geo peer)
import { LineChart } from "semiotic/ai"                  // ~397 KB (all HOCs)
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

All chart components render SVG automatically in server environments — no
special imports or configuration needed:

```jsx
// Works in Next.js App Router, Remix, Astro — same component, same props
import { LineChart } from "semiotic"

// Server: renders <svg> with path/circle/rect elements
// Client: renders <canvas> with SVG overlay for axes
<LineChart data={data} xAccessor="date" yAccessor="value" />
```

For standalone SVG generation (email, OG images, PDF), use the server entry point:

```js
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

## MCP Server

Semiotic ships with an [MCP server](https://modelcontextprotocol.io) that lets AI coding assistants render charts, diagnose configuration problems, discover schemas, and get chart recommendations via tool calls.

### Setup

Add to your MCP client config (e.g. `claude_desktop_config.json` for Claude Desktop):

```json
{
  "mcpServers": {
    "semiotic": {
      "command": "npx",
      "args": ["semiotic-mcp"]
    }
  }
}
```

No API keys or authentication required. The server runs locally via stdio.

### Tools

| Tool | Description |
|------|-------------|
| **`renderChart`** | Render any Semiotic chart to static SVG. Pass `{ component: "LineChart", props: { data: [...], xAccessor: "x", yAccessor: "y" } }`. Returns SVG string or validation errors with fix suggestions. |
| **`getSchema`** | Return the prop schema for a specific component. Pass `{ component: "LineChart" }` to get its props, or omit `component` to list all 30 chart types. Use before `renderChart` to look up valid props. |
| **`suggestChart`** | Recommend chart types for a data sample. Pass `{ data: [{...}, ...] }` with 1–5 sample objects. Optionally include `intent` (`"comparison"`, `"trend"`, `"distribution"`, `"relationship"`, `"composition"`, `"geographic"`, `"network"`, `"hierarchy"`). Returns ranked suggestions with example props. |
| **`diagnoseConfig`** | Check a chart configuration for common problems — empty data, bad dimensions, missing accessors, wrong data shape, and more. Returns structured diagnostics with actionable fixes. |
| **`reportIssue`** | Generate a pre-filled GitHub issue URL for bug reports or feature requests. Pass `{ title: "...", body: "...", labels: ["bug"] }`. Returns a URL the user can open to submit. |

### Example: get schema for a component

```
Tool: getSchema
Args: { "component": "LineChart" }
→ Returns: { "name": "LineChart", "description": "...", "parameters": { "properties": { "data": ..., "xAccessor": ..., ... } } }
```

### Example: suggest a chart for your data

```
Tool: suggestChart
Args: {
  "data": [
    { "month": "Jan", "revenue": 120, "region": "East" },
    { "month": "Feb", "revenue": 180, "region": "West" }
  ]
}
→ Returns:
  1. BarChart (high confidence) — categorical field (region) with values (revenue)
  2. StackedBarChart (medium confidence) — two categorical fields (month, region)
  3. DonutChart (medium confidence) — 2 categories — proportional composition
```

### Example: render a chart

```
Tool: renderChart
Args: {
  "component": "BarChart",
  "props": {
    "data": [
      { "category": "Q1", "revenue": 120 },
      { "category": "Q2", "revenue": 180 },
      { "category": "Q3", "revenue": 150 }
    ],
    "categoryAccessor": "category",
    "valueAccessor": "revenue"
  }
}
→ Returns: <svg>...</svg>
```

### Example: diagnose a broken config

```
Tool: diagnoseConfig
Args: { "component": "LineChart", "props": { "data": [] } }
→ Returns: ✗ [EMPTY_DATA] data is an empty array — Fix: provide at least one data point
```

### Example: report an issue

```
Tool: reportIssue
Args: {
  "title": "Bug: BarChart tooltip shows undefined for custom accessor",
  "body": "When using valueAccessor='amount', tooltip displays 'undefined'.\n\ndiagnoseConfig output: ✓ no issues detected.",
  "labels": ["bug"]
}
→ Returns: Open this URL to submit the issue: https://github.com/nteract/semiotic/issues/new?...
```

### CLI alternative

For quick validation without an MCP client:

```bash
npx semiotic-ai --doctor       # validate component + props JSON
npx semiotic-ai --schema       # dump all chart schemas
npx semiotic-ai --compact      # compact schema (fewer tokens)
```

## Documentation

[Interactive docs and examples](https://semiotic.nteract.io)

- [Getting Started](https://semiotic.nteract.io/getting-started)
- [Charts](https://semiotic.nteract.io/charts) — all 37 chart types with live examples
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
