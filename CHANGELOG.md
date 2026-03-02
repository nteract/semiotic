# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### New Chart Types

**RealtimeSankey** — Streaming Sankey diagram with push API:
- Topology grows over time via `ref.current.push({ source, target, value })`
- Dual-layer rendering: SVG for nodes/links/labels, canvas overlay for animated particles
- Tension model batches relayouts — topology changes (new nodes/edges) trigger immediately, weight-only changes accumulate until threshold
- Animated transitions with ease-out cubic interpolation when layout changes
- Particle system with object pool, bezier path evaluation, and chord-based perpendicular offset
- Supports circular/cyclic flows via d3-sankey-circular
- Configurable particle style, tension thresholds, node alignment, and orientation
- Ref handle: `push()`, `pushMany()`, `clear()`, `getTopology()`, `relayout()`, `getTension()`

**Histogram** — Binned frequency distribution chart:
- Uses OrdinalFrame's `summaryType: "histogram"` for automatic binning
- Configurable bin count (`bins`, default 25) and per-category normalization (`relative`)
- Follows the same pattern as BoxPlot with full selection/coordination support

**ViolinPlot** — Kernel density visualization per category:
- Uses OrdinalFrame's `summaryType: "violin"` for symmetric density shapes
- Configurable bin count, interpolation curve (`curve`, default "catmullRom"), and IQR lines (`showIQR`)
- Full selection/coordination support

#### ThemeProvider

Global theming system for Semiotic charts:
- `ThemeProvider` wraps charts and injects CSS custom properties
- `useTheme()` hook for reading the current theme
- Built-in presets: `"light"` (default) and `"dark"` with high-contrast categorical palette
- Custom theme support via partial overrides
- Non-breaking: falls back to current defaults when no provider exists

#### Data Transform Helpers (`semiotic/data`)

New entry point with pure helper functions:
- `bin()` — bin continuous data into histogram-ready format
- `rollup()` — group and aggregate data (sum, mean, count, min, max)
- `groupBy()` — group flat rows into nested line-chart-ready format
- `pivot()` — convert wide data to long format

#### Browser Export

`exportChart()` utility for downloading charts as SVG or PNG:
- Clones SVG, inlines computed styles for standalone rendering
- PNG mode renders to canvas with configurable retina scale
- No new dependencies — uses native browser APIs

#### ChartErrorBoundary

React Error Boundary wrapper for charts:
- Catches render errors and shows a friendly fallback
- Default fallback uses the existing `ChartError` component
- Supports custom fallback (ReactNode or render function) and `onError` callback

#### Coordinated Views & ScatterplotMatrix

A producer-consumer coordination system for cross-highlighting, brushing-and-linking, and cross-filtering between charts. Replaces FacetController.

**LinkedCharts** — React Context provider for coordinated chart views:
- Wraps any number of charts at any depth (no `cloneElement` limitations)
- Named selections with configurable resolution: `union`, `intersect`, or `crossfilter`
- Crossfilter mode excludes the requesting chart's own clause (standard SPLOM pattern)

**Selection hooks** for custom coordinated views:
- `useSelection` — primary hook for reading/writing selections
- `useLinkedHover` — convenience hook for hover cross-highlighting
- `useBrushSelection` — convenience hook for brush-and-link
- `useFilteredData` — returns data filtered by a named selection

**Chart integration** — new props on all XY and ordinal HOCs:
- `selection` — consume a named selection (dims unselected points)
- `linkedHover` — produce hover selections for cross-highlighting
- `linkedBrush` — produce brush selections (Scatterplot, BubbleChart)

**ScatterplotMatrix (SPLOM)** — N×N scatterplot grid with built-in coordination:
- Diagonal cells show histograms (or labels)
- Two interaction modes: hover (cross-highlight with tooltip) or brush (crossfilter)
- Tooltip positioned above the hovered point with colorBy label
- `colorBy`, `fieldLabels`, `cellSize`, `pointRadius`, `showLegend` props

### Fixed

