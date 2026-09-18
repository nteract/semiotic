/**
 * Streaming / realtime types re-exported from the root `semiotic` entry.
 * Satellite of `semiotic.ts` so the root barrel stays under the production
 * line ceiling.
 */

export type {
  ArrowOfTime,
  WindowMode,
  ThresholdType,
  LineStyle,
  BarStyle,
  WaterfallStyle,
  SwarmStyle,
  AnnotationContext,
  AnnotationAnchorMode,
  CrosshairStyle,
  HoverAnnotationConfig,
  HoverData,
  RealtimeFrameHandle
} from "./realtime/types"

export type {
  RealtimeLineChartHandle,
  RealtimeLineChartProps
} from "./charts/realtime/RealtimeLineChart"
export type {
  AggregateConfig,
  AggregatedRealtimeDatum
} from "./charts/realtime/aggregate"
export type {
  RealtimeTemporalHistogramProps,
  RealtimeHistogramProps,
  TemporalHistogramProps
} from "./charts/realtime/RealtimeHistogram"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"
export type { RealtimeHeatmapProps } from "./charts/realtime/RealtimeHeatmap"

export {
  useSyncedPushData,
  syncPushBuffer
} from "./charts/shared/useSyncedPushData"
export type {
  SyncedPushHandle,
  SyncedPushDataOptions,
  PushIdAccessor
} from "./charts/shared/useSyncedPushData"
