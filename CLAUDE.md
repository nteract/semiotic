# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- **Use sub-path imports** — `semiotic/xy` (77KB gz), `semiotic/ordinal` (64KB), `semiotic/network` (51KB), `semiotic/geo` (49KB), `semiotic/realtime` (84KB), `semiotic/server` (64KB), `semiotic/recipes` (4KB), `semiotic/utils` (20KB), `semiotic/themes` (4KB), `semiotic/data` (3KB). Full `semiotic` is 165KB gz.
- CLI: `npx semiotic-ai [--schema|--compact|--examples|--doctor]`
- MCP: `npx semiotic-mcp`

## Architecture
- **HOC Charts**: Simple props, sensible defaults. **Stream Frames**: Full control.
- **Always use HOC charts** unless you need control they don't expose. Stream Frames pass `RealtimeNode`/`RealtimeEdge` wrappers in callbacks, not your data.
- Every HOC accepts `frameProps` for pass-through. TypeScript `strict: true`. Every HOC has error boundary + dev-mode validation.

## Common Props (all HOCs)
`title`, `description` (aria-label), `summary` (sr-only), `width` (600), `height` (400), `responsiveWidth`, `responsiveHeight`, `margin`, `className`, `color` (uniform fill), `stroke` (uniform stroke color — CSS var OK), `strokeWidth` (uniform stroke width in px), `opacity` (uniform 0–1 opacity), `enableHover` (true), `tooltip` (boolean | "multi" | function | config object), `showLegend`, `showGrid` (false), `frameProps`, `onObservation`, `onClick`, `chartId`, `loading` (false), `emptyContent`, `legendInteraction` ("none"|"highlight"|"isolate"), `legendPosition` ("right"|"left"|"top"|"bottom"), `emphasis` ("primary"|"secondary"), `annotations` (array), `accessibleTable` (true), `hoverHighlight` (boolean — dims non-hovered series, requires `colorBy`), `hoverRadius` (30), `animate` (boolean | { duration?, easing?, intro? } — animated intro on first render + smooth transitions on data change; intro defaults to true when animate is enabled)

**Primitive styling props** (`color`, `stroke`, `strokeWidth`, `opacity`) apply to any shape the chart draws (bars, circles, lines, wedges, rects). Precedence: top-level prop > `frameProps.*Style` function return > HOC base > theme fallback. Use CSS variables (`stroke="var(--semiotic-border)"`) for theme-aware, cascade-overridable styling. For per-datum customization, keep using the function-form `frameProps.pieceStyle` / `pointStyle` / `lineStyle` etc. — the top-level prop overlays on top of whatever the function returns.

`onClick` receives `(datum, { x, y })`. `onObservation` receives `{ type, datum?, x?, y?, timestamp, chartType, chartId }`.

## XY Charts (`semiotic/xy`)

**LineChart** — `data`, `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor`, `colorBy`, `colorScheme`, `curve`, `lineWidth` (2), `showPoints`, `pointRadius` (3), `fillArea` (boolean|string[]), `areaOpacity` (0.3), `lineGradient`, `anomaly`, `forecast`, `directLabel`, `gapStrategy`, `xScaleType`/`yScaleType` ("linear"|"log"|"time")
**AreaChart** — LineChart props + `areaBy`, `y0Accessor`, `gradientFill`, `areaOpacity` (0.7), `showLine` (true)
**StackedAreaChart** — flat array + `areaBy` (required), `colorBy`, `normalize`, `baseline` (`"zero"` default | `"wiggle"` for streamgraph | `"silhouette"` for centered), `stackOrder` (`"key"` default alpha | `"insideOut"` largest-in-middle | `"asc"`/`"desc"` by total). For canonical streamgraph aesthetic: `baseline="wiggle"` + `stackOrder="insideOut"` puts the largest series in the middle as a central anchor with smaller series wrapping outward. `baseline` is mutually exclusive with `normalize`. No `lineBy`/`lineDataAccessor`.
**Scatterplot** — `data`, `xAccessor`, `yAccessor`, `colorBy`, `sizeBy`, `sizeRange`, `pointRadius` (5), `pointOpacity` (0.8), `marginalGraphics`
**BubbleChart** — Scatterplot + `sizeBy` (required), `sizeRange` ([5,40])
**ConnectedScatterplot** — + `orderAccessor`
**QuadrantChart** — Scatterplot + `quadrants` (required), `xCenter`, `yCenter`
**MultiAxisLineChart** — Dual Y-axis. `series` (required: `[{ yAccessor, label?, color?, format?, extent? }]`). Falls back to multi-line if not 2 series.
**Heatmap** — `data`, `xAccessor`, `yAccessor`, `valueAccessor`, `colorScheme`, `showValues`, `cellBorderColor`
**ScatterplotMatrix** — `data`, `fields` (array of numeric field names for grid)
**MinimapChart** — Overview + detail with linked zoom. Wraps an XY chart.
**CandlestickChart** — `data`, `xAccessor`, `highAccessor` (req), `lowAccessor` (req), `openAccessor` + `closeAccessor` (optional). With all four: OHLC bars. With only high/low: degrades to a range chart. `candlestickStyle` ({ upColor, downColor, wickColor, rangeColor, bodyWidth, wickWidth }). Honors `mode` (primary/context/sparkline).

