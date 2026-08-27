import * as React from "react"
import { useRef, forwardRef, useCallback, useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { barXYPlugin } from "../../stream/xyPlugins/barPlugin"
import type {
  ArrowOfTime,
  WindowMode,
  BarStyle,
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
import { buildHistogramTooltip } from "./defaultRealtimeTooltip"
import {
  renderLoadingState,
  renderEmptyState
} from "../shared/withChartWrapper"
import { normalizeLinkedBrush } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { resolveRealtimeWindowSize } from "./resolveWindowSize"
import type { Datum } from "../shared/datumTypes"
import type { AutoPlaceAnnotations } from "../../recipes/annotationLayout"
import type { MobileVisualizationContract } from "../shared/auditMobileVisualization"
import type { ResponsiveRule } from "../shared/responsiveRules"
import { buildCustomBehaviorProps } from "../shared/streamPropsHelpers"
import type { LegendValue } from "../../types/legendTypes"
import type { PartialMargin } from "../../types/marginType"
import { resolveDownwardHistogramExtent } from "./temporalHistogramConfig"
import { resolveTooltipContent } from "../../Tooltip/Tooltip"
import type {
  RealtimeAccessibilityProps,
  RealtimeData,
  RealtimePointIdAccessor,
  RealtimeTooltipProp
} from "./realtimeChartTypes"
import { useStreamingLegend } from "../shared/useStreamingLegend"
import {
  buildRealtimeFrameChromeProps,
  useRealtimeChartMode,
  useRealtimeFrameHandle,
  useRealtimeSelectionStyle
} from "./realtimeChartRuntime"
import { useRealtimeCategoryColors } from "./useRealtimeCategoryColors"
import { composeStyleRules, type StyleRule } from "../shared/styleRules"
import { makeHistogramRuleContext } from "./realtimeStyleRules"

registerXYPlugin(barXYPlugin)

export type RealtimeHistogramDirection = "up" | "down"

const EMPTY_LEGEND_DATA: Datum[] = []

export interface RealtimeHistogramProps<
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
  /** Time interval for binning */
  binSize: number
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
  /**
   * Direction bars grow from the baseline.
   * "up" uses the normal y-domain. "down" flips the resolved value
   * domain so bars grow downward from the top, useful for mirrored
   * histogram layouts. Explicit valueExtent is reversed.
   * @default "up"
   */
  direction?: RealtimeHistogramDirection
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
  /** Bar fill color, or fallback for categories missing from `colors`. */
  fill?: string
  /** Bar stroke color */
  stroke?: string
  /** Bar stroke width */
  strokeWidth?: number
  /** Uniform bar opacity (0–1). Pairs with `color` / `stroke` / `strokeWidth` for the designer-facing primitive vocabulary. */
  opacity?: number
  /** Presentation-only CSS cursor for retained marks; does not add click, keyboard, or observation behavior. */
  cursor?: CSSProperties["cursor"]
  /**
   * Ordered styling for displayed bins. Rule `value` is `categoryValue` for a
   * stacked segment or `total` for an unstacked bin; `x` is the bin center.
   */
  styleRules?: StyleRule[]
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
  /** Configurable opacity decay for older data */
  decay?: DecayConfig
  /** Flash effect on newly inserted data */
  pulse?: PulseConfig
  /** Frame-level data liveness indicator */
  staleness?: StalenessConfig
  /** Smooth position interpolation on data change */
  transition?: TransitionConfig
  /** Show a loading skeleton placeholder */
  loading?: boolean
  /** Custom content rendered in place of the default skeleton while `loading` is true. */
  loadingContent?: React.ReactNode | false
  /** Custom content to render when data is empty. Set to `false` to disable empty state. */
  emptyContent?: ReactNode | false
  /** Brush configuration. `true` defaults to `{ dimension: "x", snap: "bin" }`. */
  brush?:
    | boolean
    | "x"
    | {
        dimension?: "x" | "y" | "xy"
        snap?: "continuous" | "bin"
        /** Actual bin boundary values for data-driven snapping (auto-populated from histogram bins when omitted) */
        binBoundaries?: number[]
        /** When true, snap during drag (not just on release). Default false. */
        snapDuring?: boolean
      }
  /** Callback when brush selection changes. Called with data-space extent, or null when cleared. */
  onBrush?: (
    extent: { x: [number, number]; y: [number, number] } | null
  ) => void
  /** Linked brush for cross-chart coordination via LinkedCharts */
  linkedBrush?: string | { name: string; xField?: string; yField?: string }
  /** Visual emphasis level for dashboard hierarchy. "primary" spans two columns in ChartGrid. */
  emphasis?: "primary" | "secondary"
  /** Show a legend */
  showLegend?: boolean
  /** Additional legend content. Categorical groups follow the inferred category legend. */
  legend?: LegendValue
  /** Legend position */
  legendPosition?: LegendPosition
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** ID accessor for remove()/update() on the push API */
  pointIdAccessor?: RealtimePointIdAccessor<TDatum>
}

/**
 * RealtimeHistogram - Streaming temporal histogram.
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
 * // Simple temporal histogram — push each event, the chart bins by time
 * <RealtimeHistogram
 *   ref={ref}
 *   binSize={20}
 *   fill="#007bff"
 *   enableHover
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Stacked by category — same push API, color by status field
 * <RealtimeHistogram
 *   ref={ref}
 *   binSize={25}
 *   categoryAccessor="category"
 *   colors={{ errors: "#dc3545", warnings: "#fd7e14", info: "#007bff" }}
 *   enableHover
 * />
 * ```
 */
export const RealtimeHistogram = forwardRef(function RealtimeHistogram<
  TDatum extends Datum = Datum
>(props: RealtimeHistogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle<TDatum>>) {
  // Thread mode-aware dimensions and axes through so `sparkline` and
  // `context` strip the appropriate chrome.
  const resolved = useRealtimeChartMode(props)

  const {
    binSize,
    size,
    margin: userMargin,
    className,
    arrowOfTime = "right",
    windowMode = "sliding",
    windowSize: windowSizeProp,
    data,
    timeAccessor,
    valueAccessor,
    direction = "up",
    timeExtent,
    valueExtent,
    extentPadding,
    categoryAccessor,
    colors,
    fill,
    stroke,
    strokeWidth,
    opacity,
    cursor,
    styleRules,
    gap,
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
    decay,
    pulse,
    staleness,
    transition,
    onObservation,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    emphasis,
    legendPosition: legendPositionProp,
    legend: additionalLegend,
    brush: brushProp,
    onBrush: userOnBrush,
    linkedBrush
  } = props

  const showAxes = resolved.showAxes
  const enableHover = resolved.enableHover
  const showHistogramLegend = resolved.showLegend !== false
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
    trackCategoryDomain: showHistogramLegend,
    registerLinkedCategories: false
  })
  const controlledCategories = useMemo(
    // Use the same coercion as push-mode frame emission. Realtime stack keys
    // deliberately preserve nullish values as "null" and "undefined".
    () => extractCategoryDomain(data ?? [], categoryAccessor),
    [data, categoryAccessor]
  )
  const activeCategories =
    data === undefined ? streamingCategories.categories : controlledCategories
  const { colorScale: categoryColorScale, colorMap: resolvedCategoryColors } =
    useRealtimeCategoryColors({
      enabled: !!categoryAccessor,
      categories: activeCategories,
      colors,
      fallbackColor: fill,
      order: "explicit-then-alpha",
      domainKey: categoryAccessor
    })
  const histogramLegendCategories = useMemo(() => {
    if (!resolvedCategoryColors) return activeCategories
    const active = new Set(activeCategories)
    return Object.keys(resolvedCategoryColors).filter((category) =>
      active.has(category)
    )
  }, [activeCategories, resolvedCategoryColors])
  const legendColorAccessor = useCallback(
    (datum: Datum) => {
      if (datum.category != null) return String(datum.category)
      const value =
        typeof categoryAccessor === "function"
          ? categoryAccessor(datum as TDatum)
          : categoryAccessor
            ? datum[categoryAccessor]
            : ""
      return String(value)
    },
    [categoryAccessor]
  )
  const { legend, margin, legendPosition, hasAutomaticLegend } =
    useChartLegendAndMargin({
      // `activeCategories` is authoritative here. Keeping sample rows out of
      // legend construction ensures function category accessors that happen to
      // return CSS color names still map through the categorical scale, exactly
      // like the retained marks do.
      data: EMPTY_LEGEND_DATA,
      colorBy: categoryAccessor,
      colorScale: categoryColorScale,
      showLegend: resolved.showLegend,
      legendPosition: legendPositionProp,
      userMargin,
      defaults: resolved.marginDefaults,
      categories: histogramLegendCategories,
      additionalLegend,
      chartWidth: resolvedSize[0],
      chartHeight: resolvedSize[1],
      // Reserve the bottom-axis band a bottom legend is placed beyond.
      axisChrome: { hasAxis: resolved.showAxes !== false }
    })
  const legendState = useLegendInteraction(
    props.legendInteraction,
    categoryAccessor ? legendColorAccessor : undefined,
    histogramLegendCategories,
    hasAutomaticLegend,
    true
  )
  // See RealtimeLineChart for the data-space-vs-pixel-space tooltip rationale.
  const resolvedTooltip =
    tooltipContent ??
    resolveTooltipContent({
      tooltip,
      defaultTooltipContent: buildHistogramTooltip({
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
    chartType: "RealtimeHistogram",
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

  // ── Brush wiring ──
  // Normalize brush prop: true defaults to x-dimension with bin snapping
  const normalizedBrush =
    brushProp === true
      ? { dimension: "x" as const, snap: "bin" as const }
      : brushProp === "x"
        ? { dimension: "x" as const }
        : typeof brushProp === "object"
          ? brushProp
          : undefined

  // LinkedBrush integration via selection store
  const brushConfig = normalizeLinkedBrush(linkedBrush)
  const timeField = typeof timeAccessor === "string" ? timeAccessor : "time"

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_hist_brush__",
    xField: brushConfig?.xField || timeField,
    ...(brushConfig?.yField ? { yField: brushConfig.yField } : {})
  })

  // Stabilize with ref to avoid BrushOverlay re-creation
  const brushInteractionRef = useRef(brushHook.brushInteraction)
  brushInteractionRef.current = brushHook.brushInteraction

  const combinedOnBrush = useCallback(
    (extent: { x: [number, number]; y: [number, number] } | null) => {
      // Fire user callback
      if (userOnBrush) userOnBrush(extent)

      // Fire observation event
      if (onObservation) {
        if (extent) {
          onObservation({
            type: "brush",
            extent,
            timestamp: Date.now(),
            chartType: "RealtimeHistogram",
            chartId
          })
        } else {
          onObservation({
            type: "brush-end",
            timestamp: Date.now(),
            chartType: "RealtimeHistogram",
            chartId
          })
        }
      }

      // Update selection store for linkedBrush
      if (brushConfig) {
        const bi = brushInteractionRef.current
        if (!extent) {
          bi.end(null)
        } else if (bi.brush === "xBrush") {
          bi.end(extent.x)
        } else if (bi.brush === "yBrush") {
          bi.end(extent.y)
        } else {
          bi.end([
            [extent.x[0], extent.y[0]],
            [extent.x[1], extent.y[1]]
          ])
        }
      }
    },
    [userOnBrush, onObservation, chartId, brushConfig]
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

  const barStyle: BarStyle = {}
  if (fill != null) barStyle.fill = fill
  if (stroke != null) barStyle.stroke = stroke
  if (strokeWidth != null) barStyle.strokeWidth = strokeWidth
  if (opacity != null) barStyle.opacity = opacity
  if (cursor != null) barStyle.cursor = cursor
  if (gap != null) barStyle.gap = gap
  const categoricalBarStyle = useMemo<
    ((datum: Datum) => Style) | undefined
  >(() => {
    if (!categoryAccessor || !categoryColorScale) return undefined
    return (datum: Datum) =>
      datum.category == null
        ? {}
        : { fill: categoryColorScale(String(datum.category)) }
  }, [categoryAccessor, categoryColorScale])
  const histogramRuleContext = useMemo(
    () => makeHistogramRuleContext(),
    [],
  )
  const ruledBarStyle = useMemo(
    () => composeStyleRules(categoricalBarStyle, styleRules, histogramRuleContext),
    [categoricalBarStyle, styleRules, histogramRuleContext],
  )
  const resolvedBarStyle = useMemo(
    () => (datum: Datum) => ({
      ...ruledBarStyle(datum),
      ...(!categoryAccessor && fill != null && { fill }),
      ...(stroke != null && { stroke }),
      ...(strokeWidth != null && { strokeWidth }),
      ...(opacity != null && { opacity }),
      ...(cursor != null && { cursor }),
    }),
    [ruledBarStyle, categoryAccessor, fill, stroke, strokeWidth, opacity, cursor],
  )
  const effectiveSelectionHook =
    hoverSelectionHook || legendState.legendSelectionHook || activeSelectionHook
  const interactiveBarStyle = useRealtimeSelectionStyle(
    resolvedBarStyle,
    [effectiveSelectionHook],
    selection
  )

  const resolvedClassName = emphasis
    ? `${className || ""} semiotic-emphasis-${emphasis}`.trim()
    : className

  const windowSize = resolveRealtimeWindowSize(windowSizeProp, data)
  const resolvedValueExtent = useMemo(() => {
    if (direction !== "down") return valueExtent
    return resolveDownwardHistogramExtent({
      data: data as TDatum[] | undefined,
      valueAccessor,
      timeAccessor,
      binSize,
      valueExtent,
      extentPadding
    })
  }, [
    direction,
    data,
    valueAccessor,
    timeAccessor,
    binSize,
    valueExtent,
    extentPadding
  ])

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl

  return (
    <StreamXYFrame
      ref={frameRef}
      chartType="bar"
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
      yExtent={resolvedValueExtent}
      extentPadding={extentPadding}
      binSize={binSize}
      categoryAccessor={categoryAccessor}
      barColors={resolvedCategoryColors}
      barStyle={barStyle}
      areaStyle={interactiveBarStyle}
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
      transition={transition}
      pointIdAccessor={props.pointIdAccessor}
      legend={legend}
      legendPosition={legendPosition}
      {...streamingCategories.categoryDomainProps}
      brush={
        normalizedBrush ||
        (linkedBrush ? { dimension: "x" as const } : undefined)
      }
      onBrush={normalizedBrush || linkedBrush ? combinedOnBrush : undefined}
    />
  )
}) as unknown as {
  /** Compatibility overload for refs authored against the loose 3.x handle. */
  <TDatum extends Datum = Datum>(
    props: RealtimeHistogramProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle>
  ): React.ReactElement | null
  /** Typed refs retain the authored row through mutation and readback. */
  <TDatum extends Datum = Datum>(
    props: RealtimeHistogramProps<TDatum> &
      React.RefAttributes<RealtimeFrameHandle<TDatum>>
  ): React.ReactElement | null
  displayName?: string
}
RealtimeHistogram.displayName = "RealtimeHistogram"

export interface TemporalHistogramProps<
  TDatum extends Datum = Datum
> extends Omit<
  RealtimeHistogramProps<TDatum>,
  "data" | "windowSize" | "windowMode"
> {
  /** Static data array for a bounded temporal histogram. */
  data: TDatum[]
}

/**
 * Static-data sibling for temporal histograms. Use this when the data is a
 * bounded array rather than a ref-driven stream; the realtime push API is not
 * part of this public surface.
 */
export function TemporalHistogram<TDatum extends Datum = Datum>(
  props: TemporalHistogramProps<TDatum>
) {
  return (
    <RealtimeHistogram
      {...(props as RealtimeHistogramProps<TDatum>)}
      windowMode="growing"
    />
  )
}
TemporalHistogram.displayName = "TemporalHistogram"

/** @deprecated Use `RealtimeHistogram` (the canonical public name) instead. The
 *  `RealtimeTemporalHistogram` alias is preserved for back-compat with code
 *  written before the rename and will be removed in a future major version. */
export const RealtimeTemporalHistogram = RealtimeHistogram
/** @deprecated Use `RealtimeHistogramProps` instead. Same component, just the
 *  pre-rename type alias. */
export type RealtimeTemporalHistogramProps<TDatum extends Datum = Datum> =
  RealtimeHistogramProps<TDatum>
