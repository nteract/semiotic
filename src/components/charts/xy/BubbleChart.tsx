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
import { useChartMode } from "../shared/hooks"
import type { LegendInteractionMode, LegendPosition } from "../shared/hooks"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"
import { useChartSetup } from "../shared/useChartSetup"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import { useXYPointStyle } from "../shared/useXYPointStyle"
import { useEncodingDomain } from "../shared/useEncodingDomain"
import { buildRegressionAnnotation, type RegressionProp } from "../shared/regressionUtils"

/**
 * BubbleChart component props
 */
export interface BubbleChartProps<TDatum extends Datum = Datum> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points. Each point should have x, y, and size properties.
   * @example
   * ```ts
   * [{x: 1, y: 10, size: 50, category: 'A'}, {x: 2, y: 20, size: 30, category: 'B'}]
   * ```
   */
  data?: TDatum[]

  /**
   * Field name or function to access x values
   * @default "x"
   */
  xAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to access y values
   * @default "y"
   */
  yAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to determine bubble size (required)
   * @example
   * ```ts
   * sizeBy="population"
   * sizeBy={d => Math.sqrt(d.value)}
   * ```
   */
  sizeBy: ChartAccessor<TDatum, number>

  /**
   * Min and max radius for bubbles
   * @default [5, 40]
   */
  sizeRange?: [number, number]

  /**
   * Field name or function to determine bubble color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.value > 10 ? 'red' : 'blue'}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Bubble opacity
   * @default 0.6
   */
  bubbleOpacity?: number

  /**
   * Bubble stroke width
   * @default 1
   */
  bubbleStrokeWidth?: number

  /**
   * Bubble stroke color
   * @default "white"
   */
  bubbleStrokeColor?: string

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show grid lines
   * @default false
   */
  showGrid?: boolean

  /**
   * Show legend
   * @default true (when colorBy is specified)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Marginal distribution plots in axis margins
   */
  marginalGraphics?: MarginalGraphicsConfig

  /** Accessor for unique point IDs, used by point-anchored annotations */
  pointIdAccessor?: ChartAccessor<TDatum, string>

  /**
   * Legend interaction mode.
   * - "highlight": hover dims non-hovered categories to 30% opacity
   * - "isolate": click toggles category visibility with checkmark indicators
   * - "none": static legend (default)
   */
  legendInteraction?: LegendInteractionMode

  /**
   * Legend position
   */
  legendPosition?: LegendPosition

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Datum[]

  /**
   * Overlay a regression line on the bubbles. Accepts `true` (linear
   * with default styling), a method name (`"linear"` | `"polynomial"`
   * | `"loess"`), or a full `RegressionConfig`. Sugar over the `trend`
   * annotation — drop into the `annotations` array directly for richer
   * setups.
   */
  regression?: RegressionProp

  /** Fixed x domain `[min, max]` (either bound may be undefined to leave that side data-derived). */
  xExtent?: [number | undefined, number | undefined] | [number]
  /** Fixed y domain `[min, max]` (either bound may be undefined to leave that side data-derived). */
  yExtent?: [number | undefined, number | undefined] | [number]

  /**
   * Additional StreamXYFrame props for advanced customization
   * For full control, consider using StreamXYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<StreamXYFrameProps, "chartType" | "data" | "size">>
}

/**
 * BubbleChart - Visualize three dimensions of data using x, y, and size
 *
 * A simplified wrapper around StreamXYFrame for creating bubble charts. Perfect for
 * showing relationships between three continuous variables or comparing
 * magnitudes across categories.
 *
 * @example
 * ```tsx
 * // Simple bubble chart
 * <BubbleChart
 *   data={[
 *     {x: 1, y: 10, size: 50, name: 'A'},
 *     {x: 2, y: 20, size: 30, name: 'B'},
 *     {x: 3, y: 15, size: 70, name: 'C'}
 *   ]}
 *   sizeBy="size"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With color encoding
 * <BubbleChart
 *   data={data}
 *   sizeBy="population"
 *   colorBy="continent"
 *   sizeRange={[5, 50]}
 *   bubbleOpacity={0.7}
 *   xLabel="GDP per Capita"
 *   yLabel="Life Expectancy"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Override StreamXYFrame props
 * <BubbleChart
 *   data={data}
 *   sizeBy="value"
 *   frameProps={{
 *     customPointMark: ({ d }) => <circle r={d.r} fill="gold" />
 *   }}
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link StreamXYFrame} with sensible defaults for bubble charts.
 * For more advanced features like custom marks, annotations, or complex interactions,
 * use StreamXYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any StreamXYFrame prop
 * - See StreamXYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All StreamXYFrame props are available via `frameProps`
 *
 * @param props - BubbleChart configuration
 * @returns Rendered bubble chart
 */