## Ordinal Charts (`semiotic/ordinal`)

**BarChart** — `data`, `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `sort`, `barPadding` (40), `roundedTop`, `gradientFill` (`true` | `{topOpacity, bottomOpacity}` | `{colorStops}` — same API as AreaChart; runs tip→base)
**StackedBarChart** — + `stackBy` (required), `normalize`, `sort` (default false — insertion order)
**GroupedBarChart** — + `groupBy` (required), `barPadding` (60), `sort` (default false — insertion order)
**SwarmPlot** — `colorBy`, `sizeBy`, `pointRadius`, `pointOpacity`
**BoxPlot** — + `showOutliers`, `outlierRadius`
**Histogram** — + `bins` (25), `relative`. Always horizontal.
**ViolinPlot** — + `bins`, `curve`, `showIQR`
**RidgelinePlot** — + `bins`, `amplitude` (1.5)
**DotPlot** — + `sort` ("auto" — insertion order when streaming, value-desc on static), `dotRadius`, `showGrid` default true
**PieChart** — `categoryAccessor`, `valueAccessor`, `colorBy`, `startAngle`
**DonutChart** — PieChart + `innerRadius` (60), `centerContent`
**FunnelChart** — `stepAccessor`, `valueAccessor`, `categoryAccessor` (optional), `connectorOpacity`, `orientation`
**SwimlaneChart** — `categoryAccessor`, `subcategoryAccessor` (required), `valueAccessor`, `colorBy` (defaults to subcategoryAccessor), `orientation`
**LikertChart** — `categoryAccessor`, `valueAccessor`|`levelAccessor`+`countAccessor`, `levels` (required), `orientation`, `colorScheme`
**GaugeChart** — `value` (required), `min`, `max`, `thresholds`, `arcWidth`, `sweep`, `fillZones`, `showNeedle`, `centerContent`

All ordinal: `colorBy`, `colorScheme`, `categoryFormat` (string|ReactNode), `showCategoryTicks` (true).

## Network Charts (`semiotic/network`)

**ForceDirectedGraph** — `nodes`, `edges`, `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `nodeSize`, `nodeSizeRange`, `edgeWidth`, `iterations` (300), `forceStrength` (0.1), `showLabels`, `nodeLabel`
**SankeyDiagram** — `edges`, `nodes`, `valueAccessor`, `nodeIdAccessor`, `colorBy`, `edgeColorBy`, `orientation`, `nodeAlign`, `nodeWidth`, `nodePaddingRatio`, `showLabels`
**ChordDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `padAngle`, `showLabels`
**TreeDiagram** — `data` (root), `layout`, `orientation`, `childrenAccessor`, `colorBy`, `colorByDepth`
**Treemap** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `showLabels`
**CirclePack** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`
**OrbitDiagram** — `data` (root), `childrenAccessor`, `orbitMode`, `speed`, `animated` (true), `colorBy`

## Geo Charts (`semiotic/geo`)

Import from `semiotic/geo` — NOT `semiotic` — to avoid pulling d3-geo into non-geo bundles.

**ChoroplethMap** — `areas` (GeoJSON Feature[] or "world-110m"), `valueAccessor`, `colorScheme`, `projection` ("equalEarth"), `graticule`, `tooltip`, `showLegend`
**ProportionalSymbolMap** — `points`, `xAccessor` ("lon"), `yAccessor` ("lat"), `sizeBy`, `sizeRange`, `colorBy`, `areas` (optional background)
**FlowMap** — `flows`, `nodes`, `valueAccessor`, `edgeColorBy`, `lineType`, `showParticles`
**DistanceCartogram** — `points`, `center`, `costAccessor`, `strength`, `showRings`

All geo: `fitPadding`, `zoomable`, `zoomExtent`, `onZoom`, `dragRotate`, `graticule`, `tileURL`, `tileAttribution`
Helpers: `resolveReferenceGeography("world-110m"|"world-50m")`, `mergeData(features, data, { featureKey, dataKey })`

## Realtime Charts (`semiotic/realtime`)

Push API: `ref.current.push({ time, value })`. All pushed data **must** include a time field.

**RealtimeLineChart**, **RealtimeHistogram** (+ `brush`, `onBrush`, `linkedBrush`), **RealtimeSwarmChart**, **RealtimeWaterfallChart**, **RealtimeHeatmap**, **Streaming Sankey** (StreamNetworkFrame + `showParticles`)

Encoding: `decay`, `pulse`, `transition`, `staleness` — compose freely.

### Push API on HOC charts
Most HOCs support push via `forwardRef`. **Omit** `data` — do NOT pass `data={[]}`.
```jsx
const ref = useRef()
ref.current.push({ id: "p1", x: 1, y: 2 })
ref.current.pushMany([...points])
ref.current.replace([...points])                   // ordinal only — full dataset replacement, preserves category order + transitions (progressively chunks large datasets)
ref.current.remove("p1")                          // by ID — requires pointIdAccessor
ref.current.remove(["p1", "p2"])                   // batch remove
ref.current.update("p1", d => ({ ...d, y: 99 }))  // in-place update — requires pointIdAccessor
ref.current.clear()
ref.current.getData()
ref.current.getScales()                            // returns {o, r, projection} (ordinal) / {x, y} (XY) — null if not yet computed
<Scatterplot ref={ref} xAccessor="x" yAccessor="y" pointIdAccessor="id" />
```
`remove()` and `update()` require an ID accessor: `pointIdAccessor` on XY/realtime charts, `dataIdAccessor` on ordinal charts. `replace()` is ordinal-only and routes through a bounded-ingest path that preserves category insertion-order memory and the transition position snapshot — what aggregator HOCs like LikertChart use under the hood to re-aggregate streaming input without shuffling categories or losing animations. Network HOC refs also use `remove(id)`/`update(id, updater)` (operates on nodes). For edge-level operations, use `StreamNetworkFrameHandle` directly: `removeNode(id)`, `removeEdge(sourceId, targetId)` or `removeEdge(edgeId)` (requires `edgeIdAccessor`), `updateNode(id, updater)`, `updateEdge(sourceId, targetId, updater)`.
Not supported: Tree, Treemap, CirclePack, Orbit, ChoroplethMap, FlowMap, ScatterplotMatrix.

## Custom Charts (escape hatch)

When the catalog doesn't fit, three HOCs let you supply a layout function that emits scene primitives directly. The frame still owns hit testing, transitions, decay, theme cascade, and SSR — your layout owns geometry only.

- **`XYCustomChart`** (`semiotic/xy`) — XY layouts: waffle, calendar heatmap, custom point/line/area arrangements
- **`OrdinalCustomChart`** (`semiotic/ordinal`) — category × value layouts: marimekko, parallel coordinates, bullet, fan chart, slope graph
- **`NetworkCustomChart`** (`semiotic/network`) — graph layouts: flextree, dagre, custom force/radial

All three accept `layout` and `layoutConfig` (your own typed config), but the layout context and return shape differ by chart family:

- **`XYCustomChart` / `OrdinalCustomChart`** — `layout: (ctx) => { nodes, overlays? }`. Context exposes `data`, `scales`, `dimensions` (with plot rect — center-anchored for radial ordinal, top-left otherwise), `theme` (semantic + categorical), `resolveColor(key)`, and `config`. XY scales: `{ x, y }` (linear). Ordinal scales: `{ o, r, projection }` (band + linear).
- **`NetworkCustomChart`** — `layout: (ctx) => { sceneNodes?, sceneEdges?, labels?, overlays? }`. Context exposes `nodes`, `edges`, `dimensions`, `theme`, `resolveColor(key)`, and `config` — graph data, no `data`/`scales`. Network layouts often run an external positioner (`d3-flextree`, `dagre`) on nodes/edges, then emit network scene primitives (`circle`, `rect`, `arc` for nodes; `line`, `bezier`, `curved` for edges).

XY/ordinal frames render whatever you put in `nodes` (rect, point, area, line, wedge, connector, etc.). Network frames split node-shaped scenes from edge-shaped scenes — give them `sceneNodes` for the round/rect/arc visuals and `sceneEdges` for the connecting paths. All three frames handle painting, hit testing, accessibility, transitions, decay, and SSR for you.

```tsx
import { XYCustomChart } from "semiotic/xy"
import { OrdinalCustomChart } from "semiotic/ordinal"
import { NetworkCustomChart } from "semiotic/network"
import {
  waffleLayout, calendarLayout,           // XY recipes
  marimekkoLayout, bulletLayout, parallelCoordinatesLayout, // ordinal
  flextreeLayout, dagreLayout,             // network
} from "semiotic/recipes"

