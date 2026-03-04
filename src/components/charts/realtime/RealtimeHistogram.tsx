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
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { normalizeLinkedHover } from "../shared/selectionUtils"
import { useLinkedHover } from "../../store/useSelection"

export interface RealtimeTemporalHistogramProps {
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
  timeAccessor?: string | ((d: Record<string, any>) => number)
  /** Value accessor */
  valueAccessor?: string | ((d: Record<string, any>) => number)
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
  categoryAccessor?: string | ((d: Record<string, any>) => string)
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
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
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
export const RealtimeTemporalHistogram = forwardRef<RealtimeFrameHandle, RealtimeTemporalHistogramProps>(
  function RealtimeTemporalHistogram(props, ref) {
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
      tickFormatValue,
      linkedHover
    } = props

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
        size={size}
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
        tooltipContent={tooltipContent}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
      />
    )
  }
)
RealtimeTemporalHistogram.displayName = "RealtimeTemporalHistogram"

/** @deprecated Use RealtimeTemporalHistogram instead */
export const RealtimeHistogram = RealtimeTemporalHistogram
/** @deprecated Use RealtimeTemporalHistogramProps instead */
export type RealtimeHistogramProps = RealtimeTemporalHistogramProps