- **Hover state persisting on mouseout** — tooltip and linked highlight now reliably clear when the mouse leaves the chart area. Added a `mouseLeave` handler on the Frame wrapper (inside `TooltipProvider`) that clears both the tooltip and any active `customHoverBehavior` selection.
- **`createStore` updater bug** — the internal `set` function in `createStore` passed itself instead of the current state to updater callbacks (`fn(set)` → `fn(state)`). This caused `clearClause` in the SelectionStore to silently fail (accessing `.selections` on a function), so linked hover selections were never actually cleared. `setClause` worked by coincidence because `new Map(undefined)` produces an empty map.
- **Treemap/CirclePack hover overlays** — fixed broken hover overlays for all area-based NetworkFrame types (treemap, circlepack, partition, chord). After the Mark component removal in v3, overlay entries spread `.props` from node generators which produced `<path>` elements without a `d` attribute. Now passes `renderElement` directly for `React.cloneElement`.
- **CirclePack rendering as force-directed** — CirclePack defaulted all circles to 10px diameter because the node size accessor ignored d3 pack layout's `r` property. Now uses `nodeSizeAccessor: (d) => d.r || 5`.
- **ViolinPlot crash (`curve is not a function`)** — the ViolinPlot HOC passed the string `"catmullRom"` to `bucketizedRenderer` which calls `.curve()` directly expecting a d3 curve function. Now resolves curve strings via `curveHash` with case-insensitive lookup.
- **Axis label floating-point noise** — default tick format was identity (`d => d`), producing labels like `0.30000000000000004`. New `smartTickFormat` default cleans floating-point noise, adds K/M/B suffixes for large numbers, and limits precision to 6 significant digits.
- **Axis label overlap** — added collision-aware filtering in `axisLabels()` that skips overlapping tick labels using estimated character widths for horizontal axes and line-height spacing for vertical axes.
- **Histogram always horizontal** — histograms now always render horizontally. The `orientation` prop is deprecated and ignored.
- **Histogram tooltip showing "Count 0"** — the Frame's annotation pipeline overwrote the summary hover datum's `pieces` array with an empty column lookup. Histogram tooltip now reads `d.value` (the bin count from the renderer) instead.
- **ViolinPlot tooltip empty stats** — same `pieces` overwrite issue. ViolinPlot tooltip now falls back to `column.pieceData` when `pieces` is empty.

### Removed

- **FacetController** — replaced entirely by `LinkedCharts`. The `cloneElement`-based approach had no HOC support and only worked with direct Frame children.

---

#### AI Enablement — Phase 2

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

**XY Charts** (wrap XYFrame):
- `LineChart` — line traces with curve interpolation, area fill, and point markers
- `AreaChart` — filled area beneath a line
- `StackedAreaChart` — multiple stacked area series
- `Scatterplot` — point clouds with color and size encoding
- `BubbleChart` — sized circles with optional labels
- `Heatmap` — 2D binned density visualization

**Ordinal Charts** (wrap OrdinalFrame):
- `BarChart` — vertical/horizontal bars with sort and color encoding
- `StackedBarChart` — stacked categorical bars
- `GroupedBarChart` — side-by-side grouped bars
- `SwarmPlot` — force-directed point distribution
- `BoxPlot` — statistical box-and-whisker
- `DotPlot` — sorted dot strips
- `PieChart` — proportional slices
- `DonutChart` — ring variant of PieChart

**Network Charts** (wrap NetworkFrame):
- `ForceDirectedGraph` — force-simulation node-link diagrams
- `ChordDiagram` — circular connection matrix
- `SankeyDiagram` — flow diagrams with weighted edges
- `TreeDiagram` — hierarchical tree layouts
- `Treemap` — space-filling hierarchical rectangles
- `CirclePack` — nested circle packing

**Realtime Charts** (wrap RealtimeFrame):
- `RealtimeLineChart` — canvas-based streaming line
- `RealtimeBarChart` — canvas-based streaming histogram bars
- `RealtimeSwarmChart` — canvas-based streaming scatter
- `RealtimeWaterfallChart` — canvas-based streaming waterfall/candlestick

All chart components feature:
- Full TypeScript generics (`LineChart<TDatum>`)
- Sensible defaults for width, height, margins, colors, hover
- `frameProps` escape hatch for accessing the underlying Frame API
- Automatic legend rendering when `colorBy` is set
- Smart margin expansion to accommodate legends and axis labels

#### RealtimeFrame

A new core Frame for streaming and real-time data visualization, built on
canvas rendering for high-frequency updates.

- Canvas-first rendering with SVG annotation overlay
- `RingBuffer<T>` — O(1) circular buffer for data windowing
- `IncrementalExtent` — efficient min/max tracking without full recalculation
- `BinAccumulator` — aggregation for histogram bars
- Imperative handle via `useRef`: `push()`, `pushMany()`, `clear()`, `getData()`
- Five chart types: line, bar, swarm, candlestick, waterfall
- Configurable time dimension: up, down, left, right
- Window modes: sliding (fixed buffer) and growing (accumulating)
- Canvas-drawn axes with custom tick formatting
- Hover annotations with crosshairs
- Five dedicated canvas renderers in `src/components/realtime/renderers/`

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
- `RealtimeBarChartPlayground` — stacked time bars and swarm plots with live data

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
