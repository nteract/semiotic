"use client"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps, StreamOrdinalFrameHandle } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useChartMode, useThemeCategorical, resolveDefaultFill } from "../shared/hooks"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface SwimlaneChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /** Data array. Omit for push API mode. */
  data?: TDatum[]
  /** Accessor for lane categories (swim lanes). Default "category". */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /** Accessor for item subcategory (color grouping within lanes). Required. */
  subcategoryAccessor: ChartAccessor<TDatum, string>
  /** Accessor for item size/duration. Default "value". */
  valueAccessor?: ChartAccessor<TDatum, number>
  /** Orientation: "horizontal" renders lanes as rows (default), "vertical" as columns. */
  orientation?: "vertical" | "horizontal"
  /** Label for the category axis */
  categoryLabel?: string
  /** Label for the value axis */
  valueLabel?: string
  /** Format function for value axis ticks */
  valueFormat?: (d: number | string) => string
  /** Color accessor — defaults to subcategoryAccessor */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme for subcategories */
  colorScheme?: string | string[]
  /** Padding between lanes in pixels */
  barPadding?: number
  /** Enable hover annotations */
  enableHover?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Show category axis tick labels */
  showCategoryTicks?: boolean
  /** Show legend */
  showLegend?: boolean
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: "right" | "left" | "top" | "bottom"
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Annotation objects */
  annotations?: Record<string, any>[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Pass-through props to StreamOrdinalFrame */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export const SwimlaneChart = forwardRef(function SwimlaneChart<TDatum extends Record<string, any> = Record<string, any>>(props: SwimlaneChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    categoryAccessor = "category",
    subcategoryAccessor,
    valueAccessor = "value",
    orientation = "horizontal",
    valueFormat,
    colorBy,
    colorScheme,
    barPadding = 40,
    tooltip, annotations,
    brush: brushProp,
    onBrush: onBrushProp,
    linkedBrush,
    frameProps = {},
    selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    categoryFormat,
    showCategoryTicks,
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const description = resolved.description
  const summary = resolved.summary
  const accessibleTable = resolved.accessibleTable
  const categoryLabel = resolved.categoryLabel
  const valueLabel = resolved.valueLabel

  const safeData = data || []
  const effectiveColorBy = colorBy || subcategoryAccessor
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
    chartType: "SwimlaneChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  const ordinalBrush = useOrdinalBrush({ brushProp, onBrushProp, linkedBrush, valueAccessor })

  if (setup.earlyReturn) return setup.earlyReturn

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>, category?: string) => {
      if (effectiveColorBy) {
        if (setup.colorScale) return { fill: getColor(d, effectiveColorBy, setup.colorScale) }
        return {}
      }
      return { fill: resolveDefaultFill(color, themeCategorical, colorScheme, category, categoryIndexMap) }
    }
  }, [effectiveColorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, setup.effectiveSelectionHook, selection),
    [basePieceStyle, setup.effectiveSelectionHook, selection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: subcategoryAccessor,
      valueAccessor,
      groupAccessor: categoryAccessor,
    }),
    [subcategoryAccessor, categoryAccessor, valueAccessor]
  )

  const validationError = validateArrayData({
    componentName: "SwimlaneChart", data: data,
    accessors: { categoryAccessor, valueAccessor, subcategoryAccessor },
    requiredProps: { subcategoryAccessor },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef, isPushMode,
    colorBy: effectiveColorBy,
    colorScheme, showLegend,
    legendPosition: legendPositionProp,
    setup,
  })

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "swimlane",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    stackBy: subcategoryAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: effectiveMargin,
    barPadding,
    enableHover,
    showAxes: resolved.showAxes,
    oLabel: showCategoryTicks === false ? undefined : categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(categoryFormat && { oFormat: categoryFormat }),
    ...(showCategoryTicks !== undefined && { showCategoryTicks }),
    showGrid,
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
    ...ordinalBrush.brushStreamProps,
    ...frameProps
  }

  if (validationError) return <ChartError componentName="SwimlaneChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="SwimlaneChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: SwimlaneChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
SwimlaneChart.displayName = "SwimlaneChart"
