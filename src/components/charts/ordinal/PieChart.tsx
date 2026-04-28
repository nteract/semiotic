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
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
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

/**
 * PieChart component props
 */
export interface PieChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of category rows. Each row should have a category and a numeric
   * value; values determine relative wedge size. Omit when using the push API.
   * @example
   * ```ts
   * [{ region: "EMEA", revenue: 120 }, { region: "Americas", revenue: 85 }]
   * ```
   */
  data?: TDatum[]
  /**
   * Field name or function returning the wedge label.
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /**
   * Field name or function returning the wedge value (slice size). Values
   * are aggregated by absolute magnitude (`Math.abs`), so negative inputs
   * render as positive-sized wedges. If your data has signed values you
   * need to differentiate, sign-encode via `colorBy` or pre-process.
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Field or function that determines wedge color. Defaults to coloring by
   * `categoryAccessor` since pies are inherently categorical.
   */
  colorBy?: ChartAccessor<TDatum, string>
  /**
   * Color scheme for `colorBy`. Either a d3 scheme name (`"category10"`,
   * `"set2"`, etc.) or an explicit array of colors. Falls back to the
   * theme's categorical palette when omitted.
   */
  colorScheme?: string | string[]
  /**
   * Rotation in **degrees** applied to the first wedge. `0` starts at 12
   * o'clock and proceeds clockwise; `90` starts at 3 o'clock, `180` at 6
   * o'clock, `270` at 9 o'clock.
   * @default 0
   */
  startAngle?: number
  /** Rounded corner radius on wedge arcs (pixels). */
  cornerRadius?: number
  enableHover?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * PieChart - Visualize a single categorical distribution as wedges of a circle.
 *
 * Each row becomes one wedge sized by `valueAccessor`. Best for ≤7 categories;
 * with more, prefer {@link BarChart} or {@link DonutChart} for legibility.
 *
 * For a pie with a hole and center content, use {@link DonutChart}.
 *
 * @example
 * ```tsx
 * // Simple pie
 * <PieChart
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
 * // Custom palette + rounded wedges + start angle
 * <PieChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   colorScheme={["#1f77b4", "#ff7f0e", "#2ca02c"]}
 *   cornerRadius={4}
 *   startAngle={90}
 *   showLegend
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Hover highlight + click handler
 * <PieChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   hoverHighlight
 *   onClick={(d) => console.log("clicked region:", d)}
 * />
 * ```
 *
 * @remarks
 * Wraps {@link StreamOrdinalFrame} with pie-specific defaults. See
 * {@link https://semiotic.nteract.io/charts/pie-chart} for live demos.
 */
export const PieChart = forwardRef(function PieChart<TDatum extends Datum = Datum>(props: PieChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width ?? 400,
    height: props.height ?? 400,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    showCategoryTicks: props.showCategoryTicks,
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    colorBy, colorScheme, startAngle = 0, cornerRadius,
    tooltip, annotations, frameProps = {},
    selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showLegend, title, description, summary, accessibleTable } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])
  const effectiveColorBy = colorBy || categoryAccessor

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
    chartType: "PieChart",
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

  const mergedPieceStyle = useMemo(() => {
    const userPieceStyle = frameProps?.pieceStyle
    const baseWithUser = (!userPieceStyle || typeof userPieceStyle !== "function")
      ? basePieceStyle
      : (d: Datum, category?: string) => ({
        ...basePieceStyle(d, category),
        ...((userPieceStyle as ((...args: any[]) => any))(d, category) || {}),
      })
    return mergeShapeStyle(baseWithUser, { stroke, strokeWidth, opacity })
  }, [basePieceStyle, frameProps, stroke, strokeWidth, opacity])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection),
    [mergedPieceStyle, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy && colorBy !== categoryAccessor ? colorBy : undefined,
      groupLabel: typeof colorBy === "string" ? colorBy : "group",
      pieData: true
    }),
    [categoryAccessor, valueAccessor, colorBy]
  )

  const validationError = validateArrayData({
    componentName: "PieChart", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef,
    setup,
  })

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "pie",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "radial",
    pieceStyle,
    startAngle,
    ...(cornerRadius != null && { cornerRadius }),
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: false,
    ...effectiveLegendProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  if (validationError) return <ChartError componentName="PieChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="PieChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: PieChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
PieChart.displayName = "PieChart"
