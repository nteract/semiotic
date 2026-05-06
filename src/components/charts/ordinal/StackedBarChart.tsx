"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface StackedBarChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  stackBy: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  normalize?: boolean
  /** Category sort order. Default: `false` (data insertion order). `"asc"`/`"desc"` sorts by total stacked value. `"auto"` preserves insertion order while streaming and falls through to value-desc on static data. Custom comparators receive category keys. */
  sort?: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number)
  barPadding?: number
  /** Rounded top corner radius. Only the topmost stacked segment gets rounded. */
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
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. Stacked bars auto-extend the value domain to cover the cumulative stack unless `valueExtent` is fully specified. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * StackedBarChart - Categorical bars split into stacked segments.
 *
 * Each row contributes one segment of the bar named by `categoryAccessor`;
 * `stackBy` chooses which series the segment belongs to. Use
 * {@link GroupedBarChart} when individual segment values matter more than
 * the total; pass `normalize` to compare composition rather than absolute
 * size.
 *
 * @example
 * ```tsx
 * // Quarterly revenue split by region
 * <StackedBarChart
 *   data={[
 *     { quarter: "Q1", region: "EMEA",     revenue: 120 },
 *     { quarter: "Q1", region: "Americas", revenue: 95 },
 *     { quarter: "Q2", region: "EMEA",     revenue: 140 },
 *     { quarter: "Q2", region: "Americas", revenue: 110 },
 *   ]}
 *   categoryAccessor="quarter"
 *   valueAccessor="revenue"
 *   stackBy="region"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Normalized to 100% — focus on composition
 * <StackedBarChart
 *   data={data}
 *   categoryAccessor="quarter"
 *   valueAccessor="revenue"
 *   stackBy="region"
 *   normalize
 * />
 * ```
 */
export const StackedBarChart = forwardRef(function StackedBarChart<TDatum extends Datum = Datum>(props: StackedBarChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    categoryAccessor = "category", stackBy, valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme, normalize = false, sort = false, barPadding = 40, roundedTop, baselinePadding = false,
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
  const effectiveColorBy = colorBy || stackBy

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
    chartType: "StackedBarChart",
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

  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      if (effectiveColorBy) {
        if (setup.colorScale) return { fill: getColor(d, effectiveColorBy, setup.colorScale) }
        return {} // Let frame use its own color scheme (push API)
      }
      return { fill: resolveDefaultFill(color, themeCategorical, colorScheme, category, categoryIndexMap) }
    }
  }, [effectiveColorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap])

  // Merge user frameProps.pieceStyle (for stroke etc.) into the HOC's color-resolved style,
  // then overlay top-level primitive props (stroke/strokeWidth/opacity) last so they win.
  const mergedPieceStyle = useMemo(() => {
    const userPieceStyle = frameProps?.pieceStyle
    const baseWithUser = (!userPieceStyle || typeof userPieceStyle !== "function")
      ? basePieceStyle
      : (d: Datum, category?: string) => {
        const base = basePieceStyle(d, category)
        const user = (userPieceStyle as ((...args: any[]) => any))(d, category) || {}
        return { ...base, ...user }
      }
    return mergeShapeStyle(baseWithUser, { stroke, strokeWidth, opacity })
  }, [basePieceStyle, frameProps, stroke, strokeWidth, opacity])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection),
    [mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: stackBy,
      valueAccessor,
      groupAccessor: categoryAccessor,
      valueFormat,
    }),
    [stackBy, categoryAccessor, valueAccessor, valueFormat]
  )

  const validationError = validateArrayData({
    componentName: "StackedBarChart", data: data,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { stackBy },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef,
    setup,
  })

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    stackBy,
    normalize,
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

  if (validationError) return <ChartError componentName="StackedBarChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="StackedBarChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: StackedBarChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
StackedBarChart.displayName = "StackedBarChart"
