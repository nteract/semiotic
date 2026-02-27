import * as React from "react"
import { useRef, useEffect, useImperativeHandle, forwardRef } from "react"
import RealtimeFrame from "../../realtime/RealtimeFrame"
import type {
  ArrowOfTime,
  WindowMode,
  LineStyle,
  HoverAnnotationConfig,
  HoverData,
  RealtimeFrameHandle,
  AnnotationContext
} from "../../realtime/types"
import type { ReactNode } from "react"

export interface RealtimeLineChartProps {
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
  /** Line color */
  stroke?: string
  /** Line width */
  strokeWidth?: number
  /** Dash pattern (e.g. "4,2") */
  strokeDasharray?: string
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
  /** Annotation objects */
  annotations?: Record<string, any>[]
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: any, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
}

/**
 * RealtimeLineChart - Simplified wrapper for streaming line charts.
 *
 * Wraps RealtimeFrame with `chartType="line"` and exposes stroke/strokeWidth
 * as top-level props instead of requiring a `lineStyle` object.
 *
 * @example
 * ```tsx
 * const ref = useRef<RealtimeFrameHandle>(null)
 *
 * <RealtimeLineChart
 *   ref={ref}
 *   stroke="#007bff"
 *   strokeWidth={2}
 *   windowSize={200}
 *   enableHover
 * />
 * ```
 */
export const RealtimeLineChart = forwardRef<RealtimeFrameHandle, RealtimeLineChartProps>(
  function RealtimeLineChart(props, ref) {
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
      stroke = "#007bff",
      strokeWidth = 2,
      strokeDasharray,
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

    const lineStyle: LineStyle = { stroke, strokeWidth, strokeDasharray }

    return (
      <RealtimeFrame
        ref={frameRef}
        chartType="line"
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
        lineStyle={lineStyle}
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
