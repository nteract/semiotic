"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import { registerXYPlugin } from "../../stream/xyPlugins/registry"
import { waterfallXYPlugin } from "../../stream/xyPlugins/waterfallPlugin"
import type { StreamXYFrameProps, StreamXYFrameHandle, WaterfallStyle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useChartSetup } from "../shared/useChartSetup"
import { resolveXYFramePropsAxisChrome } from "../../legendLayout"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"

registerXYPlugin(waterfallXYPlugin)

export interface WaterfallChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  data?: TDatum[]
  xAccessor?: ChartAccessor<TDatum, number | Date | string>
  yAccessor?: ChartAccessor<TDatum, number>
  /** Stable ID for push-mode remove() and update(). */
  pointIdAccessor?: ChartAccessor<TDatum, string>
  xScaleType?: "linear" | "log" | "time"
  positiveColor?: string
  negativeColor?: string
  connectorStroke?: string
  connectorWidth?: number
  gap?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  legendInteraction?: LegendInteractionMode
  legendPosition?: LegendPosition
  tooltip?: TooltipProp
  annotations?: Datum[]
  xExtent?: [number | undefined, number | undefined] | [number]
  yExtent?: [number | undefined, number | undefined] | [number]
  frameProps?: Partial<Omit<StreamXYFrameProps, "data" | "size" | "chartType">>
}

/**
 * WaterfallChart — cumulative signed steps as floating bars.
 *
 * Each row is a delta. Positive values step up from the previous cumulative
 * total; negative values step down. Use {@link RealtimeWaterfallChart} for
 * a push-driven window of the same geometry.
 *
 * @example
 * ```tsx
 * <WaterfallChart
 *   data={[
 *     { step: "Start", value: 100 },
 *     { step: "Sales", value: 40 },
 *     { step: "Costs", value: -25 },
 *     { step: "Tax", value: -10 },
 *   ]}
 *   xAccessor="step"
 *   yAccessor="value"
 * />
 * ```
 */
