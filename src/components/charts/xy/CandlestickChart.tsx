"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { CandlestickStyle } from "../../stream/types"
import { useChartSelection, useChartMode, getCrosshairProps } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName, type TooltipFieldConfig } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"

export interface CandlestickChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  data?: TDatum[]
  xAccessor?: ChartAccessor<TDatum, number>
  /** Required — upper bound (candlestick high, or range top) */
  highAccessor?: ChartAccessor<TDatum, number>
  /** Required — lower bound (candlestick low, or range bottom) */
  lowAccessor?: ChartAccessor<TDatum, number>
  /** Optional — when paired with closeAccessor, renders OHLC candlesticks. Omit both to render a range chart. */
  openAccessor?: ChartAccessor<TDatum, number>
  /** Optional — see openAccessor */
  closeAccessor?: ChartAccessor<TDatum, number>
  candlestickStyle?: CandlestickStyle
  tooltip?: TooltipProp
  annotations?: Datum[]
  enableHover?: boolean
  showGrid?: boolean
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * CandlestickChart — OHLC bars, or a range chart when open/close are omitted.
 *
 * Pass all four of `open/high/low/close` for classic candlesticks. Pass only
 * `high/low` to degrade into a range/dumbbell visualization (PipelineStore
 * auto-detects this via `candlestickRangeMode`).
 *
 * @example
 * ```tsx
 * // Full OHLC candlesticks
 * <CandlestickChart
 *   data={prices}
 *   xAccessor="date"
 *   openAccessor="o"
 *   highAccessor="h"
 *   lowAccessor="l"
 *   closeAccessor="c"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Range-only (e.g. min/max bands per period)
 * <CandlestickChart
 *   data={data}
 *   xAccessor="date"
 *   highAccessor="max"
 *   lowAccessor="min"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Custom up/down colors and bar width
 * <CandlestickChart
 *   data={prices}
 *   xAccessor="date"
 *   openAccessor="o"
 *   highAccessor="h"
 *   lowAccessor="l"
 *   closeAccessor="c"
 *   candlestickStyle={{ upColor: "#22c55e", downColor: "#ef4444", bodyWidth: 8 }}
 * />
 * ```
 */
