/**
 * Higher-order chart components
 *
 * These components provide simplified, opinionated wrappers around
 * XYFrame, OrdinalFrame, and NetworkFrame for common chart types.
 *
 * @module charts
 */

// ============================================================================
// XY Charts (based on XYFrame)
// ============================================================================

export { Scatterplot } from "./xy/Scatterplot"
export type { ScatterplotProps } from "./xy/Scatterplot"
export { ConnectedScatterplot } from "./xy/ConnectedScatterplot"
export type { ConnectedScatterplotProps } from "./xy/ConnectedScatterplot"

export { LineChart } from "./xy/LineChart"
export type { LineChartProps } from "./xy/LineChart"

export { AreaChart } from "./xy/AreaChart"
export type { AreaChartProps } from "./xy/AreaChart"

export { StackedAreaChart } from "./xy/StackedAreaChart"
export type { StackedAreaChartProps } from "./xy/StackedAreaChart"

export { Heatmap } from "./xy/Heatmap"
export type { HeatmapProps } from "./xy/Heatmap"

export { BubbleChart } from "./xy/BubbleChart"
export type { BubbleChartProps } from "./xy/BubbleChart"

export { ScatterplotMatrix } from "./xy/ScatterplotMatrix"
export type { ScatterplotMatrixProps } from "./xy/ScatterplotMatrix"

export { MinimapChart } from "./xy/MinimapChart"
export type { MinimapChartProps, MinimapConfig } from "./xy/MinimapChart"

export { QuadrantChart } from "./xy/QuadrantChart"
export type { QuadrantChartProps, QuadrantsConfig, QuadrantConfig, CenterlineStyle } from "./xy/QuadrantChart"

export { MultiAxisLineChart } from "./xy/MultiAxisLineChart"
export type { MultiAxisLineChartProps, MultiAxisSeriesConfig } from "./xy/MultiAxisLineChart"

// ============================================================================
// Ordinal Charts (based on OrdinalFrame)
// ============================================================================

export { BarChart } from "./ordinal/BarChart"
export type { BarChartProps } from "./ordinal/BarChart"

export { StackedBarChart } from "./ordinal/StackedBarChart"
export type { StackedBarChartProps } from "./ordinal/StackedBarChart"

export { LikertChart } from "./ordinal/LikertChart"
export type { LikertChartProps } from "./ordinal/LikertChart"

export { SwarmPlot } from "./ordinal/SwarmPlot"
export type { SwarmPlotProps } from "./ordinal/SwarmPlot"

export { BoxPlot } from "./ordinal/BoxPlot"
export type { BoxPlotProps } from "./ordinal/BoxPlot"

export { Histogram } from "./ordinal/Histogram"
export type { HistogramProps } from "./ordinal/Histogram"

export { ViolinPlot } from "./ordinal/ViolinPlot"
export type { ViolinPlotProps } from "./ordinal/ViolinPlot"

export { RidgelinePlot } from "./ordinal/RidgelinePlot"
export type { RidgelinePlotProps } from "./ordinal/RidgelinePlot"

export { FunnelChart } from "./ordinal/FunnelChart"
export type { FunnelChartProps } from "./ordinal/FunnelChart"

export { DotPlot } from "./ordinal/DotPlot"
export type { DotPlotProps } from "./ordinal/DotPlot"

export { PieChart } from "./ordinal/PieChart"
export type { PieChartProps } from "./ordinal/PieChart"

export { DonutChart } from "./ordinal/DonutChart"
export type { DonutChartProps } from "./ordinal/DonutChart"

export { GroupedBarChart } from "./ordinal/GroupedBarChart"
export type { GroupedBarChartProps } from "./ordinal/GroupedBarChart"

export { SwimlaneChart } from "./ordinal/SwimlaneChart"
export type { SwimlaneChartProps } from "./ordinal/SwimlaneChart"

// ============================================================================
// Network Charts (based on NetworkFrame)
// ============================================================================

export { ForceDirectedGraph } from "./network/ForceDirectedGraph"
export type { ForceDirectedGraphProps } from "./network/ForceDirectedGraph"

export { ChordDiagram } from "./network/ChordDiagram"
export type { ChordDiagramProps } from "./network/ChordDiagram"

export { SankeyDiagram } from "./network/SankeyDiagram"
export type { SankeyDiagramProps } from "./network/SankeyDiagram"

export { TreeDiagram } from "./network/TreeDiagram"
export type { TreeDiagramProps } from "./network/TreeDiagram"

export { Treemap } from "./network/Treemap"
export type { TreemapProps } from "./network/Treemap"

export { CirclePack } from "./network/CirclePack"
export type { CirclePackProps } from "./network/CirclePack"
export { OrbitDiagram } from "./network/OrbitDiagram"
export type { OrbitDiagramProps, OrbitNode } from "./network/OrbitDiagram"

// ============================================================================
// Realtime Charts
// ============================================================================

export { RealtimeLineChart } from "./realtime/RealtimeLineChart"
export type { RealtimeLineChartProps } from "./realtime/RealtimeLineChart"

export { RealtimeTemporalHistogram, RealtimeHistogram } from "./realtime/RealtimeHistogram"
export type { RealtimeTemporalHistogramProps, RealtimeHistogramProps } from "./realtime/RealtimeHistogram"

export { RealtimeSwarmChart } from "./realtime/RealtimeSwarmChart"
export type { RealtimeSwarmChartProps } from "./realtime/RealtimeSwarmChart"

export { RealtimeWaterfallChart } from "./realtime/RealtimeWaterfallChart"
export type { RealtimeWaterfallChartProps } from "./realtime/RealtimeWaterfallChart"

export { RealtimeHeatmap } from "./realtime/RealtimeHeatmap"
export type { RealtimeHeatmapProps } from "./realtime/RealtimeHeatmap"

// ============================================================================
// Shared Utilities
// ============================================================================

// Re-export shared types for convenience
export type { BaseChartProps, AxisConfig, Accessor, ChartAccessor, ChartMode } from "./shared/types"

// Shared hooks for building custom chart wrappers
export { useColorScale, useSortedData, DEFAULT_COLOR } from "./shared/hooks"

// Color utilities (if users want to use them directly)
export {
  COLOR_SCHEMES,
  DEFAULT_COLORS,
  getColor,
  createColorScale,
  getSize
} from "./shared/colorUtils"

// Format utilities (if users want to use them directly)
export {
  formatNumber,
  formatDate,
  formatAxis,
  createTooltip,
  formatLargeNumber,
  truncateText,
  adaptiveTimeTicks
} from "./shared/formatUtils"

// Color manipulation utilities for anomaly/forecast styling
export { darkenColor, lightenColor } from "./shared/colorManipulation"

// Tooltip utilities
export {
  Tooltip,
  MultiLineTooltip,
  normalizeTooltip
} from "../Tooltip/Tooltip"

export type {
  TooltipProp,
  TooltipConfig,
  TooltipField,
  MultiLineTooltipConfig
} from "../Tooltip/Tooltip"

// Pattern fills for canvas charts
export { createHatchPattern } from "./shared/hatchPattern"
export type { HatchPatternOptions } from "./shared/hatchPattern"
