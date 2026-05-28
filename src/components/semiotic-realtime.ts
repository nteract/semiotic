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
import { RealtimeHistogram, TemporalHistogram } from "./charts/realtime/RealtimeHistogram"
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
  TemporalHistogram,
  RealtimeSwarmChart,
  RealtimeWaterfallChart,
  RealtimeHeatmap
}

// Types
export type { RealtimeLineChartProps } from "./charts/realtime/RealtimeLineChart"
export type { RealtimeHistogramProps, TemporalHistogramProps } from "./charts/realtime/RealtimeHistogram"
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

// User-facing stream-status observer — wrap any push-API ref to
// get a reactive idle/active/stale status enum and last-push
// timestamp. Works on realtime + non-realtime push HOCs uniformly.
export { useStreamStatus } from "./charts/shared/useStreamStatus"
export type {
  StreamStatus,
  StreamStatusOptions,
  StreamStatusResult,
} from "./charts/shared/useStreamStatus"

// Shared lifecycle classifier — used by the annotation freshness
// surface today, available to future banded-decay / banded-staleness
// opt-ins without each system re-implementing the schedule.
export { bandFromAge, DEFAULT_LIFECYCLE_THRESHOLDS } from "./realtime/lifecycleBands"
export type { LifecycleBand, LifecycleBandThresholds } from "./realtime/lifecycleBands"
