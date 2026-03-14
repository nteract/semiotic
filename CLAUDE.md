# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- Import: `semiotic`, `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/ai`, `semiotic/data`, `semiotic/server`
- CLI: `npx semiotic-ai [--schema|--compact|--examples|--doctor]`
- MCP: `npx semiotic-mcp`
- Every HOC has a built-in error boundary (never blanks the page) and dev-mode validation warnings

## Architecture
- **HOC Charts**: Simple props, sensible defaults. **Stream Frames**: Full control.
- **Always use HOC charts** (`ForceDirectedGraph`, `SankeyDiagram`, `LineChart`, `RealtimeLineChart`, etc.) unless you need sophisticated control they don't expose. Stream Frames (`StreamNetworkFrame`, `StreamXYFrame`, `StreamOrdinalFrame`) are low-level escape hatches — they accept raw `RealtimeNode`/`RealtimeEdge` wrappers in callbacks, not your data objects directly.
- Every HOC accepts `frameProps` to pass through. TypeScript `strict: true`.

## Common Props (all HOCs)
`title`, `width` (600), `height` (400), `responsiveWidth`, `responsiveHeight`, `margin`, `className`, `enableHover` (true), `tooltip`, `showLegend`, `showGrid` (false), `frameProps`, `onObservation`, `chartId`, `loading` (false), `emptyContent`, `legendInteraction` ("none"|"highlight"|"isolate"), `emphasis` ("primary"|"secondary")

## XY Charts (`semiotic/xy`)

**LineChart** — `data`, `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor` ("coordinates"), `colorBy`, `colorScheme`, `curve`, `lineWidth` (2), `showPoints`, `pointRadius` (3), `fillArea`, `areaOpacity` (0.3), `anomaly` (AnomalyConfig), `forecast` (ForecastConfig), `directLabel` (boolean|{position,fontSize}), `gapStrategy` ("break"|"interpolate"|"zero")

**AreaChart** — LineChart props + `areaBy`, `y0Accessor` (band/ribbon), `gradientFill` (boolean|{topOpacity,bottomOpacity}), `areaOpacity` (0.7), `showLine` (true)

**StackedAreaChart** — flat array data + `areaBy` (required, groups into stacked areas), `colorBy`, `normalize` (false). Do NOT use `lineBy` or `lineDataAccessor` — those are LineChart props.

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

**ForceDirectedGraph** — `nodes`, `edges`, `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `colorScheme`, `nodeSize` (number|string|fn), `nodeSizeRange`, `edgeWidth`, `edgeColor`, `edgeOpacity`, `iterations` (300), `forceStrength` (0.1), `showLabels`, `nodeLabel`, `tooltip`, `showLegend`, `legendInteraction`
**SankeyDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `orientation`, `nodeAlign`, `nodeWidth`, `showLabels`, `edgeOpacity`
**ChordDiagram** — `edges`, `nodes`, `valueAccessor`, `edgeColorBy`, `padAngle`, `groupWidth`, `showLabels`
**TreeDiagram** — `data` (root), `layout`, `orientation`, `childrenAccessor`, `colorBy`, `colorByDepth`, `edgeStyle`
**Treemap** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `showLabels`, `labelMode`
**CirclePack** — `data` (root), `childrenAccessor`, `valueAccessor`, `colorBy`, `colorByDepth`, `circleOpacity`
**OrbitDiagram** — `data` (root), `childrenAccessor`, `nodeIdAccessor`, `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed` (0.25), `revolution`, `eccentricity`, `orbitSize`, `nodeRadius`, `showRings`, `showLabels`, `animated` (true), `colorBy`, `colorByDepth`, `annotations` (widget annotations anchor by nodeId)

## Realtime Charts (`semiotic/realtime`)

Push API: `chartRef.current.push({ time, value })`

**IMPORTANT**: All pushed data must include a time field (default: `"time"`). If your data uses a different field name, set `timeAccessor` explicitly. Without a valid time field, charts render blank with no error.

**RealtimeLineChart** — `size`, **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `windowSize` (200), `windowMode`, `stroke`, `strokeWidth`
**RealtimeHistogram** — **`binSize`** (required), **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `categoryAccessor`, `colors`. Time field is required even though this shows a distribution — it's used for windowing.
**RealtimeSwarmChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `categoryAccessor`, `radius`, `opacity`
**RealtimeWaterfallChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `positiveColor`, `negativeColor`
**RealtimeHeatmap** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `heatmapXBins`, `heatmapYBins`, `aggregation`. Both accessors must match your data fields or the chart renders blank.
**Streaming Sankey** — `StreamNetworkFrame` with `chartType="sankey"`, `showParticles` (boolean), `particleStyle` (`{ radius, opacity, speedMultiplier, maxPerEdge, colorBy }`), `tensionConfig`, `thresholds`

Realtime encoding: `decay`, `pulse`, `transition`, `staleness` — compose freely on all streaming charts.

### Realtime data shape
```jsx
// Every pushed datum should have a time field
ref.current.push({ time: Date.now(), value: 42 })              // line, waterfall
ref.current.push({ time: Date.now(), value: 42, category: "A" }) // histogram, swarm
ref.current.push({ time: Date.now(), value: 42 })              // heatmap (time=x, value=y)
```

### Any chart can stream via Stream Frames
The Realtime* HOCs are convenience wrappers. For streaming versions of ANY chart type (scatter, stacked area, bar, etc.), use the corresponding Stream Frame (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`) with `runtimeMode="streaming"` and push data via ref.

