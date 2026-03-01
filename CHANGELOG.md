# Semiotic Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