export const BubbleChart = forwardRef(function BubbleChart<TDatum extends Datum = Datum>(props: BubbleChartProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
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
    sizeBy,
    sizeRange = [5, 40],
    colorBy,
    colorScheme,
    bubbleOpacity = 0.6,
    bubbleStrokeWidth = 1,
    bubbleStrokeColor = "white",
    tooltip,
    marginalGraphics,
    pointIdAccessor,
    annotations,
    regression,
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
    chartType: "BubbleChart",
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

  // ── Encoding domain (sizeBy) — bounded + push-mode tracking ──────────
  // The shared `useEncodingDomain` hook owns the running min/max
  // across both bounded data and ref-pushed items. The HOC wraps
  // the frame's push/pushMany to feed the hook before delegating.
  const {
    domain: sizeDomain,
    trackPushed: trackSizeDomain,
    reset: resetSizeDomain,
  } = useEncodingDomain<Datum>({
    accessor: sizeBy,
    data: safeData,
    isPushMode,
  })

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

  // Wrapped push/pushMany add streaming-size-domain tracking; clear
  // also resets that domain. Other 5 methods get the vanilla XY
  // defaults from the helper.
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

  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const _brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // ── Core chart logic ───────────────────────────────────────────────────

  // Bubble's chart-shape defaults (default stroke + width) ride
  // through `baseStyleExtras`. sizeBy is mandatory on BubbleChart, so
  // `radiusFn` is always set.
  //
  // `baseStyleExtras` and `radiusFn` are useMemo-stabilized because
  // both are deps of `useXYPointStyle`'s internal memo — passing
  // inline literals would re-allocate the helper's `pointStyle` fn
  // on every render even when nothing changed.
  const bubbleBaseExtras = useMemo(
    () => ({ stroke: bubbleStrokeColor, strokeWidth: bubbleStrokeWidth }),
    [bubbleStrokeColor, bubbleStrokeWidth],
  )
  // Push-mode initial state — no values seen yet → domain undefined.
  // Fall back to `[0, 1]` so `getSize` switches into its scaling
  // branch; the internal clamp then bounds the radius to `sizeRange`
  // even when the first pushed value is outside `[0, 1]` (otherwise
  // the un-clamped linear scale would produce arbitrarily large
  // pixel radii). Memoized so the fallback doesn't churn the radius
  // fn.
  const effectiveSizeDomain = useMemo<[number, number]>(
    () => sizeDomain ?? [0, 1],
    [sizeDomain],
  )
  const bubbleRadiusFn = useCallback(
    (d: Datum) => getSize(d, sizeBy, sizeRange, effectiveSizeDomain),
    [sizeBy, sizeRange, effectiveSizeDomain],
  )

  const pointStyle = useXYPointStyle({
    colorBy, colorScale: setup.colorScale, color,
    fillOpacity: bubbleOpacity,
    radiusFn: bubbleRadiusFn,
    baseStyleExtras: bubbleBaseExtras,
    stroke, strokeWidth, opacity,
    effectiveSelectionHook: setup.effectiveSelectionHook,
    resolvedSelection: setup.resolvedSelection,
  })

  // Default tooltip showing all configured fields. `xFormat`/`yFormat`
  // cascade from the HOC so the tooltip values read the same way as the axis.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    { label: accessorName(sizeBy), accessor: sizeBy, role: "size" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, sizeBy, colorBy, xFormat, yFormat])

  // Loading / empty state — returned only after every hook above has run, so
  // the hook count is identical whether or not data is present. Mounting empty
  // (loading skeleton, 0 bubbles) and then streaming in data must not change
  // the number of hooks between renders, or React throws "Rendered more hooks
  // than during the previous render."
  if (setup.earlyReturn) return setup.earlyReturn

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "BubbleChart",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
    },
    requiredProps: { sizeBy },
  })
  if (error) return <ChartError componentName="BubbleChart" message={error} width={width} height={height} />

  // Splice the `regression` sugar into annotations as a `trend`
  // annotation. Trend goes first so user-supplied annotations paint
  // above it.
  const trendAnn = buildRegressionAnnotation(regression)
  const resolvedAnnotations = trendAnn
    ? [trendAnn, ...(annotations || [])]
    : annotations

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "bubble",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy,
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
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent }),
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
    ...setup.crosshairProps,
    ...frameProps
  }

  return <SafeRender componentName="BubbleChart" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: BubbleChartProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
BubbleChart.displayName = "BubbleChart"
