import * as React from "react"
import { useRef, forwardRef, useCallback, useMemo, useState } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { heatmapXYPlugin } from "../../stream/xyPlugins/heatmapPlugin"
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
import type { CSSProperties, ReactNode } from "react"
import {
  useChartLegendAndMargin,
  useChartSelection,
  useGradientLegendInteraction
} from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type {
  ChartMode,
  ChartAccessor,
  SelectionConfig,
  MobileInteractionProp
} from "../shared/types"
import type { OnObservationCallback } from "../../store/ObservationStore"
import { buildHeatmapTooltip } from "./defaultRealtimeTooltip"
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
import type { GradientLegendConfig } from "../../types/legendTypes"
import { getSequentialInterpolator } from "../shared/colorPalettes"
import type { PartialMargin } from "../../types/marginType"
import {
  buildRealtimeFrameChromeProps,
  useRealtimeChartMode,
  useRealtimeFrameHandle,
  useRealtimeSelectionStyle
} from "./realtimeChartRuntime"
import { composeStyleRules, type StyleRule } from "../shared/styleRules"
import { makeHeatmapRuleContext } from "../shared/heatmapStyleRules"

registerXYPlugin(heatmapXYPlugin)

export interface RealtimeHeatmapProps<
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
  /** Maximum canvas backing-store DPR; large canvases also use the shared backing-store budget. */
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
  /** Sequential color scheme for aggregated cell values. */
  colorScheme?:
    | "blues"
    | "reds"
    | "greens"
    | "viridis"
    | "oranges"
    | "purples"
    | "greys"
    | "plasma"
    | "inferno"
    | "magma"
    | "cividis"
    | "turbo"
    | "custom"
    | (string & {})
  /** Custom value-to-color function used when colorScheme is "custom". */
  customColorScale?: (value: number) => string
  /** Presentation-only CSS cursor for retained marks; does not add click, keyboard, or observation behavior. */
  cursor?: CSSProperties["cursor"]
  /**
   * Ordered styling for displayed aggregate cells. Rule `value` is the chosen
   * aggregate; `count`, `sum`, `xCenter`, `yCenter`, and `agg` are fields.
   */
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
  /** Annotation objects */
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
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
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
export const RealtimeHeatmap = forwardRef(function RealtimeHeatmap<
  TDatum extends Datum = Datum
>(props: RealtimeHeatmapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle<TDatum>>) {
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
    categoryAccessor,
    timeExtent,
    valueExtent,
    extentPadding,
    heatmapXBins = 20,
    heatmapYBins = 20,
    aggregation = "count",
    colorScheme,
    customColorScale,
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
  const resolvedSize: [number, number] = size ?? [
    resolved.width,
    resolved.height
  ]
  const [colorDomain, setColorDomain] = useState<[number, number] | null>(null)
  const valueDomain = useMemo<[number, number]>(
    () => colorDomain ?? [0, 1],
    [colorDomain]
  )
  const legendColorFn = useMemo(() => {
    if (colorScheme === "custom" && customColorScale) return customColorScale
    const interpolator = getSequentialInterpolator(colorScheme || "blues")
    return (value: number) => {
      const range = valueDomain[1] - valueDomain[0] || 1
      return interpolator(
        Math.max(0, Math.min(1, (value - valueDomain[0]) / range))
      )
    }
  }, [colorScheme, customColorScale, valueDomain])
  const gradientLegendState = useGradientLegendInteraction(
    props.legendInteraction,
    (datum) => Number(datum.value),
    valueDomain
  )
  const gradientLegend = useMemo(() => {
    if (!resolved.showLegend) return undefined
    const config: GradientLegendConfig = {
      colorFn: legendColorFn,
      domain: valueDomain,
      label: aggregation
    }
    return { gradient: config }
  }, [aggregation, legendColorFn, resolved.showLegend, valueDomain])
  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: [],
    colorBy: undefined,
    colorScale: undefined,
    showLegend: false,
    legendPosition: legendPositionProp,
    userMargin,
    defaults: resolved.marginDefaults,
    additionalLegend: gradientLegend,
    chartWidth: resolvedSize[0],
    chartHeight: resolvedSize[1],
    axisChrome: { hasAxis: resolved.showAxes !== false }
  })
  // Heatcell datums are aggregated bins, not the user's raw rows — the
  // generic `x:/y:` tooltip would read undefined off `timeAccessor`/
  // `valueAccessor` since the cell datum is `{xi, yi, value, count, sum,
  // xCenter, yCenter, agg}`. The heatmap-specific helper reads the
  // enriched bin-center coords + aggregation type so users see real
  // data-space values and the cell's count/sum/mean.
  const resolvedTooltip =
    tooltipContent ??
    resolveTooltipContent({
      tooltip,
      defaultTooltipContent: buildHeatmapTooltip({
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
    chartType: "RealtimeHeatmap",
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

  const resolvedClassName = emphasis
    ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
    : className

  const windowSize = resolveRealtimeWindowSize(windowSizeProp, data)
  const cursorCellStyle = useMemo(() => {
    if (cursor == null) return undefined
    const style = { cursor }
    return () => style
  }, [cursor])
  const cellRuleContext = useMemo(
    () => makeHeatmapRuleContext(
      (timeAccessor ?? "time") as string | ((d: Datum) => unknown),
      (valueAccessor ?? "value") as string | ((d: Datum) => unknown),
      (valueAccessor ?? "value") as string | ((d: Datum) => unknown),
    ),
    [timeAccessor, valueAccessor],
  )
  const ruledCellStyle = useMemo(
    () => composeStyleRules(cursorCellStyle, styleRules, cellRuleContext),
    [cursorCellStyle, styleRules, cellRuleContext],
  )
  const interactiveCellStyle = useRealtimeSelectionStyle(
    ruledCellStyle,
    [
      hoverSelectionHook,
      gradientLegendState.legendSelectionHook,
      activeSelectionHook
    ],
    selection
  )

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <StreamXYFrame
      ref={frameRef}
      chartType="heatmap"
      runtimeMode="streaming"
      size={resolvedSize}
      maxDevicePixelRatio={props.maxDevicePixelRatio}
      margin={margin}
      className={resolvedClassName}
      {...buildRealtimeFrameChromeProps(
        resolved,
        gradientLegendState,
        props.legendInteraction
      )}
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
      colorScheme={colorScheme !== "custom" ? colorScheme : undefined}
      heatmapColorScale={
        colorScheme === "custom" && typeof customColorScale === "function"
          ? customColorScale
          : undefined
      }
      onColorDomainChange={setColorDomain}
      areaStyle={interactiveCellStyle}
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
      decay={decay}
      pulse={pulse}
      staleness={staleness}
      legend={legend}
      legendPosition={legendPosition}
      pointIdAccessor={props.pointIdAccessor}
    />
  )
}) as unknown as {
  /** Compatibility overload for refs authored against the loose 3.x handle. */
  <TDatum extends Datum = Datum>(
    props: RealtimeHeatmapProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  /** Typed refs retain the authored row through mutation and readback. */
  <TDatum extends Datum = Datum>(
    props: RealtimeHeatmapProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}
RealtimeHeatmap.displayName = "RealtimeHeatmap"