## Stream Frame Callbacks (advanced — prefer HOCs)
Stream Frame callbacks (`nodeStyle`, `edgeStyle`, `nodeSize` as function, `colorBy` as function, `nodeLabel` as function) receive **`RealtimeNode`/`RealtimeEdge`** wrappers, NOT your raw data. Access your original data via `.data`:
```jsx
// WRONG: nodeSize={(d) => d.weight}         — d is RealtimeNode, d.weight is undefined
// RIGHT: nodeSize={(d) => d.data?.weight}   — d.data is your original node object
// RIGHT: nodeSize="weight"                  — string accessor handles this automatically
// WRONG: nodeStyle={(d) => ({ fill: d.datum.color })}  — .datum does not exist
// RIGHT: nodeStyle={(d) => ({ fill: d.data?.color })}  — use .data
```
`customHoverBehavior` and `customClickBehavior` receive `{ type: "node"|"edge", data: <your raw object>, x, y } | null`.
`tooltipContent` receives `{ type: "node"|"edge", data: <your raw object> }`.

## Coordinated Views

**LinkedCharts** — wraps charts. Props: `selections` (resolution: "union"|"intersect"|"crossfilter"), `showLegend` (auto when CategoryColorProvider present), `legendPosition` ("top"|"bottom"), `legendInteraction` ("highlight"|"isolate"|"none"), `legendSelectionName` (selection name for legend-driven cross-highlighting), `legendField` (data field for legend selections)
**CategoryColorProvider** — stable category→color mapping. Props: `colors` (map) or `categories` + `colorScheme`
Chart props: `selection`, `linkedHover`, `linkedBrush`. Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`
**ScatterplotMatrix** — `data`, `fields`, `colorBy`, `cellSize`, `hoverMode`, `brushMode`

## ChartContainer

**ChartContainer** — wrapper with title, subtitle, status indicator, toolbar actions. Props: `title`, `subtitle`, `height` (default **400** — set this to match your chart's height or you'll get extra whitespace), `width` (default "100%"), `status` ("live"|"stale"|"error"), `loading`, `error`, `errorBoundary`, `actions` (`{ export, fullscreen, copyConfig }`), `controls`, `style`, `className`

When using `ChartContainer` with a chart that has `size={[w, h]}`, always set `height={h}` on the container to avoid a mismatch.

## Layout & Composition

**ChartGrid** — CSS Grid layout. `columns` (number|"auto"), `minCellWidth` (300), `gap` (16). Children with `emphasis="primary"` span two columns.
**ContextLayout** — primary + context panel. `context` (ReactNode), `position`, `contextSize` (250)

## Key Patterns

```jsx
// Force-directed graph with custom sizing and hover
<ForceDirectedGraph
  nodes={[{ id: "A", group: "eng", weight: 10 }, { id: "B", group: "design", weight: 5 }]}
  edges={[{ source: "A", target: "B" }]}
  colorBy="group"
  nodeSize="weight"           // string accessor → reads node.weight, scales to nodeSizeRange
  nodeSizeRange={[5, 25]}
  showLabels
  showLegend
  tooltip={(d) => <div>{d.data.id}: {d.data.weight}</div>}
  frameProps={{
    customClickBehavior: (d) => { if (d?.type === "node") console.log(d.data) },
    background: "#f5f5f5",
  }}
/>

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

// Stacked area (flat array + areaBy, NOT lineBy)
<StackedAreaChart data={flatData} xAccessor="month" yAccessor="value"
  areaBy="category" colorBy="category" />

// Gradient area + percentile band
<AreaChart data={d} xAccessor="x" yAccessor="p95" y0Accessor="p5" gradientFill />

// Realtime — always include time field in pushed data
const ref = useRef()
ref.current.push({ time: Date.now(), value: 42 })
<RealtimeLineChart ref={ref} timeAccessor="time" valueAccessor="value" />

// Realtime histogram — time field required even for distribution charts
const histRef = useRef()
histRef.current.push({ time: Date.now(), value: Math.abs(delta) })
<RealtimeHistogram ref={histRef} timeAccessor="time" valueAccessor="value" binSize={100} />

// Streaming sankey with particles
<StreamNetworkFrame
  ref={sankeyRef}
  chartType="sankey"
  showParticles={true}
  particleStyle={{ radius: 2, colorBy: "source", speedMultiplier: 1.5 }}
/>
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
- `exportChart(el, { format: "png"|"svg" })` — browser export (default: PNG, composites canvas + SVG layers)
- `npx semiotic-ai --doctor` — validate component + props JSON from CLI (uses both validateProps and diagnoseConfig)

## Differentiators
Network viz, streaming canvas, realtime encoding, coordinated views, statistical summaries, AI hooks, chart serialization, global theming, keyboard navigation, interactive legends (highlight/isolate), direct labeling, gap handling, empty/loading states, landmark tick labels, LinkedCharts unified legend
