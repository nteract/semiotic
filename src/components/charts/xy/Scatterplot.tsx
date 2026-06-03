"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import * as React from "react"
import { useMemo, useCallback, forwardRef, useRef } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle, MarginalGraphicsConfig } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { getSize } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { SafeRender, warnMissingField } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useXYPointStyle } from "../shared/useXYPointStyle"
import { useEncodingDomain } from "../shared/useEncodingDomain"
import { buildRegressionAnnotation, type RegressionProp } from "../shared/regressionUtils"
import { useSeriesFeatures } from "../shared/useSeriesFeatures"
import type { ForecastConfig, AnomalyConfig } from "../shared/statisticalOverlays"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /** Array of data points. Each point should have x and y properties. */
  data?: TDatum[]
  /** Field name or function to access x values @default "x" */
  xAccessor?: ChartAccessor<TDatum, number | Date | string>
  /** Field name or function to access y values @default "y" */
  yAccessor?: ChartAccessor<TDatum, number>
  /** X scale type @default "linear" */
  xScaleType?: "linear" | "log" | "time"
  /** Y scale type @default "linear" */
  yScaleType?: "linear" | "log"
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
  /**
   * Overlay a regression line on the scatter. Accepts:
   * - `true` — linear regression with default styling
   * - `"linear"` | `"polynomial"` | `"loess"` — pick a method
   * - `RegressionConfig` — full control (method, bandwidth, order,
   *   color, strokeWidth, strokeDasharray, label)
   *
   * Sugar over `annotations={[{ type: "trend", … }]}` — for richer
   * setups (multiple regression lines, custom anchoring) drop into
   * the annotations array directly.
   *
   * @example
   * ```tsx
   * <Scatterplot data={d} xAccessor="x" yAccessor="y" regression />
   * <Scatterplot data={d} xAccessor="x" yAccessor="y" regression="loess" />
   * <Scatterplot data={d} xAccessor="x" yAccessor="y"
   *   regression={{ method: "polynomial", order: 3, color: "#ef4444", label: "Cubic" }} />
   * ```
   */
  regression?: RegressionProp
  /**
   * Forecast overlay — extends the scatter with tagged future
   * points + (optional) confidence-envelope annotations. Same shape
   * as LineChart's `forecast` prop.
   */
  forecast?: ForecastConfig
  /**
   * Anomaly overlay — adds a ±σ band annotation and per-point
   * anomaly dots. Standalone (without forecast) gives raw anomaly
   * detection on the scatter.
   */
  anomaly?: AnomalyConfig
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
    xScaleType,
    yScaleType,
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
    regression,
    forecast,
    anomaly,
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
    loadingContent,
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
  const isPushMode = data === undefined

  // ── Encoding domain (sizeBy) — bounded + push-mode tracking ──────────
  // When `sizeBy` is set and the user streams data via ref, the
  // domain has to be tracked from pushed values; otherwise the
  // domain comes straight from bounded data. The shared hook owns
  // the running min/max and the version counter that triggers
  // radius-fn recompute on each new min/max.
  const {
    domain: sizeDomain,
    trackPushed: trackSizeDomain,
    reset: resetSizeDomain,
  } = useEncodingDomain<Datum>({
    accessor: sizeBy,
    data: safeData,
    isPushMode,
  })

  // Wrap push/pushMany/clear so sizeBy-driven radii stay in sync
  // when the chart is driven through a ref. Other handle methods
  // get the vanilla XY defaults from the helper.
  const wrappedPush = useCallback(
    (d: Datum) => {
      trackSizeDomain([d])
      frameRef.current?.push(d)
    },
    [trackSizeDomain]
  )
  const wrappedPushMany = useCallback(
    (d: Datum[]) => {
      trackSizeDomain(d)
      frameRef.current?.pushMany(d)
    },
    [trackSizeDomain]
  )

  useFrameImperativeHandle(ref, {
    variant: "xy",
    frameRef,
    overrides: {
      push: wrappedPush,
      pushMany: wrappedPushMany,
      clear: () => {
        resetSizeDomain()
        frameRef.current?.clear()
      },
    },
    deps: [wrappedPush, wrappedPushMany, resetSizeDomain],
  })

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
    loadingContent,
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

  // ── Dev-mode warnings ─────────────────────────────────────────────────
  warnMissingField("Scatterplot", safeData, "xAccessor", xAccessor)
  warnMissingField("Scatterplot", safeData, "yAccessor", yAccessor)

  // ── Core chart logic ───────────────────────────────────────────────────
  // `sizeDomain` comes from the shared `useEncodingDomain` hook
  // above — same value in bounded mode, push-mode-tracked when
  // streaming.

  // Push-mode initial state — first pushed point arrives before the
  // domain-update setState re-renders, so `sizeDomain` is undefined
  // for one render. The `[0, 1]` fallback combined with `getSize`'s
  // internal clamp keeps the radius inside `sizeRange` even when the
  // pushed value is well outside `[0, 1]`: the value normalizes
  // above 1, then clamps to maxSize. Harmless in bounded mode
  // because `sizeDomain` is non-null whenever data is non-empty.
  const effectiveSizeDomain = useMemo<[number, number] | undefined>(
    () => sizeBy ? (sizeDomain ?? [0, 1]) : undefined,
    [sizeBy, sizeDomain],
  )

  // useMemo'd because `radiusFn` is a dep of useXYPointStyle's
  // internal memo — passing an inline literal would re-allocate the
  // returned `pointStyle` on every render.
  const sizedRadiusFn = useMemo(
    () => sizeBy ? (d: Datum) => getSize(d, sizeBy, sizeRange, effectiveSizeDomain) : undefined,
    [sizeBy, sizeRange, effectiveSizeDomain],
  )

  const pointStyle = useXYPointStyle({
    colorBy, colorScale: setup.colorScale, color,
    pointRadius, fillOpacity: pointOpacity,
    radiusFn: sizedRadiusFn,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
  })

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
    ...(sizeBy ? [{ label: accessorName(sizeBy), accessor: sizeBy, role: "size" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, colorBy, sizeBy, xFormat, yFormat])

  // ── Statistical features (forecast + anomaly overlays) ────────────────
  // Shared hook with LineChart/AreaChart — produces post-forecast
  // data (tagged future points) + envelope/anomaly annotations.
  const {
    effectiveData: featureEffectiveData,
    statisticalAnnotations,
  } = useSeriesFeatures({
    data: safeData as Datum[],
    xAccessor, yAccessor,
    forecast, anomaly,
  })

  // Splice the `regression` sugar + statistical overlays into the
  // annotations array. Order: trend regression first (paints under),
  // then user annotations, then statistical (envelope, anomaly band /
  // dots) — envelope tends to be background-shaded so it sits at the
  // top of the annotation list and is rendered first by the frame.
  const resolvedAnnotations = useMemo(() => {
    const trendAnn = buildRegressionAnnotation(regression)
    const userAnns = annotations || []
    if (!trendAnn && statisticalAnnotations.length === 0) return annotations
    return [
      ...(trendAnn ? [trendAnn] : []),
      ...userAnns,
      ...statisticalAnnotations,
    ]
  }, [regression, annotations, statisticalAnnotations])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 points) and then streaming in data must not change the
  // number of hooks between renders, or React throws "Rendered more hooks than
  // during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

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
    // Use featureEffectiveData when forecast/anomaly is active so
    // post-forecast tagged points flow into the frame; otherwise
    // the hook returns safeData unchanged (same reference).
    ...(data != null && { data: featureEffectiveData }),
    xAccessor,
    yAccessor,
    xScaleType,
    yScaleType,
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
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, onObservation, onClick, hoverHighlight,
      customHoverBehavior: setup.customHoverBehavior,
      customClickBehavior: setup.customClickBehavior,
    }),
    ...(marginalGraphics && { marginalGraphics }),
    ...(pointIdAccessor && { pointIdAccessor }),
    ...(resolvedAnnotations && resolvedAnnotations.length > 0 && { annotations: resolvedAnnotations }),
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
