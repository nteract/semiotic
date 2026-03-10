# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0-beta.4] - 2026-03-10

### Added

#### Server-Side Rendering Overhaul

Stream Frames now render SVG natively in server environments — no separate rendering path needed.

- **Component-level SSR** — `StreamXYFrame`, `StreamOrdinalFrame`, and `StreamNetworkFrame` detect server context (`typeof window === "undefined"`) and render `<svg>` elements with scene nodes instead of `<canvas>`
- **Shared SceneToSVG converters** (`src/components/stream/SceneToSVG.tsx`) — single source of truth for scene→SVG conversion, used by both Stream Frames and `renderToStaticSVG`
  - `xySceneNodeToSVG` — line, area, point, rect, heatcell, candlestick
  - `ordinalSceneNodeToSVG` — rect, point, wedge, boxplot, violin, connector
  - `networkSceneNodeToSVG` — circle, rect, arc nodes
  - `networkSceneEdgeToSVG` — line, bezier, ribbon, curved edges
  - `networkLabelToSVG` — text labels
- **19 component-level SSR tests** proving HOC charts produce visible SVG marks (not empty canvas tags) via `ReactDOMServer.renderToStaticMarkup` in a Node environment
- **`renderToStaticSVG` rewritten** to use shared SceneToSVG converters, eliminating duplicated conversion code

#### AI Tooling Improvements

- **Levenshtein typo suggestions** — `validateProps` now suggests closest prop name when an unknown prop is passed (e.g., `"linewidth"` → `'Did you mean "lineWidth"?'`)
- **`diagnoseConfig` anti-pattern detector** — checks 12 common failure modes with severity, code, message, and actionable fix:
  - `EMPTY_DATA`, `EMPTY_EDGES`, `BAD_WIDTH`, `BAD_HEIGHT`, `BAD_SIZE`
  - `ACCESSOR_MISSING`, `HIERARCHY_FLAT_ARRAY`, `NETWORK_NO_EDGES`
  - `DATE_NO_FORMAT`, `LINKED_HOVER_NO_SELECTION`, `MARGIN_OVERFLOW_H`, `MARGIN_OVERFLOW_V`
- **MCP `renderChart` tool** — generic tool accepting `{ component, props }`, renders any chart to SVG
- **MCP `diagnoseConfig` tool** — anti-pattern detector available as MCP tool for AI assistants
- **Schema freshness CI** (`scripts/check-schema-freshness.js`) — cross-references `schema.json`, `VALIDATION_MAP`, and `CLAUDE.md` to catch drift
- **ConnectedScatterplot and OrbitDiagram** added to `VALIDATION_MAP`, `schema.json`, and `componentRegistry`
- **`npx semiotic-ai --doctor`** upgraded to use `diagnoseConfig` in addition to `validateProps`

---

## [3.0.0-beta.3] - 2026-03-04

### Changed

- **MCP server imports refactored** — replaced 20 relative `../src/` imports with a single barrel import from `"semiotic/ai"`, eliminating 1.4MB of duplicated source files from the npm package
- **Package size reduced** — packed size 870 KB → 668 KB, unpacked 3.6 MB → 2.5 MB (30% reduction)
- `tsconfig.mcp.json` no longer compiles `src/` — MCP build output is 3 flat files in `ai/dist/`

#### HOC Chart Refactoring

Extracted shared logic from all 26 HOC chart components into reusable hooks and utilities, reducing duplication by ~500 lines while improving consistency across chart families.

- **`useChartSelection` hook** — consolidates selection/hover setup (normalizeLinkedHover, useSelection, useLinkedHover, customHoverBehavior) used by 21 charts
- **`useChartLegendAndMargin` hook** — consolidates legend creation and margin computation with legend-aware auto-expansion, used by 18 charts
- **`buildOrdinalTooltip` helper** — shared tooltip builder for ordinal charts (BarChart, DotPlot, PieChart, DonutChart, SwarmPlot, StackedBarChart, GroupedBarChart)
- **Network utilities** (`networkUtils.ts`) — `flattenHierarchy`, `inferNodesFromEdges`, `resolveHierarchySum`, `createEdgeStyleFn` extracted from 5 network chart HOCs
- **`DEPTH_PALETTE_COLORS`** — unified depth-based color palette constant for Treemap, CirclePack, TreeDiagram (was duplicated inline)
- Standardized `resolveAccessor()` usage across all ordinal chart tooltips

