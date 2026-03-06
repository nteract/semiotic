# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- Import from `semiotic` or granular: `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/ai`, `semiotic/data`
- `semiotic/ai` exports HOC charts + TooltipProvider + MultiLineTooltip + ThemeProvider + exportChart + validateProps + useChartObserver + DetailsPanel + ChartContainer
- `semiotic/data` exports: `bin`, `rollup`, `groupBy`, `pivot`
- CLI: `npx semiotic-ai [--schema|--compact|--examples]` — dump AI context to stdout
- MCP: `npx semiotic-mcp` — MCP server rendering charts to static SVG

## Architecture
- **HOC Charts** (recommended): Simple props, sensible defaults
- **Stream Frames** (advanced): `StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`
- Every HOC accepts `frameProps` to pass through to the underlying Stream Frame
- TypeScript `strict: true`; all charts have `role="img"` + `aria-label`

## Component Reference

### Common props (all HOCs unless noted)
`title` (string), `width` (number, 600), `height` (number, 400), `responsiveWidth` (boolean, false), `responsiveHeight` (boolean, false), `margin` (object), `className` (string), `enableHover` (boolean, true), `tooltip` (fn), `showLegend` (boolean), `showGrid` (boolean, false), `frameProps` (object), `onObservation` (fn), `chartId` (string)

### XY Charts (from "semiotic" or "semiotic/xy")

**LineChart** — `data` (required), `xAccessor` ("x"), `yAccessor` ("y"), `lineBy`, `lineDataAccessor` ("coordinates"), `colorBy`, `colorScheme` ("category10"), `curve` ("linear"|"monotoneX"|"monotoneY"|"step"|"stepAfter"|"stepBefore"|"basis"|"cardinal"|"catmullRom"), `lineWidth` (2), `showPoints` (false), `pointRadius` (3), `fillArea` (false), `areaOpacity` (0.3), `xLabel`, `yLabel`, `xFormat`, `yFormat`, `anomaly` (AnomalyConfig), `forecast` (ForecastConfig)

**AreaChart** — Same as LineChart plus: `areaBy`, `y0Accessor` (per-point lower bound for band/ribbon charts), `gradientFill` (boolean|{topOpacity,bottomOpacity} — fade fill from line to baseline), `areaOpacity` (0.7), `showLine` (true), curve default "monotoneX"

**StackedAreaChart** — Same as AreaChart plus: `normalize` (false)

**Scatterplot** — `data` (required), `xAccessor` ("x"), `yAccessor` ("y"), `colorBy`, `colorScheme`, `sizeBy`, `sizeRange` ([3,15]), `pointRadius` (5), `pointOpacity` (0.8), `xLabel`, `yLabel`, `marginalGraphics` ({top?,bottom?,left?,right?} — "histogram"|"violin"|"ridgeline"|"boxplot" or config object)

**BubbleChart** — Like Scatterplot with `sizeBy` (required), `sizeRange` ([5,40]), `bubbleOpacity` (0.6), `bubbleStrokeWidth` (1), `bubbleStrokeColor` ("white"), `marginalGraphics`

**Heatmap** — `data` (required), `xAccessor` ("x"), `yAccessor` ("y"), `valueAccessor` ("value"), `colorScheme` ("blues"|"reds"|"greens"|"viridis"|"custom"), `customColorScale`, `showValues` (false), `valueFormat`, `cellBorderColor` ("#fff"), `cellBorderWidth` (1)

### Ordinal Charts (from "semiotic" or "semiotic/ordinal")

**BarChart** — `data` (required), `categoryAccessor` ("category"), `valueAccessor` ("value"), `orientation` ("vertical"|"horizontal"), `colorBy`, `colorScheme`, `sort` (boolean|"asc"|"desc"|fn), `barPadding` (5), `categoryLabel`, `valueLabel`, `valueFormat`

**StackedBarChart** — BarChart props plus `stackBy` (required), `normalize` (false)

**GroupedBarChart** — BarChart props plus `groupBy` (required)