<XYCustomChart data={cells} layout={waffleLayout} layoutConfig={{ rows: 10, columns: 10, ... }} />
<OrdinalCustomChart data={revenue} layout={marimekkoLayout} layoutConfig={{ ... }} />
<NetworkCustomChart nodes={nodes} edges={edges} layout={flextreeLayout} layoutConfig={{ ... }} />
```

**Recipes subpath** (`semiotic/recipes`, 4KB gz) ships pure layout functions. They emit standard SceneNodes — no chart code. BYO heavy deps (`d3-flextree`, `dagre`) live in user code.

### Chrome (labels, axes, legends): the recipe owns it

Custom layouts often need chrome the standard chart axes can't render — variable-width bars, per-row independent value scales, parallel axes, asymmetric tree branches. The unified pattern: **the recipe emits its own labels/axes/ticks via the `overlays` return field** (a ReactNode painted on top of the canvas). Built-in axes (via `showAxes` on the HOC) work for layouts that respect the standard scale; everything else, the recipe handles itself.

Convention across shipped recipes — every recipe takes a consistent set of label/axis toggles in `layoutConfig`:

| Recipe | Toggle | Default | What it draws |
|---|---|---|---|
| `marimekkoLayout` | `showCategoryLabels` | `true` | Category names under each variable-width bar |
| `bulletLayout` | `showLabels` | `true` | Metric name to the left of each row |
| `bulletLayout` | `showTicks` | `true` | Per-row value-axis ticks (each row independently scaled) |
| `parallelCoordinatesLayout` | `showAxes` | `true` | Vertical axis line + field name + 5 ticks per axis |
| `flextreeLayout` / `dagreLayout` | `showLabels` | `true` | Node text rendered inside each rect |
| `waffleLayout` / `calendarLayout` | — | — | No chrome needed (uniform grid + cell color tells the story) |

Writing your own recipe: prefer `showXxx` boolean toggles for chrome opt-out, `xxxFormat` callbacks for custom number/string formatting, and reserve plot-rect padding (`labelWidth`, `labelPadding`, `axisLabelPadding`) when chrome eats space.

### Interaction (hover, brush, selection): the parent component owns it

Recipes are pure functions, so they can't carry interactive state (hover, brush ranges, selection). The pattern: recipes accept a **predicate prop** (e.g. `parallelCoordinatesLayout`'s `highlightFn?: (d) => boolean`) and the parent component manages state. Wire `onObservation` (`{ type: "hover" | "hover-end" | ... }`) on `OrdinalCustomChart` / `XYCustomChart` / `NetworkCustomChart` to update parent state, then feed a derived predicate back into `layoutConfig`. Matching rows render at full opacity; non-matching dim. Highlighted rows z-order on top so neighbors don't cover them.

```tsx
const [hovered, setHovered] = useState(null)
<OrdinalCustomChart
  data={rows}
  layout={parallelCoordinatesLayout}
  layoutConfig={{
    fields: ["mpg", "hp", "weight"],
    highlightFn: hovered ? (d) => d.name === hovered : undefined,
  }}
  onObservation={(obs) => {
    if (obs.type === "hover") setHovered(obs.datum?.data?.name ?? obs.datum?.name)
    else if (obs.type === "hover-end") setHovered(null)
  }}
