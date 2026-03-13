# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- Import: `semiotic`, `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/ai`, `semiotic/data`, `semiotic/server`
- CLI: `npx semiotic-ai [--schema|--compact|--examples|--doctor]`
- MCP: `npx semiotic-mcp`
- Every HOC has a built-in error boundary (never blanks the page) and dev-mode validation warnings

## Architecture
- **HOC Charts**: Simple props, sensible defaults. **Stream Frames**: Full control.
- Every HOC accepts `frameProps` to pass through. TypeScript `strict: true`.

## Common Props (all HOCs)
`title`, `width` (600), `height` (400), `responsiveWidth`, `responsiveHeight`, `margin`, `className`, `enableHover` (true), `tooltip`, `showLegend`, `showGrid` (false), `frameProps`, `onObservation`, `chartId`

## XY Charts (`semiotic/xy`)

**LineChart** — `data`, `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor` ("coordinates"), `colorBy`, `colorScheme`, `curve`, `lineWidth` (2), `showPoints`, `pointRadius` (3), `fillArea`, `areaOpacity` (0.3), `anomaly` (AnomalyConfig), `forecast` (ForecastConfig)

**AreaChart** — LineChart props + `areaBy`, `y0Accessor` (band/ribbon), `gradientFill` (boolean|{topOpacity,bottomOpacity}), `areaOpacity` (0.7), `showLine` (true)

**StackedAreaChart** — AreaChart + `normalize` (false)

**Scatterplot** — `data`, `xAccessor`, `yAccessor`, `colorBy`, `sizeBy`, `sizeRange`, `pointRadius` (5), `pointOpacity` (0.8), `marginalGraphics`

**BubbleChart** — Scatterplot + `sizeBy` (required), `sizeRange` ([5,40]), `bubbleOpacity` (0.6)

**ConnectedScatterplot** — `data`, `xAccessor`, `yAccessor`, `orderAccessor` (number|Date field for sequencing), `pointRadius` (4). Viridis colored start→end, line width = point radius, white halo under lines when <100 points.

**Heatmap** — `data`, `xAccessor`, `yAccessor`, `valueAccessor`, `colorScheme`, `showValues`, `cellBorderColor`

## Ordinal Charts (`semiotic/ordinal`)

**BarChart** — `data`, `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `sort`, `barPadding`
**StackedBarChart** — + `stackBy` (required), `normalize`
**GroupedBarChart** — + `groupBy` (required)
**SwarmPlot** — `data`, `categoryAccessor`, `valueAccessor`, `colorBy`, `sizeBy`, `pointRadius`, `pointOpacity`
**BoxPlot** — + `showOutliers`, `outlierRadius`
**Histogram** — + `bins` (25), `relative`. Always horizontal.
**ViolinPlot** — + `bins`, `curve`, `showIQR`
**DotPlot** — + `sort` (true), `dotRadius`, `showGrid` default true
**PieChart** — `data`, `categoryAccessor`, `valueAccessor`, `colorBy`, `startAngle`, `slicePadding`
**DonutChart** — PieChart + `innerRadius` (60), `centerContent`

## Network Charts (`semiotic/network`)

**ForceDirectedGraph** — `nodes`, `edges`, `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `nodeSize`, `edgeWidth`, `iterations`, `showLabels`
**SankeyDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `orientation`, `nodeAlign`, `nodeWidth`, `showLabels`, `edgeOpacity`
**ChordDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `padAngle`, `groupWidth`, `showLabels`
**TreeDiagram** — `data` (root), `layout`, `orientation`, `childrenAccessor`, `colorBy`, `colorByDepth`, `edgeStyle`
**Treemap** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `showLabels`, `labelMode`
**CirclePack** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `circleOpacity`
**OrbitDiagram** — `data` (root), `childrenAccessor`, `nodeIdAccessor`, `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed` (0.25), `revolution`, `eccentricity`, `orbitSize`, `nodeRadius`, `showRings`, `showLabels`, `animated` (true), `colorBy`, `colorByDepth`, `annotations` (widget annotations anchor by nodeId)

## Realtime Charts (`semiotic/realtime`)

Push API: `chartRef.current.push({ time, value })`

**RealtimeLineChart** — `size`, `timeAccessor`, `valueAccessor`, `windowSize` (200), `windowMode`, `stroke`, `strokeWidth`
**RealtimeHistogram** — + `binSize` (required), `categoryAccessor`, `colors`
**RealtimeSwarmChart** — + `categoryAccessor`, `radius`, `opacity`
**RealtimeWaterfallChart** — + `positiveColor`, `negativeColor`
**RealtimeHeatmap** — + `heatmapXBins`, `heatmapYBins`, `aggregation`
**Streaming Sankey** — `StreamNetworkFrame` with `chartType="sankey"`, `showParticles`, `particleStyle`, `tensionConfig`, `thresholds`