**SwarmPlot** — `data` (required), `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `sizeBy`, `sizeRange` ([3,8]), `pointRadius` (4), `pointOpacity` (0.7), `categoryPadding` (20)

**BoxPlot** — `data` (required), `categoryAccessor`, `valueAccessor`, `orientation`, `colorBy`, `showOutliers` (true), `outlierRadius` (3), `categoryPadding` (20)

**Histogram** — `data` (required), `categoryAccessor`, `valueAccessor`, `bins` (25), `relative` (false), `categoryPadding` (20). Always horizontal.

**ViolinPlot** — `data` (required), `categoryAccessor`, `valueAccessor`, `orientation`, `bins` (25), `curve` ("catmullRom"), `showIQR` (true), `categoryPadding` (20)

**DotPlot** — `data` (required), `categoryAccessor`, `valueAccessor`, `orientation` ("horizontal"), `sort` (true), `dotRadius` (5), `categoryPadding` (10), `showGrid` default true

**PieChart** — `data` (required), `categoryAccessor`, `valueAccessor`, `colorBy`, `startAngle` (0), `slicePadding` (2), width/height default 400

**DonutChart** — PieChart props plus `innerRadius` (60), `centerContent` (ReactNode)

### Network Charts (from "semiotic" or "semiotic/network")

**ForceDirectedGraph** — `nodes` (required), `edges` (required), `nodeIDAccessor` ("id"), `sourceAccessor` ("source"), `targetAccessor` ("target"), `nodeLabel`, `colorBy`, `nodeSize` (8), `nodeSizeRange` ([5,20]), `edgeWidth` (1), `edgeColor` ("#999"), `edgeOpacity` (0.6), `iterations` (300), `forceStrength` (0.1), `showLabels` (false). Width/height default 600.

**SankeyDiagram** — `edges` (required), `nodes` (optional), `sourceAccessor`, `targetAccessor`, `valueAccessor` ("value"), `nodeIdAccessor` ("id"), `colorBy`, `edgeColorBy` ("source"|"target"|"gradient"|fn), `orientation` ("horizontal"|"vertical"), `nodeAlign` ("justify"|"left"|"right"|"center"), `nodePaddingRatio` (0.05), `nodeWidth` (15), `nodeLabel`, `showLabels` (true), `edgeOpacity` (0.5), `edgeSort`. Default 800x600.

**ChordDiagram** — `edges` (required), `nodes`, `sourceAccessor`, `targetAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorBy`, `edgeColorBy`, `padAngle` (0.01), `groupWidth` (20), `sortGroups`, `nodeLabel`, `showLabels` (true), `edgeOpacity` (0.5)

**TreeDiagram** — `data` (required, single root with children), `layout` ("tree"|"cluster"|"partition"|"treemap"|"circlepack"), `orientation` ("vertical"|"horizontal"|"radial"), `childrenAccessor` ("children"), `valueAccessor`, `nodeIdAccessor` ("name"), `colorBy`, `colorByDepth` (false), `edgeStyle` ("line"|"curve"), `nodeLabel`, `showLabels` (true), `nodeSize` (5)

**Treemap** — `data` (required, root with children), `childrenAccessor`, `valueAccessor`, `nodeIdAccessor` ("name"), `colorBy`, `colorByDepth` (false), `showLabels` (true), `labelMode` ("leaf"|"parent"|"all"), `nodeLabel`, `padding` (4), `paddingTop` (0, auto 18 for "parent"). Hover shows ancestor breadcrumb.

**CirclePack** — `data` (required), `childrenAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorBy`, `colorByDepth` (false), `showLabels` (true), `nodeLabel`, `circleOpacity` (0.7), `padding` (4). Labels hidden below 15px radius. Hover shows ancestor breadcrumb.

### Realtime Charts (from "semiotic" or "semiotic/realtime")

All use ref-based push API + canvas rendering: `chartRef.current.push({ time, value })`

**RealtimeLineChart** — `size` ([500,300]), `timeAccessor`, `valueAccessor`, `windowSize` (200), `windowMode` ("sliding"|"stepping"), `arrowOfTime` ("left"|"right"), `stroke`, `strokeWidth`, `strokeDasharray`, `timeExtent`, `valueExtent`, `extentPadding`, `showAxes`, `background`, `enableHover`, `tooltipContent`, `onHover`, `annotations`, `svgAnnotationRules`, `tickFormatTime`, `tickFormatValue`

**RealtimeTemporalHistogram** — RealtimeLineChart props plus `binSize` (required), `categoryAccessor`, `colors`, `fill`, `gap`, `decay`, `pulse`, `staleness`, `transition`

**RealtimeSwarmChart** — RealtimeLineChart props plus `categoryAccessor`, `colors`, `radius`, `fill`, `opacity`

**RealtimeWaterfallChart** — RealtimeLineChart props plus `positiveColor`, `negativeColor`, `connectorStroke`, `connectorWidth`, `gap`

**RealtimeHeatmap** — RealtimeLineChart props plus `heatmapXBins` (20), `heatmapYBins` (20), `aggregation` ("count"|"sum"|"mean"), `linkedHover`, `decay`, `pulse`, `staleness`

**Streaming Sankey** — Use `StreamNetworkFrame` with `chartType="sankey"`, `showParticles`, `particleStyle`, `tensionConfig`, `thresholds`, `onTopologyChange`. Ref: `push()`, `pushMany()`, `clear()`, `getTopology()`, `relayout()`, `getTension()`

### Realtime Visual Encoding (all streaming charts)
- `decay` — older data fades (`{ type, halfLife, minOpacity }`)
- `pulse` — new data flashes (`{ duration, color, glowRadius }`)
- `transition` — smooth interpolation (`{ duration, easing }`)
- `staleness` — stale feed detection (`{ threshold, dimOpacity, showBadge }`)

### Coordinated Views (from "semiotic" or "semiotic/ai")

**LinkedCharts** — Wraps charts for coordination. Props: `selections` (Record with resolution: "union"|"intersect"|"crossfilter")

Chart coordination props (on HOCs inside LinkedCharts):
- `selection` — consume named selection
- `linkedHover` — produce hover selections
- `linkedBrush` — produce brush selections (Scatterplot/BubbleChart only)

Hooks: `useSelection`, `useLinkedHover`, `useBrushSelection`, `useFilteredData`

**ScatterplotMatrix** — `data` (required), `fields` (required), `fieldLabels`, `colorBy`, `cellSize` (150), `cellGap` (4), `pointRadius` (2), `pointOpacity` (0.5), `diagonal` ("histogram"|"density"|"label"), `histogramBins` (20), `hoverMode` (true), `brushMode` ("crossfilter"|"intersect"|false), `unselectedOpacity` (0.1)

## Key Usage Patterns

```jsx
// Multi-line data
<LineChart data={[{ id: "A", coordinates: [{x:0,y:1},{x:1,y:2}] }]} lineBy="id" xAccessor="x" yAccessor="y" />