/>
```

The same predicate hook is the integration point for richer interactions on the roadmap: a future `<ParallelCoordinatesBrushes>` overlay that drag-brushes per-axis ranges, and `useBrushSelection`-style linked brushing across coordinated charts (selection store would carry per-field range constraints, downstream charts consume them via the same hook).

### Built-in chrome works when the layout uses standard scales

Layouts that draw *within* the frame's standard scales can just use the HOC's chrome. Pass `showAxes` on `XYCustomChart` / `OrdinalCustomChart` and the frame will render the same x/y or o/r axes the built-in HOCs do — useful for custom XY layouts that overlay points/lines on regular axes. The recipe-managed chrome is for the cases where standard axes can't help (variable-width bars under a band scale, per-row independent scales, etc.).

**Notes:**
- Coords are plot-relative (the frame translates the canvas/SVG group by `margin`). Read `ctx.dimensions.plot` for the drawing rect. Radial ordinal projection is the one exception: `plot.x = -width/2`, `plot.y = -height/2` because the canvas ctx is center-translated.
- Layouts that need axis domains: pass `xExtent`/`yExtent` (XY) or `oExtent`/`rExtent` (ordinal) — those flow through scale construction *before* the layout runs.
- Streaming layouts: ingest data via the chart's ref (`push`/`pushMany`); the layout re-runs on each ingest. Custom overlays update on data-change paths, NOT on per-frame animation rebuilds (intentional — would force a React re-render per frame).
- Custom layouts own their colors. Always prefer `ctx.resolveColor(key)` over hardcoded literals so `ThemeProvider` / `colorScheme` flow through. `CategoryColorProvider` integration is XY-only; for cross-chart category sync on network/ordinal customLayouts, pass a matching `colorScheme` to each chart.
- Tooltips: emit datum keys that match the user-visible accessor names (e.g. when `categoryAccessor: "region"` and `valueAccessor: "revenue"` are passed, put `region` and `revenue` on each rect's `datum`). The default tooltip looks them up by accessor name and the user's custom tooltip will read whatever fields they expect. Avoid underscored synthetic keys — the default tooltip filters those out.

## Coordinated Views

**LinkedCharts** — `selections`, **CategoryColorProvider** — `colors`|`categories` + `colorScheme`
Chart props: `selection`, `linkedHover`, `linkedBrush`. Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`
**Shared categories inside LinkedCharts → wrap in `CategoryColorProvider`.** When two or more charts encode the same categorical field (e.g. both `colorBy="region"`), wrapping in `CategoryColorProvider` gives every chart identical colors per category AND makes `LinkedCharts` render one unified legend (and suppress individual chart legends). Without it, each chart renders its own legend independently — often with mismatched colors.
**Linked crosshair**: `linkedHover={{ name: "sync", mode: "x-position", xField: "time" }}`. Click-to-lock: click locks crosshair (dashed white), click/Escape unlocks.
**ScatterplotMatrix**, **ChartContainer** (`title`, `subtitle`, `actions`), **ChartGrid** (`columns`, `gap`), **ContextLayout**

