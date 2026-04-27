"use client"
import type { Datum } from "../shared/datumTypes"
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
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"
import { useOrdinalStreaming } from "../shared/useOrdinalStreaming"

export interface SwimlaneChartProps<TDatum extends Datum = Datum> extends BaseChartProps {
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
  annotations?: Datum[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Custom tick values for the value axis. Forces specific values instead of d3 auto-ticks. */
  rTickValues?: number[]
  /** Align first value tick label to start, last to end. Prevents clipping at chart edges. */
  tickLabelEdgeAlign?: boolean
  /** Pass-through props to StreamOrdinalFrame */
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * SwimlaneChart - Range bars per category (swim lane), one segment per row.
 *
 * Each row becomes a horizontal segment in the lane named by
 * `categoryAccessor`; `subcategoryAccessor` chooses the segment label
 * within the lane. Useful for project timelines, status histories,
 * Gantt-like views, and per-resource workloads.
 *
 * @example
 * ```tsx
 * // Project task ranges per assignee
 * <SwimlaneChart
 *   data={[
 *     { team: "Design", task: "Spec",   value: 8 },
 *     { team: "Design", task: "Mocks",  value: 12 },
 *     { team: "Eng",    task: "API",    value: 16 },
 *     { team: "Eng",    task: "Client", value: 10 },
 *     { team: "QA",     task: "Plan",   value: 4 },
 *   ]}
 *   categoryAccessor="team"
 *   subcategoryAccessor="task"
 *   valueAccessor="value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by subcategory + custom label rotation
 * <SwimlaneChart
 *   data={data}
 *   categoryAccessor="team"
 *   subcategoryAccessor="task"
 *   valueAccessor="hours"
 *   colorBy="task"
 *   showLegend
 * />
 * ```
 */
export const SwimlaneChart = forwardRef(function SwimlaneChart<TDatum extends Datum = Datum>(props: SwimlaneChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    barPadding: userBarPadding,
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
    stroke,
    strokeWidth,
    opacity,
    categoryFormat,
    rTickValues,
    tickLabelEdgeAlign,
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

  // Mode-aware `barPadding`: sparkline uses 1px by default (or less when so
  // many categories are present that 1px would shrink each lane below 2px).
  // Primary/context keep the generous 40px default. User-supplied values
  // always win regardless of mode.
  const barPadding = useMemo(() => {
    if (userBarPadding != null) return userBarPadding
    if (props.mode !== "sparkline") return 40
    const uniqueCategories = new Set(
      safeData.map((d) => typeof categoryAccessor === "function" ? categoryAccessor(d) : d[categoryAccessor as string])
    )
    const laneCount = Math.max(1, uniqueCategories.size)
    if (laneCount <= 1) return 1
    // The available length is the dimension perpendicular to the lane axis.
    // Horizontal (default): lanes stack vertically → available = height.
    const availableLength = orientation === "horizontal" ? height : width
    // Each lane must be >= 2px after subtracting cumulative padding.
    // Lane width = (avail - (n-1)*pad) / n; solve for pad when laneWidth=2:
    // pad = (avail - 2n) / (n - 1), capped at 1 (the target default).
    const maxPadForMinLane = (availableLength - 2 * laneCount) / (laneCount - 1)
    return Math.max(0, Math.min(1, maxPadForMinLane))
  }, [userBarPadding, props.mode, safeData, categoryAccessor, orientation, width, height])

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

  // Merge frameProps.pieceStyle (stroke/strokeWidth for themed borders) with
  // the HOC's color-resolved fill. The HOC keeps control of fill; users can add borders.
  const fpPieceStyle = frameProps.pieceStyle as ((d: any, c?: string) => Datum) | undefined

  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      const base: Datum = effectiveColorBy
        ? (setup.colorScale ? { fill: getColor(d, effectiveColorBy, setup.colorScale) } : {})
        : { fill: resolveDefaultFill(color, themeCategorical, colorScheme, category, categoryIndexMap) }
      if (fpPieceStyle) {
        const extra = fpPieceStyle(d, category)
        if (extra.stroke) base.stroke = extra.stroke
        if (extra.strokeWidth != null) base.strokeWidth = extra.strokeWidth
        if (extra.strokeOpacity != null) base.strokeOpacity = extra.strokeOpacity
      }
      return base
    }
  }, [effectiveColorBy, setup.colorScale, color, themeCategorical, colorScheme, categoryIndexMap, fpPieceStyle])

  const basePieceStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(basePieceStyle, { stroke, strokeWidth, opacity }),
    [basePieceStyle, stroke, strokeWidth, opacity]
  )

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({
      categoryAccessor: subcategoryAccessor,
      valueAccessor,
      groupAccessor: categoryAccessor,
      valueFormat,
    }),
    [subcategoryAccessor, categoryAccessor, valueAccessor, valueFormat]
  )

  const validationError = validateArrayData({
    componentName: "SwimlaneChart", data: data,
    accessors: { categoryAccessor, valueAccessor, subcategoryAccessor },
    requiredProps: { subcategoryAccessor },
  })

  const { effectiveLegendProps, effectiveMargin } = useOrdinalStreaming({
    ref, frameRef,
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
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: resolved.showAxes,
    oLabel: showCategoryTicks === false ? undefined : categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(rTickValues && { rTickValues }),
    ...(tickLabelEdgeAlign != null && { tickLabelEdgeAlign }),
    ...(categoryFormat && { oFormat: categoryFormat }),
    ...(showCategoryTicks !== undefined && { showCategoryTicks }),
    showGrid,
    ...effectiveLegendProps,
    ...(title && { title }),
    ...(description && { description }),
    ...(summary && { summary }),
    ...(accessibleTable !== undefined && { accessibleTable }),
    ...(className && { className }),
    ...(props.animate != null && { animate: props.animate }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation || onClick || hoverHighlight) && { customHoverBehavior: setup.customHoverBehavior }),
    ...((onObservation || onClick || linkedHover) && { customClickBehavior: setup.customClickBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...ordinalBrush.brushStreamProps,
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  if (validationError) return <ChartError componentName="SwimlaneChart" message={validationError} width={width} height={height} />

  return <SafeRender componentName="SwimlaneChart" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: SwimlaneChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
SwimlaneChart.displayName = "SwimlaneChart"
