# Semiotic — React Data Visualization

Use `import { ComponentName } from "semiotic/ai"` for all components below.

## Flat Array Data (`data: object[]`)
- **LineChart** — `xAccessor`, `yAccessor`, `lineBy` (multi-line), `curve`
- **AreaChart** — `xAccessor`, `yAccessor`, `areaBy`, `areaOpacity`
- **StackedAreaChart** — `xAccessor`, `yAccessor`, `areaBy` (required), `normalize`
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
- **ForceDirectedGraph** — **`nodes`**, **`edges`** (both required), `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`
- **SankeyDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`
- **ChordDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`

## Realtime (ref-based push API, canvas)
- **RealtimeLineChart** — `ref.current.push(datum)`, `timeAccessor`, `valueAccessor`, `windowSize`
- **RealtimeHistogram** — **`binSize`** (required), `timeAccessor`, `valueAccessor`
- **RealtimeSwarmChart** — `timeAccessor`, `valueAccessor`, `categoryAccessor`
- **RealtimeWaterfallChart** — `timeAccessor`, `valueAccessor`, `positiveColor`, `negativeColor`
- **RealtimeHeatmap** — `timeAccessor`, `valueAccessor`, `heatmapXBins`, `heatmapYBins`, `aggregation`
- **StreamNetworkFrame** (`chartType="sankey"`) — `ref.current.push({ source, target, value })`, `sourceAccessor`, `targetAccessor`, `valueAccessor` (import from `semiotic`)

## Common Props (all components)
`width`, `height`, `margin`, `title`, `colorBy`, `colorScheme`, `enableHover`, `tooltip`, `showLegend`, `className`, `frameProps`