## Server-Side Rendering (`semiotic/server`)

HOC charts render SVG automatically in server environments. For standalone generation:

```ts
import { renderChart, renderToImage, renderToAnimatedGif, renderDashboard } from "semiotic/server"

const svg = renderChart("BarChart", { data, categoryAccessor: "region", valueAccessor: "revenue", theme: "tufte", showLegend: true, showGrid: true, annotations: [...] })
const png = await renderToImage("LineChart", { data, ... }, { format: "png", scale: 2 })  // requires sharp
const gif = await renderToAnimatedGif("line", data, { xAccessor: "x", yAccessor: "y", theme: "dark" }, { fps: 12, transitionFrames: 4, decay: { type: "linear" } })  // requires sharp + gifenc
const dashboard = renderDashboard([{ component: "BarChart", props: {...} }, { component: "PieChart", colSpan: 2, props: {...} }], { title: "Q1", theme: "dark", layout: { columns: 2 } })
```

All render functions accept `theme` (preset name or object). Theme categorical colors flow to data marks automatically. `generateFrameSVGs()` returns frame SVGs without sharp/gifenc (sync, for client preview).
AnimatedGifOptions: `fps`, `stepSize`, `windowSize`, `frameCount`, `xExtent`/`yExtent` (lock axes), `transitionFrames`, `easing`, `decay`, `loop`, `scale`.
Server SVGs include `role="img"`, `<title>`, `<desc>`, grid, legend, annotations (y-threshold, x-threshold, band, label, text, category-highlight). SVG groups have `id` attributes for Figma layer naming: `data-area`, `axes`, `grid`, `annotations`, `legend`, `chart-title`.

