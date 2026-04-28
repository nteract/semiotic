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
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildOrdinalTooltip } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"

export interface DotPlotProps<TDatum extends Datum = Datum> extends BaseChartProps {
  data?: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  /** Category ordering. Default (`undefined`) resolves to `"auto"`, which
   *  preserves insertion order while streaming and falls through to
   *  value-desc on static data — the recommended choice when using the
   *  push API so categories don't jump around as values fluctuate.
   *  `true` forces value-desc regardless of source. `"asc"` / `"desc"`
   *  sorts by total value. `false` for insertion order regardless of
   *  source. Function comparators receive category name strings (not
   *  row objects) and run against the category list on the axis. */
  sort?: boolean | "asc" | "desc" | "auto" | ((a: string, b: string) => number)
  dotRadius?: number
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * DotPlot - One dot per category, positioned along the value axis.
 *
 * Lighter-weight than {@link BarChart} for sorted comparisons; emphasizes
 * exact values rather than magnitude perception. Defaults to insertion
 * order while streaming (so categories don't shuffle as values change)
 * and value-descending on static data via `sort: "auto"`.
 *
 * @example
 * ```tsx
 * // Sorted ranking by metric
 * <DotPlot
 *   data={teams}
 *   categoryAccessor="name"
 *   valueAccessor="score"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by group + grid for axis reading
 * <DotPlot
 *   data={features}
 *   categoryAccessor="feature"
 *   valueAccessor="adoption"
 *   colorBy="team"
 *   showGrid
 *   showLegend
 * />
 * ```
 */
export const DotPlot = forwardRef(function DotPlot<TDatum extends Datum = Datum>(props: DotPlotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid ?? true,
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
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    orientation = "horizontal", valueFormat,
    colorBy, colorScheme, sort = "auto", dotRadius = 5,
    categoryPadding = 10, tooltip, annotations, frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
    categoryFormat
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, categoryLabel, valueLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])

  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""],
    unwrapData: true,
    onObservation,
    onClick,
    hoverHighlight,
    chartType: "DotPlot",
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

  const sortedData = useSortedData(safeData, sort, valueAccessor)

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  const fpPieceStyle = frameProps.pieceStyle as ((d: any, c?: string) => Datum) | undefined

  const basePieceStyle = useMemo(() => {
    return (d: Datum, category?: string) => {
      const base: Record<string, string | number> = { r: dotRadius, fillOpacity: 0.8 }
      base.fill = colorBy ? getColor(d, colorBy, setup.colorScale) : resolveDefaultFill(color, themeCategorical, colorScheme, undefined, categoryIndexMap)
      if (fpPieceStyle) {
        const extra = fpPieceStyle(d, category)
        if (extra.stroke) base.stroke = extra.stroke
        if (extra.strokeWidth != null) base.strokeWidth = extra.strokeWidth
        if (extra.strokeOpacity != null) base.strokeOpacity = extra.strokeOpacity
      }
      return base
    }
  }, [colorBy, setup.colorScale, dotRadius, color, themeCategorical, colorScheme, categoryIndexMap, fpPieceStyle])

  const basePieceStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(basePieceStyle, { stroke, strokeWidth, opacity }),
    [basePieceStyle, stroke, strokeWidth, opacity]
  )

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [basePieceStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  const defaultTooltipContent = useMemo(
    () => buildOrdinalTooltip({ categoryAccessor, valueAccessor, valueFormat }),
    [categoryAccessor, valueAccessor, valueFormat]
  )

  const error = validateArrayData({
    componentName: "DotPlot", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="DotPlot" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "point",
    ...(data != null && { data: sortedData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    barPadding: categoryPadding,
    enableHover,
    ...(props.dataIdAccessor && { dataIdAccessor: props.dataIdAccessor }),
    showAxes: resolved.showAxes,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat,
    ...(categoryFormat && { oFormat: categoryFormat }),
    showGrid,
    oSort: sort,
    ...setup.legendBehaviorProps,
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

  return <SafeRender componentName="DotPlot" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: DotPlotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
DotPlot.displayName = "DotPlot"
