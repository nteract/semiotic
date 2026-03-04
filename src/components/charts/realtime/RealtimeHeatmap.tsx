import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle,
  DecayConfig,
  PulseConfig,
  StalenessConfig
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"

export interface RealtimeHeatmapProps {
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
  /** Time/x value accessor */
  timeAccessor?: string | ((d: Record<string, any>) => number)
  /** Value/y accessor */
  valueAccessor?: string | ((d: Record<string, any>) => number)
  /** Category accessor for colored cells */
  categoryAccessor?: string | ((d: Record<string, any>) => string)
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Extent padding factor */
  extentPadding?: number
  /** Number of x-axis bins (default: 20) */
  heatmapXBins?: number
  /** Number of y-axis bins (default: 20) */
  heatmapYBins?: number
  /** Aggregation mode: "count", "sum", or "mean" (default: "count") */
  aggregation?: "count" | "sum" | "mean"
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
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
}

/**
 * RealtimeHeatmap - Streaming heatmap with 2D grid binning.
 *
 * Wraps StreamXYFrame with `chartType="heatmap"` and `runtimeMode="streaming"`,
 * providing configurable bin counts and aggregation modes.
 *
 * @example
 * ```tsx
 * const ref = useRef<RealtimeFrameHandle>(null)
 * ref.current.push({ time: Date.now(), x: 42, y: 7 })
 *
 * <RealtimeHeatmap
 *   ref={ref}
 *   timeAccessor="time"
 *   valueAccessor="y"
 *   heatmapXBins={30}
 *   heatmapYBins={20}
 *   aggregation="count"
 * />
 * ```
 */
export const RealtimeHeatmap = forwardRef<RealtimeFrameHandle, RealtimeHeatmapProps>(
  function RealtimeHeatmap(props, ref) {
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
      categoryAccessor,
      timeExtent,
      valueExtent,
      extentPadding,
      heatmapXBins = 20,
      heatmapYBins = 20,
      aggregation = "count",
      showAxes = true,
      background,
      enableHover,
      tooltipContent,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      decay,
      pulse,
      staleness
    } = props

    const frameRef = useRef<StreamXYFrameHandle>(null)

    useImperativeHandle(ref, () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? []
    }))

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="heatmap"
        runtimeMode="streaming"
        size={size}
        margin={margin}
        className={className}
        arrowOfTime={arrowOfTime}
        windowMode={windowMode}
        windowSize={windowSize}
        data={data}
        timeAccessor={timeAccessor}
        valueAccessor={valueAccessor}
        categoryAccessor={categoryAccessor}
        xExtent={timeExtent}
        yExtent={valueExtent}
        extentPadding={extentPadding}
        heatmapXBins={heatmapXBins}
        heatmapYBins={heatmapYBins}
        heatmapAggregation={aggregation}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={tooltipContent}
        customHoverBehavior={onHover}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        decay={decay}
        pulse={pulse}
        staleness={staleness}
      />
    )
  }
)
RealtimeHeatmap.displayName = "RealtimeHeatmap"
