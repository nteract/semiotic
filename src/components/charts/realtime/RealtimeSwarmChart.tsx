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
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { ChartMode, ChartAccessor } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"

export interface RealtimeSwarmChartProps<TDatum extends Record<string, any> = Record<string, any>> {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
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
  onObservation?: OnObservationCallback
  chartId?: string
  /** Direction time flows */
  arrowOfTime?: ArrowOfTime
  /** Data retention strategy */
  windowMode?: WindowMode
  /** Ring buffer capacity */
  windowSize?: number
  /** Controlled data array */
  data?: Record<string, any>[]
  /** Time value accessor */
  timeAccessor?: ChartAccessor<TDatum, number>
  /** Value accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Category accessor for color-coding dots */
  categoryAccessor?: ChartAccessor<TDatum, string>
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
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
    })

    const {
      size,
      width,
      height,
      margin: userMargin,
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
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      linkedHover,
      onObservation,
      chartId
    } = props

    const showAxes = resolved.showAxes
    const enableHover = resolved.enableHover
    const margin = userMargin ?? resolved.marginDefaults
    const resolvedSize: [number, number] = size ?? [resolved.width, resolved.height]
    const resolvedTooltip = tooltipContent ?? tooltip

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover via shared hook ──
    const { customHoverBehavior: linkedHoverBehavior } = useChartSelection({
      linkedHover, unwrapData: true,
      onObservation, chartType: "RealtimeSwarmChart", chartId
    })

    const combinedHoverBehavior = useCallback(
      (d: HoverData | null) => {
        if (onHover) onHover(d)
        linkedHoverBehavior(d)
      },
      [onHover, linkedHoverBehavior]
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
