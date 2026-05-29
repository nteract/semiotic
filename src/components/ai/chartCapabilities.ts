import type { ChartCapability } from "./chartCapabilityTypes"

// XY family
import { LineChartCapability } from "../charts/xy/LineChart.capability"
import { AreaChartCapability } from "../charts/xy/AreaChart.capability"
import { StackedAreaChartCapability } from "../charts/xy/StackedAreaChart.capability"
import { ScatterplotCapability } from "../charts/xy/Scatterplot.capability"
import { ConnectedScatterplotCapability } from "../charts/xy/ConnectedScatterplot.capability"
import { BubbleChartCapability } from "../charts/xy/BubbleChart.capability"
import { QuadrantChartCapability } from "../charts/xy/QuadrantChart.capability"
import { MultiAxisLineChartCapability } from "../charts/xy/MultiAxisLineChart.capability"
import { MinimapChartCapability } from "../charts/xy/MinimapChart.capability"
import { DifferenceChartCapability } from "../charts/xy/DifferenceChart.capability"
import { CandlestickChartCapability } from "../charts/xy/CandlestickChart.capability"
import { HeatmapCapability } from "../charts/xy/Heatmap.capability"

// Ordinal family
import { BarChartCapability } from "../charts/ordinal/BarChart.capability"
import { GroupedBarChartCapability } from "../charts/ordinal/GroupedBarChart.capability"
import { StackedBarChartCapability } from "../charts/ordinal/StackedBarChart.capability"
import { DotPlotCapability } from "../charts/ordinal/DotPlot.capability"
import { PieChartCapability } from "../charts/ordinal/PieChart.capability"
import { DonutChartCapability } from "../charts/ordinal/DonutChart.capability"
import { FunnelChartCapability } from "../charts/ordinal/FunnelChart.capability"
import { GaugeChartCapability } from "../charts/ordinal/GaugeChart.capability"
import { LikertChartCapability } from "../charts/ordinal/LikertChart.capability"
import { SwimlaneChartCapability } from "../charts/ordinal/SwimlaneChart.capability"
import { HistogramCapability } from "../charts/ordinal/Histogram.capability"
import { BoxPlotCapability } from "../charts/ordinal/BoxPlot.capability"
import { SwarmPlotCapability } from "../charts/ordinal/SwarmPlot.capability"
import { ViolinPlotCapability } from "../charts/ordinal/ViolinPlot.capability"
import { RidgelinePlotCapability } from "../charts/ordinal/RidgelinePlot.capability"

// Network family
import { ForceDirectedGraphCapability } from "../charts/network/ForceDirectedGraph.capability"
import { SankeyDiagramCapability } from "../charts/network/SankeyDiagram.capability"
import { ChordDiagramCapability } from "../charts/network/ChordDiagram.capability"
import { ProcessSankeyCapability } from "../charts/network/ProcessSankey.capability"
import { TreeDiagramCapability } from "../charts/network/TreeDiagram.capability"
import { TreemapCapability } from "../charts/network/Treemap.capability"
import { CirclePackCapability } from "../charts/network/CirclePack.capability"
import { OrbitDiagramCapability } from "../charts/network/OrbitDiagram.capability"

// Geo family
import { ChoroplethMapCapability } from "../charts/geo/ChoroplethMap.capability"
import { ProportionalSymbolMapCapability } from "../charts/geo/ProportionalSymbolMap.capability"
import { FlowMapCapability } from "../charts/geo/FlowMap.capability"
import { DistanceCartogramCapability } from "../charts/geo/DistanceCartogram.capability"

// Value family
import { BigNumberCapability } from "../charts/value/BigNumber.capability"

/**
 * Built-in capability descriptors. Each chart owns its own descriptor in
 * `Foo.capability.ts` next to `Foo.tsx`. To add a new chart, write the descriptor
 * and append it here.
 *
 * Charts intentionally NOT in this registry:
 *   • Realtime variants (RealtimeLineChart, RealtimeHistogram, ...) — they're for
 *     streaming data, while `suggestCharts` operates on static datasets.
 *   • Custom-layout charts (XYCustomChart, OrdinalCustomChart, NetworkCustomChart) —
 *     they require a layout function and are escape-hatches by design.
 *   • LinkedCharts and ScatterplotMatrix — multi-chart compositions whose data
 *     shape is a tuple, not a single dataset.
 *
 * Consumers can still register these (or any custom chart) via `registerChartCapability`.
 */
