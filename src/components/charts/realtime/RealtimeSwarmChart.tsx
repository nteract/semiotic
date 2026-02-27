import * as React from "react"
import { useRef, useImperativeHandle, forwardRef } from "react"
import RealtimeFrame from "../../realtime/RealtimeFrame"
import type {
  ArrowOfTime,
  WindowMode,
  SwarmStyle,
  HoverAnnotationConfig,
  HoverData,
  RealtimeFrameHandle,
  AnnotationContext
} from "../../realtime/types"
import type { ReactNode } from "react"

export interface RealtimeSwarmChartProps {
  /** Chart dimensions as [width, height] */
  size?: [number, number]
  /** Chart margins */
  margin?: { top?: number; right?: number; bottom?: number; left?: number }
  /** CSS class name */
  className?: string
  /** Direction time flows */
  arrowOfTime?: ArrowOfTime
  /** Data retention strategy */
  windowMode?: WindowMode
  /** Ring buffer capacity */
  windowSize?: number
  /** Controlled data array */
  data?: Record<string, any>[]
  /** Time value accessor */
  timeAccessor?: string | ((d: any) => number)
  /** Value accessor */
  valueAccessor?: string | ((d: any) => number)
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Category accessor for color-coding dots */
  categoryAccessor?: string | ((d: any) => string)
  /** Category-to-color map */
  colors?: Record<string, string>
  /** Dot radius */
  radius?: number
  /** Dot fill color (when no categoryAccessor) */
  fill?: string
  /** Dot opacity */
  opacity?: number
  /** Dot stroke color */
  stroke?: string
  /** Dot stroke width */
  strokeWidth?: number
  /** Show canvas-drawn axes */
  showAxes?: boolean
  /** Background fill color */
  background?: string
  /** Enable hover interaction */
  enableHover?: boolean | HoverAnnotationConfig
  /** Custom tooltip renderer */
  tooltipContent?: (d: HoverData) => ReactNode
  /** Callback on hover */
  onHover?: (d: HoverData | null) => void
  /** Annotation objects (including threshold coloring) */
  annotations?: Record<string, any>[]
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: any, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
}

/**
 * RealtimeSwarmChart - Simplified wrapper for streaming dot/swarm charts.
 *
 * Wraps RealtimeFrame with `chartType="swarm"` and exposes dot styling as
 * top-level props. Each data point renders as an individual dot at its
 * (time, value) coordinates.
 *
 * Supports threshold coloring via annotations to recolor dots that cross
 * value boundaries.
 *
 * @example
 * ```tsx
 * <RealtimeSwarmChart
 *   ref={ref}
 *   radius={4}
 *   opacity={0.8}
 *   categoryAccessor="sensor"
 *   colors={{ sensor1: "#007bff", sensor2: "#28a745" }}
 * />
 * ```
 */
export const RealtimeSwarmChart = forwardRef<RealtimeFrameHandle, RealtimeSwarmChartProps>(
  function RealtimeSwarmChart(props, ref) {
    const {
      size = [500, 300],
      margin,
      className,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize = 200,
      data,
      timeAccessor,
      valueAccessor,
      timeExtent,
      valueExtent,
      extentPadding,
      categoryAccessor,
      colors,
      radius,
      fill,
      opacity,
      stroke,
      strokeWidth,
      showAxes = true,
      background,
      enableHover,
      tooltipContent,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue
    } = props

    const frameRef = useRef<RealtimeFrameHandle>(null)

    useImperativeHandle(ref, () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? []
    }))

    const swarmStyle: SwarmStyle = {}
    if (radius != null) swarmStyle.radius = radius
    if (fill != null) swarmStyle.fill = fill
    if (opacity != null) swarmStyle.opacity = opacity
    if (stroke != null) swarmStyle.stroke = stroke
    if (strokeWidth != null) swarmStyle.strokeWidth = strokeWidth

    return (
      <RealtimeFrame
        ref={frameRef}
        chartType="swarm"
        size={size}
        margin={margin}
        className={className}
        arrowOfTime={arrowOfTime}
        windowMode={windowMode}
        windowSize={windowSize}
        data={data}
        timeAccessor={timeAccessor}
        valueAccessor={valueAccessor}
        timeExtent={timeExtent}
        valueExtent={valueExtent}
        extentPadding={extentPadding}
        categoryAccessor={categoryAccessor}
        barColors={colors}
        swarmStyle={swarmStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={tooltipContent}
        customHoverBehavior={onHover}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
      />
    )
  }
)
