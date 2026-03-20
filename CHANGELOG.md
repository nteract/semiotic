# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0] - 2026-03-20

### Added

- **Accessibility foundation** — moves Semiotic from ~30% to ~70% WCAG 2.1 AA compliance.
  - **Canvas `aria-label`** — every `<canvas>` element now has a computed `aria-label` describing chart type and data shape (e.g., "scatter chart, 200 points"). All four Stream Frames: `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`, `StreamGeoFrame`.
  - **Legend keyboard navigation** — interactive legend items are focusable (`tabIndex={0}`, `role="option"`), with `role="listbox"` on the container. Enter/Space activates (click), Arrow keys navigate between items. Visible focus ring on keyboard focus.
  - **`aria-multiselectable`** on legend listbox when `legendInteraction="isolate"` or `customClickBehavior` is present.
  - **`aria-selected`** on legend items reflecting isolation state.
  - **`aria-live="polite"` region** — `AriaLiveTooltip` component mirrors tooltip text for screen reader announcements on hover.
  - **SVG `<title>` and `<desc>`** — all SVG overlays (`SVGOverlay`, `OrdinalSVGOverlay`, `NetworkSVGOverlay`) include `role="img"` and accessible `<title>`/`<desc>` elements derived from the chart title.
  - **`aria-label` on ChartContainer toolbar buttons** — Export, Fullscreen, and Copy Config buttons have descriptive labels and title attributes.
  - **35 Playwright integration tests** — `integration-tests/accessibility.spec.ts` covering canvas aria-labels, AriaLiveTooltip, legend keyboard traversal, focus rings, SVG title/desc, and ChartContainer toolbar buttons.

- **Streaming legend support** — new `useStreamingLegend` hook discovers categories from pushed data and builds legends dynamically with minimal re-renders via version counter. Integrated into StackedBarChart, PieChart, DonutChart, GroupedBarChart.

- **Streaming regression test suite** — 20+ Playwright integration tests (`streaming-regression.spec.ts`) covering:
  - Canvas pixel sampling to verify colored fills (saturation > 0.1) across 8 streaming chart types
  - Legend items appear after push API data arrives (4 chart types)
  - Area chart tooltip contains numeric values, not dashes
  - LineChart streaming stability (no "Maximum update depth" errors)
  - Force graph content centroid within 30% of canvas center
  - Error-free rendering across all 11 streaming test fixtures

- **Performance: color map cache** — `PipelineStore` caches the category→color map across rebuilds using a sorted category set as cache key. Skips rebuild when categories are unchanged. (`PipelineStore.ts`)
- **Performance: stacked area cache** — `PipelineStore` caches stacked area cumulative sums using a `buffer.size + ingestVersion` hash. Skips expensive groupData + cumulative sum computation when data is unchanged. (`PipelineStore.ts`)

### Fixed

#### Streaming Color Pipeline (root cause)

- **Grey fills on push API charts** — When using `ref.current.push()`, HOC charts passed undefined color scales to style functions, causing grey fallback fills. Fixed end-to-end:
  - HOC `pieceStyle`/`pointStyle`/`lineStyle` functions now omit fill/stroke when colorScale is unavailable
  - `OrdinalPipelineStore.resolvePieceStyle` fills in from the frame's color scheme when HOC returns no fill
  - `PipelineStore.resolveLineStyle`/`resolveAreaStyle`/point scene builder do the same for XY charts
  - New `resolveGroupColor` method provides centralized `STREAMING_PALETTE` assignment for streaming groups
  - Affected charts: StackedBarChart, PieChart, DonutChart, GroupedBarChart, BubbleChart, StackedAreaChart, AreaChart, LineChart, Scatterplot, QuadrantChart, ChordDiagram

#### Runtime Errors

- **LineChart infinite re-render loop** — circular dependency between `useEffect` → `setSegmentAwareStyle` → `baseLineStyle` → `colorScale` → `statisticalResult`. Fixed by guarding statistical effect to only run when forecast/anomaly is present and deriving `effectiveLineStyle` without unnecessary state.
- **`createColorScale` crash on undefined data** — added null guards (`d?.` + `.filter(v => v != null)`) so push API charts with sparse data don't throw.
- **`OrdinalSVGOverlay` duplicate React keys** — keys now include category/group for uniqueness across stacked/grouped layouts.

#### Tooltips

- **Area/StackedArea tooltips showing "-"** — `hitTestAreaPath` now extracts the specific data point at the hover index (like `hitTestLine` does) instead of returning the entire data array.
- **Ordinal frame tooltips** — default tooltip now shows category + value using `__oAccessor`/`__rAccessor` metadata.
- **Geo chart tooltips** — ChoroplethMap shows country names (not numeric IDs), ProportionalSymbolMap shows formatted metrics with labels, FlowMap shows source → target with values.

#### Layout & Interaction

