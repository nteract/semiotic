import * as React from "react"
import {
  useRef,
  forwardRef,
  useCallback,
  useMemo
} from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { lineXYPlugin } from "../../stream/xyPlugins/linePlugin"
import type {
  LineStyle,
  HoverData,
  StreamXYFrameHandle
} from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import {
  useChartLegendAndMargin,
  useChartSelection,
  getCrosshairProps,
  useLegendInteraction
} from "../shared/hooks"
import { buildDefaultRealtimeTooltip } from "./defaultRealtimeTooltip"
import {
  renderLoadingState,
  renderEmptyState
} from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import { AGG_SERIES } from "./RealtimeAccumulator"
import {
  type AggregateConfig,
  type AggregatedRealtimeDatum,
  hasBand,
  AGG_TIME,
  AGG_VALUE,
  AGG_LOWER,
  AGG_UPPER
} from "./aggregate"
import { useRealtimeLineIngestion } from "./useRealtimeLineIngestion"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import {
  MultiPointTooltip,
  resolveMultiCapableTooltip
} from "../../Tooltip/Tooltip"
import type { LegendValue } from "../../types/legendTypes"
import {
  type RealtimeLineChartHandle,
  type RealtimeLineChartProps
} from "./RealtimeLineChart.types"

import {
  buildRealtimeFrameChromeProps,
  useRealtimeChartMode,
  useRealtimeSelectionStyle
} from "./realtimeChartRuntime"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import { composeStyleRules, makeXYRuleContext } from "../shared/styleRules"
import { withChartErrorBoundary } from "../shared/withChartErrorBoundary"

export type { RealtimeLineChartHandle, RealtimeLineChartProps }

// Registered at render (not import) so unused charts stay tree-shakeable.
function ensureRealtimeLineChartRegistrations(): void {
  registerXYPlugin(lineXYPlugin)
}

/**
 * RealtimeLineChart - Simplified wrapper for streaming line charts.
 *
 * Wraps StreamXYFrame with `chartType="line"` and `runtimeMode="streaming"`,
 * exposing stroke/strokeWidth as top-level props instead of requiring a `lineStyle` object.
 *
 * @example
 * ```tsx
 * // Single streaming series — push each datum, the chart slides
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   const id = setInterval(() => ref.current?.push({ time: Date.now(), value: Math.random() }), 100)
 *   return () => clearInterval(id)
 * }, [])
 * return (
 *   <RealtimeLineChart
 *     ref={ref}
 *     stroke="#007bff"
 *     strokeWidth={2}
 *     windowSize={200}
 *     enableHover
 *   />
 * )
 * ```
 *
 * @example
 * ```tsx
 * // Decay + pulse — older points fade, newly-pushed points flash
 * <RealtimeLineChart
 *   ref={ref}
 *   timeAccessor="t"
 *   valueAccessor="v"
 *   stroke="#0b5fff"
 *   strokeWidth={2}
 *   decay={{ type: "linear" }}
 *   pulse={{ type: "fade", durationMs: 400 }}
 *   windowSize={500}
 * />
 * ```
 */
