import type { RealtimeScales, RealtimeLayout, LineStyle, RealtimeAccessors } from "../types"

export type RendererFn = (
  ctx: CanvasRenderingContext2D,
  data: Iterable<any>,
  scales: RealtimeScales,
  layout: RealtimeLayout,
  style: LineStyle,
  accessors: RealtimeAccessors,
  annotations?: Record<string, any>[]
) => void
