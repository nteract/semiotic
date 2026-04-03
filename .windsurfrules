# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- Import: `semiotic`, `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/geo`, `semiotic/realtime`, `semiotic/ai`, `semiotic/data`, `semiotic/server`, `semiotic/themes`, `semiotic/utils`
- CLI: `npx semiotic-ai [--schema|--compact|--examples|--doctor]`
- MCP: `npx semiotic-mcp`
- Every HOC has a built-in error boundary and dev-mode validation warnings

## Architecture
- **HOC Charts**: Simple props, sensible defaults. **Stream Frames**: Full control.
- **Always use HOC charts** unless you need control they don't expose. Stream Frames (`StreamNetworkFrame`, `StreamXYFrame`, `StreamOrdinalFrame`, `StreamGeoFrame`) are low-level — they pass `RealtimeNode`/`RealtimeEdge` wrappers in callbacks, not your data.
- Every HOC accepts `frameProps` to pass through. TypeScript `strict: true`.

## Common Props (all HOCs)
`title`, `description` (overrides aria-label), `summary` (sr-only note), `width` (600), `height` (400), `responsiveWidth`, `responsiveHeight`, `margin`, `className`, `color` (uniform fill — overrides theme/colorScheme), `enableHover` (true), `tooltip` (boolean | "multi" | `(datum) => ReactNode` | `{ fields?, title?, format?, style? }`), `showLegend`, `showGrid` (false), `frameProps`, `onObservation`, `onClick`, `chartId`, `loading` (false), `emptyContent`, `legendInteraction` ("none"|"highlight"|"isolate"), `legendPosition` ("right"|"left"|"top"|"bottom"), `emphasis` ("primary"|"secondary"), `annotations` (array), `accessibleTable` (true), `hoverHighlight` (boolean|"series" — dims non-hovered series on data mark hover), `hoverRadius` (number, default 30 — max pixel distance for hover/click hit testing)

`onClick` receives `(datum, { x, y })` — the original datum and pixel coordinates. Works on lines, bars, areas, pie slices, nodes, and geo features.

`onObservation` receives `{ type: "hover"|"hover-end"|"click"|"brush"|"selection", datum?, x?, y?, timestamp, chartType, chartId }`. The `datum` is your original data object.

## XY Charts (`semiotic/xy`)

**LineChart** — `data`, `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor` ("coordinates"), `colorBy`, `colorScheme`, `curve`, `lineWidth` (2), `showPoints`, `pointRadius` (3), `fillArea` (boolean|string[] — `true` fills all, `string[]` lists series names for per-series area fill), `areaOpacity` (0.3), `lineGradient` ({colorStops:[{offset,color}]} — horizontal gradient for line stroke), `anomaly`, `forecast`, `directLabel`, `gapStrategy` ("break"|"interpolate"|"zero"), `xScaleType`/`yScaleType` ("linear"|"log")
**AreaChart** — LineChart props + `areaBy`, `y0Accessor` (band/ribbon), `gradientFill` (boolean|{topOpacity,bottomOpacity}|{colorStops:[{offset,color}]}), `lineGradient` ({colorStops:[{offset,color}]}), `areaOpacity` (0.7), `showLine` (true)
**StackedAreaChart** — flat array + `areaBy` (required), `colorBy`, `normalize`. Do NOT use `lineBy` or `lineDataAccessor`.
**Scatterplot** — `data`, `xAccessor`, `yAccessor`, `colorBy`, `sizeBy`, `sizeRange`, `pointRadius` (5), `pointOpacity` (0.8), `marginalGraphics`
**BubbleChart** — Scatterplot + `sizeBy` (required), `sizeRange` ([5,40]), `bubbleOpacity` (0.6)
**ConnectedScatterplot** — `data`, `xAccessor`, `yAccessor`, `orderAccessor` (sequencing field), `pointRadius` (4)
**QuadrantChart** — Scatterplot + `quadrants` (required: `{ topRight, topLeft, bottomRight, bottomLeft }` each `{ label, color, opacity? }`), `xCenter`, `yCenter`, `centerlineStyle`, `showQuadrantLabels` (true). Supports push API.
**MultiAxisLineChart** — Dual Y-axis. `data`, `xAccessor` ("x"), `series` (required: array of `{ yAccessor, label?, color?, format?, extent? }`), `colorScheme`, `curve` ("monotoneX"), `lineWidth` (2). Data unitized to [0,1] internally; left axis=series[0], right axis=series[1] in original units. For push API, provide `series[].extent` for stable unitization. Falls back to standard multi-line if not exactly 2 series.
**Heatmap** — `data`, `xAccessor`, `yAccessor`, `valueAccessor`, `colorScheme` ("blues"|"reds"|"greens"|"viridis"), `showValues`, `cellBorderColor`. Supports string/categorical axes.

