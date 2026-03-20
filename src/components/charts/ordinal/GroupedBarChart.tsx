"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef, useImperativeHandle } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
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

export interface GroupedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: "right" | "left" | "top" | "bottom"
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export const GroupedBarChart = forwardRef(function GroupedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: GroupedBarChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    categoryLabel: props.categoryLabel,
    valueLabel: props.valueLabel,
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", groupBy, valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme = "category10", barPadding = 60,
    tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const categoryLabel = resolved.categoryLabel
  const valueLabel = resolved.valueLabel

  const safeData = data || []
  const actualColorBy = colorBy || groupBy
  const isPushMode = data === undefined

  const streaming = useStreamingLegend({
    isPushMode,
    colorBy: actualColorBy,
    colorScheme,
    showLegend,
    legendPosition: legendPositionProp,
  })

  useImperativeHandle(ref, () => ({
    push: (point: any) => {
      streaming.wrapPush((d: any) => frameRef.current?.push(d))(point)
    },
    pushMany: (points: any[]) => {
      streaming.wrapPushMany((d: any[]) => frameRef.current?.pushMany(d))(points)
    },
    clear: () => {
      streaming.resetCategories()
      frameRef.current?.clear()
    },
    getData: () => frameRef.current?.getData() ?? []
  }), [streaming])

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
      categoryAccessor: groupBy,
      valueAccessor,
      groupAccessor: categoryAccessor,
    }),
    [groupBy, categoryAccessor, valueAccessor]
  )

  const error = validateArrayData({
    componentName: "GroupedBarChart", data: data,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { groupBy },
  })
  if (error) return <ChartError componentName="GroupedBarChart" message={error} width={width} height={height} />

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
    chartType: "clusterbar",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    groupBy,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    showGrid,
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

  return <SafeRender componentName="GroupedBarChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: GroupedBarChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
GroupedBarChart.displayName = "GroupedBarChart"
