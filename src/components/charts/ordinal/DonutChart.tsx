"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { useChartMode, useThemeCategorical } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useOrdinalPieceStyle } from "../shared/useOrdinalPieceStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface DonutChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  innerRadius?: number
  centerContent?: React.ReactNode
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  startAngle?: number
  /** Rounded corner radius on wedge arcs */
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
 * DonutChart - Pie chart with a hole; supports center content.
 *
 * Same data shape as {@link PieChart}, but the inner radius leaves room
 * for a value, label, or icon at the center via `centerContent`. Useful
 * when the headline number is the total or a key fraction.
 *
 * @example
 * ```tsx
 * // Donut with the total in the center
 * <DonutChart
 *   data={[
 *     { region: "EMEA", revenue: 120 },
 *     { region: "Americas", revenue: 85 },
 *     { region: "APAC", revenue: 60 },
 *   ]}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   innerRadius={70}
 *   centerContent={<text fontSize={28}>$265</text>}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Thin ring with rounded wedges
 * <DonutChart
 *   data={data}
 *   categoryAccessor="region"
 *   valueAccessor="revenue"
 *   innerRadius={120}
 *   cornerRadius={4}
 *   showLegend
 * />
 * ```
 */
export const DonutChart = forwardRef(function DonutChart<TDatum extends Datum = Datum>(props: DonutChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  // Width/height passed through unmassaged so `useChartMode` can substitute
  // the mode default (context: 400×250, sparkline: 120×24). Primary-mode
  // default is 400×400 via the third arg — a donut looks square.
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    description: props.description,
    accessibleTable: props.accessibleTable,
    summary: props.summary,
    linkedHover: props.linkedHover,
    showCategoryTicks: props.showCategoryTicks,
  }, { width: 400, height: 400 })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    innerRadius: userInnerRadius, centerContent,
    colorBy, colorScheme, startAngle = 0, cornerRadius,
    tooltip, annotations, frameProps = {},
    selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, loadingContent, emptyContent,
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
    chartType: "DonutChart",
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

  // Default `innerRadius` scales with the container's min dimension so the
  // donut keeps its ring shape at any size. User-supplied pixel values always
  // win. The ratio `min(w, h) * 0.15` (so primary 400×400 → 60, matching the
  // pre-fix literal; sparkline 120×24 → 3.6 → clamped to 2) deliberately
  // undershoots the frame's actual outer radius: the frame subtracts its
  // margin + legend allowance before drawing the arc, and we can't see that
  // number from the HOC layer. Staying conservative keeps the ring thick
  // enough to read at every size rather than degrading to a hairline at the
  // larger primary defaults where the legend eats half the right margin.
  const innerRadius = userInnerRadius ?? Math.max(2, Math.min(width, height) * 0.15)

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  // Consolidated piece-style — same recipe as PieChart with
  // per-slice color cycling enabled. Previously had a stroke-only
  // user-overlay filter that diverged from PieChart's spread
  // semantic; aligned with the helper.
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
      categoryAccessor,
      valueAccessor,
      groupAccessor: colorBy && colorBy !== categoryAccessor ? colorBy : undefined,
      groupLabel: typeof colorBy === "string" ? colorBy : "group",
      pieData: true
    }),
    [categoryAccessor, valueAccessor, colorBy]
  )

  const validationError = validateArrayData({
    componentName: "DonutChart", data: data,
    accessors: { categoryAccessor, valueAccessor },
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
    chartType: "donut",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "radial",
    pieceStyle,
    innerRadius,
    startAngle,
    ...(cornerRadius != null && { cornerRadius }),
    centerContent,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: false,
    ...effectiveLegendProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
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

  if (validationError) return <ChartError componentName="DonutChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="DonutChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: DonutChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
DonutChart.displayName = "DonutChart"
