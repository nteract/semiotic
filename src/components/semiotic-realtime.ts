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

export {
  RealtimeFrame,
  RingBuffer,
  IncrementalExtent,
  lineRenderer,
  swarmRenderer,
  candlestickRenderer,
  waterfallRenderer,
  barRenderer
}

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
