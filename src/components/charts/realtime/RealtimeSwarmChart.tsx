import * as React from "react"
import { useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type {
  ArrowOfTime,
  WindowMode,
  SwarmStyle,
  Style,
  HoverAnnotationConfig,
  HoverData,
  AnnotationContext,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { ReactNode } from "react"
import { useChartSelection, useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { ChartMode, ChartAccessor, SelectionConfig } from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildDefaultRealtimeTooltip } from "./defaultRealtimeTooltip"
import { renderLoadingState, renderEmptyState } from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"

export interface RealtimeSwarmChartProps<TDatum extends Datum = Datum> {
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
  data?: Datum[]
  /** Time value accessor */
  timeAccessor?: ChartAccessor<TDatum, number>
  /** Value accessor */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Fixed time domain */
  timeExtent?: [number, number]
  /** Fixed value domain */
  valueExtent?: [number, number]
  /** Value-axis scale. "symlog" supports signed values while compressing large magnitudes. */
  yScaleType?: "linear" | "log" | "symlog"
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
  /** Per-datum dot style. Returned values override the top-level dot primitives and category color. */
  pointStyle?: (datum: TDatum) => Style & { r?: number }
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
  annotations?: Datum[]
  /** Opt into automatic placement for note-like annotations without manual offsets. */
  autoPlaceAnnotations?: AutoPlaceAnnotations
  /** SVG annotation render function */
  svgAnnotationRules?: (annotation: Datum, index: number, context: AnnotationContext) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
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
 * // Per-sensor swarm — each push is a discrete dot, color by category
 * <RealtimeSwarmChart
 *   ref={ref}
 *   radius={4}
 *   opacity={0.8}
 *   categoryAccessor="sensor"
 *   colors={{ sensor1: "#007bff", sensor2: "#28a745" }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Threshold-coloured outliers via a y-threshold annotation
 * <RealtimeSwarmChart
 *   ref={ref}
 *   radius={3}
 *   annotations={[{ type: "y-threshold", value: 0.9, color: "#dc3545", label: "alert" }]}
 *   windowSize={300}
 * />
 * ```
 */
export const RealtimeSwarmChart = forwardRef(
  function RealtimeSwarmChart<TDatum extends Datum = Datum>(props: RealtimeSwarmChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
    const resolved = useChartMode(props.mode, {
      width: props.size?.[0] ?? props.width,
      height: props.size?.[1] ?? props.height,
      enableHover: props.enableHover != null ? !!props.enableHover : undefined,
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
      timeExtent,
      valueExtent,
      yScaleType,
      extentPadding,
      categoryAccessor,
      colors,
      radius,
      fill,
      opacity,
      stroke,
      strokeWidth,
      pointStyle,
      background,
      tooltipContent,
      tooltip,
      onHover,
      annotations,
      autoPlaceAnnotations,
      svgAnnotationRules,
      tickFormatTime,
      tickFormatValue,
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
    // See RealtimeLineChart for the data-space-vs-pixel-space tooltip rationale.
    const resolvedTooltip =
      tooltipContent ?? tooltip ?? buildDefaultRealtimeTooltip({ timeAccessor, valueAccessor })

    const frameRef = useRef<StreamXYFrameHandle>(null)

    // ── Linked hover via shared hook ──
    const { customHoverBehavior: linkedHoverBehavior } = useChartSelection({
      selection, linkedHover, unwrapData: true,
      onObservation, chartType: "RealtimeSwarmChart", chartId
    })

    const combinedHoverBehavior = useCallback(
      (d: HoverData | null) => {
        if (onHover) onHover(d)
        linkedHoverBehavior(d)
      },
      [onHover, linkedHoverBehavior]
    )

    // `[]` deps so the handle stays stable — see useFrameImperativeHandle
    // for the regression class.
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

    const swarmStyle: SwarmStyle = {}
    if (radius != null) swarmStyle.radius = radius
    if (fill != null) swarmStyle.fill = fill
    if (opacity != null) swarmStyle.opacity = opacity
    if (stroke != null) swarmStyle.stroke = stroke
    if (strokeWidth != null) swarmStyle.strokeWidth = strokeWidth
    // StreamXYFrame stores heterogeneous Datum rows internally. The wrapper's
    // generic narrows that same row at its public boundary for caller
    // autocomplete, so this variance bridge is type-only.
    const resolvedPointStyle = pointStyle as ((datum: Datum) => Style & { r?: number }) | undefined

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
        chartType="swarm"
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
        xExtent={timeExtent}
        yExtent={valueExtent}
        yScaleType={yScaleType}
        extentPadding={extentPadding}
        categoryAccessor={categoryAccessor}
        barColors={colors}
        swarmStyle={swarmStyle}
        pointStyle={resolvedPointStyle}
        showAxes={showAxes}
        background={background}
        hoverAnnotation={enableHover}
        tooltipContent={resolvedTooltip}
        customHoverBehavior={combinedHoverBehavior}
        annotations={annotations}
        autoPlaceAnnotations={autoPlaceAnnotations}
        svgAnnotationRules={svgAnnotationRules}
        tickFormatTime={tickFormatTime}
        tickFormatValue={tickFormatValue}
        legendPosition={legendPositionProp}
        pointIdAccessor={props.pointIdAccessor}
      />
    )
  }
) as unknown as {
  <TDatum extends Datum = Datum>(props: RealtimeSwarmChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
RealtimeSwarmChart.displayName = "RealtimeSwarmChart"