Realtime encoding: `decay`, `pulse`, `transition`, `staleness` — compose freely on all streaming charts.

## Coordinated Views

**LinkedCharts** — wraps charts. Props: `selections` (resolution: "union"|"intersect"|"crossfilter")
**CategoryColorProvider** — stable category→color mapping. Props: `colors` (map) or `categories` + `colorScheme`
Chart props: `selection`, `linkedHover`, `linkedBrush`. Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`
**ScatterplotMatrix** — `data`, `fields`, `colorBy`, `cellSize`, `hoverMode`, `brushMode`

## Layout & Composition

**ChartGrid** — CSS Grid layout. `columns` (number|"auto"), `minCellWidth` (300), `gap` (16)
**ContextLayout** — primary + context panel. `context` (ReactNode), `position`, `contextSize` (250)

## Key Patterns

```jsx
// Cross-highlighting dashboard
<CategoryColorProvider categories={["North", "South", "East"]}>
<LinkedCharts>
  <ChartGrid columns={2}>
    <LineChart data={d} colorBy="region" linkedHover={{ name: "hl", fields: ["region"] }} selection={{ name: "hl" }} responsiveWidth />
    <BarChart data={d} colorBy="region" linkedHover={{ name: "hl", fields: ["region"] }} selection={{ name: "hl" }} responsiveWidth />
  </ChartGrid>
</LinkedCharts>
</CategoryColorProvider>

// Forecast + anomaly (auto)
<LineChart data={ts} xAccessor="time" yAccessor="value"
  forecast={{ trainEnd: 60, steps: 15, confidence: 0.95 }}
  anomaly={{ threshold: 2 }} />

// Forecast (pre-computed ML bounds)
<LineChart data={ml} xAccessor="time" yAccessor="value"
  forecast={{ isTraining: "isTraining", isForecast: "isForecast", isAnomaly: "isAnomaly", upperBounds: "upper", lowerBounds: "lower" }} />

// Gradient area + percentile band
<AreaChart data={d} xAccessor="x" yAccessor="p95" y0Accessor="p5" gradientFill />

// Realtime
const ref = useRef()
ref.current.push({ time: Date.now(), value: 42 })
<RealtimeLineChart ref={ref} timeAccessor="time" valueAccessor="value" />
```

## Annotations
- `type: "widget"` — place any React element at data coordinates. Works on all frame types. XY/ordinal use data coordinates (`x`/`y` or field names). Network/orbit use `nodeId`. Default: info emoji. Renders as HTML overlay (not SVG) so popups/threads overflow freely.
```jsx
annotations={[{ type: "widget", month: 4, revenue: 32, dy: -4, content: <MyAlertButton /> }]}
// OrbitDiagram: annotations={[{ type: "widget", nodeId: "Pipeline", content: <Alert /> }]}
```

## Server-Side Rendering
- All HOC charts and Stream Frames render SVG automatically in server environments (no window/document)
- `renderToStaticSVG()`, `renderXYToStaticSVG()`, `renderOrdinalToStaticSVG()`, `renderNetworkToStaticSVG()` — standalone SVG generation from `semiotic/server`
- Works with Next.js App Router, Remix, Astro — same component on server and client

## AI Features
- `onObservation` — structured events (hover, click, brush, selection) on all HOCs
- `useChartObserver` — aggregates observations across LinkedCharts
- `toConfig`/`fromConfig`/`toURL`/`fromURL`/`copyConfig`/`configToJSX` — chart state serialization
- `DetailsPanel` — click-driven detail panel inside `ChartContainer`
- `validateProps(componentName, props)` — prop validation with Levenshtein typo suggestions
- `diagnoseConfig(componentName, props)` — anti-pattern detector (12 checks: empty data, bad dimensions, missing accessors, margin overflow, etc.)
- `ChartErrorBoundary` — error boundary
- `exportChart(el, { format: "png"|"svg" })` — browser export
- `npx semiotic-ai --doctor` — validate component + props JSON from CLI (uses both validateProps and diagnoseConfig)

## Differentiators
Network viz, streaming canvas, realtime encoding, coordinated views, statistical summaries, AI hooks, chart serialization, global theming, keyboard navigation