## Ordinal Charts (`semiotic/ordinal`)

**BarChart** — `data`, `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `sort`, `barPadding` (40)
**StackedBarChart** — + `stackBy` (required), `normalize`, `barPadding` (40)
**GroupedBarChart** — + `groupBy` (required), `barPadding` (60)
**SwarmPlot** — `data`, `categoryAccessor`, `valueAccessor`, `colorBy`, `sizeBy`, `pointRadius`, `pointOpacity`
**BoxPlot** — + `showOutliers`, `outlierRadius`
**Histogram** — + `bins` (25), `relative`. Always horizontal. `categoryAccessor` optional (defaults to `"category"`).
**ViolinPlot** — + `bins`, `curve`, `showIQR`
**RidgelinePlot** — + `bins`, `amplitude` (1.5, unitless multiplier of lane width)
**DotPlot** — + `sort` (true), `dotRadius`, `showGrid` default true
**PieChart** — `data`, `categoryAccessor`, `valueAccessor`, `colorBy`, `startAngle`
**DonutChart** — PieChart + `innerRadius` (60), `centerContent` (ReactNode)
**FunnelChart** — `data`, `stepAccessor` ("step"), `valueAccessor` ("value"), `categoryAccessor` (optional), `colorBy`, `connectorOpacity` (0.3), `orientation` ("horizontal"|"vertical"). Horizontal: centered bars with trapezoid connectors. Vertical: bars with diagonal hatch for dropoff. Multi-category: `categoryAccessor="channel"` mirrors (horizontal) or groups (vertical).
**SwimlaneChart** — `data`, `categoryAccessor` ("category"), `subcategoryAccessor` (required), `valueAccessor` ("value"), `colorBy` (defaults to subcategoryAccessor), `colorScheme`, `orientation` ("horizontal"|"vertical"), `barPadding` (40). Renders categorical lanes with items stacked sequentially — unlike StackedBarChart, the same subcategory can appear multiple times in the same lane. Items stack left-to-right (horizontal) or bottom-to-top (vertical) in data order. Wraps StreamOrdinalFrame with `chartType="swimlane"`. Supports push API for streaming.

**LikertChart** — `data`, `categoryAccessor` ("question"), `valueAccessor` ("score", raw mode) or `levelAccessor`+`countAccessor` ("count", pre-aggregated mode), `levels` (required, ordered negative→positive), `orientation` ("horizontal"|"vertical"), `colorScheme`. Horizontal (default): diverging bar chart centered at 0% — negative levels extend left, positive right, neutral (odd count) split 50/50 across centerline. Vertical: stacked 100% bar chart. Supports any scale size (3-point to 7-point+). Raw mode aggregates integer scores automatically (1-based: score 1 → levels[0]). The `levels` array order defines polarity — first half negative, second half positive, center neutral if odd. Supports push API for streaming — accumulates raw data internally and re-aggregates percentages on each push.

**GaugeChart** — `value` (required), `min` (0), `max` (100), `thresholds` (array of `{ value, color, label? }` defining zones), `arcWidth` (0.3, fraction of radius), `sweep` (240°), `showNeedle` (true), `needleColor`, `centerContent` (ReactNode or `(value, min, max) => ReactNode`), `valueFormat`, `showScaleLabels` (true), `backgroundColor`. Built on top of `StreamOrdinalFrame` with `projection="radial"` — reuses the existing pie/donut rendering pipeline. Supports streaming via push API. Annotations work for custom threshold markers.

All ordinal HOCs support `colorBy` and `colorScheme`. `categoryFormat` (`(label: string, index?: number) => string | ReactNode`) customizes individual tick labels (truncation, formatting, or custom ReactNode rendering via `<foreignObject>`). `showCategoryTicks` (default true) hides per-tick labels when false — margins auto-adjust. For distribution charts with `colorBy`, set `showCategoryTicks={false}` since the legend identifies categories.

## Network Charts (`semiotic/network`)

**ForceDirectedGraph** — `nodes`, `edges`, `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `colorScheme`, `nodeSize` (number|string|fn), `nodeSizeRange`, `edgeWidth`, `edgeColor`, `edgeOpacity`, `iterations` (300), `forceStrength` (0.1), `showLabels`, `nodeLabel`, `legendInteraction`
**SankeyDiagram** — `edges`, `nodes`, `valueAccessor`, `nodeIdAccessor` ("id"), `sourceAccessor` ("source"), `targetAccessor` ("target"), `colorBy`, `edgeColorBy` ("source"|"target"|"gradient"|fn), `orientation`, `nodeAlign`, `nodeWidth`, `nodePaddingRatio`, `nodeLabel`, `showLabels`, `edgeOpacity`
**ChordDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `padAngle`, `groupWidth`, `showLabels`
**TreeDiagram** — `data` (root), `layout`, `orientation`, `childrenAccessor`, `colorBy`, `colorByDepth`, `edgeStyle`
**Treemap** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `showLabels`, `labelMode`
**CirclePack** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `circleOpacity`
**OrbitDiagram** — animated radial/orbital hierarchy. `data` (root), `childrenAccessor`, `nodeIdAccessor`, `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed` (0.25), `revolution`, `eccentricity`, `orbitSize`, `nodeRadius`, `showRings`, `showLabels`, `animated` (true), `colorBy`, `colorByDepth`. For static radial trees, use `TreeDiagram layout="radial"`.

