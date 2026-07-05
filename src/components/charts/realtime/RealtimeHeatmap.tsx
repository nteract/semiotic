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
import type { ChartMode, ChartAccessor, SelectionConfig, MobileInteractionProp } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildHeatmapTooltip } from "./defaultRealtimeTooltip"
import { renderLoadingState, renderEmptyState } from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { MobileVisualizationContract } from "../shared/auditMobileVisualization"
import type { ResponsiveRule } from "../shared/responsiveRules"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"

export interface RealtimeHeatmapProps<TDatum extends Datum = Datum> {
  /** Display mode: "primary" (full chrome), "context" (compact), "sparkline" (inline) */
  mode?: ChartMode
  /** Semantic responsive transformations applied before chart-mode defaults. */
  responsiveRules?: ResponsiveRule[]
  /** Phone/mobile contract consumed by audits, recipes, adapters, and agents. */
  mobileSemantics?: MobileVisualizationContract
  /** Touch-first interaction policy for phone-sized chart slots. */
  mobileInteraction?: MobileInteractionProp
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
  data?: Datum[]
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
  annotations?: Datum[]
  /** Opt into automatic placement for note-like annotations without manual offsets. */
  autoPlaceAnnotations?: AutoPlaceAnnotations
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: Datum, index: number, context: AnnotationContext) => ReactNode
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
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: React.ReactNode | false
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
  pointIdAccessor?: string | ((d: Datum) => string)
}

/**
 * RealtimeHeatmap - Streaming heatmap with 2D grid binning.
 *
 * Wraps StreamXYFrame with `chartType="heatmap"` and `runtimeMode="streaming"`,
 * providing configurable bin counts and aggregation modes.
 *
 * @example
 * ```tsx
 * // Count-aggregated heatmap — each push lands in a (time-bin × value-bin) cell
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(() => ref.current?.push({ time: Date.now(), y: Math.random() * 10 }), 50)
 *   return () => clearInterval(id)
 * }, [])
 * return (
 *   <RealtimeHeatmap
 *     ref={ref}
 *     timeAccessor="time"
 *     valueAccessor="y"
 *     heatmapXBins={30}
 *     heatmapYBins={20}
 *     aggregation="count"
 *   />
 * )
 * ```
 *
 * @example
 * ```tsx
 * // Mean aggregation with a sequential color scheme; useful for sensor density maps
 * <RealtimeHeatmap
 *   ref={ref}
 *   timeAccessor="time"
 *   valueAccessor="y"
 *   aggregation="mean"
 *   colorScheme="viridis"
 *   windowSize={500}
 * />
 * ```
 */
export const RealtimeHeatmap = forwardRef(
  function RealtimeHeatmap<TDatum extends Datum = Datum>(props: RealtimeHeatmapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
          mobileInteraction: props.mobileInteraction,
      mobileSemantics: props.mobileSemantics,
      responsiveRules: props.responsiveRules,
})

    const {
      size,
      margin: userMargin,
      className,
      arrowOfTime = "right",
      windowMode = "sliding",
      windowSize: windowSizeProp,
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
      autoPlaceAnnotations,
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
      loadingContent,
      emptyContent,
      emphasis,
      legendPosition: legendPositionProp,
    } = props

    const showAxes = resolved.showAxes
    const enableHover = resolved.enableHover
    const margin = userMargin ?? resolved.marginDefaults
    const resolvedSize: [number, number] = size ?? [resolved.width, resolved.height]
    // Heatcell datums are aggregated bins, not the user's raw rows — the
    // generic `x:/y:` tooltip would read undefined off `timeAccessor`/
    // `valueAccessor` since the cell datum is `{xi, yi, value, count, sum,
    // xCenter, yCenter, agg}`. The heatmap-specific helper reads the
    // enriched bin-center coords + aggregation type so users see real
    // data-space values and the cell's count/sum/mean.
    const resolvedTooltip =
      tooltipContent ?? tooltip ?? buildHeatmapTooltip({ timeAccessor, valueAccessor })

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

    // `[]` deps so the handle stays stable — see useFrameImperativeHandle.
    useImperativeHandle(ref, () => ({
      push: (point) => frameRef.current?.push(point),
      pushMany: (points) => frameRef.current?.pushMany(points),
      remove: (id) => frameRef.current?.remove(id) ?? [],
      update: (id, updater) => frameRef.current?.update(id, updater) ?? [],
      clear: () => frameRef.current?.clear(),
      getData: () => frameRef.current?.getData() ?? [],
      getScales: () => frameRef.current?.getScales() ?? null
    }), [])

    // ── Loading / empty states (computed early, returned after all hooks) ───
    const loadingEl = renderLoadingState(loading, resolvedSize[0], resolvedSize[1], loadingContent)
    const emptyEl = !loadingEl ? renderEmptyState(data, resolvedSize[0], resolvedSize[1], emptyContent) : null

    const resolvedClassName = emphasis
      ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
      : className

    const windowSize = resolveRealtimeWindowSize(windowSizeProp, data)

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
        {...buildCustomBehaviorProps({
          linkedHover,
          selection,
          onObservation,
          forceHoverBehavior: true,
          mobileInteraction: resolved.mobileInteraction,
          customHoverBehavior: combinedHoverBehavior as (d: Datum | null) => void,
        })}
        annotations={annotations}
        autoPlaceAnnotations={autoPlaceAnnotations}
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
  <TDatum extends Datum = Datum>(props: RealtimeHeatmapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeHeatmap.displayName = "RealtimeHeatmap"
