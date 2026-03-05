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
export { SwarmPlot } from "./charts/ordinal/SwarmPlot"
export { BoxPlot } from "./charts/ordinal/BoxPlot"
export { Histogram } from "./charts/ordinal/Histogram"
export { ViolinPlot } from "./charts/ordinal/ViolinPlot"
export { DotPlot } from "./charts/ordinal/DotPlot"
export { PieChart } from "./charts/ordinal/PieChart"
export { DonutChart } from "./charts/ordinal/DonutChart"

// Stream Frame types
export type {
  StreamOrdinalFrameProps,
  StreamOrdinalFrameHandle,
  OrdinalChartType,
  OrdinalScales,
  OrdinalSceneNode
} from "./stream/ordinalTypes"