## Geo Charts (`semiotic/geo`)

Import from `semiotic/geo` — NOT `semiotic` — to avoid pulling d3-geo into non-geo bundles.

**ChoroplethMap** — `areas` (GeoJSON Feature[] or "world-110m"), `valueAccessor`, `colorScheme`, `areaOpacity` (1), `projection` ("equalEarth"), `graticule`, `tooltip`, `showLegend`
**ProportionalSymbolMap** — `points`, `xAccessor` ("lon"), `yAccessor` ("lat"), `sizeBy`, `sizeRange` ([3,30]), `colorBy`, `areas` (optional background), `projection`
**FlowMap** — `flows`, `nodes`, `xAccessor`, `yAccessor`, `nodeIdAccessor`, `valueAccessor`, `edgeColorBy`, `edgeOpacity` (0.6), `edgeWidthRange` ([1,8]), `lineType` ("geo"|"line"), `showParticles`, `particleStyle`
**DistanceCartogram** — `points`, `center` (id), `costAccessor`, `strength` (0-1), `lineMode`, `showRings` (true|false|number[]), `ringStyle`, `showNorth`, `costLabel`, `transition`, `pointRadius`

All geo HOCs: `fitPadding` (0–1), `zoomable` (defaults true with tileURL), `zoomExtent` ([1,8]), `onZoom`, `dragRotate` (true for orthographic), `graticule`, `tileURL`, `tileAttribution`, `tileCacheSize`, `selection`, `linkedHover`, `onObservation`

**Tiles**: `tileURL` accepts string template (`{z}/{x}/{y}`) or function. Mercator only. OSM tiles are dev-only — use commercial provider with env var key in production.
**Zoom**: Imperative: `ref.current.getZoom()`, `ref.current.resetZoom()`.
**Reference geography**: `resolveReferenceGeography("world-110m"|"world-50m"|"land-110m"|"land-50m")` returns GeoJSON features.
**mergeData(features, data, { featureKey, dataKey })** — join data into GeoJSON by key. World-atlas uses ISO numeric codes as `id`.

```jsx
import { ChoroplethMap, resolveReferenceGeography, mergeData } from "semiotic/geo"
const world = await resolveReferenceGeography("world-110m")
const areas = mergeData(world, gdpData, { featureKey: "id", dataKey: "id" })
<ChoroplethMap areas={areas} valueAccessor="gdpPerCapita" colorScheme="viridis"
  projection="equalEarth" zoomable tooltip />
```

**StreamGeoFrame** — low-level frame. Push API: `ref.current.push(datum)`, `.pushMany()`, `.clear()`. Props: `projection`, `areas`, `points`, `lines`, `xAccessor`, `yAccessor`, `areaStyle`, `pointStyle`, `lineStyle`, `graticule`, `zoomable`, `decay`, `pulse`, `transition`.

