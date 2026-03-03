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

// ============================================================================
// Ordinal Charts (based on OrdinalFrame)
// ============================================================================

export { BarChart } from "./ordinal/BarChart"
export type { BarChartProps } from "./ordinal/BarChart"

export { StackedBarChart } from "./ordinal/StackedBarChart"
export type { StackedBarChartProps } from "./ordinal/StackedBarChart"

export { SwarmPlot } from "./ordinal/SwarmPlot"
export type { SwarmPlotProps } from "./ordinal/SwarmPlot"

export { BoxPlot } from "./ordinal/BoxPlot"
export type { BoxPlotProps } from "./ordinal/BoxPlot"

export { Histogram } from "./ordinal/Histogram"
export type { HistogramProps } from "./ordinal/Histogram"

export { ViolinPlot } from "./ordinal/ViolinPlot"
export type { ViolinPlotProps } from "./ordinal/ViolinPlot"

export { DotPlot } from "./ordinal/DotPlot"
export type { DotPlotProps } from "./ordinal/DotPlot"

export { PieChart } from "./ordinal/PieChart"
export type { PieChartProps } from "./ordinal/PieChart"

export { DonutChart } from "./ordinal/DonutChart"
export type { DonutChartProps } from "./ordinal/DonutChart"

export { GroupedBarChart } from "./ordinal/GroupedBarChart"
export type { GroupedBarChartProps } from "./ordinal/GroupedBarChart"

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

// ============================================================================
// Realtime Charts (based on RealtimeFrame)
// ============================================================================

export { RealtimeLineChart } from "./realtime/RealtimeLineChart"
export type { RealtimeLineChartProps } from "./realtime/RealtimeLineChart"

export { RealtimeTemporalHistogram, RealtimeBarChart } from "./realtime/RealtimeBarChart"
export type { RealtimeTemporalHistogramProps, RealtimeBarChartProps } from "./realtime/RealtimeBarChart"

export { RealtimeSwarmChart } from "./realtime/RealtimeSwarmChart"
export type { RealtimeSwarmChartProps } from "./realtime/RealtimeSwarmChart"

export { RealtimeWaterfallChart } from "./realtime/RealtimeWaterfallChart"
export type { RealtimeWaterfallChartProps } from "./realtime/RealtimeWaterfallChart"

export { RealtimeSankey } from "./realtime/RealtimeSankey"

// ============================================================================
// Shared Utilities
// ============================================================================

// Re-export shared types for convenience
export type { BaseChartProps, AxisConfig, Accessor, ChartAccessor } from "./shared/types"

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
  truncateText
} from "./shared/formatUtils"

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
