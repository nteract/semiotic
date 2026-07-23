"use client"
import type { Datum } from "../shared/datumTypes"
import { filterSparseArray } from "../shared/sparseArray"
import { buildBaseMetadataProps, buildCustomBehaviorProps, buildTooltipProps } from "../shared/streamPropsHelpers"
import { useFrameImperativeHandle } from "../shared/useFrameImperativeHandle"
import * as React from "react"
import { useMemo, forwardRef, useRef } from "react"
import { scaleSequential } from "d3-scale"
import { getSequentialInterpolator } from "../shared/colorPalettes"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, StreamXYFrameHandle } from "../../stream/types"
import type { RealtimeFrameHandle } from "../../realtime/types"
import { useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction, useThemeSequential, getCrosshairProps } from "../shared/hooks"
import type { GradientLegendConfig, GradientLegendValue } from "../../types/legendTypes"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { useResolvedSelection } from "../shared/useResolvedSelection"
import { getMinMax } from "../shared/minMax"

/**
 * Heatmap component props
 */
export interface HeatmapProps<TDatum extends Datum = Datum> extends BaseChartProps {
  /**
   * Array of data points with x, y, and value properties.
   * @example
   * ```ts
   * [{x: 1, y: 1, value: 10}, {x: 1, y: 2, value: 20}, {x: 2, y: 1, value: 15}]
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
   * Field name or function to access cell values
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>

  /**
   * Label for the x-axis
   */
  xLabel?: string

  /**
   * Label for the y-axis
   */
  yLabel?: string

  /**
   * Format function for x-axis tick labels
   */
  xFormat?: (d: string | number | Date, index?: number, allTicks?: number[]) => string

  /**
   * Format function for y-axis tick labels
   */
  yFormat?: (d: number | Date | string) => string

  /**
   * Color scheme for the heatmap — any d3-scale-chromatic sequential scheme
   * name, `"custom"` (paired with `customColorScale`), or any scheme name
   * emitted by a SemioticTheme's `colors.sequential`. When unset, falls back
   * to the active theme's sequential scheme, then to `"blues"`.
   *
   * @default `theme.colors.sequential` (or `"blues"` when no ThemeProvider)
   */
  colorScheme?: "blues" | "reds" | "greens" | "viridis" | "oranges" | "purples" | "greys" | "plasma" | "inferno" | "magma" | "cividis" | "turbo" | "custom" | (string & {})

  /**
   * Custom color scale (used when colorScheme is "custom")
   * @example
   * ```ts
   * customColorScale={scaleSequential(interpolatePlasma).domain([0, 100])}
   * ```
   */
  customColorScale?: (value: number) => string

  /**
   * Show values in cells
   * @default false
   */
  showValues?: boolean

  /**
   * Format function for cell value labels
   */
  valueFormat?: (d: number) => string

  /**
   * Cell border color
   * @default "#fff"
   */
  cellBorderColor?: string

  /**
   * Cell border width
   * @default 1
   */
  cellBorderWidth?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Show a gradient legend for the color scale.
   * @default false
   */
  showLegend?: boolean

  /**
   * Position of the gradient legend.
   * @default "right"
   */
  legendPosition?: "right" | "left" | "top" | "bottom"

  /** Gradient legend layout overrides. */
  legend?: Pick<GradientLegendValue, "legendDistance">

  /**
   * Legend interaction mode.
   * - "highlight": hover dims non-hovered categories to 30% opacity
   * - "isolate": click toggles category visibility with checkmark indicators
   * - "none": static legend (default)
   */
  legendInteraction?: LegendInteractionMode

