"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { useChartMode, useThemeCategorical } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useOrdinalPieceStyle } from "../shared/useOrdinalPieceStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface SwimlaneChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /** Data array. Omit for push API mode. */
  data?: TDatum[]
  /** Accessor for lane categories (swim lanes). Default "category". */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /** Accessor for item subcategory (color grouping within lanes). Required. */
  subcategoryAccessor: ChartAccessor<TDatum, string>
  /** Accessor for item size/duration. Default "value". */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Orientation: "horizontal" renders lanes as rows (default), "vertical" as columns. */
  orientation?: "vertical" | "horizontal"
  /** Label for the category axis */
  categoryLabel?: string
  /** Label for the value axis */
  valueLabel?: string
  /** Format function for value axis ticks */
  valueFormat?: (d: number | string) => string
  /** Color accessor — defaults to subcategoryAccessor */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme for subcategories */
  colorScheme?: string | string[] | Record<string, string>
  /** Padding between lanes in pixels */
  barPadding?: number
  /** Enable hover annotations */
  enableHover?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Show category axis tick labels */
  showCategoryTicks?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: "right" | "left" | "top" | "bottom"
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Annotation objects */
  annotations?: Datum[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Custom tick values for the value axis. Forces specific values instead of d3 auto-ticks. */
  rTickValues?: number[]
  /** Align first value tick label to start, last to end. Prevents clipping at chart edges. */
  tickLabelEdgeAlign?: boolean
  /** Gradient fill for swimlane segments. `true` uses tip→base opacity ramp;
   *  pass `{ topOpacity, bottomOpacity }` for a uniform alpha gradient or
   *  `{ colorStops }` for a multi-stop color ramp. Same shape as
   *  BarChart.gradientFill / AreaChart.gradientFill. The gradient runs along
   *  the lane's growth direction (left→right horizontal, bottom→top vertical). */
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** Lane "track" fill — a rect drawn behind each lane spanning the full
   *  value-axis range, sized to the lane's bandwidth. Lets budget/progress
   *  lanes read as filled vs. empty. Pass a color string (CSS vars
   *  supported, e.g. `"var(--semiotic-grid)"`) or `{ color, opacity }`. */
  trackFill?: string | { color: string; opacity?: number }
  /** Rounded corner radius (in pixels) for the outermost ends of each
   *  lane. Both ends round: left+right in horizontal orientation, top+bottom
   *  in vertical. Middle segments of multi-segment lanes stay square so
   *  pieces visually butt against each other. */
  roundedTop?: number
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  /** Pass-through props to StreamOrdinalFrame */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * SwimlaneChart - Range bars per category (swim lane), one segment per row.
 *
 * Each row becomes a horizontal segment in the lane named by
 * `categoryAccessor`; `subcategoryAccessor` chooses the segment label
 * within the lane. Useful for project timelines, status histories,
 * Gantt-like views, and per-resource workloads.
 *
 * @example
 * ```tsx
 * // Project task ranges per assignee
 * <SwimlaneChart
 *   data={[
 *     { team: "Design", task: "Spec",   value: 8 },
 *     { team: "Design", task: "Mocks",  value: 12 },
 *     { team: "Eng",    task: "API",    value: 16 },
 *     { team: "Eng",    task: "Client", value: 10 },
 *     { team: "QA",     task: "Plan",   value: 4 },
 *   ]}
 *   categoryAccessor="team"
 *   subcategoryAccessor="task"
 *   valueAccessor="value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by subcategory + custom label rotation
 * <SwimlaneChart
 *   data={data}
 *   categoryAccessor="team"
 *   subcategoryAccessor="task"
 *   valueAccessor="hours"
 *   colorBy="task"
 *   showLegend
 * />
 * ```
 */
export const SwimlaneChart = forwardRef(function SwimlaneChart<TDatum extends Datum = Datum>(props: SwimlaneChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    categoryLabel: props.categoryLabel,
    valueLabel: props.valueLabel,
    showCategoryTicks: props.showCategoryTicks,
    orientation: props.orientation,
      mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
})

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category",
    subcategoryAccessor,
    valueAccessor = "value",
    orientation = "horizontal",
    valueFormat,
    colorBy,
    colorScheme,
    barPadding: userBarPadding,
    tooltip, annotations,
    brush: brushProp,
    onBrush: onBrushProp,
    linkedBrush,
    frameProps = {},
    selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
    categoryFormat,
    rTickValues,
    tickLabelEdgeAlign,
    showCategoryTicks,
    gradientFill,
    trackFill,
    roundedTop,
    valueExtent,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, categoryLabel, valueLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])
  const effectiveColorBy = colorBy || subcategoryAccessor

  // Mode-aware `barPadding`: sparkline uses 1px by default (or less when so
  // many categories are present that 1px would shrink each lane below 2px).
  // Primary/context keep the generous 40px default. User-supplied values
  // always win regardless of mode.
  const barPadding = useMemo(() => {
    if (userBarPadding != null) return userBarPadding
    if (props.mode !== "sparkline") return 40
    const uniqueCategories = new Set(
      safeData.map((d) => typeof categoryAccessor === "function" ? categoryAccessor(d) : d[categoryAccessor as string])
    )
    const laneCount = Math.max(1, uniqueCategories.size)
    if (laneCount <= 1) return 1
    // The available length is the dimension perpendicular to the lane axis.
    // Horizontal (default): lanes stack vertically → available = height.
    const availableLength = orientation === "horizontal" ? height : width
    // Each lane must be >= 2px after subtracting cumulative padding.
    // Lane width = (avail - (n-1)*pad) / n; solve for pad when laneWidth=2:
    // pad = (avail - 2n) / (n - 1), capped at 1 (the target default).
    const maxPadForMinLane = (availableLength - 2 * laneCount) / (laneCount - 1)
    return Math.max(0, Math.min(1, maxPadForMinLane))
  }, [userBarPadding, props.mode, safeData, categoryAccessor, orientation, width, height])

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: effectiveColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: effectiveColorBy ? [typeof effectiveColorBy === "string" ? effectiveColorBy : ""] : [],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "SwimlaneChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
  })

  const ordinalBrush = useOrdinalBrush({ brushProp, onBrushProp, linkedBrush, valueAccessor })

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [])

  // Consolidated piece-style. SwimlaneChart uses per-category color
  // cycling so each lane gets its own scheme color when colorBy
  // (= subcategoryAccessor by default) isn't explicitly set.
  const pieceStyle = useOrdinalPieceStyle({
    colorBy: effectiveColorBy,
    colorScale: setup.colorScale,
    color, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: frameProps?.pieceStyle,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    cycleByCategory: true,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: subcategoryAccessor,
      valueAccessor,
      groupAccessor: categoryAccessor,
      valueFormat,
    }),
    [subcategoryAccessor, categoryAccessor, valueAccessor, valueFormat]
  )

  const validationError = validateArrayData({
    componentName: "SwimlaneChart", data: data,
    accessors: { categoryAccessor, valueAccessor, subcategoryAccessor },
    requiredProps: { subcategoryAccessor },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef,
    setup,
  })

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 bars) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "swimlane",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    stackBy: subcategoryAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: resolved.showAxes,
    oLabel: showCategoryTicks === false ? undefined : categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(rTickValues && { rTickValues }),
    ...(tickLabelEdgeAlign != null && { tickLabelEdgeAlign }),
    ...(categoryFormat && { oFormat: categoryFormat }),
    ...(showCategoryTicks !== undefined && { showCategoryTicks }),
    showGrid,
    ...effectiveLegendProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(gradientFill && {
      gradientFill: gradientFill === true
        ? { topOpacity: 0.8, bottomOpacity: 0.05 }
        : gradientFill
    }),
    ...(trackFill != null && { trackFill }),
    ...(roundedTop != null && { roundedTop }),
    ...(valueExtent && { rExtent: valueExtent }),
    ...ordinalBrush.brushStreamProps,
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  if (validationError) return <ChartError componentName="SwimlaneChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="SwimlaneChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: SwimlaneChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
SwimlaneChart.displayName = "SwimlaneChart"
