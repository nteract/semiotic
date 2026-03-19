import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  BarStyle,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle,
  DecayConfig,
  PulseConfig,
  StalenessConfig,
  TransitionConfig
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { ChartMode, ChartAccessor } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"

export interface RealtimeTemporalHistogramProps<TDatum extends Record<string, any> = Record<string, any>> {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Time interval for binning */
  binSize: number
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
  /**
   * Category accessor for stacked bars.
   * When provided, bars are stacked by category within each bin.
   */
  categoryAccessor?: ChartAccessor<TDatum, string>
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
  svgAnnotationRules?: (annotation: Record<string, any>, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Custom tooltip renderer (alias for tooltipContent) */
  tooltip?: (d: HoverData) => ReactNode
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
  /** Smooth position interpolation on data change */
  transition?: TransitionConfig
}

/**
 * RealtimeTemporalHistogram - Streaming temporal histogram.
 *
 * Wraps StreamXYFrame with `chartType="bar"` and `runtimeMode="streaming"`,
 * binning pushed data points into time-windowed bars. Supports both simple
 * and stacked (categorical) modes.
 *
 * Edge bins that only partially fall within the visible time window are
 * rendered at proportionally narrower widths (Datadog-style).
 *
 * @example
 * ```tsx
 * // Simple histogram
 * <RealtimeTemporalHistogram
 *   ref={ref}
 *   binSize={20}
 *   fill="#007bff"
 *   enableHover
 * />
 *
 * // Stacked by category
 * <RealtimeTemporalHistogram
 *   ref={ref}
 *   binSize={25}
 *   categoryAccessor="category"
 *   colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
 *   enableHover
 * />
 * ```
 */
export const RealtimeTemporalHistogram = forwardRef(
  function RealtimeTemporalHistogram<TDatum extends Record<string, any> = Record<string, any>>(props: RealtimeTemporalHistogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
    })

    const {
      binSize,
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
      fill,
      stroke,
      strokeWidth,
      gap,
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      linkedHover,
      decay,
      pulse,
      staleness,
      transition,
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
      onObservation, chartType: "RealtimeTemporalHistogram", chartId
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

    const barStyle: BarStyle = {}
    if (fill != null) barStyle.fill = fill
    if (stroke != null) barStyle.stroke = stroke
    if (strokeWidth != null) barStyle.strokeWidth = strokeWidth
    if (gap != null) barStyle.gap = gap

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="bar"
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
        binSize={binSize}
        categoryAccessor={categoryAccessor}
        barColors={colors}
        barStyle={barStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        decay={decay}
        pulse={pulse}
        staleness={staleness}
        transition={transition}
      />
    )
  }
) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: RealtimeTemporalHistogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeTemporalHistogram.displayName = "RealtimeTemporalHistogram"

/** @deprecated Use RealtimeTemporalHistogram instead */
export const RealtimeHistogram = RealtimeTemporalHistogram
/** @deprecated Use RealtimeTemporalHistogramProps instead */
export type RealtimeHistogramProps = RealtimeTemporalHistogramProps
