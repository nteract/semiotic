import type { RealtimeScales, RealtimeLayout, LineStyle, RealtimeAccessors, BarStyle, WaterfallStyle, SwarmStyle } from "../types"

export interface RendererOptions {
  binSize?: number
  barColors?: Record<string, string>
  barStyle?: BarStyle
  waterfallStyle?: WaterfallStyle
  swarmStyle?: SwarmStyle
}

export type RendererFn = (
  ctx: CanvasRenderingContext2D,
  data: Iterable<Record<string, any>>,
  scales: RealtimeScales,
  layout: RealtimeLayout,
  style: LineStyle,
  accessors: RealtimeAccessors,
  annotations?: Record<string, any>[],
  options?: RendererOptions
) => void
