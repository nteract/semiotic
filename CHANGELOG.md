# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-03-10

Complete rewrite of Semiotic. Stream-first canvas architecture, 28 HOC chart
components, full TypeScript, AI tooling, coordinated views, realtime encoding,
and native server-side rendering.

### Architecture

**Stream-first rendering.** All frames are canvas-first with SVG overlays for
labels, axes, and annotations. Legacy frame names (`XYFrame`, `OrdinalFrame`,
`NetworkFrame`) have been removed entirely.

| Frame | Purpose |
|---|---|
| `StreamXYFrame` | Line, area, scatter, heatmap, candlestick charts |
| `StreamOrdinalFrame` | Bar, pie, boxplot, violin, swarm charts |
| `StreamNetworkFrame` | Force, sankey, chord, tree, treemap, circlepack |

Every frame supports a ref-based push API for streaming data.

**Functional components + hooks.** All components converted from class-based to
functional. Full TypeScript strict mode with generic type parameters on all
Frame and Chart components. `"use client"` directives for React Server
Components compatibility.

### Added

#### Chart Components (HOCs)

28 higher-order chart components that wrap the core Frames with curated,
simple prop APIs.

**XY Charts** (wrap StreamXYFrame):
- `LineChart` — line traces with curve interpolation, area fill, and point markers
- `AreaChart` — filled area beneath a line
- `StackedAreaChart` — multiple stacked area series
- `Scatterplot` — point clouds with color and size encoding
- `ConnectedScatterplot` — sequential path through 2D space with Viridis gradient
- `BubbleChart` — sized circles with optional labels
- `Heatmap` — 2D binned density visualization

**Ordinal Charts** (wrap StreamOrdinalFrame):
- `BarChart` — vertical/horizontal bars with sort and color encoding
- `StackedBarChart` — stacked categorical bars
- `GroupedBarChart` — side-by-side grouped bars
- `SwarmPlot` — force-directed point distribution
- `BoxPlot` — statistical box-and-whisker
- `Histogram` — binned frequency distribution
- `ViolinPlot` — kernel density per category
- `DotPlot` — sorted dot strips
- `PieChart` — proportional slices
- `DonutChart` — ring variant of PieChart

**Network Charts** (wrap StreamNetworkFrame):
- `ForceDirectedGraph` — force-simulation node-link diagrams
- `ChordDiagram` — circular connection matrix
- `SankeyDiagram` — flow diagrams with weighted edges
- `TreeDiagram` — hierarchical tree layouts
- `Treemap` — space-filling hierarchical rectangles
- `CirclePack` — nested circle packing
- `OrbitDiagram` — animated orbital hierarchy with solar/atomic/flat modes

**Realtime Charts** (canvas-based streaming):
- `RealtimeLineChart` — streaming line
- `RealtimeHistogram` — streaming histogram bars
- `RealtimeSwarmChart` — streaming scatter
- `RealtimeWaterfallChart` — streaming waterfall/candlestick
- `RealtimeHeatmap` — streaming 2D heatmaps with grid binning

All chart components feature:
- Full TypeScript generics (`LineChart<TDatum>`)
- Sensible defaults for width, height, margins, colors, hover
- `frameProps` escape hatch for accessing the underlying Frame API
- Automatic legend rendering when `colorBy` is set
- Smart margin expansion to accommodate legends and axis labels
- Built-in error boundary (never blanks the page) and dev-mode validation warnings

#### Server-Side Rendering

Two SSR paths, both producing identical SVG output:

**Component-level SSR** — Stream Frames detect server context
(`typeof window === "undefined"`) and render `<svg>` elements with scene
nodes instead of `<canvas>`. Same component, same props — works automatically
in Next.js App Router, Remix, and Astro.

**Standalone SSR** — `semiotic/server` entry point for Node.js environments
(email, OG images, PDF, static sites):

```js
import { renderToStaticSVG } from "semiotic/server"

const svg = renderToStaticSVG("xy", {
  lines: [{ coordinates: data }],
  xAccessor: "date",
  yAccessor: "value",
  size: [600, 400],
})
```

- `renderToStaticSVG(frameType, props)` — generic entry point
- `renderXYToStaticSVG(props)` — XY-specific
- `renderOrdinalToStaticSVG(props)` — ordinal-specific
- `renderNetworkToStaticSVG(props)` — network-specific
- Shared SceneToSVG converters used by both paths

#### Realtime Visual Encoding System
- `decay` prop — configurable opacity fade for older data (linear, exponential, step modes)
- `pulse` prop — glow flash effect on newly inserted data points with configurable duration/color
- `transition` prop — smooth position interpolation with ease-out cubic easing
- `staleness` prop — canvas dimming + optional LIVE/STALE badge when data feed stops
- All four features work on StreamXYFrame, StreamOrdinalFrame, and all realtime HOCs
- Features compose freely (e.g., decay + pulse creates a data trail with flash-on-arrival)

#### Marginal Graphics
- `marginalGraphics` prop on `StreamXYFrame`, `Scatterplot`, and `BubbleChart`
- Four types: **histogram**, **violin**, **ridgeline**, **boxplot**
- Margins auto-expand to 60px minimum when marginals are configured