- **Force graph centering** — added `forceCenter` to simulation, strengthened `forceX`/`forceY`, clamped node positions to canvas bounds. Fixed `finalizeLayout` overwriting force-computed positions from stale bounding boxes during streaming warm-starts.
- **Streaming force refresh** — force simulation now runs on topology changes during push API streaming.
- **FIFO category ordering** — streaming ordinal charts preserve insertion order instead of re-sorting by value (fixes violin/histogram column flicker).
- **Edge hit areas** — expanded to 5px minimum tolerance across XY lines, network edges (bezier + path), and geo lines. Added `pointToSegmentDist` for accurate perpendicular distance. Line hit tolerance now scales with stroke width.
- **Network edge ctx.lineWidth leak** — `hitTestBezierEdge` and `hitTestPathEdge` now save/restore `ctx.lineWidth` around `isPointInStroke` calls.
- **Sankey crossing reduction** — added barycenter-based initial node ordering before iterative relaxation.
- **QuadrantChart streaming** — fixed quadrant backgrounds disappearing after first point; points now auto-color by quadrant when no `colorBy` provided.
- **Anti-meridian line handling** — geo lines that wrap across the projection edge are split into segments with smooth opacity fades.
- **Distance cartogram centering** — center node is pinned to viewport center during streaming.
- **Orthographic drag jank** — pointer-move rotations now coalesce via `pendingRotationRef`, applying once per rAF frame.

#### Visual / Dark Mode

- **Orbit diagram** — ring/connecting lines changed from `currentColor` (invisible on canvas) to `rgba(128,128,128,0.35)`. Root nodes use scheme color instead of grey depth palette.
- **Treemap/CirclePack labels** — luminance-based contrast text color (white on dark fills, dark on light fills). Treemap parent labels positioned at top-left of rectangle.
- **ScatterplotMatrix diagonal histograms** — now colored by category with O(1) Map lookups instead of grey fills with O(n) `.indexOf()`.
- **Dark mode fixes** — serialization page text contrast, streaming system model background, candlestick wick color, uncertainty tooltip background.

#### Bug Fixes

- **`tooltip={false}` now correctly disables tooltips** on all 22 remaining HOCs. The pattern `normalizeTooltip(tooltip) || defaultTooltipContent` was replaced with an explicit `tooltip === false ? undefined : ...` check.
- **`normalizeTooltip` unwrap heuristic tightened** — the HoverData unwrap now only triggers when the object has `.type === "node" | "edge"` AND `.data`, preventing false unwraps when a user's datum has a `.data` property.
- **ForceDirectedGraph empty state** — `renderEmptyState` now checks `nodes` instead of `edges`, so a graph with nodes but no edges no longer shows the empty state.
- **ChoroplethMap validation** — added GeoJSON-aware validation that checks for a `geometry` property on area features, replacing the inapplicable `validateArrayData` check.
- **LineChart validation** — `validateArrayData` now receives the raw `data` prop instead of post-processed `safeData`, so push API mode (`data` undefined) correctly skips validation instead of triggering "No data provided".
- **QuadrantChart `sizeDomain` NaN** — `sizeBy` values are now filtered to finite numbers before computing min/max, preventing NaN propagation to point radius.

#### Documentation (25+ fixes)

- Home page: meaningful tooltips on bar chart, bubble chart, network graph (degree centrality)
- Streaming sankey pastel colors, chord multi-color fix
- Highlight hover uses distinct red line, more distinctive custom theme
- Top/bottom legend examples, chart container year controls work
- Responsive frame data fix, styling offset fix, linked dashboard color consistency
- Candlestick dark mode, uncertainty tooltip dark mode, isotype chart person icons
- Radar/isotype duplicate key fix, network explorer `.data` wrapper access
- Rosling bubble annotations/extent/tooltip, benchmark log scale fix, forecast sparkline card
- Force graph sparse preset parameters, choropleth playground sizing
- DocumentFrame: added 100+ missing prop names to `processNodes`
- Tile map: production provider documentation

## [3.0.2] - 2026-03-16

### Added

- **Geographic visualization** — new `semiotic/geo` entry point with 4 HOC chart components and a low-level `StreamGeoFrame`, all canvas-rendered with d3-geo projections.
  - **`ChoroplethMap`** — sequential color encoding on GeoJSON features. Supports `areaOpacity`, function or string `valueAccessor`, and reference geography strings (`"world-110m"`, `"world-50m"`, etc.).
  - **`ProportionalSymbolMap`** — sized/colored point symbols on a geographic basemap with `sizeBy`, `sizeRange`, and `colorBy`.
  - **`FlowMap`** — origin-destination flow lines with width encoding, animated particles (`showParticles`, `particleStyle`), and `lineType` ("geo"|"line").
  - **`DistanceCartogram`** — ORBIS-style projection distortion based on travel cost. Concentric ring overlay (`showRings`, `ringStyle`, `costLabel`), north indicator (`showNorth`), configurable `strength` and `lineMode`.
  - **`StreamGeoFrame`** — low-level geo frame with full control over areas, points, lines, canvas rendering, and push API for streaming.
