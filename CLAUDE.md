# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- **Use sub-path imports** — `semiotic/xy` (143KB gz), `semiotic/ordinal` (109KB), `semiotic/network` (98KB), `semiotic/geo` (93KB), `semiotic/realtime` (145KB), `semiotic/server` (100KB), `semiotic/utils` (31KB), `semiotic/themes` (5KB), `semiotic/data` (5KB). Full `semiotic` is 278KB gz.
- CLI: `npx semiotic-ai [--schema|--compact|--examples|--doctor]`
- MCP: `npx semiotic-mcp`

## Architecture
- **HOC Charts**: Simple props, sensible defaults. **Stream Frames**: Full control.
- **Always use HOC charts** unless you need control they don't expose. Stream Frames pass `RealtimeNode`/`RealtimeEdge` wrappers in callbacks, not your data.
- Every HOC accepts `frameProps` for pass-through. TypeScript `strict: true`. Every HOC has error boundary + dev-mode validation.

## Common Props (all HOCs)
`title`, `description` (aria-label), `summary` (sr-only), `width` (600), `height` (400), `responsiveWidth`, `responsiveHeight`, `margin`, `className`, `color` (uniform fill), `enableHover` (true), `tooltip` (boolean | "multi" | function | config object), `showLegend`, `showGrid` (false), `frameProps`, `onObservation`, `onClick`, `chartId`, `loading` (false), `emptyContent`, `legendInteraction` ("none"|"highlight"|"isolate"), `legendPosition` ("right"|"left"|"top"|"bottom"), `emphasis` ("primary"|"secondary"), `annotations` (array), `accessibleTable` (true), `hoverHighlight` (boolean — dims non-hovered series, requires `colorBy`), `hoverRadius` (30)

`onClick` receives `(datum, { x, y })`. `onObservation` receives `{ type, datum?, x?, y?, timestamp, chartType, chartId }`.

## XY Charts (`semiotic/xy`)

**LineChart** — `data`, `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor`, `colorBy`, `colorScheme`, `curve`, `lineWidth` (2), `showPoints`, `pointRadius` (3), `fillArea` (boolean|string[]), `areaOpacity` (0.3), `lineGradient`, `anomaly`, `forecast`, `directLabel`, `gapStrategy`, `xScaleType`/`yScaleType` ("linear"|"log"|"time")
**AreaChart** — LineChart props + `areaBy`, `y0Accessor`, `gradientFill`, `areaOpacity` (0.7), `showLine` (true)
**StackedAreaChart** — flat array + `areaBy` (required), `colorBy`, `normalize`. No `lineBy`/`lineDataAccessor`.
**Scatterplot** — `data`, `xAccessor`, `yAccessor`, `colorBy`, `sizeBy`, `sizeRange`, `pointRadius` (5), `pointOpacity` (0.8), `marginalGraphics`
**BubbleChart** — Scatterplot + `sizeBy` (required), `sizeRange` ([5,40])
**ConnectedScatterplot** — + `orderAccessor`
**QuadrantChart** — Scatterplot + `quadrants` (required), `xCenter`, `yCenter`
**MultiAxisLineChart** — Dual Y-axis. `series` (required: `[{ yAccessor, label?, color?, format?, extent? }]`). Falls back to multi-line if not 2 series.
**Heatmap** — `data`, `xAccessor`, `yAccessor`, `valueAccessor`, `colorScheme`, `showValues`, `cellBorderColor`
**ScatterplotMatrix** — `data`, `fields` (array of numeric field names for grid)
**MinimapChart** — Overview + detail with linked zoom. Wraps an XY chart.

## Ordinal Charts (`semiotic/ordinal`)

