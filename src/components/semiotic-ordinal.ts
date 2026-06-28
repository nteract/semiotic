/**
 * Ordinal entry point — bar charts, pie charts, distribution charts.
 * Import from "semiotic/ordinal" instead of the full bundle to reduce bundle size.
 */

import StreamOrdinalFrame from "./stream/StreamOrdinalFrame"

export { StreamOrdinalFrame }

// Chart HOCs
export { BarChart } from "./charts/ordinal/BarChart"
export { StackedBarChart } from "./charts/ordinal/StackedBarChart"
export { GroupedBarChart } from "./charts/ordinal/GroupedBarChart"
export { SwimlaneChart } from "./charts/ordinal/SwimlaneChart"
export { SwarmPlot } from "./charts/ordinal/SwarmPlot"
export { BoxPlot } from "./charts/ordinal/BoxPlot"
export { Histogram } from "./charts/ordinal/Histogram"
export { ViolinPlot } from "./charts/ordinal/ViolinPlot"
export { DotPlot } from "./charts/ordinal/DotPlot"
export { PieChart } from "./charts/ordinal/PieChart"
export { DonutChart } from "./charts/ordinal/DonutChart"
export { GaugeChart } from "./charts/ordinal/GaugeChart"
export type { GaugeChartProps, GaugeThreshold } from "./charts/ordinal/GaugeChart"
export { RidgelinePlot } from "./charts/ordinal/RidgelinePlot"
export { FunnelChart } from "./charts/ordinal/FunnelChart"
export { LikertChart } from "./charts/ordinal/LikertChart"
export { OrdinalCustomChart } from "./charts/custom/OrdinalCustomChart"
export { useCustomLayoutSelection } from "./stream/customLayoutSelection"
export type { CustomLayoutSelection } from "./stream/customLayoutSelection"
// hitTarget — invisible, interaction-bearing scene nodes for custom layouts
// (keyboard nav + focus ring, pointId annotation anchoring, onObservation,
// transition identity). See also semiotic/recipes.
export { hitTargetPoint, hitTargetRect, DEFAULT_HIT_RADIUS } from "./stream/hitTarget"
export type { HitTargetPointProps, HitTargetRectProps } from "./stream/hitTarget"

// Utilities
export { createHatchPattern } from "./charts/shared/hatchPattern"
export type { HatchPatternOptions } from "./charts/shared/hatchPattern"

// Stream Frame types
export type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
  OrdinalChartType,
  OrdinalScales,
  OrdinalSceneNode
} from "./stream/ordinalTypes"

// Chart prop types
export type { BarChartProps } from "./charts/ordinal/BarChart"
export type { StackedBarChartProps } from "./charts/ordinal/StackedBarChart"
export type { GroupedBarChartProps } from "./charts/ordinal/GroupedBarChart"
export type { SwimlaneChartProps } from "./charts/ordinal/SwimlaneChart"
export type { PieChartProps } from "./charts/ordinal/PieChart"
export type { DonutChartProps } from "./charts/ordinal/DonutChart"
export type { FunnelChartProps } from "./charts/ordinal/FunnelChart"
export type { LikertChartProps } from "./charts/ordinal/LikertChart"
export type { OrdinalCustomChartProps } from "./charts/custom/OrdinalCustomChart"

// customLayout escape hatch
export type {
  OrdinalCustomLayout,
  OrdinalLayoutContext,
  OrdinalLayoutResult,
} from "./stream/ordinalCustomLayout"