**`renderChart` required props by component:**
- **Sparkline** — `data`, `xAccessor`, `yAccessor`. No axes/grid/legend/title by default. Margin defaults to 2px.
- **LineChart/AreaChart** — `data`, `xAccessor`, `yAccessor`. Optional: `lineBy`/`areaBy`, `colorBy`, `colorScheme`.
- **StackedAreaChart** — `data`, `xAccessor`, `yAccessor`, `areaBy` (required).
- **Scatterplot/BubbleChart** — `data`, `xAccessor`, `yAccessor`. BubbleChart requires `sizeBy`.
- **Heatmap** — `data`, `xAccessor`, `yAccessor`, `valueAccessor`.
- **BarChart** — `data`, `categoryAccessor`, `valueAccessor`.
- **StackedBarChart** — `data`, `categoryAccessor`, `valueAccessor`, `stackBy` (required).
- **GroupedBarChart** — `data`, `categoryAccessor`, `valueAccessor`, `groupBy` (required).
- **PieChart/DonutChart** — `data`, `categoryAccessor`, `valueAccessor`.
- **FunnelChart** — `data`, `stepAccessor` ("step"), `valueAccessor` ("value"). Renders with trapezoid connectors, no axes.
- **GaugeChart** — `value`. Optional: `thresholds` (array of `{value, color, label}`), `min`, `max`, `sweep`, `arcWidth`.
- **SwimlaneChart** — `data`, `categoryAccessor`, `subcategoryAccessor` (required), `valueAccessor`.
- **ForceDirectedGraph** — `nodes`, `edges` (both required). If deriving nodes from edge endpoints, materialize `nodes` before returning JSX/renderChart props.
- **SankeyDiagram** — `edges` (required), `valueAccessor`.
- **ChoroplethMap** — `areas` (GeoJSON features, pre-resolved).

All components accept: `width`, `height`, `theme`, `title`, `description`, `showLegend`, `showGrid`, `background`, `annotations`, `margin`, `colorScheme`, `colorBy`, `legendPosition`. Pass additional frame-level props via `frameProps`.

## Annotations

All HOCs accept `annotations` (array). Coordinates use data field names.

**Positioning**: `widget`, `label`, `callout`, `text`, `bracket`
**Reference lines**: `y-threshold` (`value`, `label`, `color`, `labelPosition`), `x-threshold`, `band` (`y0`, `y1`)
**Ordinal**: `category-highlight`
**Enclosures**: `enclose`, `rect-enclose`, `highlight`
**Statistical**: `trend`, `envelope`, `anomaly-band`, `forecast`
**Streaming anchors**: `"fixed"` | `"latest"` | `"sticky"`

## Theming

CSS custom properties: `--semiotic-bg`, `--semiotic-text`, `--semiotic-text-secondary`, `--semiotic-border`, `--semiotic-grid`, `--semiotic-primary`, `--semiotic-secondary`, `--semiotic-surface`, `--semiotic-success`, `--semiotic-danger`, `--semiotic-warning`, `--semiotic-error`, `--semiotic-info`, `--semiotic-focus`, `--semiotic-font-family`, `--semiotic-annotation-color`, `--semiotic-legend-font-size`, `--semiotic-title-font-size`, `--semiotic-tick-font-family`, `--semiotic-tooltip-bg`/`text`/`radius`/`font-size`/`shadow`.

```jsx
<ThemeProvider theme="tufte">       {/* Named preset */}
<ThemeProvider theme={{ mode: "dark", colors: { categorical: [...] } }}> {/* Merge onto dark base */}
```

**Color priority** (with `colorBy`): CategoryColorProvider/LinkedCharts category map > explicit `colorScheme` fallback > ThemeProvider `colors.categorical` > `"category10"`.
Presets: `light`, `dark`, `high-contrast`, `pastels`(-dark), `bi-tool`(-dark), `italian`(-dark), `tufte`(-dark), `journalist`(-dark), `playful`(-dark), `carbon`(-dark).
Serialization: `themeToCSS(theme, selector)`, `themeToTokens(theme)`, `resolveThemePreset(name)`.