export const RealtimeLineChart = /* @__PURE__ */ withChartErrorBoundary(/* @__PURE__ */ forwardRef(function RealtimeLineChart<
  TDatum extends Datum = Datum
>(
  props: RealtimeLineChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle<TDatum, Datum>>
) {
  ensureRealtimeLineChartRegistrations()
  const resolved = useRealtimeChartMode(props)

  const {
    size,
    margin: userMargin,
    className,
    arrowOfTime = "right",
    windowMode: windowModeProp,
    capacityMode,
    windowSize: windowSizeProp,
    maxCapacity,
    capacity,
    seriesAccessor,
    data,
    timeAccessor,
    valueAccessor,
    timeExtent,
    valueExtent,
    extentPadding,
    stroke: strokeProp,
    strokeWidth: strokeWidthProp,
    strokeDasharray,
    opacity,
    cursor,
    styleRules,
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
    transition,
    linkedHover,
    selection,
    onObservation,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    emphasis,
    legendPosition: legendPositionProp,
    aggregate,
    eventTime
  } = props

  const showAxes = resolved.showAxes
  const enableHover = resolved.enableHover
  const resolvedSize: [number, number] = size ?? [
    resolved.width,
    resolved.height
  ]
  const stroke = strokeProp ?? "#007bff"
  const strokeWidth = strokeWidthProp ?? 2
  const seriesLabel =
    typeof valueAccessor === "string" ? valueAccessor : "Value"
  const lineLegend = useMemo<LegendValue | undefined>(() => {
    if (!resolved.showLegend) return undefined
    return {
      legendGroups: [
        {
          label: "Series",
          type: "line",
          items: [{ label: seriesLabel, color: stroke }],
          styleFn: (item) => ({
            stroke: item.color || "var(--semiotic-primary, #007bff)",
            strokeWidth: strokeWidth ?? 2
          })
        }
      ]
    }
  }, [resolved.showLegend, seriesLabel, stroke, strokeWidth])
  const legendState = useLegendInteraction(
    props.legendInteraction,
    () => seriesLabel,
    [seriesLabel]
  )
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: [],
    colorBy: undefined,
    colorScale: undefined,
    showLegend: false,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults,
    additionalLegend: lineLegend,
    chartWidth: resolvedSize[0],
    chartHeight: resolvedSize[1],
    axisChrome: { hasAxis: resolved.showAxes !== false }
  })
  // Accessor-aware default tooltip — reads data-space `time` /
  // `value` fields off `hover.data` so the user sees real values
  // out of the box. See `buildDefaultRealtimeTooltip` for shape.
  const defaultTooltipContent = buildDefaultRealtimeTooltip({
    timeAccessor,
    valueAccessor
  })
  const multiPointTooltip = MultiPointTooltip()
  const tooltipProps = resolveMultiCapableTooltip({
    tooltip,
    defaultTooltipContent,
    customFunctionContext: "hover",
    // RealtimeLineChart currently has one value channel. Give its otherwise
    // unnamed line a useful label while retaining the shared multi renderer.
    multiDefaultContent: (hover: Datum) =>
      multiPointTooltip({
        ...hover,
        allSeries: Array.isArray(hover.allSeries)
          ? hover.allSeries.map((hit: Record<string, unknown>) => ({
              ...hit,
              group:
                hit.group ||
                (typeof valueAccessor === "string" ? valueAccessor : "value")
            }))
          : hover.allSeries
      })
  })
  const resolvedTooltip = tooltipContent ?? tooltipProps.tooltipContent

  const frameRef = useRef<StreamXYFrameHandle>(null)

  // ── Linked hover via shared hook ──
  const {
    activeSelectionHook,
    customHoverBehavior: linkedHoverBehavior,
    customClickBehavior,
    crosshairSourceId
  } = useChartSelection({
    selection,
    linkedHover,
    unwrapData: true,
    onObservation,
    chartType: "RealtimeLineChart",
    chartId,
    mobileInteraction: resolved.mobileInteraction
  })

  const combinedHoverBehavior = useCallback(
    (d: HoverData | null) => {
      if (onHover) onHover(d)
      linkedHoverBehavior(d)
    },
    [onHover, linkedHoverBehavior]
  )

  // ── Windowed aggregation (opt-in) ──────────────────────────────────────
  // When `aggregate` is set the HOC owns a WindowAccumulator and feeds the
  // frame a controlled, bounded array of per-window rows instead of the raw
  // stream. Refs keep the imperative handle referentially stable while still
  // reaching live config/accessors.
  const windowMode = windowModeProp ?? capacityMode ?? "sliding"
  const windowSize = resolveRealtimeWindowSize(windowSizeProp, data, capacity)
  const { aggEnabled, aggRows } = useRealtimeLineIngestion(ref, frameRef, windowSize, {
    aggregate, eventTime, data, timeAccessor, valueAccessor, seriesAccessor, onObservation, chartId
  })

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(
    loading,
    resolvedSize[0],
    resolvedSize[1],
    loadingContent, props)
  // In aggregate mode the chart is push-driven (data arrives via ref), so
  // skip the static empty state just as a plain streaming chart does.
  const emptyEl = !loadingEl
    ? renderEmptyState(
        aggEnabled ? undefined : data,
        resolvedSize[0],
        resolvedSize[1],
        emptyContent, props)
    : null

  const baseLineStyle = useMemo(
    () => () => ({ stroke: "#007bff", strokeWidth: 2 }) as LineStyle,
    []
  )
  const lineRuleContext = useMemo(
    () =>
      makeXYRuleContext(
        aggEnabled
          ? AGG_TIME
          : ((timeAccessor ?? "time") as string | ((d: Datum) => unknown)),
        aggEnabled
          ? AGG_VALUE
          : ((valueAccessor ?? "value") as string | ((d: Datum) => unknown))
      ),
    [aggEnabled, timeAccessor, valueAccessor]
  )
  const ruledLineStyle = useMemo(
    () => composeStyleRules(baseLineStyle, styleRules, lineRuleContext),
    [baseLineStyle, styleRules, lineRuleContext]
  )
  const lineStyleWithPrimitives = useMemo(() => {
    const primitiveStyle = mergeShapeStyle(ruledLineStyle, {
      stroke: strokeProp,
      strokeWidth: strokeWidthProp,
      opacity
    })
    return (datum: Datum) => ({
      ...primitiveStyle(datum),
      ...(strokeDasharray != null && { strokeDasharray }),
      ...(cursor != null && { cursor })
    })
  }, [
    ruledLineStyle,
    strokeProp,
    strokeWidthProp,
    opacity,
    strokeDasharray,
    cursor
  ])
  const interactiveLineStyle = useRealtimeSelectionStyle(
    lineStyleWithPrimitives,
    [activeSelectionHook],
    selection
  )

  const resolvedClassName = emphasis
    ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
    : className

  // ── Resolve frame inputs: aggregated rows replace the raw stream ────────
  const frameData = aggEnabled ? aggRows : data
  const frameTimeAccessor = aggEnabled ? AGG_TIME : timeAccessor
  const frameValueAccessor = aggEnabled ? AGG_VALUE : valueAccessor
  // Controlled aggregated data is re-passed whole each render — no eviction.
  const frameWindowMode = aggEnabled ? "growing" : windowMode
  // Display capacity for the controlled aggregated rows — large enough to
  // hold every retained window (or the current row count when unbounded).
  const aggCapacity = Math.max(aggRows.length, windowSize)
  const frameWindowSize = aggEnabled ? Math.max(1, aggCapacity) : windowSize
  const frameBand =
    aggEnabled && aggregate && hasBand(aggregate)
      ? {
          y0Accessor: AGG_LOWER,
          y1Accessor: AGG_UPPER,
          perSeries: seriesAccessor != null
        }
      : undefined

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <StreamXYFrame
      ref={frameRef}
      {...getCrosshairProps(linkedHover, crosshairSourceId)}
      chartType="line"
      runtimeMode="streaming"
      size={resolvedSize}
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={margin}
      className={resolvedClassName}
      {...buildRealtimeFrameChromeProps(
        resolved,
        legendState,
        props.legendInteraction
      )}
      arrowOfTime={arrowOfTime}
      windowMode={frameWindowMode}
      windowSize={frameWindowSize}
      maxCapacity={maxCapacity}
      data={frameData}
      timeAccessor={frameTimeAccessor}
      valueAccessor={frameValueAccessor}
      groupAccessor={
        aggEnabled && seriesAccessor != null ? AGG_SERIES : seriesAccessor
      }
      xExtent={timeExtent}
      yExtent={valueExtent}
      axisExtent={props.axisExtent}
      extentPadding={extentPadding}
      band={frameBand}
      lineStyle={interactiveLineStyle ?? lineStyleWithPrimitives}
      showAxes={showAxes}
      background={background}
      hoverAnnotation={enableHover}
      tooltipContent={resolvedTooltip}
      tooltipMode={tooltipProps.tooltipMode}
      {...buildCustomBehaviorProps({
        linkedHover,
        selection,
        onObservation,
        forceHoverBehavior: true,
        mobileInteraction: resolved.mobileInteraction,
        customHoverBehavior: combinedHoverBehavior as (d: Datum | null) => void,
        customClickBehavior
      })}
      annotations={annotations}
      legend={legend}
      legendPosition={legendPosition}
      autoPlaceAnnotations={autoPlaceAnnotations}
      svgAnnotationRules={svgAnnotationRules}
      tickFormatTime={tickFormatTime}
      tickFormatValue={tickFormatValue}
      decay={decay}
      pulse={pulse}
      staleness={staleness}
      transition={transition}
      pointIdAccessor={props.pointIdAccessor}
    />
  )
}), "RealtimeLineChart") as unknown as {
  /** Compatibility overload for refs authored against the shared 3.x handle. */
  <TDatum extends Datum = Datum>(
    props: RealtimeLineChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  /** Aggregate mode accepts authored rows but materializes window summaries. */
  <TDatum extends Datum = Datum>(
    props: Omit<RealtimeLineChartProps<TDatum>, "aggregate"> & {
      aggregate: AggregateConfig
    } & React.RefAttributes<
        RealtimeLineChartHandle<TDatum, AggregatedRealtimeDatum>
      >
  ): React.ReactElement | null
  /** Typed non-aggregate refs retain the authored row and expose flush(). */
  <TDatum extends Datum = Datum>(
    props: Omit<RealtimeLineChartProps<TDatum>, "aggregate"> & {
      aggregate?: undefined
    } & React.RefAttributes<RealtimeLineChartHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}