## Realtime Charts (`semiotic/realtime`)

Push API: `chartRef.current.push({ time, value })`

**IMPORTANT**: All pushed data must include a time field (default: `"time"`). Set `timeAccessor` if your field differs. Without valid time field, charts render blank.

**RealtimeLineChart** — `timeAccessor` ("time"), `valueAccessor` ("value"), `windowSize` (200), `windowMode`, `stroke`, `strokeWidth`
**RealtimeHistogram** — `binSize` (required), `timeAccessor`, `valueAccessor`, `categoryAccessor`, `colors`, `brush` (boolean|"x"|object, defaults to `{ dimension: "x", snap: "bin" }` when `true`), `onBrush`, `linkedBrush` (cross-chart coordination)
**RealtimeSwarmChart** — `timeAccessor`, `valueAccessor`, `categoryAccessor`, `radius`, `opacity`
**RealtimeWaterfallChart** — `timeAccessor`, `valueAccessor`, `positiveColor`, `negativeColor`
**RealtimeHeatmap** — `timeAccessor`, `valueAccessor`, `heatmapXBins`, `heatmapYBins`, `aggregation`
**Streaming Sankey** — `StreamNetworkFrame` with `chartType="sankey"`, `showParticles`, `particleStyle`. Push individual edges: `ref.current.push({ source, target, value })`.

Encoding: `decay`, `pulse`, `transition`, `staleness` — compose freely on all streaming charts.

All Realtime* charts accept `data` props for static mode (no push API needed). RealtimeHistogram brush supports bin-snapping (`snap: "bin"`) and streaming tracking — the brush shrinks as selected bins scroll off and auto-clears when fully evicted. Bin snapping uses actual computed bin boundaries (data-driven), not a uniform grid — works with irregular bin widths. `snapDuring: true` enables continuous snap feedback during drag (not just on release).

### Push API on HOC charts
Most HOC charts support push via `forwardRef`. **Omit** `data`/`nodes`/`edges` — do NOT pass `data={[]}`.
```jsx
const ref = useRef()
ref.current.push({ x: 1, y: 2 })       // single
ref.current.pushMany([...points])        // batch
ref.current.clear()                       // reset
ref.current.getData()                     // read
<Scatterplot ref={ref} xAccessor="x" yAccessor="y" />
```
Supported: all XY, ordinal, network (Force, Sankey, Chord), geo point charts. **Not supported**: hierarchy charts (Tree, Treemap, CirclePack, Orbit), ChoroplethMap, FlowMap, ScatterplotMatrix.

## Stream Frame Callbacks (advanced)
Frame callbacks (`nodeStyle`, `edgeStyle`, `nodeSize` as fn) receive `RealtimeNode`/`RealtimeEdge` wrappers. Access original data via `.data`:
```jsx
// WRONG: nodeSize={(d) => d.weight}         — d.weight is undefined
// RIGHT: nodeSize={(d) => d.data?.weight}   — or use string: nodeSize="weight"
```
Same applies to `frameProps` style functions on HOCs. `customHoverBehavior`/`customClickBehavior` receive `{ type, data, x, y } | null`. `tooltipContent` receives `{ type, data }`.

## Hover Indicator
The hover dot automatically matches the hovered element's color (line stroke, point fill, etc.). Override via `frameProps`:
```jsx
<LineChart frameProps={{ hoverAnnotation: { pointColor: "#ff0000" } }} />
```
Fallback chain: `pointColor` → element color → `--semiotic-primary` CSS var → `#007bff`.

## Coordinated Views