export const CandlestickChart = forwardRef(function CandlestickChart<TDatum extends Datum = Datum>(
  props: CandlestickChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    description: props.description,
    summary: props.summary,
    accessibleTable: props.accessibleTable,
  })

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    yFormat,
    xAccessor = "x",
    highAccessor = "high",
    lowAccessor = "low",
    openAccessor,
    closeAccessor,
    candlestickStyle,
    tooltip,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    chartId,
    loading,
    emptyContent,
  } = props

  const { width, height, enableHover, showGrid, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  const loadingEl = renderLoadingState(loading, width, height)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = useMemo(() => filterSparseArray(data), [data])

  // Range mode: either side of open/close missing collapses to high/low band.
  // Providing only one of the two is treated as "no OHLC" rather than an error —
  // PipelineStore builds the range scene when candlestickRangeMode is true.
  const isRange = openAccessor == null || closeAccessor == null

  warnMissingField("CandlestickChart", safeData, "xAccessor", xAccessor)
  warnMissingField("CandlestickChart", safeData, "highAccessor", highAccessor)
  warnMissingField("CandlestickChart", safeData, "lowAccessor", lowAccessor)
  // When the user asked for OHLC mode (both open & close accessors supplied),
  // warn if the data doesn't actually carry those fields — otherwise the
  // scene builder silently drops bars and the chart renders blank.
  if (!isRange) {
    warnMissingField("CandlestickChart", safeData, "openAccessor", openAccessor!)
    warnMissingField("CandlestickChart", safeData, "closeAccessor", closeAccessor!)
  }

  const { customHoverBehavior, customClickBehavior, crosshairSourceId } = useChartSelection({
    selection, linkedHover,
    onObservation, onClick, chartType: "CandlestickChart", chartId,
  })

  const crosshairFrameProps = getCrosshairProps(linkedHover, crosshairSourceId)

  // Merge the user's PartialMargin (number shorthand or any subset of sides)
  // with the mode-driven defaults so the frame gets a fully-resolved margin.
  // In sparkline mode, zero out top/bottom: with axes stripped, the 2px
  // default on each side is just dead space that compresses the price range.
  const margin = useMemo(() => {
    const base = resolved.marginDefaults
    const d = props.mode === "sparkline" ? { ...base, top: 0, bottom: 0 } : base
    if (userMargin == null) return d
    if (typeof userMargin === "number") return { top: userMargin, bottom: userMargin, left: userMargin, right: userMargin }
    return { ...d, ...userMargin }
  }, [userMargin, resolved.marginDefaults, props.mode])

  // Tooltip: OHLC when present, range when degraded. `ChartAccessor<TDatum,
  // number>` is narrower than TooltipFieldConfig.accessor by parameter
  // variance — a single cast at the boundary is cleaner than per-row noise.
  const defaultTooltipContent = useMemo(() => {
    type Acc = TooltipFieldConfig["accessor"]
    const rows: TooltipFieldConfig[] = [
      { label: xLabel || accessorName(xAccessor), accessor: xAccessor as Acc, role: "x", format: xFormat },
    ]
    if (!isRange) {
      rows.push({ label: "Open", accessor: openAccessor! as Acc, format: yFormat })
      rows.push({ label: "High", accessor: highAccessor as Acc, format: yFormat })
      rows.push({ label: "Low", accessor: lowAccessor as Acc, format: yFormat })
      rows.push({ label: "Close", accessor: closeAccessor! as Acc, format: yFormat })
    } else {
      rows.push({ label: "High", accessor: highAccessor as Acc, role: "y", format: yFormat })
      rows.push({ label: "Low", accessor: lowAccessor as Acc, format: yFormat })
    }
    return buildDefaultTooltip(rows)
  }, [xAccessor, xLabel, xFormat, yFormat, highAccessor, lowAccessor, openAccessor, closeAccessor, isRange])

  const validationError = validateArrayData({
    componentName: "CandlestickChart",
    data: data,
    accessors: {
      xAccessor, highAccessor, lowAccessor,
      ...(!isRange && { openAccessor: openAccessor!, closeAccessor: closeAccessor! }),
    },
  })

  // yAccessor on the frame drives scale extent. Use high by default so the
  // scale fits the bars; the scene builder reads high/low/open/close directly
  // off the data rather than from yAccessor.
  //
  // scalePadding scales with width so the leftmost/rightmost bars don't get
  // clipped, without eating a quarter of a sparkline canvas. Roughly: primary
  // 600 → 12, context 400 → 10, sparkline 120 → 3. The scene builder caps
  // bodyWidth to fit within the resulting usable range.
  // extentPadding drops to 2% at small widths; the 10% frame default steals
  // ~4px out of a 20px-tall sparkline. Both are overridable via `frameProps`
  // because `...frameProps` spreads below and wins on conflict.
  const scalePadding = Math.max(2, Math.min(12, Math.round(width / 40)))
  const extentPadding = width <= 200 ? 0.02 : 0.1
  const streamProps: StreamXYFrameProps = {
    chartType: "candlestick",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor: highAccessor,
    highAccessor,
    lowAccessor,
    ...(!isRange && { openAccessor, closeAccessor }),
    ...(candlestickStyle && { candlestickStyle }),
    scalePadding,
    extentPadding,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(props.pointIdAccessor && { pointIdAccessor: props.pointIdAccessor }),
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      // CandlestickChart has no `hoverHighlight` prop, but the click
      // predicate still includes `linkedHover` (cross-chart click-to-lock).
      linkedHover, onObservation, onClick,
      customHoverBehavior, customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...crosshairFrameProps,
    ...frameProps,
  }

  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (validationError) return <ChartError componentName="CandlestickChart" message={validationError} width={width} height={height} />

  return (
    <SafeRender componentName="CandlestickChart" width={width} height={height}>
      <StreamXYFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: CandlestickChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
CandlestickChart.displayName = "CandlestickChart"