**Semantic status roles** (on every preset): `colors.success`, `colors.danger`, `colors.warning`, `colors.error`, `colors.info`, plus `colors.secondary` and `colors.surface`. Each emits as a `--semiotic-{role}` CSS custom property. Use for status-driven charts: `<Waterfall positiveColor="var(--semiotic-success)" negativeColor="var(--semiotic-danger)" />`, `<Swimlane color="var(--semiotic-warning)" />`, bar stroke delineation `<RealtimeHistogram stroke="var(--semiotic-border)" />`, status annotations.

**Scoped CSS cascade override** (per-subtree, no ThemeProvider needed):
```jsx
<div style={{ "--semiotic-danger": "#4b0082" }}>
  {/* every chart below inherits this danger color via canvas CSS-var lookup */}
</div>
```
Canvas scene builders read CSS variables via `getComputedStyle` on the canvas DOM ancestor, so standard CSS cascade rules apply even though rendering is canvas-based. Use CSS vars for **single-role** overrides; use a nested `ThemeProvider` for **array/scale** overrides (categorical palette, sequential/diverging scheme name).

## AI Features
`onObservation`/`useChartObserver`, `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX`, `validateProps(component, props)`, `diagnoseConfig(component, props)`, `exportChart(div, { format })`, `npx semiotic-ai --doctor`


## AI Behavior Contracts

<!-- semiotic-behavior-contracts:start -->

These rules are generated from `ai/behaviorContracts.cjs` and are consumed by `semiotic-ai --doctor`, MCP resources, and docs checks.

- **Data required by usage mode** (`props.data-required-by-usage-mode`): Static usage (`renderChart`, MCP previews, SSR snapshots, and copy/paste examples with immediate data) requires data in props. React push mode selects live ingestion by omitting data and mutating through a ref.
  Agent action: Pass usageMode="push" to `semiotic-ai --doctor` when validating ref-based JSX with no data prop. Keep usageMode="static" or omit it for renderChart/MCP/static configs where data must be present.
- **Categorical color precedence** (`color.category-precedence`): When colorBy is set, CategoryColorProvider/LinkedCharts category maps win for mapped categories. Unmapped categories fall back to explicit colorScheme, then ThemeProvider colors.categorical, then the built-in categorical fallback.
  Agent action: Use colorBy for categorical encodings. Use CategoryColorProvider or LinkedCharts for cross-chart consistency, colorScheme for per-chart fallback palettes, and avoid frameProps style functions unless intentionally bypassing HOC color resolution.
- **Required prop combinations** (`props.required-combinations`): Some chart families need semantic props beyond data. These combinations are enforced by validation/schema for static configs and remain required in push mode unless explicitly noted.
  Agent action: Before returning code, check the selected component against the required combinations list. For push mode, omit data but keep semantic props such as areaBy, sizeBy, stackBy, and groupBy.
  Required combinations: StackedAreaChart: static data + areaBy; push areaBy. Stacked areas need a flat data array plus areaBy to identify the stacked series. BubbleChart: static data + sizeBy; push sizeBy. Bubbles need sizeBy in addition to x/y accessors so radius encodes data rather than a constant point size. StackedBarChart: static data + stackBy; push stackBy. Stacked bars need stackBy to split each category into stack segments. GroupedBarChart: static data + groupBy; push groupBy. Grouped bars need groupBy to split each category into side-by-side bars. SwimlaneChart: static data + subcategoryAccessor; push subcategoryAccessor. Swimlanes need subcategoryAccessor; colorBy defaults to the same field when not provided. GaugeChart: static value; push not supported. GaugeChart is value-only. thresholds, min, max, sweep, and arcWidth are optional. ForceDirectedGraph: static nodes + edges; push nodes + edges. ForceDirectedGraph schema/rendering requires nodes and edges. If an agent infers nodes from edge endpoints, it must materialize a nodes array before returning code.
- **Push mode omits data** (`streaming.push-mode-data`): HOC push mode is selected by omitting the data prop entirely. Passing data={[]} is static empty data and can clear/reinitialize the frame on render.
  Agent action: For live charts, create a ref, omit data, then call ref.current.push() or pushMany(). For static renderChart/MCP snapshots, provide data because renderChart cannot push later.
