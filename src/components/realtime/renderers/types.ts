import type { RealtimeScales, RealtimeLayout, LineStyle, RealtimeAccessors, BarStyle } from "../types"

export interface RendererOptions {
  binSize?: number
  barColors?: Record<string, string>
  barStyle?: BarStyle
}

export type RendererFn = (
  ctx: CanvasRenderingContext2D,
  data: Iterable<any>,
  scales: RealtimeScales,
  layout: RealtimeLayout,
  style: LineStyle,
  accessors: RealtimeAccessors,
  annotations?: Record<string, any>[],
  options?: RendererOptions
) => void