#### Coordinated Views
- `LinkedCharts` — cross-highlighting, brushing-and-linking, and crossfilter between any charts
- Selection hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`
- `ScatterplotMatrix` — N×N grid with hover cross-highlight or crossfilter brushing
- `CategoryColorProvider` — stable category→color mapping across charts

#### Threshold-based Line Coloring
- Annotations with `type: "threshold"` automatically split lines into colored segments
- Interpolates exact crossing points between data samples

#### ThemeProvider
- `ThemeProvider` wraps charts and injects CSS custom properties
- Presets: `"light"` (default) and `"dark"`
- `useTheme()` hook

#### Layout & Composition
- `ChartGrid` — CSS Grid layout with auto columns
- `ContextLayout` — primary + context panel layout

#### AI Tooling

- **`semiotic/ai`** — HOC-only surface optimized for LLM code generation
- **`ai/schema.json`** — machine-readable prop schemas for every component
- **MCP server** (`npx semiotic-mcp`) — renders charts as SVG tools for any MCP client
  - Per-component tools for all 21 SVG-renderable chart types
  - Generic `renderChart` tool accepting `{ component, props }`
  - `diagnoseConfig` tool for anti-pattern detection
- **`validateProps(componentName, props)`** — prop validation with Levenshtein typo suggestions
- **`diagnoseConfig(componentName, props)`** — anti-pattern detector with 12 checks:
  `EMPTY_DATA`, `EMPTY_EDGES`, `BAD_WIDTH`, `BAD_HEIGHT`, `BAD_SIZE`,
  `ACCESSOR_MISSING`, `HIERARCHY_FLAT_ARRAY`, `NETWORK_NO_EDGES`,
  `DATE_NO_FORMAT`, `LINKED_HOVER_NO_SELECTION`, `MARGIN_OVERFLOW_H`, `MARGIN_OVERFLOW_V`
- **CLI** (`npx semiotic-ai`) — `--schema`, `--compact`, `--examples`, `--doctor`
- **`CLAUDE.md`** — instruction file for Claude, Cursor, Copilot, Windsurf, and Cline
- **Schema freshness CI** — cross-references schema.json, VALIDATION_MAP, and CLAUDE.md

#### Other
- `onObservation` — structured events (hover, click, brush, selection) on all HOCs
- `useChartObserver` — aggregates observations across LinkedCharts
- `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX` — chart serialization
- `fromVegaLite(spec)` — translate Vega-Lite specs to Semiotic configs
- `exportChart()` — download charts as SVG or PNG
- `ChartErrorBoundary` — React error boundary
- `DetailsPanel` — click-driven detail panel inside `ChartContainer`
- Data transform helpers (`semiotic/data`): `bin`, `rollup`, `groupBy`, `pivot`
- `Tooltip` and `MultiLineTooltip` components with field-based configuration
- Keyboard navigation utilities

#### Granular Bundle Exports

Eight separate entry points for reduced bundle sizes:

| Entry Point | Contents |
|---|---|
| `semiotic` | Full library |
| `semiotic/xy` | XY Frame + XY charts |
| `semiotic/ordinal` | Ordinal Frame + ordinal charts |
| `semiotic/network` | Network Frame + network charts |
| `semiotic/realtime` | Realtime charts |
| `semiotic/server` | SSR rendering functions |
| `semiotic/ai` | HOC-only surface for AI generation |
| `semiotic/data` | Data transform utilities |

#### HOC Shared Infrastructure

Extracted shared logic from all HOC chart components into reusable hooks:

- **`useChartSelection` hook** — selection/hover setup used by 21 charts
- **`useChartLegendAndMargin` hook** — legend + margin auto-expansion used by 18 charts
- **`buildOrdinalTooltip` helper** — shared tooltip builder for ordinal charts
- **Network utilities** — `flattenHierarchy`, `inferNodesFromEdges`, `resolveHierarchySum`, `createEdgeStyleFn`

### Changed

#### Build System

- Rollup 2.x → Rollup 4.x with Terser minification
- Modern ESM output with `const` bindings (ES2015 target)
- `sideEffects: false` for aggressive tree-shaking
- Modern `exports` field in package.json for proper ESM/CJS resolution

#### React 18 Requirement

Minimum React version is now 18.1.0 (was 16.x in v1, 17.x in v2).
Also supports React 19.

#### Network Layout Refactoring

The monolithic `processing/network.ts` has been split into focused layout plugins:
sankey, force, chord, tree, cluster, treemap, circlepack, partition.

### Removed

- **All legacy frames** — `XYFrame`, `OrdinalFrame`, `NetworkFrame` and their Responsive/Spark variants. Use `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`.
- **`FacetController`** — use `LinkedCharts`
- **`RealtimeSankey`**, **`RealtimeNetworkFrame`** — use `StreamNetworkFrame` with `chartType="sankey"`
- **`baseMarkProps`**, **`ProcessViz`**, **`Mark`**, **`SpanOrDiv`** — removed internal utilities

### Fixed

- Chord diagram arc/ribbon angle alignment
- Stacked area streaming flicker (stable sort of groups)
- Violin plot IQR positioning
- Sankey particle colors
- Canvas clip region (marks no longer draw into margins)
- Tooltip position flipping at chart edges
- Stacked bar color encoding, streaming aggregation, and category flicker
- Force layout initial positions (phyllotaxis spiral)
- Treemap hover (smallest containing rect wins)
- Axis label floating-point noise and overlap
- ThemeProvider integration with SVG overlay axes and canvas background
- HOC chart data validation (visible error element instead of blank)
- 30+ additional rendering, theming, and coordination fixes

---

## [2.0.0-rc.12] - 2021

Version 2.0 was an internal milestone that began the transition from class
components to functional components and introduced initial TypeScript support.
It was never promoted to a stable release.

Notable changes from v1:
- Initial functional component conversions
- TypeScript adoption began
- React 17 compatibility

---

## [1.20.6] - 2020-12-02

- Add `customClickBehavior` with hover pointer state for legend interactions
- Make difference between vertical and horizontal group rendering explicit

## [1.20.5] - 2020-01-21

- Fix canvas interactivity with custom canvas function

---

For the complete v1.x changelog, see the
[git history](https://github.com/nteract/semiotic/commits/main).
