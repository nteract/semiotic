import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  SwarmStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { normalizeLinkedHover } from "../shared/selectionUtils"
import { useLinkedHover } from "../../store/useSelection"

export interface RealtimeSwarmChartProps {
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
  /** Value accessor */
  valueAccessor?: string | ((d: Record<string, any>) => number)
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Category accessor for color-coding dots */
  categoryAccessor?: string | ((d: Record<string, any>) => string)
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
 * RealtimeSwarmChart - Simplified wrapper for streaming dot/swarm charts.
 *
 * Wraps StreamXYFrame with `chartType="swarm"` and `runtimeMode="streaming"`,
 * exposing dot styling as top-level props. Each data point renders as an individual
 * dot at its (time, value) coordinates.
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

    const swarmStyle: SwarmStyle = {}
    if (radius != null) swarmStyle.radius = radius
    if (fill != null) swarmStyle.fill = fill
    if (opacity != null) swarmStyle.opacity = opacity
    if (stroke != null) swarmStyle.stroke = stroke
    if (strokeWidth != null) swarmStyle.strokeWidth = strokeWidth

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="swarm"
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
        categoryAccessor={categoryAccessor}
        barColors={colors}
        swarmStyle={swarmStyle}
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
RealtimeSwarmChart.displayName = "RealtimeSwarmChart"