- **Ref mutations need stable IDs** (`streaming.ref-mutations-require-id-accessors`): push() and pushMany() can append without IDs, but remove(id) and update(id, updater) require a stable ID accessor: pointIdAccessor for XY/realtime charts, dataIdAccessor for ordinal charts, and nodeIDAccessor/edgeIdAccessor for network operations.
  Agent action: When generating code that calls remove() or update(), include the matching ID accessor and make sure pushed rows carry that ID field.
- **renderChart uses static props only** (`rendering.renderchart-static-props`): MCP renderChart and semiotic/server renderChart render a single static SVG/PNG snapshot. Browser-only realtime components and future ref pushes are not renderable through that path.
  Agent action: Use renderChart only with renderable HOC components and complete static data. For live behavior, return React code with a ref and do not promise MCP-rendered output.

<!-- semiotic-behavior-contracts:end -->

## Accessibility

`role="group"` (outer) + `role="img"` (inner canvas). Keyboard: arrows navigate points, Enter cycles neighbors, Home/End/PageUp/PageDown. Shape-adaptive focus ring (`--semiotic-focus`). `accessibleTable` (default true) for sr-only data summary. Auto-detects `prefers-reduced-motion` and `forced-colors`. Hooks: `useReducedMotion()`, `useHighContrast()`.

## Usage Notes

- **Tooltip datum shape**: HOC tooltips get raw data. Frame `tooltipContent` gets wrapped — use `d.data`.
- **Legend**: "bottom" expands margin ~80px. MultiAxisLineChart: use `legendPosition="bottom"`.
- **Log scale**: Domain min clamped to 1e-6.
- **barPadding**: Pixel value (40/60 default). Reduce for small charts.
- **sort on StackedBarChart/GroupedBarChart**: Default `false` preserves insertion order. The underlying frame defaults to value-descending if `oSort` is undefined, so always pass `sort` explicitly if order matters.
- **sort `"auto"`** (BarChart/StackedBarChart/GroupedBarChart/DotPlot): insertion order while streaming, value-desc on static data. The right choice when using the push API — avoids categories shuffling as values fluctuate. DotPlot's default; opt-in on others.
- **Tooltip format cascade**: `valueFormat` (ordinal) / `xFormat` / `yFormat` (XY) / `valueFormat` on Heatmap flow to the default tooltip automatically, so axis and tooltip read identically. Only applies to the default tooltip — a custom `tooltip` prop fully overrides; re-pass the formatter inside `Tooltip({format})` / `MultiLineTooltip({fields:[{format}]})` if you want it there. Bespoke-tooltip charts (Histogram, FunnelChart, LikertChart, GaugeChart) don't participate; customize via `tooltip`.
- **Horizontal bars**: Need wider left margin: `margin={{ left: 120 }}`.
- **Push API**: Omit `data` entirely. `data={[]}` clears on every render.
- **frameProps style functions**: Bypass HOC color resolution — use `colorBy` prop instead.
- **Geo imports**: Always `semiotic/geo`, never `semiotic`, to avoid d3-geo in non-geo bundles.
- **fillArea**: `fillArea={["seriesA"]}` fills named series only. Names must match `lineBy`/`colorBy` keys.
- **hoverHighlight**: Requires `colorBy` as a string field.
- **tooltip="multi"**: Shows all series at hovered X. Custom fn receives `datum.allSeries`.
- **Axis config**: `frameProps.axes: [{ orient, includeMax, autoRotate, gridStyle, landmarkTicks }]`
- **xScaleType: "time"**: Creates `scaleTime`. Required for landmark ticks with timestamps.
- **scalePadding**: Pixel inset on scale ranges. Pass via `frameProps={{ scalePadding: 12 }}`.
- **categoryFormat/xFormat/yFormat**: Can return ReactNode (renders in `<foreignObject>`).
- **Tick deduplication**: Adjacent identical labels auto-removed.
- **Composing overlays**: XY/Ordinal charts paint `--semiotic-bg` across the full canvas by default, hiding anything beneath. When stacking charts (e.g. `position: absolute` overlay on top of a base), pass `frameProps={{ background: "transparent" }}` on the overlay to skip the fill. Network/Geo frames don't paint bg by default, so this only matters for XY/Ordinal.

## Performance

Prefer string accessors (`xAccessor="value"`) — always referentially stable. Memoize function accessors with `useCallback`.