  /**
   * Annotation objects to render on the chart
   */
  annotations?: Datum[]

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
 * Heatmap - Visualize matrix data with color-encoded cells
 *
 * A simplified wrapper around StreamXYFrame for creating heatmaps. Perfect for
 * showing patterns, correlations, and distributions in 2D data.
 *
 * @example
 * ```tsx
 * // Simple heatmap
 * <Heatmap
 *   data={[
 *     {x: 1, y: 1, value: 10},
 *     {x: 1, y: 2, value: 20},
 *     {x: 2, y: 1, value: 15},
 *     {x: 2, y: 2, value: 25}
 *   ]}
 *   xLabel="Time"
 *   yLabel="Category"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With custom color scheme and value labels
 * <Heatmap
 *   data={data}
 *   colorScheme="viridis"
 *   showValues={true}
 *   valueFormat={d => d.toFixed(1)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Advanced: Custom color scale
 * <Heatmap
 *   data={data}
 *   colorScheme="custom"
 *   customColorScale={
 *     scaleSequential(interpolatePlasma).domain([0, 100])
 *   }
 * />
 * ```
 *
 * @remarks
 * This component wraps {@link StreamXYFrame} with sensible defaults for heatmaps.
 * For more advanced features like hexbins, contours, or custom summaries,
 * use StreamXYFrame directly.
 *
 * **Breadcrumb to advanced usage:**
 * - Use the `frameProps` prop to pass any StreamXYFrame prop
 * - See StreamXYFrame documentation: https://semiotic.nteract.io/guides/xy-frame
 * - All StreamXYFrame props are available via `frameProps`
 *
 * @param props - Heatmap configuration
 * @returns Rendered heatmap
 */
export const Heatmap = forwardRef(function Heatmap<TDatum extends Datum = Datum>(props: HeatmapProps<TDatum>, ref: React.Ref<RealtimeFrameHandle>) {
  const frameRef = useRef<StreamXYFrameHandle>(null)

  useFrameImperativeHandle(ref, { variant: "xy", frameRef })

  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: undefined,
    enableHover: props.enableHover,
    showLegend: undefined,
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
    xAccessor = "x",
    yAccessor = "y",
    valueAccessor = "value",
    xFormat,
    yFormat,
    colorScheme: colorSchemeProp,
    customColorScale,
    showValues = false,
    valueFormat,
    cellBorderColor = "#fff",
    cellBorderWidth = 1,
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
    showLegend: showLegendProp,
    legendPosition: legendPositionProp,
    legend: legendProp,
    legendInteraction,
    // Primitive styling props (BaseChartProps) — accepted-but-not-wired for
    // Heatmap. Cell fills come from the sequential LUT, and cell strokes use
    // the theme surface fallback; there's no per-primitive style surface for
    // user overrides to flow through.
    stroke: _stroke,
    strokeWidth: _strokeWidth,
    opacity: _opacity,
  } = props

  const { width, height, enableHover, title, description, summary, accessibleTable, xLabel, yLabel } = resolved

  // ── Loading / empty states (computed early, returned after all hooks) ───
  const loadingEl = renderLoadingState(loading, width, height, loadingContent)
  const emptyEl = !loadingEl ? renderEmptyState(data, width, height, emptyContent) : null

  const safeData = useMemo(() => filterSparseArray(data), [data])

  // Color scheme resolution priority:
  //   explicit `colorScheme` prop > ambient theme's `colors.sequential` > "blues"
  // Matches ChoroplethMap's pattern for theme-driven magnitude encoding.
  const themeSequential = useThemeSequential()
  const colorScheme = colorSchemeProp ?? themeSequential ?? "blues"

  const showLegend = showLegendProp ?? false
  const legendPosition = legendPositionProp ?? "right"

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { customHoverBehavior, customClickBehavior, crosshairSourceId } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: [],
    onObservation, onClick, chartType: "Heatmap", chartId,
    hoverHighlight,
    colorByField: undefined,
    mobileInteraction: resolved.mobileInteraction,
  })

  // `useResolvedSelection` is still called so the selection store subscribes
  // to Heatmap — consumers can read the active selection from `selection` even
  // though Heatmap itself has no per-cell selection-driven dim state.
  useResolvedSelection(selection)

  const crosshairFrameProps = getCrosshairProps(linkedHover, crosshairSourceId)

  // Legend interaction (no-op for Heatmap since no colorBy categories)
  useLegendInteraction(legendInteraction, undefined, [])

  // ── Core chart logic ───────────────────────────────────────────────────

  // Get value accessor function
  const getValueFn = useMemo(() => {
    return typeof valueAccessor === "function"
      ? (d: Datum) => (valueAccessor as (d: Datum) => number)(d)
      : (d: Datum) => d[valueAccessor]
  }, [valueAccessor])

  // Calculate value domain
  const valueDomain = useMemo(() => {
    const values = safeData.map(getValueFn)
    return getMinMax(values)
  }, [safeData, getValueFn])

  // Create color scale
  const colorScale = useMemo(() => {
    if (colorScheme === "custom" && customColorScale) {
      return customColorScale
    }

    const interpolator = getSequentialInterpolator(colorScheme as string)

    return scaleSequential(interpolator).domain(valueDomain)
  }, [colorScheme, customColorScale, valueDomain])

  const cellStyle = useMemo(() => {
    const borderWidth = Number.isFinite(cellBorderWidth)
      ? Math.max(0, cellBorderWidth)
      : 1
    return () => ({
      stroke: cellBorderColor,
      strokeWidth: borderWidth,
    })
  }, [cellBorderColor, cellBorderWidth])

  // showValues is handled natively by the canvas renderer and SSR SVG path.
  // No SVG summaryRenderMode overlay needed — the previous `summaryStyle` /
  // `summaryData` useMemos were never wired into StreamXYFrame props and were
  // removed as dead code.

  // Default tooltip showing x, y, and value. `xFormat`/`yFormat`/`valueFormat`
  // cascade from the HOC so the tooltip reads the same way as the axis / cell labels.
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x", format: xFormat },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y", format: yFormat },
    { label: accessorName(valueAccessor), accessor: valueAccessor, role: "value", format: valueFormat },
  ]), [xAccessor, yAccessor, xLabel, yLabel, valueAccessor, xFormat, yFormat, valueFormat])

  // Validate data (after all hooks)
  const validationError = validateArrayData({
    componentName: "Heatmap",
    data: data,
    accessors: {
      xAccessor,
      yAccessor,
      valueAccessor,
    },
  })

  // Build gradient legend
  const gradientLegend = useMemo(() => {
    if (!showLegend) return undefined
    const gradientConfig: GradientLegendConfig = {
      colorFn: (v: number) => colorScale(v),
      domain: valueDomain,
      label: typeof valueAccessor === "string" ? valueAccessor : "value",
      format: valueFormat,
    }
    return {
      gradient: gradientConfig,
      legendDistance: legendProp?.legendDistance,
    }
  }, [showLegend, colorScale, valueDomain, valueAccessor, valueFormat, legendProp?.legendDistance])

  // Reserve against the legend that is actually rendered. The previous
  // synthetic categorical legend measured the heatmap's raw values instead
  // of the gradient label/endpoints and could disagree with legendDistance.
  const { margin } = useChartLegendAndMargin({
    data: [],
    colorBy: undefined,
    colorScale: undefined,
    showLegend: false,
    legendPosition,
    userMargin,
    defaults: resolved.marginDefaults,
    additionalLegend: gradientLegend,
    chartWidth: width,
    legendLayout: frameProps.legendLayout,
    hasTitle: !!title,
  })

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "heatmap",
    ...(data != null && { data: safeData }),
    xAccessor,
    yAccessor,
    valueAccessor,
    colorScheme: colorScheme !== "custom" ? colorScheme : undefined,
    areaStyle: cellStyle,
    showValues,
    heatmapValueFormat: valueFormat,
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
    ...(props.pointIdAccessor && { pointIdAccessor: props.pointIdAccessor }),
    ...(gradientLegend && { legend: gradientLegend, legendPosition }),
    ...buildBaseMetadataProps({ title, description, summary, accessibleTable, className, animate: props.animate, axisExtent: props.axisExtent, autoPlaceAnnotations: props.autoPlaceAnnotations }),
    ...buildTooltipProps({ tooltip, defaultTooltipContent }),
    ...buildCustomBehaviorProps({
      linkedHover, selection, onObservation, onClick, hoverHighlight,
      mobileInteraction: resolved.mobileInteraction,
      customHoverBehavior, customClickBehavior,
    }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...(xExtent && { xExtent }),
    ...(yExtent && { yExtent }),
    ...crosshairFrameProps,
    ...frameProps
  }

  // ── Loading / empty guards (deferred to after all hooks) ───────────────
  if (loadingEl) return loadingEl
  if (emptyEl) return emptyEl
  if (validationError) return <ChartError componentName="Heatmap" message={validationError} width={width} height={height} />

  return <SafeRender componentName="Heatmap" width={width} height={height}><StreamXYFrame ref={frameRef} {...streamProps} /></SafeRender>
}) as unknown as {
  <TDatum extends Datum = Datum>(props: HeatmapProps<TDatum> & React.RefAttributes<RealtimeFrameHandle>): React.ReactElement | null
  displayName?: string
}
Heatmap.displayName = "Heatmap"
