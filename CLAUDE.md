# Semiotic — AI Assistant Guide

## Quick Start
- Install: `npm install semiotic`
- Import from `semiotic` or granular: `semiotic/xy`, `semiotic/ordinal`, `semiotic/network`, `semiotic/realtime`, `semiotic/ai`
- `semiotic/ai` exports the 24 HOC chart components + TooltipProvider + MultiLineTooltip + `validateProps`
- `validateProps(componentName, props)` — validate props before rendering, returns `{ valid, errors }`
- CLI: `npx semiotic-ai [--schema|--compact|--examples]` — dump AI context to stdout
- MCP: `npx semiotic-mcp` — MCP server that renders charts to static SVG

## Architecture
- **HOC Charts** (recommended): Simple props, sensible defaults — use these
- **Frames** (advanced): Full control — only when HOCs aren't enough
- Every HOC accepts `frameProps` to pass through to the underlying Frame

## Component Reference

### XY Charts (import from "semiotic" or "semiotic/xy")

#### LineChart
Line traces with curve interpolation, area fill, and point markers. Use for time series, trends, and continuous data.

Props: `data` (TDatum[], required), `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `lineBy` (string|fn), `lineDataAccessor` (string, "coordinates"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `curve` ("linear"|"monotoneX"|"monotoneY"|"step"|"stepAfter"|"stepBefore"|"basis"|"cardinal"|"catmullRom", "linear"),
  `lineWidth` (number, 2), `showPoints` (boolean, false), `pointRadius` (number, 3),
  `fillArea` (boolean, false), `areaOpacity` (number, 0.3),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<LineChart data={sales} xAccessor="month" yAccessor="revenue" curve="monotoneX" />
```

#### AreaChart
Filled area under a line with optional stroke. Use for showing volume or magnitude over time.

Props: `data` (TDatum[], required), `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `areaBy` (string|fn), `lineDataAccessor` (string, "coordinates"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `curve` ("linear"|"monotoneX"|"monotoneY"|"step"|"stepAfter"|"stepBefore"|"basis"|"cardinal"|"catmullRom", "monotoneX"),
  `areaOpacity` (number, 0.7), `showLine` (boolean, true), `lineWidth` (number, 2),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<AreaChart data={temps} xAccessor="date" yAccessor="temp" areaBy="city" />
```

#### StackedAreaChart
Stacked area chart with optional normalization to 100%. Use for part-to-whole trends over time.

Props: `data` (TDatum[], required), `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `areaBy` (string|fn), `lineDataAccessor` (string, "coordinates"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `curve` ("linear"|"monotoneX"|"monotoneY"|"step"|"stepAfter"|"stepBefore"|"basis"|"cardinal"|"catmullRom", "monotoneX"),
  `areaOpacity` (number, 0.7), `showLine` (boolean, true), `lineWidth` (number, 2),
  `normalize` (boolean, false),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<StackedAreaChart data={revenue} xAccessor="quarter" yAccessor="amount" areaBy="product" normalize />
```

#### Scatterplot
Individual data points plotted by x/y position with optional size and color encoding.

Props: `data` (TDatum[], required), `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `sizeBy` (string|fn), `sizeRange` ([number, number], [3, 15]),
  `pointRadius` (number, 5), `pointOpacity` (number, 0.8),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<Scatterplot data={iris} xAccessor="sepalLength" yAccessor="petalLength" colorBy="species" />
```

#### BubbleChart
Like Scatterplot but with required size dimension. Use when a third numeric variable matters.

Props: `data` (TDatum[], required), `sizeBy` (string|fn, **required**),
  `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `sizeRange` ([number, number], [5, 40]),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `bubbleOpacity` (number, 0.6), `bubbleStrokeWidth` (number, 1), `bubbleStrokeColor` (string, "white"),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<BubbleChart data={countries} xAccessor="gdp" yAccessor="life" sizeBy="population" colorBy="continent" />
```

#### Heatmap
Grid/matrix visualization with color-encoded cell values.

