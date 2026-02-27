/**
 * RealtimeFrame entry point - for streaming/realtime canvas-first visualizations
 * Import this instead of the full semiotic bundle to reduce bundle size
 */

import RealtimeFrame from "./realtime/RealtimeFrame"

// Reusable data structures
import { RingBuffer } from "./realtime/RingBuffer"
import { IncrementalExtent } from "./realtime/IncrementalExtent"

// Renderers
import { lineRenderer } from "./realtime/renderers/lineRenderer"
import { swarmRenderer } from "./realtime/renderers/swarmRenderer"
import { candlestickRenderer } from "./realtime/renderers/candlestickRenderer"
import { waterfallRenderer } from "./realtime/renderers/waterfallRenderer"
import { barRenderer } from "./realtime/renderers/barRenderer"

// Higher-order chart components
import { RealtimeLineChart } from "./charts/realtime/RealtimeLineChart"
import { RealtimeBarChart } from "./charts/realtime/RealtimeBarChart"
import { RealtimeSwarmChart } from "./charts/realtime/RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./charts/realtime/RealtimeWaterfallChart"

export {
  RealtimeFrame,
  RingBuffer,
  IncrementalExtent,
  lineRenderer,
  swarmRenderer,
  candlestickRenderer,
  waterfallRenderer,
  barRenderer,
  // Higher-order chart components
  RealtimeLineChart,
  RealtimeBarChart,
  RealtimeSwarmChart,
  RealtimeWaterfallChart
}

export type { RealtimeLineChartProps } from "./charts/realtime/RealtimeLineChart"
export type { RealtimeBarChartProps } from "./charts/realtime/RealtimeBarChart"
export type { RealtimeSwarmChartProps } from "./charts/realtime/RealtimeSwarmChart"
export type { RealtimeWaterfallChartProps } from "./charts/realtime/RealtimeWaterfallChart"

// Export types
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
  HoverData,
  RealtimeFrameProps,
  RealtimeFrameHandle,
  RealtimeScales,
  RealtimeLayout,
  RealtimeAccessors
} from "./realtime/types"

export type { RendererFn, RendererOptions } from "./realtime/renderers/types"
