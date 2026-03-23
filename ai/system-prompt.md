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
- **Histogram** — `categoryAccessor` (optional, defaults to `"category"` — omit for single-group), `valueAccessor`, `bins` (default 25), `relative`
- **ViolinPlot** — `categoryAccessor`, `valueAccessor`, `bins`, `curve`, `showIQR`
- **DotPlot** — `categoryAccessor`, `valueAccessor`, `sort`, `dotRadius`
- **PieChart** — `categoryAccessor`, `valueAccessor`
- **DonutChart** — `categoryAccessor`, `valueAccessor`, `innerRadius`, `centerContent` (ReactNode, e.g. `<div>50%</div>`)

## Hierarchical Data (`data: { children: [...] }`)
- **TreeDiagram** — `childrenAccessor`, `nodeIdAccessor`, `layout` ("tree"|"cluster"|"partition"), `orientation`
- **Treemap** — `childrenAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorByDepth`
- **CirclePack** — `childrenAccessor`, `valueAccessor`, `nodeIdAccessor`, `colorByDepth`
- **OrbitDiagram** — animated radial/orbital hierarchy (use this, not TreeDiagram, for animated orbiting nodes). `childrenAccessor`, `nodeIdAccessor`, `orbitMode` ("flat"|"solar"|"atomic"|number[]), `speed`, `animated`. For static radial trees use `TreeDiagram layout="radial"`.

