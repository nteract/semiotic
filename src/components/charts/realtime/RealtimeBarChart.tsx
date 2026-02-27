import * as React from "react"
import { useRef, useImperativeHandle, forwardRef } from "react"
import RealtimeFrame from "../../realtime/RealtimeFrame"
import type {
  ArrowOfTime,
  WindowMode,
  BarStyle,
  HoverAnnotationConfig,
  HoverData,
  RealtimeFrameHandle,
  AnnotationContext
} from "../../realtime/types"
import type { ReactNode } from "react"

export interface RealtimeBarChartProps {
  /** Time interval for binning */
  binSize: number
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
  /**
   * Category accessor for stacked bars.
   * When provided, bars are stacked by category within each bin.
   */
  categoryAccessor?: string | ((d: any) => string)
  /**
   * Category-to-color map for stacked bars.
   * Keys also determine stack order (listed keys first, then alphabetical).
   */
  colors?: Record<string, string>
  /** Bar fill color (non-stacked mode) */
  fill?: string
  /** Bar stroke color */
  stroke?: string
  /** Bar stroke width */
  strokeWidth?: number
  /** Gap between bars in pixels */
  gap?: number
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
 * RealtimeBarChart - Simplified wrapper for streaming temporal histograms.
 *
 * Wraps RealtimeFrame with `chartType="bar"` and exposes bar styling as
 * top-level props. Supports both simple and stacked (categorical) modes.
 *
 * Edge bins that only partially fall within the visible time window are
 * rendered at proportionally narrower widths (Datadog-style).
 *
 * @example
 * ```tsx
 * // Simple histogram
 * <RealtimeBarChart
 *   ref={ref}
 *   binSize={20}
 *   fill="#007bff"
 *   enableHover
 * />
 *
 * // Stacked by category
 * <RealtimeBarChart
 *   ref={ref}
 *   binSize={25}
 *   categoryAccessor="category"
 *   colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
 *   enableHover
 * />
 * ```
 */
export const RealtimeBarChart = forwardRef<RealtimeFrameHandle, RealtimeBarChartProps>(
  function RealtimeBarChart(props, ref) {
    const {
      binSize,
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
      fill,
      stroke,
      strokeWidth,
      gap,
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

    const barStyle: BarStyle = {}
    if (fill != null) barStyle.fill = fill
    if (stroke != null) barStyle.stroke = stroke
    if (strokeWidth != null) barStyle.strokeWidth = strokeWidth
    if (gap != null) barStyle.gap = gap

    return (
      <RealtimeFrame
        ref={frameRef}
        chartType="bar"
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
        binSize={binSize}
        categoryAccessor={categoryAccessor}
        barColors={colors}
        barStyle={barStyle}
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
