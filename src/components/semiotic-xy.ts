/**
 * XY entry point — line, area, scatter, heatmap, and bubble charts.
 * Import from "semiotic/xy" instead of the full bundle to reduce bundle size.
 */

import StreamXYFrame from "./stream/StreamXYFrame"

export { StreamXYFrame }

// Chart HOCs
export { LineChart } from "./charts/xy/LineChart"
export { AreaChart } from "./charts/xy/AreaChart"
export { StackedAreaChart } from "./charts/xy/StackedAreaChart"
export { Scatterplot } from "./charts/xy/Scatterplot"
export { BubbleChart } from "./charts/xy/BubbleChart"
export { Heatmap } from "./charts/xy/Heatmap"
export { ScatterplotMatrix } from "./charts/xy/ScatterplotMatrix"
export { MinimapChart } from "./charts/xy/MinimapChart"

// Stream Frame types
export type {
  StreamXYFrameProps,
  StreamXYFrameHandle
} from "./stream/types"
