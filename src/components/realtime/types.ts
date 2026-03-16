import type { ReactNode } from "react"
import type { ScaleLinear } from "d3-scale"

export type ArrowOfTime = "up" | "down" | "left" | "right"
export type WindowMode = "sliding" | "growing"
export type ThresholdType = "greater" | "lesser"

export interface LineStyle {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
}

/**
 * Anchoring mode for streaming annotations.
 * - `"fixed"` (default): anchored to specific datum coordinates; disappears when out of view.
 * - `"latest"`: annotation attaches to the most recent datum in the buffer.
 *   On each frame, the annotation's position is re-resolved to the latest data point.
 *   Useful for "current value" labels.
 * - `"sticky"`: annotation stays at its last known pixel position after the target datum
 *   is evicted from the window. It freezes in place rather than disappearing.
 */
export type AnnotationAnchorMode = "fixed" | "latest" | "sticky"

export interface AnnotationContext {
  scales?: {
    x?: ScaleLinear<number, number>
    y?: ScaleLinear<number, number>
    time?: ScaleLinear<number, number>
    value?: ScaleLinear<number, number>
  } | null
  /** @deprecated Use scales.x / scales.y instead */
  timeAxis?: "x" | "y"
  xAccessor?: string
  yAccessor?: string
  width?: number
  height?: number
  data?: Record<string, any>[]
  frameType?: "xy" | "ordinal" | "network"
  /** Point scene nodes for point-anchored annotations */
  pointNodes?: { pointId?: string; x: number; y: number; r: number }[]
  /** Curve interpolation type from the parent chart */
  curve?: string
  /** Cache of last known pixel positions for sticky annotations, keyed by annotation index */
  stickyPositionCache?: Map<number, { x: number; y: number }>
}

export interface CrosshairStyle {
  stroke?: string
  strokeWidth?: number
  strokeDasharray?: string
}

export interface HoverAnnotationConfig {
  crosshair?: boolean | CrosshairStyle
  snapToPoint?: boolean
}

export interface HoverData {
  data: Record<string, any>
  time: number
  value: number
  x: number
  y: number
}

export interface BarStyle {
  fill?: string
  stroke?: string
  strokeWidth?: number
  gap?: number
}

export interface WaterfallStyle {
  positiveColor?: string
  negativeColor?: string
  connectorStroke?: string
  connectorWidth?: number
  gap?: number
  stroke?: string
  strokeWidth?: number
}

export interface SwarmStyle {
  radius?: number
  fill?: string
  opacity?: number
  stroke?: string
  strokeWidth?: number
}

export interface RealtimeFrameProps {
  chartType?: "line" | "swarm" | "candlestick" | "waterfall" | "bar"
  arrowOfTime?: ArrowOfTime
  windowMode?: WindowMode
  windowSize?: number
  data?: Record<string, any>[]
  timeAccessor?: string | ((d: Record<string, any>) => number)
  valueAccessor?: string | ((d: Record<string, any>) => number)
  timeExtent?: [number, number]
  valueExtent?: [number, number]
  extentPadding?: number
  size?: [number, number]
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  className?: string
  lineStyle?: LineStyle
  annotations?: Record<string, any>[]
  svgAnnotationRules?: (annotation: Record<string, any>, index: number, context: AnnotationContext) => ReactNode
  hoverAnnotation?: boolean | HoverAnnotationConfig
  tooltipContent?: (d: HoverData) => ReactNode
  customHoverBehavior?: (d: HoverData | null) => void
  showAxes?: boolean
  background?: string
  categoryAccessor?: string | ((d: Record<string, any>) => string)
  binSize?: number
  barColors?: Record<string, string>
  barStyle?: BarStyle
  waterfallStyle?: WaterfallStyle
  swarmStyle?: SwarmStyle
  tickFormatTime?: (value: number) => string
  tickFormatValue?: (value: number) => string
}

export interface RealtimeFrameHandle {
  push(point: Record<string, any>): void
  pushMany(points: Record<string, any>[]): void
  clear(): void
  getData(): Record<string, any>[]
}

export interface RealtimeScales {
  time: ScaleLinear<number, number>
  value: ScaleLinear<number, number>
}

export interface RealtimeLayout {
  width: number
  height: number
  timeAxis: "x" | "y"
}

export interface RealtimeAccessors {
  time: (d: Record<string, any>) => number
  value: (d: Record<string, any>) => number
  category?: (d: Record<string, any>) => string
}