const BUILT_IN_CAPABILITIES: ReadonlyArray<ChartCapability> = [
  // XY
  LineChartCapability,
  AreaChartCapability,
  StackedAreaChartCapability,
  ScatterplotCapability,
  ConnectedScatterplotCapability,
  BubbleChartCapability,
  QuadrantChartCapability,
  MultiAxisLineChartCapability,
  MinimapChartCapability,
  DifferenceChartCapability,
  CandlestickChartCapability,
  HeatmapCapability,
  // Ordinal
  BarChartCapability,
  GroupedBarChartCapability,
  StackedBarChartCapability,
  DotPlotCapability,
  PieChartCapability,
  DonutChartCapability,
  FunnelChartCapability,
  GaugeChartCapability,
  LikertChartCapability,
  SwimlaneChartCapability,
  // Distribution
  HistogramCapability,
  BoxPlotCapability,
  SwarmPlotCapability,
  ViolinPlotCapability,
  RidgelinePlotCapability,
  // Network
  ForceDirectedGraphCapability,
  SankeyDiagramCapability,
  ChordDiagramCapability,
  ProcessSankeyCapability,
  // Hierarchy
  TreeDiagramCapability,
  TreemapCapability,
  CirclePackCapability,
  OrbitDiagramCapability,
  // Geo
  ChoroplethMapCapability,
  ProportionalSymbolMapCapability,
  FlowMapCapability,
  DistanceCartogramCapability,
  // Value
  BigNumberCapability,
]

const userCapabilities = new Map<string, ChartCapability>()

/**
 * Register a capability for a chart (built-in or third-party). Re-registering by
 * component name replaces the previous descriptor — useful for overriding defaults.
 */
export function registerChartCapability(capability: ChartCapability): void {
  userCapabilities.set(capability.component, capability)
}

/** Remove a previously-registered capability. Does not affect built-ins. */
export function unregisterChartCapability(component: string): void {
  userCapabilities.delete(component)
}

/**
 * Current capability list — built-ins, then user-registered, with user-registered
 * overriding built-ins by component name.
 */
export function getCapabilities(): ReadonlyArray<ChartCapability> {
  if (userCapabilities.size === 0) return BUILT_IN_CAPABILITIES
  const merged = new Map<string, ChartCapability>()
  for (const c of BUILT_IN_CAPABILITIES) merged.set(c.component, c)
  for (const [name, c] of userCapabilities) merged.set(name, c)
  return Array.from(merged.values())
}

/** Look up a capability by component name. */
export function getCapability(component: string): ChartCapability | undefined {
  return getCapabilities().find((c) => c.component === component)
}

// Re-export every built-in descriptor so consumers can import them individually
// without pulling in the registry.
export {
  // XY
  LineChartCapability,
  AreaChartCapability,
  StackedAreaChartCapability,
  ScatterplotCapability,
  ConnectedScatterplotCapability,
  BubbleChartCapability,
  QuadrantChartCapability,
  MultiAxisLineChartCapability,
  MinimapChartCapability,
  DifferenceChartCapability,
  CandlestickChartCapability,
  HeatmapCapability,
  // Ordinal
  BarChartCapability,
  GroupedBarChartCapability,
  StackedBarChartCapability,
  DotPlotCapability,
  PieChartCapability,
  DonutChartCapability,
  FunnelChartCapability,
  GaugeChartCapability,
  LikertChartCapability,
  SwimlaneChartCapability,
  // Distribution
  HistogramCapability,
  BoxPlotCapability,
  SwarmPlotCapability,
  ViolinPlotCapability,
  RidgelinePlotCapability,
  // Network
  ForceDirectedGraphCapability,
  SankeyDiagramCapability,
  ChordDiagramCapability,
  ProcessSankeyCapability,
  // Hierarchy
  TreeDiagramCapability,
  TreemapCapability,
  CirclePackCapability,
  OrbitDiagramCapability,
  // Geo
  ChoroplethMapCapability,
  ProportionalSymbolMapCapability,
  FlowMapCapability,
  DistanceCartogramCapability,
}
