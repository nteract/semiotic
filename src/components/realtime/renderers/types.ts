import type { RealtimeScales, RealtimeLayout, LineStyle, RealtimeAccessors, BarStyle, WaterfallStyle, SwarmStyle } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"

export interface RendererOptions {
  binSize?: number
  barColors?: Record<string, string>
  barStyle?: BarStyle
  waterfallStyle?: WaterfallStyle
  swarmStyle?: SwarmStyle
}

export type RendererFn = (
  ctx: CanvasRenderingContext2D,
  data: Iterable<Datum>,
  scales: RealtimeScales,
  layout: RealtimeLayout,
  style: LineStyle,
  accessors: RealtimeAccessors,
  annotations?: Datum[],
  options?: RendererOptions
) => void
