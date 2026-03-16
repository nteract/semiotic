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

export interface StackedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
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

export function StackedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: StackedBarChartProps<TDatum>) {
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
    categoryAccessor = "category", stackBy, valueAccessor = "value",
    orientation = "vertical", valueFormat,
    colorBy, colorScheme = "category10", normalize = false, barPadding = 40,
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

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = data || []
  const actualColorBy = colorBy || stackBy

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: true,
    onObservation, chartType: "StackedBarChart", chartId
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

  const { legend, margin, legendPosition } = useChartLegendAndMargin({
    data: safeData, colorBy: actualColorBy, colorScale, showLegend,
    legendPosition: legendPositionProp, userMargin,
    defaults: resolved.marginDefaults,
  })

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: stackBy,
      valueAccessor,
      groupAccessor: categoryAccessor,
    }),
    [stackBy, categoryAccessor, valueAccessor]
  )

  const error = validateArrayData({
    componentName: "StackedBarChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { stackBy },
  })
  if (error) return <ChartError componentName="StackedBarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    stackBy,
    normalize,
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
    rFormat: valueFormat,
    showGrid,
    ...(legend && { legend, legendPosition }),
    ...(legendInteraction && legendInteraction !== "none" && {
      legendHoverBehavior: legendState.onLegendHover,
      legendClickBehavior: legendState.onLegendClick,
      legendHighlightedCategory: legendState.highlightedCategory,
      legendIsolatedCategories: legendState.isolatedCategories,
    }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: normalizeTooltip(tooltip) || defaultTooltipContent,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="StackedBarChart" width={width} height={height}><StreamOrdinalFrame {...streamProps} /></SafeRender>
}
StackedBarChart.displayName = "StackedBarChart"
