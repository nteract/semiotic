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
export { RidgelinePlot } from "./charts/ordinal/RidgelinePlot"
export { FunnelChart } from "./charts/ordinal/FunnelChart"
export { LikertChart } from "./charts/ordinal/LikertChart"

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
