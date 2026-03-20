"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
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
import { useStreamingLegend } from "../shared/useStreamingLegend"

export interface PieChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  startAngle?: number
  slicePadding?: number
  enableHover?: boolean
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
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    colorBy, colorScheme = "category10", startAngle = 0, slicePadding = 2,
    tooltip, annotations, frameProps = {},
    selection, linkedHover,
    onObservation, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showLegend = resolved.showLegend
  const title = resolved.title

  const safeData = data || []
  const actualColorBy = colorBy || categoryAccessor
  const isPushMode = data === undefined

  const streaming = useStreamingLegend({
    isPushMode,
    colorBy: actualColorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  const wrappedPush = useCallback(
    streaming.wrapPush((d: any) => frameRef.current?.push(d)),
    [streaming.wrapPush]
  )
  const wrappedPushMany = useCallback(
    streaming.wrapPushMany((d: any[]) => frameRef.current?.pushMany(d)),
    [streaming.wrapPushMany]
  )

  useImperativeHandle(ref, () => ({
    push: wrappedPush,
    pushMany: wrappedPushMany,
    clear: () => {
      streaming.resetCategories()
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [wrappedPush, wrappedPushMany, streaming.resetCategories])

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy: actualColorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: true,
    onObservation,
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

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      if (actualColorBy) {
        if (setup.colorScale) return { fill: getColor(d, actualColorBy, setup.colorScale) }
        return {} // Let frame use its own color scheme (push API)
      }
      return { fill: DEFAULT_COLOR }
    }
  }, [actualColorBy, setup.colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, setup.effectiveSelectionHook, selection),
    [basePieceStyle, setup.effectiveSelectionHook, selection]
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

  const error = validateArrayData({
    componentName: "PieChart", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="PieChart" message={error} width={width} height={height} />

  // Merge streaming legend into legendBehaviorProps when in push API mode
  const effectiveLegendProps = useMemo(() => {
    if (streaming.streamingLegend) {
      return {
        ...setup.legendBehaviorProps,
        legend: streaming.streamingLegend,
        legendPosition: legendPositionProp || setup.legendPosition,
      }
    }
    return setup.legendBehaviorProps
  }, [setup.legendBehaviorProps, setup.legendPosition, streaming.streamingLegend, legendPositionProp])

  // Adjust margin for streaming legend
  const effectiveMargin = useMemo(() => {
    if (streaming.streamingMarginAdjust) {
      const m = { ...setup.margin }
      for (const [key, val] of Object.entries(streaming.streamingMarginAdjust)) {
        const k = key as keyof typeof m
        if (m[k] < val) m[k] = val
      }
      return m
    }
    return setup.margin
  }, [setup.margin, streaming.streamingMarginAdjust])

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "pie",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "radial",
    pieceStyle,
    startAngle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    enableHover,
    showAxes: false,
    ...effectiveLegendProps,
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior: setup.customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="PieChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: PieChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
PieChart.displayName = "PieChart"