**LinkedCharts** — `selections` (resolution: "union"|"intersect"|"crossfilter"), `showLegend`, `legendPosition`, `legendInteraction`, `legendSelectionName`, `legendField`
**CategoryColorProvider** — `colors` (map) or `categories` + `colorScheme`
Chart props: `selection`, `linkedHover`, `linkedBrush`. Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`

**Linked crosshair** (coordinate-based hover sync): `linkedHover={{ name: "sync", mode: "x-position", xField: "time" }}` broadcasts the hovered X data value. Other charts with the same `linkedHover` name render a synced vertical crosshair at that X position. Each chart shows its own Y values independently. Use for dashboards with multiple time-series at different scales. **Click-to-lock**: click a chart to lock the crosshair at that X position; the locked line changes to a dashed white stroke. Click again or press Escape to unlock. Locking is automatic when `linkedHover` uses `x-position` mode.
**ScatterplotMatrix** — `data`, `fields`, `colorBy`, `cellSize`, `hoverMode`, `brushMode`
**ChartContainer** — `title`, `subtitle`, `height` (400), `width` ("100%"), `status`, `loading`, `error`, `errorBoundary`, `actions` ({ export, fullscreen, copyConfig, dataSummary }), `controls`
**ChartGrid** — `columns` (number|"auto"), `minCellWidth` (300), `gap` (16). `emphasis="primary"` spans two columns.
**ContextLayout** — `context` (ReactNode), `position`, `contextSize` (250)

## Key Patterns

```jsx
// Cross-highlighting dashboard
<CategoryColorProvider categories={["North", "South", "East"]}>
<LinkedCharts>
  <ChartGrid columns={2}>
    <LineChart data={d} colorBy="region" linkedHover={{ name: "hl", fields: ["region"] }} selection={{ name: "hl" }} emphasis="primary" responsiveWidth />
    <BarChart data={d} colorBy="region" linkedHover={{ name: "hl", fields: ["region"] }} selection={{ name: "hl" }} responsiveWidth />
  </ChartGrid>
</LinkedCharts>
</CategoryColorProvider>

// Forecast + anomaly
<LineChart data={ts} xAccessor="time" yAccessor="value"
  forecast={{ trainEnd: 60, steps: 15, confidence: 0.95 }}
  anomaly={{ threshold: 2 }} />

// Pre-computed forecast bounds
<LineChart data={ml} xAccessor="time" yAccessor="value"
  forecast={{ isTraining: "isTraining", isForecast: "isForecast", isAnomaly: "isAnomaly", upperBounds: "upper", lowerBounds: "lower" }} />

// Percentile band — layer AreaChart + LineChart
<>
  <AreaChart data={d} xAccessor="x" yAccessor="p95" y0Accessor="p5"
    showLine={false} areaOpacity={0.3} gradientFill />
  <LineChart data={d} xAccessor="x" yAccessor="p50" lineWidth={2} />
</>

// Streaming sankey with particles
const sankeyRef = useRef()
sankeyRef.current.push({ source: "Web", target: "API", value: 1 })
<StreamNetworkFrame ref={sankeyRef} chartType="sankey"
  showParticles particleStyle={{ radius: 2, colorBy: "source" }}
  width={600} height={400} />

// SSR
import { renderOrdinalToStaticSVG } from "semiotic/server"
const svg = renderOrdinalToStaticSVG({ data, categoryAccessor: "cat", valueAccessor: "val", width: 600, height: 400 })
```

## Annotations

All HOCs accept `annotations` (array). Coordinates use your data field names. Network/orbit use `nodeId`.

**Positioning**: `widget` (React content at data coords — v3 replacement for v2 `htmlAnnotationRules`; props: `content`, `dx`, `dy`, `width`, `height`, `anchor`), `label` (callout with connector), `callout` (circle + label), `text` (plain text), `bracket`
**Reference lines**: `y-threshold` (`value`, `label`, `color`, `labelPosition`: "left"|"center"|"right", `strokeDasharray`), `x-threshold` (`labelPosition`: "top"|"center"|"bottom"), `band` (`y0`, `y1`, `label`, `fill`)
**Ordinal**: `category-highlight` (`category`, `color`, `opacity`, `label`) — highlights a category column/row. Works on BarChart, StackedBarChart, etc. `y-threshold` also works on vertical ordinal charts.
**Enclosures**: `enclose` (circle around `coordinates`), `rect-enclose`, `highlight` (`filter` fn or `field`+`value`)
**Statistical** (XY): `trend` (`method`: linear/polynomial/loess), `envelope`, `anomaly-band`, `forecast`
**Streaming anchors**: `"fixed"` (default), `"latest"` (tracks newest datum), `"sticky"` (freezes when evicted)

Custom rendering: `frameProps.svgAnnotationRules = (annotation, index, context) => ReactNode | null`. Context has `scales`, `width`, `height`, `data`. Colors inherit from theme (`--semiotic-primary`, `--semiotic-text-secondary`).

```jsx
<LineChart data={data} xAccessor="time" yAccessor="latency"
  annotations={[
    { type: "y-threshold", value: 200, label: "SLA limit", color: "#e45050" },
    { type: "widget", time: 42, latency: 850, dy: -30, content: <span>Incident</span> },
  ]} />