### Fixed

#### Core Rendering
- **Chord diagram edge rotation** — removed double `-PI/2` offset in ribbon generation that caused 180° misalignment
- **Stacked area streaming flicker** — stable sort of groups in `buildStackedAreaScene()` prevents layer swapping during sliding window eviction
- **Violin plot IQR positioning** — IQR overlay now draws at the category center position instead of x=0
- **Waterfall custom colors** — `waterfallStyle` props now piped through to PipelineStore; previously silently ignored
- **Histogram streaming projection** — streaming histograms now correctly use horizontal projection
- **Canvas clip region** — StreamXYFrame clips rendered data to the chart area, preventing marks from drawing into margins when xExtent/yExtent constrains the view
- **Sankey particle colors** — particles now inherit edge color by syncing nodeColorMap with store's node ordering after layout
- **Pulse glow radius** — renderer reads `_pulseGlowRadius` from scene nodes instead of hardcoding 4px
- **LineChart validation** — `validateArrayData` now checks coordinate arrays (not top-level line objects) when data is in line objects format

#### Theming & Styling
- **ThemeProvider integration** — SVG overlay axes, ticks, labels, and grid lines now read `--semiotic-*` CSS custom properties; canvas background reads theme variables
- **Line hover highlighting** — StreamXYFrame supports `hoverAnnotation` array with `type: "highlight"` for bold stroke on hovered lines
- **Jagged baseline** — SVGOverlay now renders sawtooth zigzag path when axis config includes `jaggedBase: true`

#### Coordinated Views
- **Small multiples bidirectional hover** — `useChartSelection` always unwraps `d.data || d.datum || d` for consistent datum extraction across XY and ordinal frames
- **SankeyDiagram tooltip** — now calls `normalizeTooltip` like all other charts (was skipping it, only accepting function tooltips)

#### Consistency
- **Heatmap margin** — now respects user `margin` prop overrides via `useChartLegendAndMargin`
- **RealtimeHeatmap `linkedHover`** — new prop enables participation in LinkedCharts coordinated views
- **RealtimeHistogram encodings** — new `decay`, `pulse`, `staleness`, `transition` props (parity with other realtime charts)
- **MinimapChart overflow** — brush overlay container clips to chart width

#### Documentation Pages
- Fixed 20+ docs page issues: tooltips, legends, streaming demos, data formats, nav structure, example styling
- Removed obsolete styling examples (sketchy rendering, SVG patterns)
- Removed duplicate TreeDiagram treemap example
- Added decay/pulse to DotPlot, SwarmPlot, HomerunMap streaming demos
- Added legends to GroupedBarChart, PieChart, DonutChart streaming demos
- Fixed ForceDirectedGraph streaming to auto-start
- Moved Realtime Histogram to XY Charts nav section

---

## [3.0.0-beta.2] - 2026-03-04

### Stream-First Architecture

All frames are now canvas-first with SVG overlays for labels, axes, and annotations.
Legacy frame names (`XYFrame`, `OrdinalFrame`, `NetworkFrame`) have been removed entirely.

| Frame | Purpose |
|---|---|
| `StreamXYFrame` | Line, area, scatter, heatmap, candlestick charts |
| `StreamOrdinalFrame` | Bar, pie, boxplot, violin, swarm charts |
| `StreamNetworkFrame` | Force, sankey, chord, tree, treemap, circlepack |

Every frame supports a ref-based push API for streaming data.

### Added

