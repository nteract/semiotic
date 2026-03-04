/**
 * Realtime entry point — for streaming/realtime canvas-first visualizations.
 * Import from "semiotic/realtime" instead of the full bundle to reduce bundle size.
 */

import StreamXYFrame from "./stream/StreamXYFrame"
import StreamNetworkFrame from "./stream/StreamNetworkFrame"

// Data structures
import { RingBuffer } from "./realtime/RingBuffer"
import { IncrementalExtent } from "./realtime/IncrementalExtent"

// Chart HOCs
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { RealtimeHistogram } from "./charts/realtime/RealtimeHistogram"
import { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"
import { RealtimeHeatmap } from "./charts/realtime/RealtimeHeatmap"

export {
  StreamXYFrame,
  StreamNetworkFrame,
  RingBuffer,
  IncrementalExtent,
  RealtimeLineChart,
  RealtimeHistogram,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  RealtimeHeatmap
}

// Types
export type { RealtimeLineChartProps } from "./charts/realtime/RealtimeLineChart"
export type { RealtimeHistogramProps } from "./charts/realtime/RealtimeHistogram"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"
export type { RealtimeHeatmapProps } from "./charts/realtime/RealtimeHeatmap"

export type {
  ArrowOfTime,
  WindowMode,
  ThresholdType,
  LineStyle,
  BarStyle,
  WaterfallStyle,
  SwarmStyle,
  AnnotationContext,
  CrosshairStyle,
  HoverAnnotationConfig,
  HoverData
} from "./realtime/types"

export type {
  StreamXYFrameProps,
  StreamXYFrameHandle,
  StreamChartType
} from "./stream/types"

export type {
  StreamNetworkFrameProps,
  StreamNetworkFrameHandle,
  NetworkChartType
} from "./stream/networkTypes"
