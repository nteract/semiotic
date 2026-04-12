"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface PieChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
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
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export const PieChart = forwardRef(function PieChart<TDatum extends Record<string, any> = Record<string, any>>(props: PieChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    color
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable

  const safeData = data || []
  const effectiveColorBy = colorBy || categoryAccessor
  const isPushMode = data === undefined

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
    return (d: Record<string, any>, category?: string) => {
      if (effectiveColorBy) {
        if (setup.colorScale) return { fill: getColor(d, effectiveColorBy, setup.colorScale) }
        return {} // Let frame use its own color scheme (push API)
      }
      return { fill: resolveDefaultFill(color, themeCategorical, colorScheme, category, categoryIndexMap) }
    }
  }, [effectiveColorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap])

  const mergedPieceStyle = useMemo(() => {
    const userPieceStyle = frameProps?.pieceStyle
    if (!userPieceStyle || typeof userPieceStyle !== "function") return basePieceStyle
    return (d: Record<string, any>, category?: string) => ({
      ...basePieceStyle(d, category),
      ...((userPieceStyle as Function)(d, category) || {}),
    })
  }, [basePieceStyle, frameProps])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(mergedPieceStyle, setup.effectiveSelectionHook, selection),
    [mergedPieceStyle, setup.effectiveSelectionHook, selection]
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
    ref, frameRef, isPushMode,
    colorBy: effectiveColorBy,
    colorScheme, showLegend,
    legendPosition: legendPositionProp,
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
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior: setup.customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  if (validationError) return <ChartError componentName="PieChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="PieChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: PieChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
PieChart.displayName = "PieChart"