#### Marginal Graphics
- `marginalGraphics` prop on `StreamXYFrame`, `Scatterplot`, and `BubbleChart` renders distribution plots in chart margins
- Four types: **histogram**, **violin**, **ridgeline**, **boxplot** — each configurable with `bins`, `fill`, `fillOpacity`, `stroke`, `strokeWidth`
- String shorthand (`{ top: "histogram" }`) or full config object (`{ top: { type: "histogram", bins: 30, fill: "red" } }`)
- Margins auto-expand to 60px minimum when marginals are configured
- Rendered as SVG in the overlay layer — aligns bin positions to the chart's own scales
- Cookbook page at `/cookbook/marginal-graphics`

#### Realtime Visual Encoding System
- `decay` prop — configurable opacity fade for older data (linear, exponential, step modes)
- `pulse` prop — glow flash effect on newly inserted data points with configurable duration/color
- `transition` prop — smooth position interpolation with ease-out cubic easing
- `staleness` prop — canvas dimming + optional LIVE/STALE badge when data feed stops
- All four features work on StreamXYFrame, StreamOrdinalFrame, and all realtime HOCs
- Features compose freely (e.g., decay + pulse creates a data trail with flash-on-arrival)

#### RealtimeHeatmap
- New HOC for streaming 2D heatmaps with grid binning
- Configurable bin counts (`heatmapXBins`, `heatmapYBins`) and aggregation modes (count, sum, mean)
- Supports decay, pulse, and staleness realtime encodings
- Docs page at `/charts/realtime-heatmap` with three live demos

#### Streaming Bubble Encoding
- `sizeAccessor` and `colorAccessor` now work in streaming mode on scatter/bubble charts
- PipelineStore computes dynamic size scale and color map from current buffer data

#### Realtime Encoding Docs
- New feature page at `/features/realtime-encoding` with interactive demos for all four encodings

#### StreamNetworkFrame
- Unified canvas-first network frame replacing both legacy NetworkFrame and RealtimeNetworkFrame
- Layout plugins: sankey, force, chord, tree, cluster, treemap, circlepack, partition
- Push API: `ref.current.push({ source, target, value })`
- Tension-based relayout batching for high-frequency streaming
- Particle animation for sankey flows
- Auto-coloring by node index when no explicit style is provided
- Hierarchy tooltip with ancestor breadcrumb path (grandparent → parent → **node**)

#### Threshold-based line coloring
- Streaming line charts change color at threshold crossings
- Annotations with `type: "threshold"` automatically split the line into colored segments
- Interpolates exact crossing points between data samples

#### New chart types
- **Histogram** — binned frequency distribution
- **ViolinPlot** — kernel density per category
- **ScatterplotMatrix** — N×N grid with hover cross-highlight or crossfilter brushing

#### ThemeProvider
- `ThemeProvider` wraps charts and injects CSS custom properties
- Presets: `"light"` (default) and `"dark"`
- `useTheme()` hook

