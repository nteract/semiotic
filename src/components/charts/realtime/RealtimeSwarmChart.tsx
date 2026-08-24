import * as React from "react"
import { useRef, forwardRef, useCallback, useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { swarmXYPlugin } from "../../stream/xyPlugins/swarmPlugin"
import type {
  ArrowOfTime,
  WindowMode,
  SwarmStyle,
  Style,
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
import type { CSSProperties, ReactNode } from "react"
import {
  useChartLegendAndMargin,
  useChartSelection,
  useLegendInteraction
} from "../shared/hooks"
import { extractCategoryDomain } from "../../stream/categoryDomain"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type {
  ChartMode,
  ChartAccessor,
  SelectionConfig,
  MobileInteractionProp
} from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildDefaultRealtimeTooltip } from "./defaultRealtimeTooltip"
import {
  renderLoadingState,
  renderEmptyState
} from "../shared/withChartWrapper"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { MobileVisualizationContract } from "../shared/auditMobileVisualization"
import type { ResponsiveRule } from "../shared/responsiveRules"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import { resolveTooltipContent } from "../../Tooltip/Tooltip"
import type {
  RealtimeAccessibilityProps,
  RealtimeData,
  RealtimePointIdAccessor,
  RealtimeTooltipProp
} from "./realtimeChartTypes"
import { useStreamingLegend } from "../shared/useStreamingLegend"
import type { PartialMargin } from "../../types/marginType"
import {
  buildRealtimeFrameChromeProps,
  useRealtimeChartMode,
  useRealtimeFrameHandle,
  useRealtimeSelectionStyle
} from "./realtimeChartRuntime"
import { useRealtimeCategoryColors } from "./useRealtimeCategoryColors"
import {
  composeStyleRules,
  makeXYRuleContext,
  type StyleRule,
} from "../shared/styleRules"

registerXYPlugin(swarmXYPlugin)

const EMPTY_LEGEND_DATA: Datum[] = []

export interface RealtimeSwarmChartProps<
  TDatum extends Datum = Datum
> extends RealtimeAccessibilityProps {
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
  /** Maximum canvas backing-store DPR; defaults to the environment cap. */
  maxDevicePixelRatio?: number
  /** Chart margins */
  margin?: PartialMargin
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
  data?: RealtimeData<TDatum>
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
  /** Age-based opacity decay for streaming marks. */
  decay?: DecayConfig
  /** Arrival pulse for newly pushed marks. */
  pulse?: PulseConfig
  /** Dim or badge stale streaming values. */
  staleness?: StalenessConfig
  /** Mark transition configuration. */
  transition?: TransitionConfig
  /** Category accessor for color-coding dots */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /** Category-to-color map */
  colors?: Record<string, string>
  /** Dot radius */
  radius?: number
  /** Dot fill color, or fallback for categories missing from `colors`. */
  fill?: string
  /** Dot opacity */
  opacity?: number
  /** Dot stroke color */
  stroke?: string
  /** Dot stroke width */
  strokeWidth?: number
  /** Presentation-only CSS cursor for retained marks; does not add click, keyboard, or observation behavior. */
  cursor?: CSSProperties["cursor"]
  /** Per-datum dot style. Returned values override the top-level dot primitives and category color. */
  pointStyle?: (datum: TDatum) => Style & { r?: number }
  /** Ordered data-aware dot styling, applied before `pointStyle`. */
  styleRules?: StyleRule[]
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
  svgAnnotationRules?: (
    annotation: Datum,
    index: number,
    context: AnnotationContext
  ) => ReactNode
  /** Custom formatter for time axis ticks */
  tickFormatTime?: (value: number) => string
  /** Custom formatter for value axis ticks */
  tickFormatValue?: (value: number) => string
  /** Declarative tooltip config or the legacy full-HoverData callback. */
  tooltip?: RealtimeTooltipProp
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
  pointIdAccessor?: RealtimePointIdAccessor<TDatum>
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
export const RealtimeSwarmChart = forwardRef(function RealtimeSwarmChart<
  TDatum extends Datum = Datum
>(props: RealtimeSwarmChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle<TDatum>>) {
  const resolved = useRealtimeChartMode(props)

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
    decay,
    pulse,
    staleness,
    transition,
    categoryAccessor,
    colors,
    radius,
    fill,
    opacity,
    stroke,
    strokeWidth,
    cursor,
    pointStyle,
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
    linkedHover,
    selection,
    onObservation,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    emphasis,
    legendPosition: legendPositionProp
  } = props

  const showAxes = resolved.showAxes
  const enableHover = resolved.enableHover
  const showSwarmLegend = resolved.showLegend === true
  const resolvedSize: [number, number] = size ?? [
    resolved.width,
    resolved.height
  ]
  const streamingCategories = useStreamingLegend({
    isPushMode: data === undefined,
    colorBy: categoryAccessor,
    colorScheme: colors,
    // This wrapper builds the visible legend from the shared mark scale below.
    // Keep this hook focused on push-mode category-domain discovery.
    showLegend: false,
    legendPosition: legendPositionProp,
    trackCategoryDomain: showSwarmLegend,
    registerLinkedCategories: false
  })
  const controlledCategories = useMemo(
    // Match the frame's push-mode category coercion, including literal
    // "null" and "undefined" keys for nullish realtime categories.
    () => extractCategoryDomain(data ?? [], categoryAccessor),
    [data, categoryAccessor]
  )
  const activeCategories =
    data === undefined ? streamingCategories.categories : controlledCategories
  const { colorScale: categoryColorScale } = useRealtimeCategoryColors({
    enabled: !!categoryAccessor,
    categories: activeCategories,
    colors,
    fallbackColor: fill,
    domainKey: categoryAccessor
  })
  const { legend, margin, legendPosition, hasAutomaticLegend } =
    useChartLegendAndMargin({
      // `activeCategories` is authoritative here. Keeping sample rows out of
      // legend construction ensures function category accessors that happen to
      // return CSS color names still map through the categorical scale, exactly
      // like the retained marks do.
      data: EMPTY_LEGEND_DATA,
      colorBy: categoryAccessor,
      colorScale: categoryColorScale,
      showLegend: showSwarmLegend,
      legendPosition: legendPositionProp,
      userMargin,
      defaults: resolved.marginDefaults,
      categories: activeCategories,
      chartWidth: resolvedSize[0],
      chartHeight: resolvedSize[1],
      axisChrome: { hasAxis: resolved.showAxes !== false }
    })
  const legendState = useLegendInteraction(
    props.legendInteraction,
    categoryAccessor,
    activeCategories,
    hasAutomaticLegend,
    true
  )
  // See RealtimeLineChart for the data-space-vs-pixel-space tooltip rationale.
  const resolvedTooltip =
    tooltipContent ??
    resolveTooltipContent({
      tooltip,
      defaultTooltipContent: buildDefaultRealtimeTooltip({
        timeAccessor,
        valueAccessor
      }),
      customFunctionContext: "hover"
    }).tooltipContent

  const frameRef = useRef<StreamXYFrameHandle>(null)

  // ── Linked hover via shared hook ──
  const {
    activeSelectionHook,
    hoverSelectionHook,
    customHoverBehavior: linkedHoverBehavior,
    customClickBehavior
  } = useChartSelection({
    selection,
    linkedHover,
    unwrapData: true,
    onObservation,
    chartType: "RealtimeSwarmChart",
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

  useRealtimeFrameHandle(ref, frameRef)

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(
    loading,
    resolvedSize[0],
    resolvedSize[1],
    loadingContent
  )
  const emptyEl = !loadingEl
    ? renderEmptyState(data, resolvedSize[0], resolvedSize[1], emptyContent)
    : null

  const swarmStyle: SwarmStyle = {}
  if (radius != null) swarmStyle.radius = radius
  if (fill != null) swarmStyle.fill = fill
  if (opacity != null) swarmStyle.opacity = opacity
  if (stroke != null) swarmStyle.stroke = stroke
  if (strokeWidth != null) swarmStyle.strokeWidth = strokeWidth
  if (cursor != null) swarmStyle.cursor = cursor
  // StreamXYFrame stores heterogeneous Datum rows internally. The wrapper's
  // generic narrows that same row at its public boundary for caller
  // autocomplete, so this variance bridge is type-only.
  const resolvedPointStyle = pointStyle as
    ((datum: Datum) => Style & { r?: number }) | undefined
  const categoricalPointStyle = useMemo<
    ((datum: Datum) => Style & { r?: number }) | undefined
  >(() => {
    if (!categoryAccessor) return undefined
    return (datum: Datum) => {
      const rawCategory =
        typeof categoryAccessor === "function"
          ? categoryAccessor(datum as TDatum)
          : categoryAccessor
            ? datum[categoryAccessor]
            : undefined
      const categoryStyle =
        categoryAccessor && categoryColorScale
          ? { fill: categoryColorScale(String(rawCategory)) }
          : undefined
      return { ...categoryStyle }
    }
  }, [categoryAccessor, categoryColorScale])
  const swarmRuleContext = useMemo(() => {
    const xyContext = makeXYRuleContext(
      (timeAccessor ?? "time") as string | ((d: Datum) => unknown),
      (valueAccessor ?? "value") as string | ((d: Datum) => unknown),
    )
    return (datum: Datum) => {
      const rawCategory =
        typeof categoryAccessor === "function"
          ? categoryAccessor(datum as TDatum)
          : categoryAccessor
            ? datum[categoryAccessor]
            : undefined
      return xyContext(
        datum,
        rawCategory == null ? undefined : String(rawCategory),
      )
    }
  }, [timeAccessor, valueAccessor, categoryAccessor])
  const ruledPointStyle = useMemo(
    () => composeStyleRules(categoricalPointStyle, styleRules, swarmRuleContext),
    [categoricalPointStyle, styleRules, swarmRuleContext],
  )
  const authoredPointStyle = useMemo(
    () => (datum: Datum) => ({
      ...ruledPointStyle(datum),
      ...resolvedPointStyle?.(datum),
    }),
    [ruledPointStyle, resolvedPointStyle],
  )
  const effectiveSelectionHook =
    hoverSelectionHook || legendState.legendSelectionHook || activeSelectionHook
  const interactivePointStyle = useRealtimeSelectionStyle(
    authoredPointStyle,
    [effectiveSelectionHook],
    selection
  )

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
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={margin}
      className={resolvedClassName}
      {...buildRealtimeFrameChromeProps(
        resolved,
        legendState,
        props.legendInteraction
      )}
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
      decay={decay}
      pulse={pulse}
      staleness={staleness}
      transition={transition}
      categoryAccessor={categoryAccessor}
      swarmStyle={swarmStyle}
      pointStyle={interactivePointStyle}
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
        customClickBehavior
      })}
      annotations={annotations}
      autoPlaceAnnotations={autoPlaceAnnotations}
      svgAnnotationRules={svgAnnotationRules}
      tickFormatTime={tickFormatTime}
      tickFormatValue={tickFormatValue}
      legend={legend}
      legendPosition={legendPosition}
      {...streamingCategories.categoryDomainProps}
      pointIdAccessor={props.pointIdAccessor}
    />
  )
}) as unknown as {
  /** Compatibility overload for refs authored against the loose 3.x handle. */
  <TDatum extends Datum = Datum>(
    props: RealtimeSwarmChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  /** Typed refs retain the authored row through mutation and readback. */
  <TDatum extends Datum = Datum>(
    props: RealtimeSwarmChartProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}
RealtimeSwarmChart.displayName = "RealtimeSwarmChart"