## Network Data (`nodes: object[]`, `edges: object[]`)
- **ForceDirectedGraph** — **`nodes`**, **`edges`** (both required), `nodeIDAccessor`, `sourceAccessor`, `targetAccessor`, `colorBy`, `nodeSize` (number|string|fn), `nodeSizeRange`, `edgeWidth`, `edgeOpacity`, `iterations`, `forceStrength`, `showLabels`, `nodeLabel`, `tooltip`, `showLegend`
- **SankeyDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`
- **ChordDiagram** — **`edges`** (required), `sourceAccessor`, `targetAccessor`, `valueAccessor`

**Important**: Always use these HOC components for network charts unless you need sophisticated control they don't expose. `StreamNetworkFrame` is a low-level escape hatch — its callbacks receive internal wrapper objects (`RealtimeNode`), not your raw data.

## Realtime (ref-based push API, canvas)

**IMPORTANT**: All pushed data must include a time field (default: `"time"`). Set `timeAccessor` if your field is named differently. Without a valid time field, charts silently render blank.

Sizing: all Realtime HOCs accept both `size={[600, 400]}` (tuple) and `width={600} height={400}`.

- **RealtimeLineChart** — `ref.current.push(datum)`, **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `windowSize`
- **RealtimeHistogram** — **`binSize`** (required), **`timeAccessor`** ("time"), **`valueAccessor`** ("value"). Time field required even though this is a distribution — it's used for windowing.
- **RealtimeSwarmChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `categoryAccessor`
- **RealtimeWaterfallChart** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `positiveColor`, `negativeColor`
- **RealtimeHeatmap** — **`timeAccessor`** ("time"), **`valueAccessor`** ("value"), `heatmapXBins`, `heatmapYBins`, `aggregation`. Both must match your data fields.
- **StreamNetworkFrame** (`chartType="sankey"`) — push **individual edges**: `ref.current.push({ source, target, value })`. Use `ref.current.pushMany([...edges])` for batches. Do NOT push full edge snapshots. Props: `sourceAccessor`, `targetAccessor`, `valueAccessor`, `showParticles` (boolean), `particleStyle` (`{ radius, opacity, speedMultiplier, maxPerEdge, colorBy }`) (import from `semiotic`)

Pushed data shape: `{ time: Date.now(), value: 42 }` for line/waterfall/heatmap, add `category` for histogram/swarm.

### Push API on HOC charts
Many HOC charts support the push API via `forwardRef`. **Omit the `data` prop** (do NOT pass `data={[]}`) and push imperatively:
```jsx
const chartRef = useRef()
chartRef.current.push({ x: 1, y: 2 })
<Scatterplot ref={chartRef} xAccessor="x" yAccessor="y" />
```
Methods: `push(datum)`, `pushMany(data)`, `clear()`, `getData()`. Streaming-specific props (`windowSize`, `decay`, `pulse`) go in `frameProps`. Supported: XY charts, ordinal charts, network charts (ForceDirectedGraph, SankeyDiagram, ChordDiagram), ProportionalSymbolMap, DistanceCartogram. Not supported: hierarchy charts (TreeDiagram, Treemap, CirclePack, OrbitDiagram), ChoroplethMap, FlowMap, ScatterplotMatrix.

For advanced streaming control, use Stream Frames (`StreamXYFrame`, `StreamOrdinalFrame`, `StreamNetworkFrame`) with `runtimeMode="streaming"` and ref-based push.

## ChartContainer
- **ChartContainer** — wrapper with title, subtitle, status indicator, toolbar. `title`, `subtitle`, `height` (default **400** — always set this to match your chart height), `width` ("100%"), `status` ("live"|"stale"|"error"), `loading`, `error`, `actions`, `style`
- When using with `size={[w, h]}`, set `height={h}` on the container or you'll get extra whitespace.

## Common Props (all components)
`width`, `height`, `margin`, `title`, `colorBy`, `colorScheme`, `enableHover`, `tooltip`, `showLegend`, `className`, `frameProps`, `onObservation`, `emphasis` ("primary"|"secondary")

### tooltip
`true` (default) | `false` | `(datum) => ReactNode` (function receives your raw data) | config `{ fields?, title?, format?, style? }`

### onObservation
Callback receiving `ChartObservation`: `{ type: "hover"|"click"|"brush"|"selection", datum: <your data>, x, y, timestamp, chartType, chartId }`. The `datum` field is your original data object. Hover-end/click-end events omit `datum`.

### emphasis
`emphasis="primary"` makes a chart span two columns inside a `ChartGrid`.

## Annotations (XY charts)
- `annotations={[{ type: "y-threshold", value: 200, label: "SLA limit", color: "#e45050" }]}` — horizontal reference line
- `annotations={[{ type: "x-threshold", value: 50, label: "Cutoff" }]}` — vertical reference line
- `annotations={[{ type: "widget", time: 42, latency: 850, dy: -10, content: <span>Alert</span> }]}` — place React element at data coordinates
- `annotations={[{ type: "enclose", coordinates: [datum1, datum2], label: "Cluster" }]}` — circle enclosing data points

## Theming & Brand Styling
All charts respond to CSS custom properties on any ancestor:
```css
.my-theme {
  --semiotic-bg: #1a1a2e;        /* chart background */
  --semiotic-text: #ededed;       /* primary text */
  --semiotic-text-secondary: #aaa; /* tick labels */
  --semiotic-grid: #333;          /* grid lines */
  --semiotic-border: #555;        /* axis lines */
  --semiotic-font-family: Georgia, serif;
  --semiotic-tooltip-bg: #1a1a2e;
  --semiotic-tooltip-text: #ededed;
  --semiotic-tooltip-radius: 8px;
}
```
Or use ThemeProvider with 15 named presets: `<ThemeProvider theme="tufte">`, `"tufte-dark"`, `"pastels"`, `"bi-tool"`, `"italian"`, `"journalist"`, `"playful"` (each with `-dark` variant), `"dark"`, `"high-contrast"`.

`semiotic/themes` entry point: `themeToCSS(theme, selector)` generates CSS string, `themeToTokens(theme)` generates DTCG design tokens, `resolveThemePreset("tufte")` returns theme object by name. Theme objects: `TUFTE_LIGHT`, `TUFTE_DARK`, `PASTELS_LIGHT`, `BI_TOOL_LIGHT`, `ITALIAN_LIGHT`, `JOURNALIST_LIGHT`, `PLAYFUL_LIGHT`, etc.

`COLOR_BLIND_SAFE_CATEGORICAL` — 8-color accessible palette (Wong 2011). Import from `semiotic`.

## Key Patterns
- **Percentile band + main line**: Layer `<AreaChart yAccessor="p95" y0Accessor="p5" showLine={false} />` + `<LineChart yAccessor="p50" />`. AreaChart's `showLine` only draws the top edge, NOT a separate main line.
- **SSR**: `renderToStaticSVG("ordinal", props)` or `renderOrdinalToStaticSVG(props)` from `semiotic/server`. Frame type is `"xy"` | `"ordinal"` | `"network"` (NOT component name).
- **exportChart**: Pass the wrapper div, not the SVG element: `exportChart(wrapperDiv, { format: "png" })`. It finds canvas+SVG internally.
