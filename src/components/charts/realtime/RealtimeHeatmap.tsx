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
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { ChartMode, ChartAccessor, SelectionConfig } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { renderLoadingState, renderEmptyState } from "../shared/withChartWrapper"

export interface RealtimeHeatmapProps<TDatum extends Record<string, any> = Record<string, any>> {
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
  /** Time/x value accessor */
  timeAccessor?: ChartAccessor<TDatum, number>
  /** Value/y accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Category accessor for colored cells */
  categoryAccessor?: ChartAccessor<TDatum, string>
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
  /** Custom tooltip renderer (alias for tooltipContent) */
  tooltip?: (d: HoverData) => ReactNode
  /** Enable linked hover selection events for cross-chart highlighting */
  linkedHover?: boolean | string | { name?: string; fields: string[] }
  /** Consume a named selection — dims unselected elements */
  selection?: SelectionConfig
  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: ReactNode | false
  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"
  /** Show a legend */
  showLegend?: boolean
  /** Legend position */
  legendPosition?: LegendPosition
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** ID accessor for remove()/update() on the push API */
  pointIdAccessor?: string | ((d: any) => string)
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
export const RealtimeHeatmap = forwardRef(
  function RealtimeHeatmap<TDatum extends Record<string, any> = Record<string, any>>(props: RealtimeHeatmapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
      categoryAccessor,
      timeExtent,
      valueExtent,
      extentPadding,
      heatmapXBins = 20,
      heatmapYBins = 20,
      aggregation = "count",
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
      decay,
      pulse,
      staleness,
      linkedHover,
      selection,
      onObservation,
      chartId,
      loading,
      emptyContent,
      emphasis,
      legendPosition: legendPositionProp,
    } = props

    const showAxes = resolved.showAxes
    const enableHover = resolved.enableHover
    const margin = userMargin ?? resolved.marginDefaults
    const resolvedSize: [number, number] = size ?? [resolved.width, resolved.height]
    const resolvedTooltip = tooltipContent ?? tooltip

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover via shared hook ──
    const { customHoverBehavior: linkedHoverBehavior } = useChartSelection({
      selection, linkedHover, unwrapData: true,
      onObservation, chartType: "RealtimeHeatmap", chartId
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
      remove: (id) => frameRef.current?.remove(id) ?? [],
      update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? []
    }))

    // ── Loading / empty states (computed early, returned after all hooks) ───
    const loadingEl = renderLoadingState(loading, resolvedSize[0], resolvedSize[1])
    const emptyEl = !loadingEl ? renderEmptyState(data, resolvedSize[0], resolvedSize[1], emptyContent) : null

    const resolvedClassName = emphasis
      ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
      : className

    // ── Loading / empty guards (deferred to after all hooks) ───────────────
    if (loadingEl) return loadingEl
    if (emptyEl) return emptyEl

    return (
      <StreamXYFrame
        ref={frameRef}
        chartType="heatmap"
        runtimeMode="streaming"
        size={resolvedSize}
        margin={margin}
        className={resolvedClassName}
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
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        decay={decay}
        pulse={pulse}
        staleness={staleness}
        legendPosition={legendPositionProp}
        pointIdAccessor={props.pointIdAccessor}
      />
    )
  }
) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: RealtimeHeatmapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeHeatmap.displayName = "RealtimeHeatmap"