export const WaterfallChart = forwardRef(function WaterfallChart<TDatum extends Datum = Datum>(
  props: WaterfallChartProps<TDatum>,
  ref: React.Ref<RealtimeFrameHandle>
) {
  const frameRef = useRef<StreamXYFrameHandle>(null)
  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
    mobileInteraction: props.mobileInteraction,
    mobileSemantics: props.mobileSemantics,
    responsiveRules: props.responsiveRules,
  })

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    pointIdAccessor,
    xScaleType,
    positiveColor,
    negativeColor,
    connectorStroke,
    connectorWidth,
    gap,
    tooltip,
    annotations,
    xExtent,
    yExtent,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    onClick,
    hoverHighlight,
    chartId,
    loading,
    loadingContent,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, xLabel, yLabel } = resolved
  const safeData = useMemo(() => filterSparseArray(data), [data])
  const pushXRef = useRef({
    next: 0,
    indexOf: new WeakMap<object, number>(),
    idOf: new Map<string, number>(),
    labels: new Map<number, unknown>(),
  })
  const { plotData, plotXAccessor, plotXFormat, usesIndex } = useMemo(() => {
    const readX = typeof xAccessor === "function"
      ? xAccessor
      : (d: Datum) => d[xAccessor as string]
    const readId = pointIdAccessor
      ? typeof pointIdAccessor === "function"
        ? pointIdAccessor
        : (d: Datum) => d[pointIdAccessor as string]
      : undefined
    const isNumericOrDate = (raw: unknown): raw is number | Date =>
      (typeof raw === "number" && Number.isFinite(raw)) || raw instanceof Date
    const formatTick = (original: unknown, v: number | Date | string) => {
      const value = (original ?? v) as number | Date | string
      return xFormat ? xFormat(value) : String(value)
    }
    const needsIndex = data == null || safeData.some((d, i) => !isNumericOrDate(readX(d, i)))
    if (!needsIndex) {
      return { plotData: safeData, plotXAccessor: xAccessor, plotXFormat: xFormat, usesIndex: false }
    }
    if (data != null) {
      const labels = safeData.map((d, i) => readX(d, i))
      return {
        plotData: safeData.map((d, i) => ({ ...d, __waterfallX: i })),
        plotXAccessor: "__waterfallX",
        plotXFormat: (v: number | Date | string) => formatTick(labels[Number(v)], v),
        usesIndex: true,
      }
    }
    const state = pushXRef.current
    const remember = (d: Datum, idx: number, id: string, raw: unknown) => {
      if (d && typeof d === "object") {
        state.indexOf.set(d, idx)
        if (!Object.isFrozen(d) && !Object.isSealed(d)) {
          (d as Datum & { __waterfallX?: number }).__waterfallX = idx
        }
      }
      if (id) state.idOf.set(id, idx)
      state.labels.set(idx, raw)
    }
    return {
      plotData: safeData,
      plotXAccessor: (d: Datum, i?: number) => {
        const raw = readX(d, i)
        if (isNumericOrDate(raw)) return raw
        const id = readId ? String(readId(d, i) ?? "") : ""
        const stamped = d && typeof d === "object"
          ? (d as Datum & { __waterfallX?: number }).__waterfallX
          : undefined
        const existing = (typeof stamped === "number" && Number.isFinite(stamped))
          ? stamped
          : (d && typeof d === "object" ? state.indexOf.get(d) : undefined)
            ?? (id ? state.idOf.get(id) : undefined)
        if (typeof existing === "number") {
          remember(d, existing, id, raw)
          return existing
        }
        const idx = typeof i === "number" ? i : state.next
        state.next = Math.max(state.next, idx + 1)
        remember(d, idx, id, raw)
        return idx
      },
      plotXFormat: (v: number | Date | string) => formatTick(state.labels.get(Number(v)), v),
      usesIndex: true,
    }
  }, [data, safeData, xAccessor, xFormat, pointIdAccessor])

  const setup = useChartSetup({
    data: plotData,
    rawData: data,
    colorBy: undefined,
    colorScheme: undefined,
    legendInteraction,
    legendPosition: legendPositionProp,
    frameLegend: frameProps,
    selection,
    linkedHover,
    fallbackFields: [typeof xAccessor === "string" ? xAccessor : "x"],
    unwrapData: false,
    onObservation,
    onClick,
    hoverHighlight,
    mobileInteraction: resolved.mobileInteraction,
    mobileSemantics: resolved.mobileSemantics,
    chartType: "WaterfallChart",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    loadingContent,
    emptyContent,
    width,
    height,
    hasTitle: !!title,
    axisChrome: resolveXYFramePropsAxisChrome(frameProps, { showAxes: resolved.showAxes, xLabel, yLabel }),
  })

  const waterfallStyle = useMemo<WaterfallStyle>(() => ({
    positiveColor,
    negativeColor,
    connectorStroke,
    connectorWidth,
    gap,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    opacity: props.opacity,
  }), [positiveColor, negativeColor, connectorStroke, connectorWidth, gap, props.stroke, props.strokeWidth, props.opacity])

  const defaultTooltipContent = useMemo(
    () => buildDefaultTooltip([
      { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
      { label: yLabel || "Change", accessor: yAccessor, role: "y", format: yFormat },
    ]),
    [xAccessor, yAccessor, xLabel, yLabel, xFormat, yFormat]
  )

  if (setup.earlyReturn) return setup.earlyReturn

  const error = validateArrayData({
    componentName: "WaterfallChart",
    data,
    accessors: { xAccessor, yAccessor },
  })
  if (error) return <ChartError componentName="WaterfallChart" message={error} width={width} height={height} />

  const streamProps: StreamXYFrameProps = {
    chartType: "waterfall",
    ...(data != null && { data: plotData }),
    xAccessor: plotXAccessor,
    yAccessor,
    xScaleType: data != null && usesIndex ? "linear" : xScaleType,
    waterfallStyle,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat: plotXFormat,
    yFormat,
    enableHover,
    showGrid,
    ...setup.legendBehaviorProps,
    ...buildBaseMetadataProps({
      title,
      description,
      summary,
      accessibleTable,
      className,
      animate: props.animate,
      maxDevicePixelRatio: props.maxDevicePixelRatio,
      axisExtent: props.axisExtent,
      autoPlaceAnnotations: props.autoPlaceAnnotations,
    }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover,
      selection,
      onObservation,
      onClick,
      hoverHighlight,
      hoverRadius: props.hoverRadius,
      mobileInteraction: setup.mobileInteraction,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...frameProps,
  }

  return (
    <SafeRender componentName="WaterfallChart" width={width} height={height}>
      <StreamXYFrame ref={frameRef} {...streamProps} />
    </SafeRender>
  )
}) as unknown as {
  <TDatum extends Datum = Datum>(props: WaterfallChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
WaterfallChart.displayName = "WaterfallChart"
