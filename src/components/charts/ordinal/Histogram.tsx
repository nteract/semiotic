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
import type { BaseChartProps, ChartAccessor, CategoryFormatFn } from "../shared/types"
import { defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useOrdinalPieceStyle } from "../shared/useOrdinalPieceStyle"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useOrdinalBrush } from "../shared/useOrdinalBrush"

/**
 * Histogram component props
 */
export interface HistogramProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of rows. Either pre-binned (one row per bar with a category +
   * count) or raw observations the chart will bin via `valueAccessor`.
   * @example
   * ```ts
   * // Raw observations — chart bins them
   * [{ value: 12 }, { value: 18 }, { value: 22 }, ...]
   * // Or pre-binned
   * [{ bucket: "0–10", count: 3 }, { bucket: "10–20", count: 7 }]
   * ```
   */
  data?: TDatum[]
  /**
   * Field name or function returning the bin label (used when data is
   * already binned). Ignored when binning raw values.
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>
  /**
   * Field name or function returning the numeric value to bin (raw mode)
   * or the count for each bin (pre-binned mode).
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>
  /**
   * Number of equal-width bins for raw-data mode. Ignored when data is
   * already binned.
   * @default 25
   */
  bins?: number
  /**
   * Render bin heights as fraction of total instead of absolute counts.
   * Y-axis becomes [0, 1].
   * @default false
   */
  relative?: boolean
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  categoryPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showCategoryTicks?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  /** Enable brush on the value axis */
  brush?: boolean
  /** Callback when brush selection changes */
  onBrush?: (extent: { r: [number, number] } | null) => void
  /** LinkedCharts brush integration */
  linkedBrush?: string | { name: string; rField?: string }
  /** Custom formatter for category tick labels */
  categoryFormat?: CategoryFormatFn
  /** Fixed value-axis domain `[min, max]`. Either bound may be `undefined` to leave that side data-derived. Wins over Histogram's auto-computed shared bin extent — useful for pinning the axis to a known range so streamed updates don't shift the bins as min/max drift. */
  valueExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * Histogram - Visualize the distribution of a continuous variable as bars.
 *
 * Always horizontal-bars-by-value-axis style. Either bin raw observations
 * via `bins` and `valueAccessor`, or pass pre-binned rows directly. Use
 * `relative` to convert counts to a fraction of total.
 *
 * For comparison across multiple distributions overlaid, prefer
 * {@link RidgelinePlot} (one row per group, stacked) or
 * {@link ViolinPlot} (mirrored density per group).
 *
 * @example
 * ```tsx
 * // Bin raw observations
 * <Histogram
 *   data={observations}        // [{ value: 12 }, { value: 18 }, ...]
 *   valueAccessor="value"
 *   bins={20}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Pre-binned data
 * <Histogram
 *   data={[
 *     { bucket: "0–10", count: 3 },
 *     { bucket: "10–20", count: 7 },
 *     { bucket: "20–30", count: 5 },
 *   ]}
 *   categoryAccessor="bucket"
 *   valueAccessor="count"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Brush to select a value range; receives the brushed extent
 * <Histogram
 *   data={observations}
 *   valueAccessor="value"
 *   brush
 *   onBrush={(extent) => console.log(extent?.r)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Relative frequencies (fractions of total)
 * <Histogram
 *   data={observations}
 *   valueAccessor="value"
 *   bins={30}
 *   relative
 * />
 * ```
 *
 * @remarks
 * For streaming distributions (window-based binning over a live data
 * stream), use {@link RealtimeHistogram} from `semiotic/realtime` instead.
 */
export const Histogram = forwardRef(function Histogram<TDatum extends Datum = Datum>(props: HistogramProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    orientation: "horizontal",
  })

  const frameRef = useRef<StreamOrdinalFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const {
    data, margin: userMargin, className,
    categoryAccessor = "category", valueAccessor = "value",
    bins = 25, relative = false,
    valueFormat,
    colorBy, colorScheme, categoryPadding = 20,
    tooltip, annotations,
    valueExtent,
    brush: brushProp, onBrush: onBrushProp, linkedBrush,
    frameProps = {}, selection, linkedHover,
    onObservation, onClick, hoverHighlight, chartId,
    loading, emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color: colorProp,
    stroke,
    strokeWidth,
    opacity,
    showCategoryTicks,
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
    chartType: "Histogram",
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

  // Compute global value extent across all categories so bins are shared
  const rExtent = useMemo(() => {
    if (safeData.length === 0) return undefined
    const getVal = typeof valueAccessor === "function" ? valueAccessor : (d: Datum) => d[valueAccessor]
    let min = Infinity
    let max = -Infinity
    for (const d of safeData) {
      const v = getVal(d)
      if (v != null && isFinite(v)) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    return min <= max ? [min, max] as [number, number] : undefined
  }, [safeData, valueAccessor])

  const themeCategorical = useThemeCategorical()
  const categoryIndexMap = useMemo(() => new Map<string, number>(), [safeData])

  // Consolidated summary-style — same recipe as BoxPlot/ViolinPlot/
  // RidgelinePlot.
  const summaryStyle = useOrdinalPieceStyle({
    colorBy,
    colorScale: setup.colorScale,
    color: colorProp, themeCategorical, colorScheme, categoryIndexMap,
    userPieceStyle: undefined,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
    baseStyleExtras: { fillOpacity: 0.8 },
    linkStrokeToFill: true,
  })

  const defaultTooltipContent = useMemo(() => {
    return (d: Datum) => {
      const datum = d.data || d
      const category = datum.category || d.category || ""
      const count = datum.count
      const range = datum.range
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          {category && <div style={{ fontWeight: "bold" }}>{String(category)}</div>}
          {count != null && <div>Count: {count}</div>}
          {range && range.length === 2 && (
            <div style={{ opacity: 0.8 }}>
              {Number(range[0]).toFixed(1)} – {Number(range[1]).toFixed(1)}
            </div>
          )}
        </div>
      )
    }
  }, [])

  const error = validateArrayData({
    componentName: "Histogram", data: data,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="Histogram" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "histogram",
    ...(data != null && { data: safeData }),
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: "horizontal",
    summaryStyle,
    bins,
    normalize: relative,
    // User-supplied `valueExtent` wins over the auto-computed shared bin
    // extent — useful for pinning the axis to a known range so streamed
    // updates don't shift the bins as the data's min/max drifts.
    ...(valueExtent ? { rExtent: valueExtent } : (rExtent && { rExtent })),
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
    showCategoryTicks,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...ordinalBrush.brushStreamProps,
    // frameProps spread last for escape hatch, but pieceStyle excluded to prevent
    // clobbering the HOC's color-resolved, selection-wrapped style function.
    ...Object.fromEntries(Object.entries(frameProps).filter(([k]) => k !== "pieceStyle")),
  }

  return <SafeRender componentName="Histogram" width={width} height={height}><StreamOrdinalFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: HistogramProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
Histogram.displayName = "Histogram"
