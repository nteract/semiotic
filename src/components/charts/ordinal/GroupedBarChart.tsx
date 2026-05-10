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
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface GroupedBarChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  groupBy: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  /** Category sort order. Default: `false` (data insertion order). `"asc"`/`"desc"` sorts by total grouped value. `"auto"` preserves insertion order while streaming and falls through to value-desc on static data. Custom comparators receive category keys. */
  sort?: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number)
  barPadding?: number
  /** Rounded corner radius on bar ends (away from baseline). */
  roundedTop?: number
  baselinePadding?: boolean
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: "right" | "left" | "top" | "bottom"
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * GroupedBarChart - Multiple bars per category, side by side.
 *
 * Each row contributes to one bar inside the group named by
 * `categoryAccessor`; `groupBy` splits each category into the
 * side-by-side series. Use {@link StackedBarChart} when group totals
 * matter more than individual values.
 *
 * @example
 * ```tsx
 * // Quarterly revenue by region
 * <GroupedBarChart
 *   data={[
 *     { quarter: "Q1", region: "EMEA",     revenue: 120 },
 *     { quarter: "Q1", region: "Americas", revenue: 95 },
 *     { quarter: "Q2", region: "EMEA",     revenue: 140 },
 *     { quarter: "Q2", region: "Americas", revenue: 110 },
 *   ]}
 *   categoryAccessor="quarter"
 *   valueAccessor="revenue"
 *   groupBy="region"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Custom palette + sorted categories
 * <GroupedBarChart
 *   data={data}
 *   categoryAccessor="quarter"
 *   valueAccessor="revenue"
 *   groupBy="region"
 *   colorScheme={["#3b82f6", "#22c55e", "#ef4444"]}
 *   sort="asc"
 * />
 * ```
 */
export const GroupedBarChart = forwardRef(function GroupedBarChart<TDatum extends Datum = Datum>(props: GroupedBarChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", groupBy, valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme, sort = false, barPadding = 60, roundedTop, baselinePadding = false,
    tooltip, annotations, valueExtent, frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
    categoryFormat
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, categoryLabel, valueLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])
  const effectiveColorBy = colorBy || groupBy

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
    chartType: "GroupedBarChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  // Consolidated piece-style — same recipe as BarChart/StackedBarChart
  // (base fill, user overlay, primitive props, selection wrap).
  // GroupedBarChart previously had a stroke-only filter on
  // frameProps.pieceStyle (it ignored user-supplied fills); aligning
  // with the helper means users can override fill via
  // `frameProps.pieceStyle: () => ({ fill: ... })` — consistent with
  // BarChart and the rest of the bar family.
  const pieceStyle = useOrdinalPieceStyle({
    colorBy: effectiveColorBy,
    colorScale: setup.colorScale,
    color, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: frameProps.pieceStyle,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: groupBy,
      valueAccessor,
      groupAccessor: categoryAccessor,
      valueFormat,
    }),
    [groupBy, categoryAccessor, valueAccessor, valueFormat]
  )

  const validationError = validateArrayData({
    componentName: "GroupedBarChart", data: data,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { groupBy },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef,
    setup,
  })

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "clusterbar",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    groupBy,
    oSort: sort,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    ...(roundedTop != null && { roundedTop }),
    baselinePadding,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(categoryFormat && { oFormat: categoryFormat }),
    showGrid,
    ...effectiveLegendProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(valueExtent && { rExtent: valueExtent }),
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  if (validationError) return <ChartError componentName="GroupedBarChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="GroupedBarChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: GroupedBarChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
GroupedBarChart.displayName = "GroupedBarChart"