- **`GeoCanvasHitTester`** — spatial indexing for hover/click hit detection on canvas-rendered geo marks.
- **`GeoParticlePool`** — object-pool polyline particle system for animated flow particles. Supports `"source"` color inheritance, per-line color functions, and configurable spawn rate.
- **`GeoTileRenderer`** — slippy-map tile rendering on a background canvas. Mercator-only with retina support. Configurable `tileURL`, `tileAttribution`, `tileCacheSize`.
- **Zoom/Pan** — all geo charts accept `zoomable`, `zoomExtent`, `onZoom`, with imperative `getZoom()`/`resetZoom()` on the frame ref. Re-renders projection directly (no CSS transform).
- **Drag Rotate** — `dragRotate` prop for globe spinning (defaults true for orthographic). Latitude clamped to [-90, 90].
- **Reference geography** — `resolveReferenceGeography("world-110m")` returns Natural Earth GeoJSON features. `mergeData(features, data, { featureKey, dataKey })` joins external data into features.
- **Geo particles** — `showParticles` and `particleStyle` on `FlowMap` and `StreamGeoFrame` for animated dots flowing along line paths.
- **6 documentation pages** — ChoroplethMap, ProportionalSymbolMap, FlowMap, DistanceCartogram, StreamGeoFrame, and GeoVisualization overview.
- **2 playground pages** — interactive prop exploration for geo charts.
- **1 recipe page** — ORBIS-style distance cartogram walkthrough.
- **Comprehensive test suites** — unit tests for FlowMap (25 tests), ChoroplethMap (16 tests), DistanceCartogram (19 tests), colorUtils (+6 tests), hooks (+3 tests).

### Fixed

- **"Rendered more hooks than during previous render"** in `FlowMap` and `ChoroplethMap` — hooks were called after early returns for loading/empty states. All hooks now run unconditionally before any early return.
- **`colorScale` crash with null areas in ChoroplethMap** — `useMemo` now returns a fallback sequential scale when `resolvedAreas` is null during async loading.
- **Variable name collision in ChoroplethMap** — local `areaStyle` renamed to `areaStyleFn` to avoid collision with destructured prop.
- **Function `colorBy` produced undefined colors** — `useColorScale` now derives categories from data when `colorBy` is a function and builds a proper ordinal scale. `getColor` maps non-CSS-color strings through `colorScale`.

## [3.0.1] - 2026-03-12

### Added

- **`emphasis` prop** — all charts accept `emphasis="primary" | "secondary"`. `ChartGrid` detects `emphasis="primary"` on children and spans them across two grid columns for F-pattern dashboard layouts.
- **`directLabel` rendering** — new `"text"` annotation type in `annotationRules.tsx` so `directLabel` labels actually render. Automatic right margin expansion prevents label clipping.
- **`gapStrategy` fixes** — `"break"` now correctly splits lines at null boundaries using synthetic `_gapSegment` group keys. `"interpolate"` filters gap points in the HOC before data enters the pipeline, preventing `resolveAccessor`'s unary `+` from coercing `null` to `0`.
- **Chart States docs page** (`/features/chart-states`) — dedicated page for empty, loading, and error state documentation. Moved from LineChart and ChartContainer pages.
- **Gap strategy tabs** — consolidated three separate subsections in LineChart docs into a tabbed interface.
- **Tabs component** — reusable tab switcher for docs pages.

### Changed

- **Export default format** — `exportChart()` now defaults to PNG instead of SVG. PNG export composites the canvas data layer underneath the SVG overlay, producing a complete chart image. SVG export only captures the overlay (axes, labels).
- **Type widening** — eliminated `as any` casts at HOC/Frame boundaries by widening `rFormat`, `oSort`, `colorBy`, and `TooltipFieldConfig.accessor` types in stream type definitions.

### Fixed

- **Export captured only axes** — PNG export now finds the `<canvas>` element and draws it as the base layer before compositing the SVG overlay on top.
- **`directLabel` annotations silently dropped** — `type: "text"` was not a recognized annotation type; it fell through to the default case and returned `null`.
- **`gapStrategy="break"` drew lines through gaps** — flattening re-merged segments because the Frame re-grouped by the original `groupAccessor`.
- **`gapStrategy="interpolate"` dropped to zero** — `resolveAccessor` used `+(d)[key]` which converted `null` to `0`.
- **`colorBy` type mismatch in network charts** — hierarchy charts that color by depth index returned a number, but the type expected a string. Added `String()` coercion.
- **Duplicate `amplitude` property** in `StreamOrdinalFrameProps`.

## [3.0.0] - 2026-03-10

Complete rewrite of Semiotic. Stream-first canvas architecture, 37 HOC chart
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

37 higher-order chart components that wrap the core Frames with curated,
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
- `exportChart()` — download charts as PNG (default) or SVG
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