```

## Theming

Charts are themeable via CSS custom properties on any ancestor element. Key vars: `--semiotic-bg`, `--semiotic-text`, `--semiotic-text-secondary`, `--semiotic-border`, `--semiotic-grid`, `--semiotic-primary`, `--semiotic-focus`, `--semiotic-font-family`, `--semiotic-border-radius`, `--semiotic-tooltip-bg`/`text`/`radius`/`font-size`/`shadow`, `--semiotic-selection-color`/`opacity`, `--semiotic-diverging`.

```jsx
import { ThemeProvider } from "semiotic"
<ThemeProvider theme="tufte">       {/* Named preset */}
<ThemeProvider theme={{ colors: { primary: "#ff6b6b", categorical: [...] } }}> {/* Custom */}
```

**Color resolution priority** (when `colorBy` is set): explicit `colorScheme` prop > ThemeProvider `colors.categorical` > `"category10"` fallback. This means ThemeProvider categorical colors automatically apply to all charts — no need to pass `colorScheme` on every component.

Presets: `light`, `dark`, `high-contrast`, `pastels`, `pastels-dark`, `bi-tool`, `bi-tool-dark`, `italian`, `italian-dark`, `tufte`, `tufte-dark`, `journalist`, `journalist-dark`, `playful`, `playful-dark`, `carbon`, `carbon-dark`.

Serialization (`semiotic/themes`): `themeToCSS(theme, selector)`, `themeToTokens(theme)`, `resolveThemePreset(name)`.
Color-blind palette: `import { COLOR_BLIND_SAFE_CATEGORICAL } from "semiotic"` (8-color Wong 2011).
IBM Carbon palette: `import { CARBON_CATEGORICAL_14, CARBON_ALERT } from "semiotic"` (14-color categorical + 4 alert colors).

**`semiotic/utils`** (~137KB, ~10% of full bundle) — Lightweight entry point for utilities without any chart components:
- **Theme**: `ThemeProvider`, `useTheme`, `LIGHT_THEME`, `DARK_THEME`, `HIGH_CONTRAST_THEME`, `COLOR_BLIND_SAFE_CATEGORICAL`, `CARBON_CATEGORICAL_14`, `CARBON_ALERT`, `themeToCSS`, `themeToTokens`, `resolveThemePreset`, `THEME_PRESETS`
- **Format**: `adaptiveTimeTicks`, `smartTickFormat`
- **Color**: `darkenColor`, `lightenColor`
- **Patterns**: `createHatchPattern`
- **Validation**: `validateProps`, `diagnoseConfig`
- **Serialization**: `toConfig`, `fromConfig`, `toURL`, `fromURL`, `copyConfig`, `configToJSX`, `serializeSelections`, `deserializeSelections`, `exportChart`
- **Vega-Lite**: `fromVegaLite` — convert Vega-Lite specs to Semiotic configs
- **Data structures**: `RingBuffer`, `IncrementalExtent`
- **Tooltip**: `normalizeTooltip`

Key: `ThemeProvider` sets CSS vars on a wrapper div (no React context). Canvas charts read vars via `getComputedStyle`. `exportChart` inlines computed styles.

**Dark/light mode merge rules:** String preset (e.g. `"dark"`) → full replacement with that preset's theme. Object with `mode` (e.g. `{ mode: "dark", colors: { categorical: [...] } }`) → merges onto the matching base theme (`DARK_THEME` or `LIGHT_THEME`), so background/text/grid adapt while your overrides are preserved. Object without `mode` → shallow-merges onto the current theme (partial override). ThemeProvider is reactive — changing the `theme` prop re-applies immediately.

**CSS interop:** Host app `--semiotic-*` vars on `:root` are overridden by ThemeProvider's closer wrapper div. To let app tokens flow through, either skip ThemeProvider and set `--semiotic-*` vars in CSS, or use the hybrid approach (ThemeProvider for palette only, CSS vars for chrome).

## Server-Side Rendering
- HOC charts and Frames render SVG automatically in server environments
- `renderXYToStaticSVG(props)`, `renderOrdinalToStaticSVG(props)`, `renderNetworkToStaticSVG(props)`, `renderGeoToStaticSVG(props)` from `semiotic/server`
- `frameType` is `"xy"|"ordinal"|"network"|"geo"` (NOT component names)
- Geo SSR requires pre-resolved features (synchronous — call `resolveReferenceGeography` first)
- Works with Next.js App Router, Remix, Astro

## AI Features
- `onObservation` / `useChartObserver` — structured events across charts
- `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX` — serialization
- `DetailsPanel` — click-driven detail panel in `ChartContainer`
- `validateProps(componentName, props)` — prop validation with typo suggestions
- `diagnoseConfig(componentName, props)` — anti-pattern detector (13+ checks)
- `exportChart(containerDiv, { format: "png"|"svg" })` — pass wrapper div, composites canvas+SVG
- `npx semiotic-ai --doctor` — CLI validation

## Canvas Pattern Fills

`createHatchPattern({ background, stroke, lineWidth, spacing, angle })` from `semiotic` — returns `CanvasPattern | null` for use as `fill` in style functions. Used by FunnelChart vertical mode for dropoff bars.

## Accessibility

Charts render with `role="group"` (outer interactive wrapper, keyboard/focus) and `role="img"` (inner canvas, read by assistive tech). SVG overlays include `<title>` and `<desc>`.

**Keyboard navigation**: Arrow keys navigate data points. In XY/ordinal charts, ArrowRight/Left moves within a series, ArrowUp/Down switches series. In network charts, arrows move to the spatially nearest node in the pressed direction; Enter cycles edge-connected neighbors. Home/End jump to first/last. PageUp/PageDown skip 10%. Escape clears focus.

**Focus ring**: Shape-adaptive dashed ring (circle for points, rect for bars, arc for wedges). Color: `--semiotic-focus` CSS var.

**Data summary**: `accessibleTable` (default true) renders a sr-only summary. Activate via keyboard focus or `actions.dataSummary` in ChartContainer. JIT-computed — no render cost until activated.

**Reduced motion**: `prefers-reduced-motion` auto-detected. Transitions skip to end state, orbit stops, pulse/decay disabled.

**High contrast**: `forced-colors` / `prefers-contrast: more` auto-detected. ThemeProvider applies `HIGH_CONTRAST_THEME` automatically.

**Hooks** (from `semiotic`): `useReducedMotion()`, `useHighContrast()` — SSR-safe, return `false` on server.

## Known Pitfalls

- **Tooltip datum shape**: HOC tooltip functions get raw data. Frame `tooltipContent` gets wrapped data — use `d.data`.
- **Tooltip positioning**: Tooltips auto-flip when near container edges (right→left, bottom→top). Custom `tooltip` content should not add its own background — the wrapper provides `--semiotic-tooltip-bg`, `--semiotic-tooltip-text`, etc. Override wrapper styles via CSS custom properties, not inline styles.
- **Legend positioning**: "bottom" auto-expands margin ~80px. For narrow charts (<400px), prefer "bottom" or "top".
- **MultiAxisLineChart legend**: Always use `legendPosition="bottom"` (or `"top"`) — the right-hand axis occupies the space where a right-side legend would go.
- **Log scale**: Clamps domain min to 1e-6 (log(0) undefined).
- **barPadding**: Pixel value, defaults 40/60. Reduce for small charts.
- **Horizontal bars**: Need wider left margin with long labels: `margin={{ left: 120 }}`.
- **LinkedCharts legends**: `CategoryColorProvider` suppresses child legends. Force with `showLegend={true}`.
- **Push API**: Omit `data` prop entirely. `data={[]}` clears pushed data every render.
- **frameProps style functions**: Bypass HOC color resolution — use `colorBy` prop instead. Frame style functions receive `(datum, categoryName)`, not `(datum, index)`.
- **v2 migration**: `htmlAnnotationRules` → `widget` annotations + `svgAnnotationRules`. v2 `summaryStyle` index-based coloring → v3 category-string-based.
- **accessibleTable**: Direct prop on HOCs. Set `accessibleTable={false}` to disable the sr-only data summary.
- **Format functions returning ReactNode**: `xFormat`, `yFormat`, and `categoryFormat` can return `string | ReactNode`. ReactNode labels render inside `<foreignObject>` (SVG interop). Useful for rotated, multi-line, or icon-decorated tick labels:
  ```jsx
  <BarChart categoryFormat={(label) => <span style={{ color: "red" }}>{label}</span>} />
  ```
- **Per-series fillArea**: `fillArea={["seriesA", "seriesB"]}` on LineChart fills only named series while others stay as lines. Series names must match `lineBy`/`colorBy` group keys. Uses a dedicated `"mixed"` chart type internally:
  ```jsx
  <LineChart data={data} lineBy="series" colorBy="series" fillArea={["Revenue", "Cost"]} />
  ```
- **Hover highlight**: `hoverHighlight="series"` dims non-hovered series on data mark hover (not just legend). Requires `colorBy` as a string field. Works on all XY and ordinal HOCs.
- **Click-to-lock crosshair**: In `linkedHover` x-position mode, clicking locks the crosshair (dashed white line). Hover updates are ignored while locked. Click again or press Escape to unlock. Multi-chart safe — unmounting one chart doesn't unlock another's crosshair.
- **Multi-color gradientFill**: `gradientFill={{ colorStops: [{offset, color}] }}` on AreaChart for semantic color bands. Supports `transparent`. Requires at least 2 stops. Offsets clamped to [0,1]:
  ```jsx
  <AreaChart gradientFill={{ colorStops: [{ offset: 0, color: "red" }, { offset: 0.5, color: "transparent" }] }} />
  ```
- **Line stroke gradient**: `lineGradient={{ colorStops: [{offset, color}] }}` on LineChart/AreaChart for horizontal gradient strokes. Gradient runs from first to last X point.
- **Multi-point tooltip**: `tooltip="multi"` on LineChart shows all series values at hovered X with color swatches (legend-in-tooltip). Custom tooltip functions receive `datum.allSeries: Array<{group, value, color}>`:
  ```jsx
  <LineChart data={data} lineBy="series" colorBy="series" tooltip="multi" />
  ```
- **Axis config** (`frameProps.axes`): Per-axis options: `includeMax: true` forces domain-max tick. `autoRotate: true` rotates bottom-axis labels 45° when crowded. `gridStyle: "dashed" | "dotted" | string` sets strokeDasharray on grid lines (requires `showGrid`):
  ```jsx
  <LineChart showGrid frameProps={{ axes: [{ orient: "bottom", includeMax: true, autoRotate: true, gridStyle: "dashed" }] }} />
  ```
- **Bar baseline alignment**: Ordinal axis baseline aligns with `rScale(0)`, not chart edge. `baselinePadding={true}` restores the old padded look; default `false` is flush.
- **hoverRadius**: Max pixel distance for hover/click hit testing (default 30px across all frames — XY, network, geo, ordinal). Available on all XY HOCs and `StreamXYFrameProps`:
  ```jsx
  <Scatterplot hoverRadius={60} tooltip />  {/* Larger hit area for sparse data */}
  ```
- **Landmark ticks**: `landmarkTicks: true` on bottom/left axis config bolds tick labels at month/year boundaries. Works with `xScaleType: "time"` for Date-aware ticks. Custom function: `landmarkTicks: (value, index) => boolean`.
- **xScaleType: "time"**: Creates `scaleTime` for the X axis. Ticks land on real calendar boundaries (weeks, months) instead of round numbers. Required for landmark ticks with timestamp data.
- **Tick deduplication**: Adjacent identical tick labels are automatically removed. Prevents duplicate labels when tick format has insufficient resolution (e.g. month-only format on weekly ticks).

## Performance

- **Range/dumbbell plot**: Use `chartType="candlestick"` on StreamXYFrame with only `highAccessor` + `lowAccessor` (omit `openAccessor`/`closeAccessor`). Auto-detects range mode: no body rect, endpoint dots, single `rangeColor` via `candlestickStyle={{ rangeColor: "#6366f1" }}`. When `bodyWidth === 0`, body rect is skipped entirely (no invisible DOM elements).

## Performance

Prefer string accessors (`xAccessor="value"`) over function accessors — always referentially stable. If you must use functions, memoize with `useCallback` or define outside the component. The pipeline uses `.toString()` comparison for inline arrows but this fails for closures capturing changing variables.
