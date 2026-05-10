# Chart Capability Matrix

> Generated from `src/components/charts/shared/chartSpecs.ts`. Do not
> edit by hand — re-run `npm run docs:capabilities` after adding a
> chart and commit the output.

Last regen: 2026-05-10 · 44 charts indexed.

**Column key**

- **Legend**: top-level `showLegend` renders a swatch column.
- **Sel**: consumes a named `selection` to dim/highlight marks.
- **Hover**: produces a `linkedHover` for cross-chart highlight.
- **Push**: exposes a ref handle (`ref.current.push(...)`).
- **SSR**: registered in `serverChartConfigs.ts` for `renderChart()`.
- **Color**: `categorical`, `sequential`, `threshold`, `continuous`, or `none`.
- **Layout**: `plugin` (built-in), `custom` (escape hatch), `synthetic` (no layout).

## XY

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **AreaChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **BubbleChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `size-encoding` `streaming-domain` `regression-overlay` |
| **CandlestickChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `ohlc` |
| **ConnectedScatterplot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` |
| **Heatmap** | ✓ | ✓ | ✓ | ✓ | ✓ | sequential | plugin | — |
| **LineChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `forecast` `anomaly` `gap-handling` `direct-labels` `endpoint-labels` |
| **MinimapChart** | ✓ | — | — | — | — | categorical | plugin | `brush` `overview-detail` `composite-delegates-interaction` `hoc-ssr-only` |
| **MultiAxisLineChart** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `dual-axis` `hoc-ssr-only` |
| **QuadrantChart** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `quadrants` `hoc-ssr-only` |
| **Scatterplot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` |
| **ScatterplotMatrix** | ✓ | — | — | — | — | categorical | plugin | `matrix` `brush` `composite-delegates-interaction` `hoc-ssr-only` |
| **StackedAreaChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `stack` `streamgraph` |

## Ordinal

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **BarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` |
| **BoxPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `statistical` |
| **DonutChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **DotPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` |
| **FunnelChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **GaugeChart** | — | — | — | — | ✓ | threshold | synthetic | `threshold-zones` `value-only` `controlled-prop-streaming` |
| **GroupedBarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **Histogram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **LikertChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **PieChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **RidgelinePlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **StackedBarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `stack` |
| **SwarmPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **SwimlaneChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `brush` |
| **ViolinPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `statistical` |

## Network

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **ChordDiagram** | — | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **CirclePack** | — | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |
| **ForceDirectedGraph** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `force-simulation` |
| **OrbitDiagram** | — | ✓ | ✓ | — | — | categorical | plugin | `hierarchy` `animated` `hoc-ssr-only` |
| **ProcessSankey** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | custom | `temporal` `particles` `lane-reuse` |
| **SankeyDiagram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **TreeDiagram** | — | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |
| **Treemap** | — | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |

## Geo

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **ChoroplethMap** | ✓ | ✓ | ✓ | — | ✓ | sequential | plugin | `controlled-prop-streaming` |
| **DistanceCartogram** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `distortion` `hoc-ssr-only` |
| **FlowMap** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `particles` |
| **ProportionalSymbolMap** | ✓ | ✓ | ✓ | ✓ | ✓ | sequential | plugin | — |

## Realtime

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **RealtimeHeatmap** | ✓ | ✓ | ✓ | ✓ | — | sequential | plugin | `live-stream` |
| **RealtimeHistogram** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `live-stream` `brush` |
| **RealtimeLineChart** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `live-stream` |
| **RealtimeSwarmChart** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `live-stream` |
| **RealtimeWaterfallChart** | ✓ | ✓ | ✓ | ✓ | — | categorical | plugin | `live-stream` |

---

## Aggregate counts

- 38/44 charts render a top-level legend.
- 36/44 charts expose a push API.
- 33/44 charts SSR via the `renderChart()` registry.
- 1/44 charts use the customLayout escape hatch.
- 1/44 charts use synthetic (no-layout) construction.
