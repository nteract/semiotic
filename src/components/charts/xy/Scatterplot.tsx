"use client"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef, useImperativeHandle } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, MarginalGraphicsConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, getSize } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { useChartSetup } from "../shared/useChartSetup"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points. Each point should have x and y properties. */
  data?: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to access y values @default "y" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** Field name or function to determine point color */
  colorBy?: ChartAccessor<TDatum, string>
  /** Color scheme for categorical data or custom colors array @default "category10" */
  colorScheme?: string | string[]
  /** Field name or function to determine point size */
  sizeBy?: ChartAccessor<TDatum, number>
  /** Min and max radius for points @default [3, 15] */
  sizeRange?: [number, number]
  /** Default point radius when sizeBy is not specified @default 5 */
  pointRadius?: number
  /** Point opacity @default 0.8 */
  pointOpacity?: number
  /** Enable hover annotations @default true */
  enableHover?: boolean
  /** Show grid lines @default false */
  showGrid?: boolean
  /** Show legend @default true (when colorBy is specified) */
  showLegend?: boolean
  /** Tooltip configuration */
  tooltip?: TooltipProp
  /** Marginal distribution plots in axis margins */
  marginalGraphics?: MarginalGraphicsConfig
  /** Accessor for unique point IDs, used by point-anchored annotations */
  pointIdAccessor?: ChartAccessor<TDatum, string>
  /** Legend interaction mode */
  legendInteraction?: LegendInteractionMode
  /** Legend position */
  legendPosition?: LegendPosition
  /** Annotation objects to render on the chart */
  annotations?: Record<string, any>[]
  /** Additional StreamXYFrame props for advanced customization */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * Scatterplot - Visualize relationships between two continuous variables
 *
 * @example
 * ```tsx
 * <Scatterplot
 *   data={[{x: 1, y: 10}, {x: 2, y: 20}]}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 */
export const Scatterplot = forwardRef(function Scatterplot<TDatum extends Record<string, any> = Record<string, any>>(props: ScatterplotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useImperativeHandle(ref, () => ({
    push: (point) => frameRef.current?.push(point),
    pushMany: (points) => frameRef.current?.pushMany(points),
    clear: () => frameRef.current?.clear(),
    getData: () => frameRef.current?.getData() ?? []
  }))

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: props.showGrid,
    enableHover: props.enableHover,
    showLegend: props.showLegend,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
  })

  const {
    data,
    margin: userMargin,
    className,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    colorBy,
    colorScheme = "category10",
    sizeBy,
    sizeRange = [3, 15],
    pointRadius = 5,
    pointOpacity = 0.8,
    tooltip,
    marginalGraphics,
    pointIdAccessor,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush,
    onObservation,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const showGrid = resolved.showGrid
  const showLegend = resolved.showLegend
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  const safeData = data || []

  // ── Shared setup (color, legend, selection, loading/empty) ────────────
  const setup = useChartSetup({
    data: safeData,
    rawData: data,
    colorBy,
    colorScheme,
    legendInteraction,
    legendPosition: legendPositionProp,
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: false,
    onObservation,
    chartType: "Scatterplot",
    chartId,
    showLegend,
    userMargin,
    marginDefaults: resolved.marginDefaults,
    loading,
    emptyContent,
    width,
    height,
  })

  // ── Brush (Scatterplot-specific) ───────────────────────────────────────
  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // Translate StreamXYFrame onBrush format to useBrushSelection format
  const brushDimension = brushConfig
    ? (brushHook.brushInteraction.brush === "xyBrush" ? "xy" : brushHook.brushInteraction.brush === "xBrush" ? "x" : "y")
    : undefined

  // Stabilize with ref so the callback identity never changes —
  // otherwise the BrushOverlay effect re-runs and clears the active brush
  const brushInteractionRef = React.useRef(brushHook.brushInteraction)
  brushInteractionRef.current = brushHook.brushInteraction

  const onBrush = useCallback(
    (extent: { x: [number, number]; y: [number, number] } | null) => {
      const bi = brushInteractionRef.current
      if (!extent) {
        bi.end(null)
        return
      }
      if (bi.brush === "xyBrush") {
        bi.end([[extent.x[0], extent.y[0]], [extent.x[1], extent.y[1]]])
      } else if (bi.brush === "xBrush") {
        bi.end(extent.x)
      } else {
        bi.end(extent.y)
      }
    },
    [] // stable — reads from ref
  )

  if (setup.earlyReturn) return setup.earlyReturn

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("Scatterplot", safeData, "xAccessor", xAccessor)
  warnMissingField("Scatterplot", safeData, "yAccessor", yAccessor)

  // ── Core chart logic ───────────────────────────────────────────────────

  const sizeDomain = useMemo(() => {
    if (!sizeBy || safeData.length === 0) return undefined
    const sizes = safeData.map((d) =>
      typeof sizeBy === "function" ? sizeBy(d) : d[sizeBy]
    )
    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      baseStyle.fill = colorBy ? getColor(d, colorBy, setup.colorScale) : DEFAULT_COLOR
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, setup.colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, setup.effectiveSelectionHook, selection),
    [basePointStyle, setup.effectiveSelectionHook, selection]
  )

  // Default tooltip showing all configured fields
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
    ...(sizeBy ? [{ label: accessorName(sizeBy), accessor: sizeBy, role: "size" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, colorBy, sizeBy])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "Scatterplot",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="Scatterplot" message={error} width={width} height={height} />

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy || undefined,
    sizeRange,
    pointStyle,
    colorScheme,
    size: [width, height],
    responsiveWidth: props.responsiveWidth,
    responsiveHeight: props.responsiveHeight,
    margin: setup.margin,
    showAxes: resolved.showAxes,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...setup.legendBehaviorProps,
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: tooltip === false
      ? () => null
      : (normalizeTooltip(tooltip) || defaultTooltipContent),
    ...((linkedHover || onObservation) && { customHoverBehavior: setup.customHoverBehavior }),
    ...(marginalGraphics && { marginalGraphics }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(brushConfig && { brush: { dimension: brushDimension }, onBrush }),
    ...frameProps
  }

  return <SafeRender componentName="Scatterplot" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Record<string, any> = Record<string, any>>(props: ScatterplotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
Scatterplot.displayName = "Scatterplot"
