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

export interface AnnotationContext {
  scales: { time: ScaleLinear<number, number>; value: ScaleLinear<number, number> } | null
  timeAxis: "x" | "y"
  width: number
  height: number
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
