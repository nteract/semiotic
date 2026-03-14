# Semiotic — React Data Visualization

Use `import { ComponentName } from "semiotic/ai"` for all components below.

## Flat Array Data (`data: object[]`)
- **LineChart** — `xAccessor`, `yAccessor`, `lineBy` (multi-line), `curve`
- **AreaChart** — `xAccessor`, `yAccessor`, `areaBy`, `areaOpacity`
- **StackedAreaChart** — `xAccessor`, `yAccessor`, **`areaBy`** (required, groups flat data into stacked areas), `colorBy`, `normalize`. Data must be a flat array. Do NOT use `lineBy` or `lineDataAccessor`.
- **Scatterplot** — `xAccessor`, `yAccessor`, `colorBy`, `sizeBy`
- **BubbleChart** — `xAccessor`, `yAccessor`, **`sizeBy`** (required), `sizeRange`
- **ConnectedScatterplot** — `xAccessor`, `yAccessor`, `orderAccessor` (sequencing field), `pointRadius`
- **Heatmap** — `xAccessor`, `yAccessor`, `valueAccessor`, `colorScheme` ("blues"|"reds"|"greens"|"viridis")
- **BarChart** — `categoryAccessor`, `valueAccessor`, `orientation`, `sort`
- **StackedBarChart** — `categoryAccessor`, `valueAccessor`, **`stackBy`** (required), `normalize`
- **GroupedBarChart** — `categoryAccessor`, `valueAccessor`, **`groupBy`** (required)
- **SwarmPlot** — `categoryAccessor`, `valueAccessor`, `pointRadius`
- **BoxPlot** — `categoryAccessor`, `valueAccessor`, `showOutliers`
- **Histogram** — `categoryAccessor`, `valueAccessor`, `bins` (default 25), `relative`
- **ViolinPlot** — `categoryAccessor`, `valueAccessor`, `bins`, `curve`, `showIQR`
- **DotPlot** — `categoryAccessor`, `valueAccessor`, `sort`, `dotRadius`
- **PieChart** — `categoryAccessor`, `valueAccessor`
- **DonutChart** — `categoryAccessor`, `valueAccessor`, `innerRadius`, `centerContent`

## Hierarchical Data (`data: { children: [...] }`)
- **TreeDiagram** — `childrenAccessor`, `nodeIdAccessor`, `layout` ("tree"|"cluster"|"partition"), `orientation`
- **Treemap** — `childrenAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorByDepth`
- **CirclePack** — `childrenAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorByDepth`
- **OrbitDiagram** — `childrenAccessor`, `nodeIdAccessor`, `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed`, `animated`

## Network Data (`nodes: object[]`, `edges: object[]`)
- **ForceDirectedGraph** — **`nodes`**, **`edges`** (both required), `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `nodeSize` (number|string|fn), `nodeSizeRange`, `edgeWidth`, `edgeOpacity`, `iterations`, `forceStrength`, `showLabels`, `nodeLabel`, `tooltip`, `showLegend`
- **SankeyDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`
- **ChordDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`

**Important**: Always use these HOC components for network charts unless you need sophisticated control they don't expose. `StreamNetworkFrame` is a low-level escape hatch — its callbacks receive internal wrapper objects (`RealtimeNode`), not your raw data.

## Realtime (ref-based push API, canvas)

**IMPORTANT**: All pushed data must include a time field (default: `"time"`). Set `timeAccessor` if your field is named differently. Without a valid time field, charts silently render blank.

- **RealtimeLineChart** — `ref.current.push(datum)`, **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `windowSize`
- **RealtimeHistogram** — **`binSize`** (required), **`timeAccessor`** ("time"), **`valueAccessor`** ("value"). Time field required even though this is a distribution — it's used for windowing.
- **RealtimeSwarmChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `categoryAccessor`
- **RealtimeWaterfallChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `positiveColor`, `negativeColor`
- **RealtimeHeatmap** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `heatmapXBins`, `heatmapYBins`, `aggregation`. Both must match your data fields.
- **StreamNetworkFrame** (`chartType="sankey"`) — `ref.current.push({ source, target, value })`, `sourceAccessor`, `targetAccessor`, `valueAccessor`, `showParticles` (boolean), `particleStyle` (`{ radius, opacity, speedMultiplier, maxPerEdge, colorBy }`) (import from `semiotic`)

Pushed data shape: `{ time: Date.now(), value: 42 }` for line/waterfall/heatmap, add `category` for histogram/swarm.

Any chart type can stream via Stream Frames (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`) with `runtimeMode="streaming"` and ref-based push.

## ChartContainer
- **ChartContainer** — wrapper with title, subtitle, status indicator, toolbar. `title`, `subtitle`, `height` (default **400** — always set this to match your chart height), `width` ("100%"), `status` ("live"|"stale"|"error"), `loading`, `error`, `actions`, `style`
- When using with `size={[w, h]}`, set `height={h}` on the container or you'll get extra whitespace.

## Common Props (all components)
`width`, `height`, `margin`, `title`, `colorBy`, `colorScheme`, `enableHover`, `tooltip`, `showLegend`, `className`, `frameProps`
