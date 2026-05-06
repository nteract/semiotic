"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useSortedData, useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

/**
 * BarChart component props
 */
export interface BarChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of data rows. Each row should have a category and a numeric value.
   * Omit when using the push API.
   * @example
   * ```ts
   * [{ region: "EMEA", revenue: 120 }, { region: "Americas", revenue: 85 }]
   * ```
   */
  data?: TDatum[]
  /**
   * Field name or function returning the category for each row.
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /**
   * Field name or function returning the bar value.
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Bar direction. Horizontal puts categories on the y-axis; usually needs
   * a wider left margin to fit the category labels.
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal"
  /** Label rendered next to the category axis. */
  categoryLabel?: string
  /** Label rendered next to the value axis. */
  valueLabel?: string
  /** Custom formatter for value-axis ticks and tooltip values. */
  valueFormat?: (d: number | string) => string
  /**
   * Field or function that determines bar color. Defaults to a single
   * color when omitted. Setting `colorBy` also enables the legend.
   */
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Color scheme for `colorBy`. Either a d3 scheme name (`"category10"`,
   * `"set2"`, etc.) or an explicit array of colors. Falls back to the
   * theme's categorical palette when omitted.
   */
  colorScheme?: string | string[]
  /** Category ordering. `false` (default) = insertion order. `"asc"` /
   *  `"desc"` sorts by total value. `"auto"` preserves insertion order
   *  while streaming and falls through to value-desc on static data.
   *  `true` = value-desc regardless of source. Custom comparator functions
   *  receive category name strings (not row objects) and run against
   *  the category list on the axis. */
  sort?: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number)
  barPadding?: number
  /** Rounded top corner radius in pixels. Only the end away from the baseline is rounded. */
  roundedTop?: number
  /**
   * Gradient fill from the bar's tip (opposite the baseline) toward its base.
   * - `true` — default opacity fade (80% → 5% of the resolved fill color).
   * - `{ topOpacity, bottomOpacity }` — explicit opacity stops on the resolved fill.
   * - `{ colorStops: [{offset, color}, ...] }` — arbitrary multi-color gradient.
   *
   * Direction follows the bar's orientation (vertical/horizontal) and sign
   * (positive/negative bars). Same API as `AreaChart.gradientFill`.
   * @default false
   */
  gradientFill?: boolean | { topOpacity: number; bottomOpacity: number } | { colorStops: Array<{ offset: number; color: string }> }
  /** When true, adds padding below the 0 baseline. Default false (bars flush with axis). */
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
 * BarChart - Visualize categorical data with vertical or horizontal bars.
 *
 * One bar per category. For multiple values per category use
 * {@link StackedBarChart} (stacked segments) or {@link GroupedBarChart}
 * (side-by-side bars).
 *
 * @example
 * ```tsx
 * // Simple bar chart
 * <BarChart
 *   data={[
 *     { region: "EMEA", revenue: 120 },
 *     { region: "Americas", revenue: 85 },
 *     { region: "APAC", revenue: 60 },
 *   ]}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by category, sorted descending by value
 * <BarChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   colorBy="region"
 *   sort="desc"
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Horizontal orientation — usually wants extra left margin for labels
 * <BarChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   orientation="horizontal"
 *   margin={{ left: 120 }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Gradient fill from bar tip toward baseline
 * <BarChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   color="steelblue"
 *   gradientFill
 *   roundedTop={4}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Push API — omit `data`, mutate via ref
 * const ref = useRef<RealtimeFrameHandle>(null)
 * useEffect(() => {
 *   ref.current?.push({ region: "EMEA", revenue: 120 })
 * }, [])
 *
 * <BarChart
 *   ref={ref}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 * />
 * ```
 *
 * @remarks
 * Wraps {@link StreamOrdinalFrame} with sensible bar defaults. For custom
 * marks, advanced annotations, or non-standard layouts, pass through via
 * `frameProps` or use StreamOrdinalFrame directly. See
 * {@link https://semiotic.nteract.io/charts/bar-chart} for live demos.
 */
export const BarChart = forwardRef(function BarChart<TDatum extends Datum = Datum>(props: BarChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    data,
    margin: userMargin,
    className,
    categoryAccessor = "category",
    valueAccessor = "value",
    orientation = "vertical",
    valueFormat,
    colorBy,
    colorScheme,
    sort = false,
    barPadding = 40, roundedTop,
    gradientFill = false,
    baselinePadding = false,
    tooltip,
    annotations,
    valueExtent,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    hoverHighlight,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
    showCategoryTicks,
    categoryFormat,
    dataIdAccessor,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, categoryLabel, valueLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])

  // ── Shared setup (color, legend, selection, loading/empty) ────────────
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "BarChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref,
    frameRef,
    setup,
  })

  if (setup.earlyReturn) return setup.earlyReturn

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("BarChart", safeData, "categoryAccessor", categoryAccessor)
  warnMissingField("BarChart", safeData, "valueAccessor", valueAccessor)

  // ── Core chart logic ───────────────────────────────────────────────────

  const sortedData = useSortedData(safeData, sort, valueAccessor)

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const basePieceStyle = useMemo(() => {
    return (d: Datum, _category?: string) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, setup.colorScale)
      } else {
        baseStyle.fill = resolveDefaultFill(color, themeCategorical, colorScheme, undefined, categoryIndexMap)
      }
      return baseStyle
    }
  }, [colorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap])

  const mergedPieceStyle = useMemo(() => {
    const userPieceStyle = frameProps?.pieceStyle
    const baseWithUser = (!userPieceStyle || typeof userPieceStyle !== "function")
      ? basePieceStyle
      : (d: Datum, category?: string) => ({
        ...basePieceStyle(d, category),
        ...((userPieceStyle as ((...args: any[]) => any))(d, category) || {}),
      })
    // Top-level primitive props (stroke/strokeWidth/opacity) applied LAST so
    // they win over both HOC base style and user-supplied frameProps.pieceStyle.
    return mergeShapeStyle(baseWithUser, { stroke, strokeWidth, opacity })
  }, [basePieceStyle, frameProps, stroke, strokeWidth, opacity])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection),
    [mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  // Default tooltip — pass valueFormat so the tooltip matches the value axis.
  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy && colorBy !== categoryAccessor ? colorBy : undefined,
      groupLabel: typeof colorBy === "string" ? colorBy : "group",
      valueFormat,
    }),
    [categoryAccessor, valueAccessor, colorBy, valueFormat]
  )

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "BarChart",
    data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="BarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    ...(data != null && { data: sortedData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    ...(roundedTop != null && { roundedTop }),
    // Resolve boolean `true` to the same default opacities AreaChart uses
    // (80% → 5%) so a single top-level toggle gets you a reasonable look.
    // Object forms are passed through unchanged.
    ...(gradientFill && {
      gradientFill: gradientFill === true
        ? { topOpacity: 0.8, bottomOpacity: 0.05 }
        : gradientFill,
    }),
    ...(dataIdAccessor && { dataIdAccessor }),
    baselinePadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(categoryFormat && { oFormat: categoryFormat }),
    showGrid,
    showCategoryTicks,
    oSort: sort,
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
    // frameProps spread last for escape hatch, but pieceStyle is excluded
    // to prevent clobbering the HOC's color-resolved, selection-wrapped style.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  return <SafeRender componentName="BarChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: BarChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
BarChart.displayName = "BarChart"
