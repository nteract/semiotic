"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, MarginalGraphicsConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getColor, getSize } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useChartMode, DEFAULT_COLOR } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import { mergeShapeStyle } from "../shared/mergeShapeStyle"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
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
  annotations?: Datum[]
  /** Fixed x domain `[min, max]` (either bound may be undefined to leave that side data-derived). */
  xExtent?: [number | undefined, number | undefined] | [number]
  /** Fixed y domain `[min, max]` (either bound may be undefined to leave that side data-derived). */
  yExtent?: [number | undefined, number | undefined] | [number]
  /** Additional StreamXYFrame props for advanced customization */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * Scatterplot - Visualize relationships between two continuous variables.
 *
 * Each row becomes a circle at `(xAccessor, yAccessor)`. Add a third
 * dimension via {@link BubbleChart} (size encoding) or
 * {@link ConnectedScatterplot} (point ordering). For matrix views of every
 * pairwise combination, use {@link ScatterplotMatrix}.
 *
 * @example
 * ```tsx
 * // Simple scatter
 * <Scatterplot
 *   data={[{ x: 1, y: 10 }, { x: 2, y: 20 }]}
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Color by category, marginal histograms in axis margins
 * <Scatterplot
 *   data={observations}
 *   xAccessor="age"
 *   yAccessor="income"
 *   colorBy="region"
 *   showLegend
 *   marginalGraphics={{ x: "histogram", y: "histogram" }}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Hover-highlight non-hovered series + click handler
 * <Scatterplot
 *   data={observations}
 *   xAccessor="x"
 *   yAccessor="y"
 *   colorBy="cluster"
 *   hoverHighlight
 *   onClick={(d) => console.log(d)}
 * />
 * ```
 */
export const Scatterplot = forwardRef(function Scatterplot<TDatum extends Datum = Datum>(props: ScatterplotProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    colorScheme,
    sizeBy,
    sizeRange = [3, 15],
    pointRadius = 5,
    pointOpacity = 0.8,
    tooltip,
    marginalGraphics,
    pointIdAccessor,
    annotations,
    xExtent,
    yExtent,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush,
    onObservation,
    onClick,
    hoverHighlight,
    chartId,
    loading,
    emptyContent,
    legendInteraction,
    legendPosition: legendPositionProp,
    color,
    stroke,
    strokeWidth,
    opacity,
  } = props

  const { width, height, enableHover, showGrid, showLegend, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  const safeData = useMemo(() => filterSparseArray(data), [data])

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
    onClick,
    hoverHighlight,
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
    return (d: Datum) => {
      const baseStyle: Record<string, string | number> = { fillOpacity: pointOpacity }
      if (colorBy) {
        if (setup.colorScale) baseStyle.fill = getColor(d, colorBy, setup.colorScale)
        // else: let frame use its own color scheme (push API)
      } else {
        baseStyle.fill = color || DEFAULT_COLOR
      }
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, setup.colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity, color])

  // Overlay top-level primitive style props (stroke/strokeWidth/opacity) last
  // so they win over the HOC base style and any per-datum color resolution.
  const pointStyleWithPrimitives = useMemo(
    () => mergeShapeStyle(basePointStyle, { stroke, strokeWidth, opacity }),
    [basePointStyle, stroke, strokeWidth, opacity]
  )

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(pointStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection),
    [pointStyleWithPrimitives, setup.effectiveSelectionHook, setup.resolvedSelection]
  )

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
    ...(sizeBy ? [{ label: accessorName(sizeBy), accessor: sizeBy, role: "size" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, colorBy, sizeBy, xFormat, yFormat])

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
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(marginalGraphics && { marginalGraphics }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...(brushConfig && { brush: { dimension: brushDimension }, onBrush }),
    ...setup.crosshairProps,
    ...frameProps
  }

  return <SafeRender componentName="Scatterplot" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: ScatterplotProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
Scatterplot.displayName = "Scatterplot"