#### LinkedCharts (coordinated views)
- Cross-highlighting, brushing-and-linking, and crossfilter between any charts
- Selection hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`

#### Other
- `exportChart()` — download charts as SVG or PNG
- `ChartErrorBoundary` — React error boundary for charts
- Data transform helpers (`semiotic/data`): `bin`, `rollup`, `groupBy`, `pivot`

### Fixed

- Home page gallery: charts not rendering when arrowing between two adjacent StreamXYFrame examples (added key to force remount)
- Chord diagram arc/ribbon angle alignment (d3-chord 12-o'clock → canvas 3-o'clock offset)
- Stacked bar color encoding — `barColors` now maps by stack key, not category name
- Stacked bar streaming aggregation — one rect per stack group instead of one per datum
- Bar chart scale overflow — non-stacked bar domain covers per-category totals
- Swarm category stability — streaming mode preserves insertion order by default
- Bubble/scatter opacity — renderer now reads both `opacity` and `fillOpacity`
- Histogram baseline alignment — bars grow from baseline, not centered
- Tooltip config objects — `normalizeTooltip` handles `{ title, fields }` objects
- LinkedCharts BarChart hover — extracts `d.data` before passing to linked hover hook
- Frame docs pages rewritten to use correct StreamFrame API
- LiveExample renders with fallback size before ResizeObserver fires
- Stacked area streaming demo replaced (was incorrectly using RealtimeHistogram)
- Feature pages (sparklines, responsive, interaction, tooltips, annotations) fixed from v1 to v2 API
- Stacked bar category flicker during streaming (stable global category order)
- Chord ribbon centering (paths translated to chart center)
- Force layout initial positions (phyllotaxis spiral instead of origin singularity)
- Hierarchy charts rendering (store now handles hierarchical plugin data flow)
- Treemap hover (smallest containing rect wins, not first/root)
- Tree tooltip suppresses zero values
- `colorBy`/`edgeColorBy` on all network charts (style functions now access `d.data`)
- Hover state persisting on mouseout
- Axis label floating-point noise and overlap
- Histogram always horizontal; tooltip shows correct count

### Removed

- **`NetworkFrame`** — deleted entirely. Use `StreamNetworkFrame`.
- **`Frame`**, **`InteractionLayer`**, **`VisualizationLayer`** — deleted (old SVG internals)
- **`ResponsiveNetworkFrame`**, **`SparkNetworkFrame`**, **`ResponsiveFrame`**, **`SparkFrame`** — deleted
- **`RealtimeSankey`** — use `StreamNetworkFrame` with `chartType="sankey"` and `showParticles`
- **`RealtimeNetworkFrame`** — use `StreamNetworkFrame`
- **`realtime-network/`** directory — `ParticlePool` and types moved to `stream/`
- **`features/canvas-rendering`** page — canvas is now the default rendering surface
- **`cookbook/bar-line-chart`** page
- **`cookbook/waterfall-chart`** page — replaced by RealtimeWaterfallChart
- **`features/axes`** StreamOrdinalFrame axes section
- **`FacetController`** — use `LinkedCharts`
- **Matrix cookbook recipe** — removed
- **Legacy frame aliases** (`OrdinalFrame`, `ResponsiveOrdinalFrame`, `SparkOrdinalFrame`, etc.) — no longer exported. Use `StreamOrdinalFrame`, `StreamXYFrame`, `StreamNetworkFrame` directly.
- **`RealtimeFrame` docs page** — content merged into chart pages
- **`baseMarkProps`**, **`ProcessViz`**, **`Mark`** — removed in earlier v3 work

---

#### AI Enablement

Five features to deepen AI integration with Semiotic.

**Compact System Prompt** (`ai/system-prompt.md`):
- ~30-line prompt listing all 24 components grouped by data shape (flat array, hierarchical, network, realtime)
- Marks required and distinguishing props per component
- Designed for pasting into custom instructions or system prompts

**Embeddings-Friendly Examples** (`ai/examples.md`):
- Copy-paste-ready examples for 13 chart types covering all 4 data shapes
- Each example includes import, realistic inline data, and key props annotation
- Covers: LineChart (single + multi-line), Scatterplot, Heatmap, BarChart, StackedBarChart, GroupedBarChart, TreeDiagram, Treemap, CirclePack, ForceDirectedGraph, SankeyDiagram, ChordDiagram

**`validateProps` Function** (exported from `semiotic/ai`):
- `validateProps(componentName, props)` returns `{ valid: boolean, errors: string[] }`
- Validates: component name, required props, prop types, enum values, unknown props (typo detection)
- Delegates data shape validation to existing `validateArrayData`/`validateObjectData`/`validateNetworkData`
- Static validation map covering all 24 components with per-prop type and enum constraints

**CLI Tool** (`ai/cli.js`):
- `npx semiotic-ai` — dumps CLAUDE.md to stdout
- `npx semiotic-ai --schema` — dumps ai/schema.json
- `npx semiotic-ai --compact` — dumps ai/system-prompt.md
- `npx semiotic-ai --examples` — dumps ai/examples.md
- Plain Node.js, no dependencies, no build step

**MCP Server** (`ai/mcp-server.ts`):
- Exposes 20 SVG-renderable chart components as MCP tools
- Renders to static SVG via `ReactDOMServer.renderToStaticMarkup`
- Uses `ai/schema.json` for tool definitions, `validateProps` for error reporting
- Component registry maps names to React components
- Separate build: `npm run build:mcp` (TypeScript → `ai/dist/`)
- Usage: `npx semiotic-mcp` in Claude Desktop or any MCP client

---

## [3.0.0-beta.1] - 2026-02-28

### Added

#### Chart Components (HOCs)

Twenty-four higher-order chart components that wrap the core Frames with curated,
simple prop APIs. These are the recommended entry point for most users.

**XY Charts** (wrap StreamXYFrame):
- `LineChart` — line traces with curve interpolation, area fill, and point markers
- `AreaChart` — filled area beneath a line
- `StackedAreaChart` — multiple stacked area series
- `Scatterplot` — point clouds with color and size encoding
- `BubbleChart` — sized circles with optional labels
- `Heatmap` — 2D binned density visualization
- `RealtimeWaterfallChart` — canvas-based streaming waterfall/candlestick
- `RealtimeLineChart` — canvas-based streaming line
- `RealtimeHistogram` — canvas-based streaming histogram bars
- `RealtimeSwarmChart` — canvas-based streaming scatter

**Ordinal Charts** (wrap StreamOrdinalFrame):
- `BarChart` — vertical/horizontal bars with sort and color encoding
- `StackedBarChart` — stacked categorical bars
- `GroupedBarChart` — side-by-side grouped bars
- `SwarmPlot` — force-directed point distribution
- `BoxPlot` — statistical box-and-whisker
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

All chart components feature:
- Full TypeScript generics (`LineChart<TDatum>`)
- Sensible defaults for width, height, margins, colors, hover
- `frameProps` escape hatch for accessing the underlying Frame API
- Automatic legend rendering when `colorBy` is set
- Smart margin expansion to accommodate legends and axis labels

#### Server-Side Rendering

Static SVG rendering for Node.js environments (email, OG images, PDF, static sites).

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
- Supports axes, titles, annotations, matte, and defs
- No animation or interactivity (pure static markup)

#### Granular Bundle Exports

Six separate entry points for reduced bundle sizes:

| Entry Point | Contents | Minified |
|---|---|---|
| `semiotic` | Full library | 218 KB |
| `semiotic/xy` | XYFrame + XY charts + utilities | 125 KB |
| `semiotic/ordinal` | OrdinalFrame + ordinal charts + utilities | 140 KB |
| `semiotic/network` | NetworkFrame + network charts + utilities | 133 KB |
| `semiotic/realtime` | RealtimeFrame + realtime charts | ~24 KB |
| `semiotic/server` | SSR rendering functions | ~130 KB |

Each entry point includes the relevant Frame, chart components, and shared
utilities (Axis, Legend, Annotation, Brush). The default `semiotic` import
continues to work and includes everything.

#### Shared Chart Utilities

New helper modules in `src/components/charts/shared/`:

- `useColorScale(data, colorBy, colorScheme)` — memoized color scale hook
- `useSortedData(data, sort, valueAccessor)` — memoized sorted data hook
- `resolveAccessor(accessor)` — string-to-function normalization
- `colorUtils` — `createColorScale()`, `getColor()`, `COLOR_SCHEMES`
- `formatUtils` — `formatNumber()`, `formatDate()`, `formatLargeNumber()`, `truncateText()`
- `legendUtils` — legend group creation helpers

#### Tooltip System

New `Tooltip` and `MultiLineTooltip` components with field-based configuration:

```jsx
import { Tooltip, normalizeTooltip } from "semiotic"
```

- `normalizeTooltip()` — convert various tooltip prop shapes to a standard config
- `TooltipProp`, `TooltipConfig`, `TooltipField` TypeScript types
- Custom styling, field labels, format functions, max-width

#### Documentation Playgrounds

Interactive playground pages for live chart exploration:

- `SankeyDiagramPlayground` — orientation, alignment, padding, node width, edge opacity
- `RealtimeLineChartPlayground` — line and waterfall modes with live signal generators
- `RealtimeHistogramPlayground` — stacked time bars and swarm plots with live data

### Changed

#### Functional Components

All components converted from class-based to functional components with hooks:

- `XYFrame` — `useState`, `useMemo`, `useCallback`, `useEffect`
- `OrdinalFrame` — same pattern
- `NetworkFrame` — same pattern
- `Axis`, `Legend`, `Brush`, `AnnotationLayer`, `InteractionLayer` — all functional
- `SparkXYFrame`, `SparkOrdinalFrame`, `SparkNetworkFrame` — all functional
- `ResponsiveXYFrame`, `ResponsiveOrdinalFrame`, `ResponsiveNetworkFrame` — all functional
- `FacetController` — functional

This change is **not breaking** — component APIs remain the same.

#### TypeScript Rewrite

The entire codebase has been converted from JavaScript to TypeScript:

- All source files are `.tsx`/`.ts`
- Full type definitions ship with the package (no separate `@types` needed)
- Generic type parameters on all Frame and Chart components
- Discriminated union types for line types, summary types, and layout configurations
- Type-safe accessor pattern: `ChartAccessor<TDatum, T> = (keyof TDatum & string) | ((d: TDatum) => T)`

#### Build System

- Rollup 2.x → Rollup 4.x
- Added Terser minification (2-pass compression)
- Modern ESM output with `const` bindings (ES2015 target)
- `sideEffects: false` for aggressive tree-shaking
- Modern `exports` field in package.json for proper ESM/CJS resolution
- Bundle analysis via `rollup-plugin-visualizer`

**Bundle size improvements:**

| Metric | Before | After | Change |
|---|---|---|---|
| ESM (unminified) | 574 KB | 574 KB | — |
| ESM (minified) | N/A | 218 KB | new |
| ESM (gzipped) | ~108 KB | ~64 KB | **-41%** |
| XY-only (minified) | N/A | 125 KB | new |

#### React 18 Requirement

Minimum React version is now 18.1.0 (was 16.x in v1, 17.x in v2).

Required for hooks, concurrent features, and `useId`.

#### `"use client"` Directives

All interactive components include `"use client"` directives for compatibility
with React Server Components (Next.js App Router, Remix, etc.).

#### Network Layout Refactoring

The monolithic `processing/network.ts` has been split into focused layout modules:

- `processing/layouts/forceLayout.ts` — force-directed and motifs
- `processing/layouts/hierarchyLayout.ts` — tree, treemap, circle pack
- `processing/layouts/sankeyLayout.ts` — sankey circular
- `processing/layouts/chordLayout.ts` — chord diagrams
- `processing/layouts/simpleLayouts.ts` — matrix, arc, and other simple layouts

This enables lazy loading of layout algorithms.

#### SVG Processing Refactoring

Area drawing, piece layouts, and summary layouts have been split out:

- `svg/hexbinLayout.tsx` — hexagonal binning (was inline in `areaDrawing.tsx`)
- `svg/contourLayout.ts` — contour/isoline generation (was inline)
- `svg/swarmLayout.tsx` — beeswarm layout (was inline in `pieceLayouts.tsx`)

### Removed

- **`baseMarkProps`** — removed from all Frames. Use `lineStyle`, `pointStyle`, or
  `summaryStyle` props for custom mark styling.
- **`ProcessViz` component** — removed. Was a development/debugging utility, not used
  in production code.
- **`Semiotic Mark` component** — removed. Use direct SVG elements or the chart
  components instead.
- **`SpanOrDiv` component** — removed (internal utility, not user-facing).

### Fixed

- **Tooltip position flipping** — tooltips now render to the left of the cursor
  when the hovered element is past the horizontal midpoint of the chart, preventing
  content from being clipped or compressed against the right edge of the frame.
  Applies to all frame types (XYFrame, OrdinalFrame, NetworkFrame) and all HOC
  chart components.
- **SankeyDiagram tooltip** — Sankey tooltips now show flow values for edges
  (`Source → Target: Value`) and totals/degree for nodes. Uses `htmlAnnotationRules`
  for reliable rendering in the annotation pipeline.
- **HOC chart data validation** — all chart components now render a visible
  `ChartError` element instead of silently returning null when required props are
  missing or empty.
- Canvas interaction tooltip behavior improved
- Matrix edges rendering corrected
- Memoization added to data pipeline for better re-render performance
- Default value handling improved in OrdinalFrame

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