Props: `data` (TDatum[], required), `xAccessor` (string|fn, "x"), `yAccessor` (string|fn, "y"),
  `valueAccessor` (string|fn, "value"),
  `colorScheme` ("blues"|"reds"|"greens"|"viridis"|"custom", "blues"),
  `customColorScale` (any), `showValues` (boolean, false), `valueFormat` (fn),
  `cellBorderColor` (string, "#fff"), `cellBorderWidth` (number, 1),
  `xLabel` (string), `yLabel` (string), `xFormat` (fn), `yFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<Heatmap data={correlations} xAccessor="var1" yAccessor="var2" valueAccessor="r" colorScheme="viridis" />
```

### Ordinal/Categorical Charts (import from "semiotic" or "semiotic/ordinal")

#### BarChart
Vertical or horizontal bars for categorical comparisons.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "vertical"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `sort` (boolean|"asc"|"desc"|fn, false), `barPadding` (number, 5),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<BarChart data={sales} categoryAccessor="region" valueAccessor="total" orientation="horizontal" />
```

#### StackedBarChart
Stacked bars for part-to-whole comparisons across categories.

Props: `data` (TDatum[], required), `stackBy` (string|fn, **required**),
  `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "vertical"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `normalize` (boolean, false), `barPadding` (number, 5),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean, true), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<StackedBarChart data={survey} categoryAccessor="question" stackBy="response" valueAccessor="count" />
```

#### GroupedBarChart
Side-by-side bars for comparing sub-categories within categories.

Props: `data` (TDatum[], required), `groupBy` (string|fn, **required**),
  `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "vertical"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `barPadding` (number, 5),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean, true), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<GroupedBarChart data={results} categoryAccessor="year" groupBy="product" valueAccessor="revenue" />
```

#### SwarmPlot
Beeswarm/jittered dot plot showing individual data points within categories.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "vertical"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `sizeBy` (string|fn), `sizeRange` ([number, number], [3, 8]),
  `pointRadius` (number, 4), `pointOpacity` (number, 0.7), `categoryPadding` (number, 20),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<SwarmPlot data={salaries} categoryAccessor="department" valueAccessor="salary" colorBy="level" />
```

#### BoxPlot
Box-and-whisker plots showing statistical distribution per category.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "vertical"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `showOutliers` (boolean, true), `outlierRadius` (number, 3), `categoryPadding` (number, 20),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, false),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<BoxPlot data={scores} categoryAccessor="subject" valueAccessor="score" showOutliers />
```

#### DotPlot
Cleveland-style dot plot for comparing values across categories.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `orientation` ("vertical"|"horizontal", "horizontal"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `sort` (boolean|"asc"|"desc"|fn, true), `dotRadius` (number, 5), `categoryPadding` (number, 10),
  `categoryLabel` (string), `valueLabel` (string), `valueFormat` (fn),
  `title` (string), `width` (number, 600), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean), `showGrid` (boolean, true),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<DotPlot data={rankings} categoryAccessor="team" valueAccessor="wins" sort="desc" />
```

#### PieChart
Proportional slices in a circle.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `startAngle` (number, 0), `slicePadding` (number, 2),
  `title` (string), `width` (number, 400), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean, true),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<PieChart data={market} categoryAccessor="brand" valueAccessor="share" />
```

#### DonutChart
Pie chart with a hole in the center. Supports center content.

Props: `data` (TDatum[], required), `categoryAccessor` (string|fn, "category"), `valueAccessor` (string|fn, "value"),
  `innerRadius` (number, 60), `centerContent` (ReactNode),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `startAngle` (number, 0), `slicePadding` (number, 2),
  `title` (string), `width` (number, 400), `height` (number, 400),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean, true),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<DonutChart data={budget} categoryAccessor="category" valueAccessor="amount" centerContent={<span>$42K</span>} />
```

### Network Charts (import from "semiotic" or "semiotic/network")

#### ForceDirectedGraph
Physics-based node-link diagram. Use for relationships, social networks, knowledge graphs.

