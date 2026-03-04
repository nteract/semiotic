import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  WaterfallStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { normalizeLinkedHover } from "../shared/selectionUtils"
import { useLinkedHover } from "../../store/useSelection"

export interface RealtimeWaterfallChartProps {
  /** Chart dimensions as [width, height] */
  size?: [number, number]
  /** Chart width (alternative to size) */
  width?: number
  /** Chart height (alternative to size) */
  height?: number
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
  timeAccessor?: string | ((d: Record<string, any>) => number)
  /** Value accessor (positive = gain, negative = loss) */
  valueAccessor?: string | ((d: Record<string, any>) => number)
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Color for positive (gain) bars */
  positiveColor?: string
  /** Color for negative (loss) bars */
  negativeColor?: string
  /** Connector line stroke color (omit to hide connectors) */
  connectorStroke?: string
  /** Connector line width */
  connectorWidth?: number
  /** Gap between bars in pixels */
  gap?: number
  /** Bar stroke color */
  stroke?: string
  /** Bar stroke width */
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
  /** Annotation objects */
  annotations?: Record<string, any>[]
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: Record<string, any>, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Custom tooltip renderer (alias for tooltipContent) */
  tooltip?: (d: HoverData) => ReactNode
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
}

/**
 * RealtimeWaterfallChart - Simplified wrapper for streaming waterfall charts.
 *
 * Wraps StreamXYFrame with `chartType="waterfall"` and `runtimeMode="streaming"`,
 * exposing waterfall styling as top-level props. Visualizes cumulative deltas as
 * connected bars rising and falling from a running baseline.
 *
 * @example
 * ```tsx
 * <RealtimeWaterfallChart
 *   ref={ref}
 *   positiveColor="#28a745"
 *   negativeColor="#dc3545"
 *   connectorStroke="#999"
 *   windowSize={300}
 * />
 * ```
 */
export const RealtimeWaterfallChart = forwardRef<RealtimeFrameHandle, RealtimeWaterfallChartProps>(
  function RealtimeWaterfallChart(props, ref) {
    const {
      size,
      width,
      height,
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
      positiveColor,
      negativeColor,
      connectorStroke,
      connectorWidth,
      gap,
      stroke,
      strokeWidth,
      showAxes = true,
      background,
      enableHover,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      linkedHover
    } = props

    const resolvedSize: [number, number] = width != null && height != null
      ? [width, height]
      : size || [500, 300]
    const resolvedTooltip = tooltipContent ?? tooltip

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover hooks (always called, conditional logic inside) ──
    const hoverConfig = normalizeLinkedHover(linkedHover)
    const linkedHoverHook = useLinkedHover({
      name: hoverConfig?.name || "hover",
      fields: hoverConfig?.fields || []
    })

    const combinedHoverBehavior = useCallback(
      (d: HoverData | null) => {
        if (onHover) onHover(d)
        if (linkedHover) {
          linkedHoverHook.onHover(d ? (d.data || d) : null)
        }
      },
      [onHover, linkedHover, linkedHoverHook]
    )

    useImperativeHandle(ref, () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? []
    }))

    const waterfallStyle: WaterfallStyle = {}
    if (positiveColor != null) waterfallStyle.positiveColor = positiveColor
    if (negativeColor != null) waterfallStyle.negativeColor = negativeColor
    if (connectorStroke != null) waterfallStyle.connectorStroke = connectorStroke
    if (connectorWidth != null) waterfallStyle.connectorWidth = connectorWidth
    if (gap != null) waterfallStyle.gap = gap
    if (stroke != null) waterfallStyle.stroke = stroke
    if (strokeWidth != null) waterfallStyle.strokeWidth = strokeWidth

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="waterfall"
        runtimeMode="streaming"
        size={resolvedSize}
        margin={margin}
        className={className}
        arrowOfTime={arrowOfTime}
        windowMode={windowMode}
        windowSize={windowSize}
        data={data}
        timeAccessor={timeAccessor}
        valueAccessor={valueAccessor}
        xExtent={timeExtent}
        yExtent={valueExtent}
        extentPadding={extentPadding}
        waterfallStyle={waterfallStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
      />
    )
  }
)
RealtimeWaterfallChart.displayName = "RealtimeWaterfallChart"
