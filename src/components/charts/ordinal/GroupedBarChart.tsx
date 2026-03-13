"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface GroupedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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
  tooltip?: TooltipProp
  annotations?: Record<string, any>[]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function GroupedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: GroupedBarChartProps<TDatum>) {
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

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", groupBy, valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme = "category10", barPadding = 5,
    tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, chartId,
    loading, emptyContent,
    legendInteraction
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const categoryLabel = resolved.categoryLabel
  const valueLabel = resolved.valueLabel

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = data || []
  const actualColorBy = colorBy || groupBy

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: true,
    onObservation, chartType: "GroupedBarChart", chartId
  })

  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  // Legend interaction
  const allCategories = useMemo(() => {
    if (!actualColorBy) return []
    const vals = new Set<string>()
    for (const d of safeData as Record<string, any>[]) {
      const v = typeof actualColorBy === "function" ? actualColorBy(d) : d[actualColorBy as string]
      if (v != null) vals.add(String(v))
    }
    return Array.from(vals)
  }, [safeData, actualColorBy])

  const legendState = useLegendInteraction(legendInteraction, actualColorBy, allCategories)

  // Merge legend selection with cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      if (actualColorBy) return { fill: getColor(d, actualColorBy, colorScale) }
      return { fill: DEFAULT_COLOR }
    }
  }, [actualColorBy, colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, effectiveSelectionHook, selection),
    [basePieceStyle, effectiveSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData, colorBy: actualColorBy, colorScale, showLegend, userMargin,
    defaults: resolved.marginDefaults,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: groupBy,
      valueAccessor,
      groupAccessor: categoryAccessor,
    }),
    [groupBy, categoryAccessor, valueAccessor]
  )

  const error = validateArrayData({
    componentName: "GroupedBarChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { groupBy },
  })
  if (error) return <ChartError componentName="GroupedBarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "clusterbar",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    groupBy,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin,
    barPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    ...(legend && { legend }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="GroupedBarChart" width={width} height={height}><StreamOrdinalFrame {...streamProps} /></SafeRender>
}
GroupedBarChart.displayName = "GroupedBarChart"