Props: `nodes` (TNode[], required), `edges` (TEdge[], required),
  `nodeIDAccessor` (string|fn, "id"), `sourceAccessor` (string|fn, "source"), `targetAccessor` (string|fn, "target"),
  `nodeLabel` (string|fn), `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `nodeSize` (number|string|fn, 8), `nodeSizeRange` ([number, number], [5, 20]),
  `edgeWidth` (number|string|fn, 1), `edgeColor` (string, "#999"), `edgeOpacity` (number, 0.6),
  `iterations` (number, 300), `forceStrength` (number, 0.1),
  `showLabels` (boolean, false),
  `title` (string), `width` (number, 600), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `showLegend` (boolean, true),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<ForceDirectedGraph nodes={people} edges={friendships} colorBy="team" nodeSize={8} showLabels />
```

#### SankeyDiagram
Flow diagram showing weighted connections between nodes. Use for flows, budgets, process mapping.

Props: `edges` (TEdge[], required), `nodes` (TNode[]),
  `sourceAccessor` (string|fn, "source"), `targetAccessor` (string|fn, "target"),
  `valueAccessor` (string|fn, "value"), `nodeIdAccessor` (string|fn, "id"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `edgeColorBy` ("source"|"target"|"gradient"|fn, "source"),
  `orientation` ("horizontal"|"vertical", "horizontal"),
  `nodeAlign` ("justify"|"left"|"right"|"center", "justify"),
  `nodePaddingRatio` (number, 0.05), `nodeWidth` (number, 15),
  `nodeLabel` (string|fn), `showLabels` (boolean, true),
  `edgeOpacity` (number, 0.5), `edgeSort` (fn),
  `title` (string), `width` (number, 800), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<SankeyDiagram edges={flows} sourceAccessor="from" targetAccessor="to" valueAccessor="amount" />
```

#### ChordDiagram
Circular diagram showing inter-relationships between groups.

Props: `edges` (TEdge[], required), `nodes` (TNode[]),
  `sourceAccessor` (string|fn, "source"), `targetAccessor` (string|fn, "target"),
  `valueAccessor` (string|fn, "value"), `nodeIdAccessor` (string|fn, "id"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `edgeColorBy` ("source"|"target"|fn, "source"),
  `padAngle` (number, 0.01), `groupWidth` (number, 20), `sortGroups` (fn),
  `nodeLabel` (string|fn), `showLabels` (boolean, true),
  `edgeOpacity` (number, 0.5),
  `title` (string), `width` (number, 600), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<ChordDiagram edges={trades} sourceAccessor="exporter" targetAccessor="importer" valueAccessor="volume" />
```

#### TreeDiagram
Hierarchical tree layout. Supports tree, cluster, partition, and radial orientations.

Props: `data` (TNode, required — single root node with children),
  `layout` ("tree"|"cluster"|"partition"|"treemap"|"circlepack", "tree"),
  `orientation` ("vertical"|"horizontal"|"radial", "vertical"),
  `childrenAccessor` (string|fn, "children"), `valueAccessor` (string|fn, "value"),
  `nodeIdAccessor` (string|fn, "name"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `colorByDepth` (boolean, false), `edgeStyle` ("line"|"curve", "curve"),
  `nodeLabel` (string|fn), `showLabels` (boolean, true), `nodeSize` (number, 5),
  `title` (string), `width` (number, 600), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<TreeDiagram data={orgChart} childrenAccessor="reports" nodeIdAccessor="name" orientation="horizontal" />
```

#### Treemap
Space-filling rectangular hierarchy visualization.

Props: `data` (TNode, required — single root node with children),
  `childrenAccessor` (string|fn, "children"), `valueAccessor` (string|fn, "value"),
  `nodeIdAccessor` (string|fn, "name"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `colorByDepth` (boolean, false),
  `showLabels` (boolean, true), `nodeLabel` (string|fn),
  `title` (string), `width` (number, 600), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<Treemap data={fileSystem} childrenAccessor="children" valueAccessor="size" colorByDepth />
```

#### CirclePack
Nested circles representing hierarchical data.

Props: `data` (TNode, required — single root node with children),
  `childrenAccessor` (string|fn, "children"), `valueAccessor` (string|fn, "value"),
  `nodeIdAccessor` (string|fn, "name"),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `colorByDepth` (boolean, false),
  `showLabels` (boolean, true), `nodeLabel` (string|fn),
  `circleOpacity` (number, 0.7),
  `title` (string), `width` (number, 600), `height` (number, 600),
  `enableHover` (boolean, true), `tooltip` (fn),
  `margin` (object), `className` (string), `frameProps` (object)

```jsx
<CirclePack data={taxonomy} childrenAccessor="children" valueAccessor="count" colorByDepth />
```

### Realtime Charts (import from "semiotic" or "semiotic/realtime")

All realtime charts use a ref-based push API and render on canvas for high performance.

```jsx
const chartRef = useRef()
// Push data at any frequency
chartRef.current.push({ time: Date.now(), value: reading })
```

#### RealtimeLineChart
Streaming line chart rendered on canvas.

Props: `size` ([number, number], [500, 300]),
  `timeAccessor` (string|fn), `valueAccessor` (string|fn),
  `windowSize` (number, 200), `windowMode` ("sliding"|"stepping", "sliding"),
  `arrowOfTime` ("left"|"right", "right"),
  `stroke` (string, "#007bff"), `strokeWidth` (number, 2), `strokeDasharray` (string),
  `timeExtent` ([number, number]), `valueExtent` ([number, number]), `extentPadding` (number),
  `showAxes` (boolean, true), `background` (string),
  `enableHover` (boolean|object), `tooltipContent` (fn), `onHover` (fn),
  `annotations` (object[]), `svgAnnotationRules` (fn),
  `tickFormatTime` (fn), `tickFormatValue` (fn),
  `margin` (object), `className` (string)

```jsx
<RealtimeLineChart ref={chartRef} timeAccessor="time" valueAccessor="value" windowSize={200} />
```

#### RealtimeBarChart
Streaming bar chart with binned aggregation.

Props: `binSize` (number, **required**),
  `size` ([number, number], [500, 300]),
  `timeAccessor` (string|fn), `valueAccessor` (string|fn),
  `categoryAccessor` (string|fn), `colors` (Record<string, string>),
  `windowSize` (number, 200), `windowMode` ("sliding"|"stepping", "sliding"),
  `arrowOfTime` ("left"|"right", "right"),
  `fill` (string), `stroke` (string), `strokeWidth` (number), `gap` (number),
  `timeExtent` ([number, number]), `valueExtent` ([number, number]), `extentPadding` (number),
  `showAxes` (boolean, true), `background` (string),
  `enableHover` (boolean|object), `tooltipContent` (fn), `onHover` (fn),
  `annotations` (object[]), `svgAnnotationRules` (fn),
  `tickFormatTime` (fn), `tickFormatValue` (fn),
  `margin` (object), `className` (string)

```jsx
<RealtimeBarChart ref={chartRef} binSize={1000} timeAccessor="time" valueAccessor="count" />
```

#### RealtimeSwarmChart
Streaming swarm/scatter chart showing individual data points.

Props: `size` ([number, number], [500, 300]),
  `timeAccessor` (string|fn), `valueAccessor` (string|fn),
  `categoryAccessor` (string|fn), `colors` (Record<string, string>),
  `windowSize` (number, 200), `windowMode` ("sliding"|"stepping", "sliding"),
  `arrowOfTime` ("left"|"right", "right"),
  `radius` (number), `fill` (string), `opacity` (number), `stroke` (string), `strokeWidth` (number),
  `timeExtent` ([number, number]), `valueExtent` ([number, number]), `extentPadding` (number),
  `showAxes` (boolean, true), `background` (string),
  `enableHover` (boolean|object), `tooltipContent` (fn), `onHover` (fn),
  `annotations` (object[]), `svgAnnotationRules` (fn),
  `tickFormatTime` (fn), `tickFormatValue` (fn),
  `margin` (object), `className` (string)

```jsx
<RealtimeSwarmChart ref={chartRef} timeAccessor="time" valueAccessor="latency" categoryAccessor="service" />
```

#### RealtimeWaterfallChart
Streaming waterfall chart showing positive/negative changes over time.

Props: `size` ([number, number], [500, 300]),
  `timeAccessor` (string|fn), `valueAccessor` (string|fn),
  `windowSize` (number, 200), `windowMode` ("sliding"|"stepping", "sliding"),
  `arrowOfTime` ("left"|"right", "right"),
  `positiveColor` (string), `negativeColor` (string),
  `connectorStroke` (string), `connectorWidth` (number),
  `gap` (number), `stroke` (string), `strokeWidth` (number),
  `timeExtent` ([number, number]), `valueExtent` ([number, number]), `extentPadding` (number),
  `showAxes` (boolean, true), `background` (string),
  `enableHover` (boolean|object), `tooltipContent` (fn), `onHover` (fn),
  `annotations` (object[]), `svgAnnotationRules` (fn),
  `tickFormatTime` (fn), `tickFormatValue` (fn),
  `margin` (object), `className` (string)

```jsx
<RealtimeWaterfallChart ref={chartRef} timeAccessor="time" valueAccessor="delta" />
```

### Coordinated Views (import from "semiotic" or "semiotic/ai")

#### LinkedCharts
Context provider for coordinated chart views. Wraps any number of charts at any depth.

Props: `selections` (Record<string, { resolution?: "union"|"intersect"|"crossfilter" }>)

```jsx
<LinkedCharts selections={{ dash: { resolution: "crossfilter" } }}>
  <Scatterplot data={d} xAccessor="x" yAccessor="y"
    linkedHover={{ name: "hl", fields: ["cat"] }}
    selection={{ name: "hl" }} />
  <BarChart data={agg} categoryAccessor="cat" valueAccessor="total"
    selection={{ name: "hl" }} />
</LinkedCharts>
```

**Chart coordination props** (available on all XY and ordinal HOCs inside LinkedCharts):
- `selection` ({ name, unselectedOpacity?, unselectedStyle?, selectedStyle? }) — consume a named selection
- `linkedHover` (boolean | string | { name?, fields }) — produce hover selections
- `linkedBrush` (string | { name, xField?, yField? }) — produce brush selections (Scatterplot, BubbleChart only)

**Hooks** (for custom coordinated views):
- `useSelection({ name, clientId?, fields? })` → { predicate, isActive, selectPoints, selectInterval, clear }
- `useLinkedHover({ name?, fields })` → { onHover, predicate, isActive }
- `useBrushSelection({ name, xField?, yField? })` → { brushInteraction, predicate, isActive, clear }
- `useFilteredData(data, selectionName, clientId?)` → filtered T[]

#### ScatterplotMatrix
N×N grid of scatterplots for exploring multi-dimensional data. Diagonal shows histograms.
Two mutually exclusive interaction modes: hover (default) cross-highlights the same datum
across all cells with a tooltip; brush mode enables crossfilter region selection.

Props: `data` (TDatum[], required), `fields` (string[], required),
  `fieldLabels` (Record<string, string>),
  `colorBy` (string|fn), `colorScheme` (string|string[], "category10"),
  `cellSize` (number, 150), `cellGap` (number, 4),
  `pointRadius` (number, 2), `pointOpacity` (number, 0.5),
  `diagonal` ("histogram"|"density"|"label", "histogram"),
  `histogramBins` (number, 20),
  `hoverMode` (boolean, true — cross-highlight with tooltip above hovered point),
  `brushMode` ("crossfilter"|"intersect"|false, "crossfilter" — active when hoverMode is false),
  `unselectedOpacity` (number, 0.1),
  `showGrid` (boolean, false), `tooltip` (fn), `showLegend` (boolean),
  `width` (number), `height` (number), `className` (string)

```jsx
// Hover mode (default): cross-highlight on hover with tooltip
<ScatterplotMatrix
  data={iris}
  fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
  colorBy="species"
  fieldLabels={{ sepalLength: "Sepal Length", sepalWidth: "Sepal Width", petalLength: "Petal Length", petalWidth: "Petal Width" }}
  cellSize={160}
/>

// Brush mode: crossfilter region selection
<ScatterplotMatrix
  data={iris}
  fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
  colorBy="species"
  cellSize={160}
  hoverMode={false}
  brushMode="crossfilter"
/>
```

## Common Patterns

### Color encoding
```jsx
<BarChart data={d} categoryAccessor="name" valueAccessor="value" colorBy="region" />
// Custom colors:
<BarChart ... colorScheme={["#e41a1c", "#377eb8", "#4daf4a"]} />
```

### Tooltips
```jsx
import { MultiLineTooltip } from "semiotic"

<LineChart ... tooltip={MultiLineTooltip({ title: "name", fields: ["value"] })} />
```

### Legends
Automatic when `colorBy` is set. Control with `showLegend`.

### Grid lines
```jsx
<LineChart ... showGrid={true} />
```

### Multi-line data
```jsx
// Array of line objects, each with a coordinates array:
const data = [
  { id: "A", coordinates: [{ x: 0, y: 1 }, { x: 1, y: 2 }] },
  { id: "B", coordinates: [{ x: 0, y: 3 }, { x: 1, y: 1 }] }
]
<LineChart data={data} lineBy="id" xAccessor="x" yAccessor="y" />
```

### Hierarchical data (TreeDiagram, Treemap, CirclePack)
```jsx
// Single root object with nested children:
const data = {
  name: "root",
  children: [
    { name: "A", value: 10 },
    { name: "B", children: [{ name: "B1", value: 5 }] }
  ]
}
<Treemap data={data} childrenAccessor="children" valueAccessor="value" />
```

### Network data (ForceDirectedGraph, SankeyDiagram, ChordDiagram)
```jsx
const nodes = [{ id: "A" }, { id: "B" }, { id: "C" }]
const edges = [{ source: "A", target: "B", value: 10 }, { source: "B", target: "C", value: 5 }]
<SankeyDiagram nodes={nodes} edges={edges} valueAccessor="value" />
```

### Coordinated views
```jsx
// Cross-highlighting: hover one chart, highlight matching data in others
<LinkedCharts>
  <Scatterplot data={d} xAccessor="x" yAccessor="y" colorBy="region"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }} />
  <BarChart data={agg} categoryAccessor="region" valueAccessor="total"
    linkedHover={{ name: "hl", fields: ["region"] }}
    selection={{ name: "hl" }} />
</LinkedCharts>
```

### ScatterplotMatrix (SPLOM)
```jsx
// Hover cross-highlight (default)
<ScatterplotMatrix
  data={iris}
  fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
  colorBy="species"
  fieldLabels={{ sepalLength: "Sepal Length", sepalWidth: "Sepal Width" }}
  cellSize={160}
/>
// Crossfilter brushing
<ScatterplotMatrix
  data={iris}
  fields={["sepalLength", "sepalWidth", "petalLength", "petalWidth"]}
  colorBy="species"
  hoverMode={false}
  brushMode="crossfilter"
/>
```

## What Semiotic Does That Others Don't
- Network visualization: ForceDirectedGraph, SankeyDiagram, ChordDiagram, TreeDiagram, Treemap, CirclePack
- Streaming data: RealtimeLineChart, RealtimeBarChart (canvas-based, high frequency)
- Coordinated views: LinkedCharts, ScatterplotMatrix with crossfilter brushing — no other React chart library has this built in
- Annotation system: built-in hover, click, and custom annotations
- Server-side SVG: `renderToStaticSVG()` for email/OG images (import from "semiotic/server")
