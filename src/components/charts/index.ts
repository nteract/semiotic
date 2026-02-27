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

export { DotPlot } from "./ordinal/DotPlot"
export type { DotPlotProps } from "./ordinal/DotPlot"

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

// ============================================================================
// Shared Utilities
// ============================================================================

// Re-export shared types for convenience
export type { BaseChartProps, AxisConfig, Accessor } from "./shared/types"

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
