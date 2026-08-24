# Chart Capability Matrix

> Generated from `src/components/charts/shared/chartSpecs.ts`. Do not
> edit by hand — re-run `npm run docs:capabilities` after adding a
> chart and commit the output.

Last regen: 2026-08-24 · 59 charts indexed.

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
| **AreaChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `forecast` `anomaly` `band` `series-features` |
| **BubbleChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `size-encoding` `streaming-domain` `regression-overlay` |
| **BumpChart** | ✓ | ✓ | ✓ | — | ✓ | categorical | custom | `ranking` `magnitude-ribbons` `time-series` `style-rules` |
| **CandlestickChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `ohlc` |
| **ConnectedScatterplot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` `forecast` `anomaly` `series-features` |
| **DifferenceChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `crossover-segmentation` |
| **Heatmap** | ✓ | ✓ | ✓ | ✓ | ✓ | sequential | plugin | — |
| **LineChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `forecast` `anomaly` `band` `series-features` `gap-handling` `direct-labels` `endpoint-labels` `brush` |
| **MinimapChart** | ✓ | — | — | — | ✓ | categorical | plugin | `brush` `overview-detail` `composite-delegates-interaction` `composite-static` |
| **MultiAxisLineChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `dual-axis` |
| **QuadrantChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `quadrants` |
| **Scatterplot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` `forecast` `anomaly` `series-features` `brush` |
| **ScatterplotMatrix** | ✓ | — | — | — | ✓ | categorical | plugin | `matrix` `brush` `composite-delegates-interaction` `composite-static` |
| **StackedAreaChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `stack` `streamgraph` |
| **WaterfallChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `waterfall` |

## Ordinal

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **BarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` `brush` |
| **BoxPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `statistical` |
| **DonutChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **DotPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `regression-overlay` |
| **FunnelChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **GaugeChart** | — | — | — | — | ✓ | threshold | synthetic | `threshold-zones` `value-only` `controlled-prop-streaming` |
| **GroupedBarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **Histogram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `brush` |
| **LikertChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **PieChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **RadarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `radial` |
| **RidgelinePlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **StackedBarChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `stack` |
| **SwarmPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **SwimlaneChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `brush` |
| **ViolinPlot** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `statistical` |

## Network

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **ChordDiagram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **CirclePack** | ✓ | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |
| **ForceDirectedGraph** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `force-simulation` |
| **OrbitDiagram** | ✓ | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` `animated` |
| **ProcessSankey** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | custom | `temporal` `particles` `lane-reuse` `quality-metrics` `slack-aware-placement` `vertical-orientation` `style-rules` `worker-layout` |
| **SankeyDiagram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | — |
| **TreeDiagram** | ✓ | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |
| **Treemap** | ✓ | ✓ | ✓ | — | ✓ | categorical | plugin | `hierarchy` |

## Geo

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **ChoroplethMap** | ✓ | ✓ | ✓ | — | ✓ | sequential | plugin | `controlled-prop-streaming` |
| **DistanceCartogram** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | plugin | `distortion` |
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
| **TemporalHistogram** | ✓ | ✓ | ✓ | — | ✓ | categorical | plugin | `brush` |

## Physics

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **ChainReactionChart** | — | — | — | — | ✓ | categorical | synthetic | `physics-simulation` `dependency-machine` `blocker-amplification` `settled-projection` `deterministic-snapshot` `authored-static-projection` |
| **CollisionSwarmChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `collision-layout` `settled-projection` |
| **CrucibleChart** | — | ✓ | ✓ | — | ✓ | categorical | synthetic | `physics-simulation` `authored-event-tape` `forming-products` `reason-labelled-outlets` `settled-projection` `deterministic-snapshot` |
| **EventDropChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `event-time` `watermark` `arrival-pacing` `settled-projection` |
| **GaltonBoardChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `settled-projection` `deterministic-seed` |
| **GauntletChart** | — | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `process-gauntlet` `settled-projection` |
| **PacketFlowChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `path-constrained-flow` `static-flow` `proximity-sensors` `settled-projection` |
| **ProcessFlowChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `process-flow` `capacitated-stages` `group-completion` `settled-projection` |
| **UnitPileChart** | ✓ | ✓ | ✓ | ✓ | ✓ | categorical | synthetic | `physics-simulation` `unitized` `settled-projection` |

## Value

| Chart | Legend | Sel | Hover | Push | SSR | Color | Layout | Features |
|---|:-:|:-:|:-:|:-:|:-:|---|---|---|
| **BigNumber** | — | — | — | ✓ | ✓ | threshold | synthetic | `threshold-zones` `value-only` `comparison` `target` `staleness` `intl-format` `chart-slot` `trend-slot` `native-value-svg` |

---

## Aggregate counts

- 54/59 charts render a top-level legend.
- 47/59 charts expose a push API.
- 54/59 charts SSR via the `renderChart()` registry.
- 2/59 charts use the customLayout escape hatch.
- 11/59 charts use synthetic (no-layout) construction.