**BarChart** — `data`, `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `sort`, `barPadding` (40)
**StackedBarChart** — + `stackBy` (required), `normalize`, `sort` (default false — insertion order)
**GroupedBarChart** — + `groupBy` (required), `barPadding` (60), `sort` (default false — insertion order)
**SwarmPlot** — `colorBy`, `sizeBy`, `pointRadius`, `pointOpacity`
**BoxPlot** — + `showOutliers`, `outlierRadius`
**Histogram** — + `bins` (25), `relative`. Always horizontal.
**ViolinPlot** — + `bins`, `curve`, `showIQR`
**RidgelinePlot** — + `bins`, `amplitude` (1.5)
**DotPlot** — + `sort` (true), `dotRadius`, `showGrid` default true
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
ref.current.remove("p1")                          // by ID — requires pointIdAccessor
ref.current.remove(["p1", "p2"])                   // batch remove
ref.current.update("p1", d => ({ ...d, y: 99 }))  // in-place update — requires pointIdAccessor
ref.current.clear()
ref.current.getData()
<Scatterplot ref={ref} xAccessor="x" yAccessor="y" pointIdAccessor="id" />
```
`remove()` and `update()` require an ID accessor: `pointIdAccessor` on XY/realtime charts, `dataIdAccessor` on ordinal charts. Network HOC refs also use `remove(id)`/`update(id, updater)` (operates on nodes). For edge-level operations, use `StreamNetworkFrameHandle` directly: `removeNode(id)`, `removeEdge(sourceId, targetId)` or `removeEdge(edgeId)` (requires `edgeIdAccessor`), `updateNode(id, updater)`, `updateEdge(sourceId, targetId, updater)`.
Not supported: Tree, Treemap, CirclePack, Orbit, ChoroplethMap, FlowMap, ScatterplotMatrix.

## Coordinated Views

**LinkedCharts** — `selections`, **CategoryColorProvider** — `colors`|`categories` + `colorScheme`
Chart props: `selection`, `linkedHover`, `linkedBrush`. Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`
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
- **GaugeChart** — `value`, `thresholds` (array of `{value, color, label}`). Optional: `min`, `max`, `sweep`, `arcWidth`.
- **SwimlaneChart** — `data`, `categoryAccessor`, `subcategoryAccessor` (required), `valueAccessor`.
- **ForceDirectedGraph** — `edges` (required). `nodes` optional (inferred from edges).
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

CSS custom properties: `--semiotic-bg`, `--semiotic-text`, `--semiotic-text-secondary`, `--semiotic-border`, `--semiotic-grid`, `--semiotic-primary`, `--semiotic-focus`, `--semiotic-font-family`, `--semiotic-tooltip-bg`/`text`/`radius`/`font-size`/`shadow`.

```jsx
<ThemeProvider theme="tufte">       {/* Named preset */}
<ThemeProvider theme={{ mode: "dark", colors: { categorical: [...] } }}> {/* Merge onto dark base */}
```

**Color priority** (with `colorBy`): explicit `colorScheme` > ThemeProvider `colors.categorical` > `"category10"`.
Presets: `light`, `dark`, `high-contrast`, `pastels`(-dark), `bi-tool`(-dark), `italian`(-dark), `tufte`(-dark), `journalist`(-dark), `playful`(-dark), `carbon`(-dark).
Serialization: `themeToCSS(theme, selector)`, `themeToTokens(theme)`, `resolveThemePreset(name)`.

## AI Features
`onObservation`/`useChartObserver`, `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX`, `validateProps(component, props)`, `diagnoseConfig(component, props)`, `exportChart(div, { format })`, `npx semiotic-ai --doctor`

## Accessibility

`role="group"` (outer) + `role="img"` (inner canvas). Keyboard: arrows navigate points, Enter cycles neighbors, Home/End/PageUp/PageDown. Shape-adaptive focus ring (`--semiotic-focus`). `accessibleTable` (default true) for sr-only data summary. Auto-detects `prefers-reduced-motion` and `forced-colors`. Hooks: `useReducedMotion()`, `useHighContrast()`.

## Known Pitfalls

- **Tooltip datum shape**: HOC tooltips get raw data. Frame `tooltipContent` gets wrapped — use `d.data`.
- **Legend**: "bottom" expands margin ~80px. MultiAxisLineChart: use `legendPosition="bottom"`.
- **Log scale**: Domain min clamped to 1e-6.
- **barPadding**: Pixel value (40/60 default). Reduce for small charts.
- **sort on StackedBarChart/GroupedBarChart**: Default `false` preserves insertion order. The underlying frame defaults to value-descending if `oSort` is undefined, so always pass `sort` explicitly if order matters.
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

## Performance

Prefer string accessors (`xAccessor="value"`) — always referentially stable. Memoize function accessors with `useCallback`.