// Hierarchical data (TreeDiagram, Treemap, CirclePack) — single root with children
<Treemap data={rootNode} childrenAccessor="children" valueAccessor="value" />

// Network data
<SankeyDiagram nodes={nodes} edges={edges} valueAccessor="value" />

// Tooltips
<LineChart ... tooltip={MultiLineTooltip({ title: "name", fields: ["value"] })} />

// Coordinated views
<LinkedCharts>
  <Scatterplot data={d} linkedHover={{ name: "hl", fields: ["cat"] }} selection={{ name: "hl" }} />
  <BarChart data={agg} selection={{ name: "hl" }} />
</LinkedCharts>

// Marginal graphics
<Scatterplot data={d} marginalGraphics={{ top: "histogram", right: "violin" }} />

// Theming
<ThemeProvider theme="dark"><LineChart ... /></ThemeProvider>

// Shared category colors across charts
<CategoryColorProvider colors={{ North: "#e41a1c", South: "#377eb8" }}>
  <LineChart data={d1} colorBy="region" />
  <BarChart data={d2} colorBy="region" />  {/* same colors */}
</CategoryColorProvider>

// Data transforms
import { bin, rollup, groupBy, pivot } from "semiotic/data"

// Browser export
await exportChart(el, { format: "png", scale: 2 })

// Realtime
const ref = useRef()
ref.current.push({ time: Date.now(), value: 42 })
<RealtimeLineChart ref={ref} timeAccessor="time" valueAccessor="value" />

// Forecast + anomaly detection (LineChart only)
// Auto mode: training=dashed, observed=solid, forecast=dotted with confidence envelope
<LineChart data={timeSeries} xAccessor="time" yAccessor="value"
  forecast={{ trainEnd: 60, steps: 15, confidence: 0.95 }}
  anomaly={{ threshold: 2, anomalyColor: "#ef4444" }} />

// Pre-computed mode: bring your own bounds from an ML model
// Data: { time, value, isTraining?, isForecast?, isAnomaly?, upperBounds?, lowerBounds? }
// Envelope follows per-point bounds (non-rectilinear)
<LineChart data={mlOutput} xAccessor="time" yAccessor="value"
  forecast={{
    isTraining: "isTraining", isForecast: "isForecast",
    isAnomaly: "isAnomaly", upperBounds: "upper", lowerBounds: "lower",
  }} />
```

## AI Features

**onObservation** — callback on all HOCs emitting structured events: hover, hover-end, click, click-end, brush, brush-end, selection, selection-end. Each includes `{ type, datum?, x?, y?, timestamp, chartType, chartId? }`.

**useChartObserver** — aggregates observations across LinkedCharts. Options: `limit` (50), `types`, `chartId`.

**Chart serialization** — `toConfig(name, props)` / `fromConfig(config)` for JSON round-trip. `toURL`/`fromURL` for permalinks. `copyConfig(config, "jsx")` for clipboard. `configToJSX(config)` for code gen. String accessors survive; functions are stripped.

**DetailsPanel** — selection-driven detail panel. Props: `children` (render fn), `position` ("right"|"bottom"|"overlay"), `size` (300), `trigger` ("click"|"hover"), `chartId`, `dismissOnEmpty`, `showClose`. Use inside ChartContainer via `detailsPanel` prop.

**ChartGrid** — responsive grid layout for multiple charts. Props: `columns` (number|"auto"), `minCellWidth` (300), `gap` (16). Works with LinkedCharts.

**ContextLayout** — places a primary chart alongside context chart(s). Props: `context` (ReactNode), `position` ("right"|"left"|"top"|"bottom"), `contextSize` (250), `gap` (12). Context charts use `mode="context"` for compact rendering.

**ChartErrorBoundary** — `fallback` (ReactNode), `onError` (fn)

**validateProps(componentName, props)** — returns `{ valid, errors }`

## What Semiotic Does That Others Don't
- Network visualization (force, sankey, chord, tree, treemap, circlepack) with same clean API
- Streaming data (canvas 60fps push API) + streaming Sankey with particles
- Realtime visual encoding (decay, pulse, transitions, staleness)
- Coordinated views (LinkedCharts, crossfilter brushing, ScatterplotMatrix)
- Statistical summaries (box, violin, swarm, histogram, marginal graphics)
- AI observation hooks + chart state serialization
- Server-side SVG via `renderToStaticSVG()` (from "semiotic/server")
- Global theming with ThemeProvider
