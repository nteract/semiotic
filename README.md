[![Semiotic](semiotic_logo_horizontal.png "semiotic")](https://semiotic.nteract.io)

[![CI](https://github.com/nteract/semiotic/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/nteract/semiotic/actions/workflows/node.js.yml)
[![npm version](https://img.shields.io/npm/v/semiotic.svg)](https://www.npmjs.com/package/semiotic)
[![TypeScript](https://img.shields.io/badge/TypeScript-built--in-blue.svg)](https://www.typescriptlang.org/)
[![semiotic MCP server](https://glama.ai/mcp/servers/nteract/semiotic/badges/card.svg)](https://glama.ai/mcp/servers/nteract/semiotic)
[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/nteract-semiotic-badge.png)](https://mseep.ai/app/nteract-semiotic)

A React data visualization library designed for AI-assisted development.

Simple charts in 5 lines. Network graphs, streaming data, and coordinated
dashboards when you need them. Structured schemas and an MCP server so
AI coding assistants generate correct chart code on the first try.

```jsx
import { LineChart } from "semiotic/xy"

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

- **`semiotic/ai`** — a single import with the 47-chart capability catalog (XY, ordinal, network, realtime, geo, value), optimized for LLM code generation. Note: the published entry files are pre-bundled, so importing one chart from `semiotic/ai` still ships most of the bundle — treat it as a codegen/tooling surface and use family subpaths (`semiotic/xy`, `semiotic/geo`, `semiotic/value`, …) in production code, at roughly half the single-chart cost.
- **`ai/schema.json`** — machine-readable prop schemas for every component
- **`npx semiotic-mcp`** — an MCP server for tool-based chart rendering in any MCP client
- **`npx semiotic-ai --doctor`** — validate component + props JSON from the command line with typo suggestions and anti-pattern detection
- **`diagnoseConfig(component, props)`** — programmatic anti-pattern detector with actionable fixes, spanning validation, encoding, accessibility, and misleading-design (deception) checks
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
brush cross-filtering, coordinate-based linked crosshairs, and selection
synchronization across any combination of chart types — zero wiring.

**Geographic visualization.** Choropleth maps, proportional symbol maps, flow
maps with animated particles, and distance cartograms — all canvas-rendered
with d3-geo projections, zoom/pan, tile basemaps, and drag-rotate globe spinning.

**Statistical summaries.** Box plots, violin plots, swarm plots, histograms,
LOESS smoothing, forecast with confidence envelopes, and anomaly detection.
Marginal distribution graphics on scatterplot axes with a single prop.

**First-class annotations.** Annotations are data-bound objects, not post-hoc
artwork. Labels, callouts, thresholds, enclosures, statistical overlays, and
React widgets move with the chart and render through browser, SSR, and export
paths. Opt into placement, hierarchy, density, progressive disclosure,
audience-aware amount, provenance, and editorial lifecycle when the chart
needs to communicate more than its encoding alone.

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
| **XY** | `LineChart` `AreaChart` `DifferenceChart` `StackedAreaChart` `Scatterplot` `ConnectedScatterplot` `BubbleChart` `Heatmap` `QuadrantChart` `MultiAxisLineChart` `MinimapChart` `CandlestickChart` `ScatterplotMatrix` |
| **Categorical** | `BarChart` `StackedBarChart` `GroupedBarChart` `LikertChart` `SwimlaneChart` `FunnelChart` `SwarmPlot` `BoxPlot` `Histogram` `ViolinPlot` `RidgelinePlot` `DotPlot` `PieChart` `DonutChart` `GaugeChart` |
| **Network** | `ForceDirectedGraph` `ChordDiagram` `SankeyDiagram` `ProcessSankey` `TreeDiagram` `Treemap` `CirclePack` `OrbitDiagram` |
| **Geo** | `ChoroplethMap` `ProportionalSymbolMap` `FlowMap` `DistanceCartogram` |
| **Realtime** | `RealtimeLineChart` `RealtimeHistogram` `RealtimeSwarmChart` `RealtimeWaterfallChart` `RealtimeHeatmap` |
| **Coordination** | `LinkedCharts` |
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

### Conversation Arc Telemetry

Capture and replay the path an AI-assisted chart session took:

```ts
import {
  createLocalStorageConversationArcSink,
  enableConversationArc,
  getConversationArcStore,
  loadConversationArc,
  registerConversationArcSink,
} from "semiotic/ai"

const sink = createLocalStorageConversationArcSink({ key: "my-app:arc" })
registerConversationArcSink(sink)
enableConversationArc({ sessionId: "session-abc" })

getConversationArcStore().record({ type: "chart-rendered", component: "LineChart" })
loadConversationArc(sink.load(), { enabled: false })
```

## Bundle Sizes

Semiotic ships 12 entry points. **Don't import from `"semiotic"` unless you need everything** — use the sub-path that matches your chart type:

<!-- semiotic-bundle-sizes:start -->
<!-- Auto-generated by `scripts/sync-bundle-sizes.mjs`. Edit dist/*, not this block. -->

| Entry Point | gzip | What's inside |
|---|---|---|
| `semiotic/xy` | **90 KB** | LineChart, AreaChart, Scatterplot, Heatmap, + 8 more XY charts |
| `semiotic/ordinal` | **74 KB** | BarChart, PieChart, BoxPlot, Histogram, + 11 more categorical charts |
| `semiotic/network` | **68 KB** | ForceDirectedGraph, SankeyDiagram, ProcessSankey, Treemap, + 4 more |
| `semiotic/geo` | **55 KB** | ChoroplethMap, FlowMap, DistanceCartogram, ProportionalSymbolMap |
| `semiotic/realtime` | **95 KB** | RealtimeLineChart, RealtimeHistogram, + 4 streaming charts |
| `semiotic/server` | **128 KB** | renderChart, renderDashboard, renderToImage, renderToAnimatedGif |
| `semiotic/utils` | **38 KB** | ThemeProvider, validators, serialization — no chart components |
| `semiotic/recipes` | **9 KB** | Pure layout functions (waffle, marimekko, flextree, dagre, …) |
| `semiotic/themes` | **4 KB** | Theme presets only (tufte, carbon, etc.) |
| `semiotic/data` | **3 KB** | bin, rollup, groupBy, pivot, fromVegaLite |
| `semiotic/value` | **6 KB** | BigNumber — focal-value KPI / scorecard (SingleValueFrame POC) |
| `semiotic/ai` | **250 KB** | All 47 schema-backed charts + validation — optimized for LLM code generation |
| `semiotic` | **203 KB** | Everything below (full bundle) |

<!-- semiotic-bundle-sizes:end -->

```jsx
// Import from the sub-path, not from "semiotic"
import { LineChart } from "semiotic/xy"
import { BarChart } from "semiotic/ordinal"
import { SankeyDiagram } from "semiotic/network"
import { ChoroplethMap } from "semiotic/geo"
```

**Tree-shaking**: Each sub-path is a self-contained bundle with `"sideEffects": false`. Bundlers (webpack, Rollup, Vite, esbuild) will tree-shake unused exports. If you only use `LineChart` from `semiotic/xy`, the bar/pie/network code is never included.

**When to use `"semiotic"`**: Only if your app uses charts from 3+ categories (XY + ordinal + network) and you'd rather have one import than three. The full bundle is roughly the sum of every sub-path bundle above — see the `semiotic` row of the table for the current number.

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

For standalone SVG/PNG/GIF generation (email, OG images, PDF, Slack), use the server entry point:

```js
import { renderChart, renderToImage, renderToAnimatedGif } from "semiotic/server"

// SVG — sync, no dependencies
const svg = renderChart("LineChart", {
  data, xAccessor: "date", yAccessor: "value",
  theme: "tufte", title: "Revenue Trend",
})

// PNG — async, requires sharp
const png = await renderToImage("BarChart", { data, ... }, { format: "png", scale: 2 })

// Animated GIF — async, requires sharp + gifenc
const gif = await renderToAnimatedGif("line", data, { ... }, { fps: 12 })
```

## MCP Server

mcp-name: io.github.nteract/semiotic

Semiotic ships with an [MCP server](https://modelcontextprotocol.io) that lets AI coding assistants render charts, diagnose configuration problems, discover schemas, read packaged AI guidance, and get chart recommendations via tool calls.

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

No API keys or authentication required. The server runs locally via stdio. HTTP mode is also available for inspectors, web clients, and ChatGPT Apps SDK experiments: `npx semiotic-mcp --http --port 3001`.

For ChatGPT developer mode, expose the HTTP endpoint over HTTPS with a tunnel and create a connector that points at `https://<your-tunnel>/mcp`. The experimental Apps SDK surface is `renderInteractiveChart`, which returns a `text/html;profile=mcp-app` widget template plus a hidden SVG payload rendered by Semiotic on the MCP server.

### Tools

| Tool | Description |
|------|-------------|
| **`renderChart`** | Render a Semiotic chart to static SVG. Supports the components returned by `getSchema` that are marked `[renderable]`. Pass `{ component: "LineChart", props: { data: [...], xAccessor: "x", yAccessor: "y" } }`. Returns SVG string plus a "Render evidence" JSON block (mark counts by scene type, resolved axis domains, empty flag, annotation count, accessible name) so agents can verify the chart drew data marks, or validation errors with fix suggestions. |
| **`renderInteractiveChart`** | Render a static-data chart as a ChatGPT Apps widget. Uses the same Semiotic server render path as `renderChart`, then hydrates an iframe UI with fit, zoom, data, hover, and render-evidence controls. |
| **`getSchema`** | Return the prop schema for a specific component. Pass `{ component: "LineChart" }` to get its props, or omit `component` to list all 47 chart schemas. Components marked `[renderable]` are available through `renderChart`; realtime charts require a browser/live environment. |
| **`suggestChart`** | Legacy sample-row recommender. Pass `{ data: [{...}, ...] }` with 1–5 sample objects plus optional broad intent/capability filters. |
| **`suggestCharts`** | Capability-based recommender for bounded row data. Returns ranked chart suggestions with scores, reasons, caveats, import paths, and ready-to-use props. |
| **`suggestStreamCharts`** | Recommend realtime charts from a stream schema, throughput, and retention hints. |
| **`suggestDashboard`** | Build a multi-panel dashboard suggestion that covers distinct analytical intents. |
| **`suggestStretchCharts`** | Recommend audience-literacy stretch picks from an `AudienceProfile`. |
| **`repairChartConfig`** | Check whether a requested chart fits a dataset and return ranked alternatives when it does not. |
| **`interrogateChart`** | Return a statistical summary and chart-aware context for answering natural-language questions with optional annotations. |
| **`diagnoseConfig`** | Check a chart configuration for common problems — empty data, bad dimensions, missing accessors, wrong data shape, and more. Returns a human-readable diagnostic report with actionable fixes. |
| **`reportIssue`** | Generate a pre-filled GitHub issue URL for bug reports or feature requests. Pass `{ title: "...", body: "...", labels: ["bug"] }`. Returns a URL the user can open to submit. |
| **`applyTheme`** | List named theme presets or return ThemeProvider/CSS/token usage for a preset such as `{ name: "tufte" }`. |

### Resources

| Resource | Description |
|----------|-------------|
| **`semiotic://schema`** | Full machine-readable component schema JSON. |
| **`semiotic://components`** | Component index showing renderable/browser-only status and MCP categories. |
| **`semiotic://behavior-contracts`** | Agent-visible semantic rules for color precedence, required prop combinations, push refs, and renderability. |
| **`semiotic://system-prompt`** | Compact AI instructions with import rules, chart props, SSR guidance, and pitfalls. |
| **`semiotic://examples`** | Copy-paste chart examples by data shape. |
| **`ui://semiotic/chart-widget.html`** | ChatGPT Apps / MCP Apps widget template used by `renderInteractiveChart`. |

### Prompts

| Prompt | Description |
|--------|-------------|
| **`build-semiotic-chart`** | Reusable workflow for choosing a chart, reading schema, diagnosing props, and rendering a preview. |
| **`debug-semiotic-chart`** | Reusable workflow for debugging invalid props, rendering failures, and issue reports. |

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

### Example: render a ChatGPT Apps widget

```
Tool: renderInteractiveChart
Args: {
  "component": "BarChart",
  "props": {
    "title": "Revenue by Quarter",
    "data": [
      { "quarter": "Q1", "revenue": 120 },
      { "quarter": "Q2", "revenue": 180 }
    ],
    "categoryAccessor": "quarter",
    "valueAccessor": "revenue"
  }
}
→ Returns: structured chart summary for the model + hidden SVG/widget metadata for ChatGPT.
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
npx semiotic-ai --list         # list components with import paths and renderability
npx semiotic-ai --list --json  # machine-readable component index
npx semiotic-ai --schema GaugeChart
npx semiotic-ai --suggest '{"data":[{"category":"A","value":10}],"intent":"comparison"}'
npx semiotic-ai --doctor       # validate component + props JSON
npx semiotic-ai --schema       # dump all chart schemas
npx semiotic-ai --compact      # compact schema (fewer tokens)
```

`--doctor` uses the full `diagnoseConfig` checks when `dist` is available and falls back to schema-only validation in clean source checkouts.

## Where to find Semiotic for AI assistants

Semiotic is indexed by AI-coding-agent documentation tools so your assistant (Claude Code, Cursor, Cline, Copilot, etc.) can pull current docs and tools without copy-paste:

- **Context7** — [context7.com/nteract/semiotic](https://context7.com/nteract/semiotic) (configured via `context7.json`)
- **DeepWiki** — [deepwiki.com/nteract/semiotic](https://deepwiki.com/nteract/semiotic)
- **GitMCP** — [gitmcp.io/nteract/semiotic](https://gitmcp.io/nteract/semiotic) (exposes the repo as an MCP endpoint directly)
- **Official MCP Registry** — search "semiotic" at [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io)
- **Smithery** — [smithery.ai/server/nteract/semiotic](https://smithery.ai/server/nteract/semiotic)

Agent-facing API surface:

- **`CLAUDE.md`**, **`ai/schema.json`**, **`ai/behaviorContracts.cjs`** — bundled in the npm tarball (see `package.json#files`); agents that install Semiotic locally read these directly. `CLAUDE.md` is the quick-start cheat sheet (HOC props, push API, theming, usage notes); `ai/schema.json` is the JSON Schema for every chart's prop surface (47 charts); `ai/behaviorContracts.cjs` carries the agent-visible semantic rules (color precedence, push-mode requirements, ID-accessor contracts).
- [**`semiotic.nteract.io/llms.txt`**](https://semiotic.nteract.io/llms.txt) + [**`/llms-full.txt`**](https://semiotic.nteract.io/llms-full.txt) — deployed at the docs site per the [llms.txt standard](https://llmstxt.org). Agents fetch the navigation map (`llms.txt`) or the full inlined docs (`llms-full.txt`) over HTTP; they're not part of the npm package itself.

## Documentation

[Interactive docs and examples](https://semiotic.nteract.io)

- [Getting Started](https://semiotic.nteract.io/getting-started)
- [Charts](https://semiotic.nteract.io/charts) — chart types with live examples
- [Frames](https://semiotic.nteract.io/frames) — full Frame API reference
- [Features](https://semiotic.nteract.io/features) — axes, tooltips, interaction, responsive behavior, and composition
- [Annotations](https://semiotic.nteract.io/annotations) — first-class annotation types, design guidance, provenance, and lifecycle
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
