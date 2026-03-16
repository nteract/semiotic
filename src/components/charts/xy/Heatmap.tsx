"use client"
import * as React from "react"
import { useMemo } from "react"
import { scaleSequential } from "d3-scale"
import { interpolateBlues, interpolateReds, interpolateGreens, interpolateViridis } from "d3-scale-chromatic"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { DEFAULT_COLOR, resolveAccessor, useChartSelection, useChartLegendAndMargin, useChartMode, useLegendInteraction } from "../shared/hooks"
import type { GradientLegendConfig } from "../../types/legendTypes"
import type { LegendInteractionMode } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { SafeRender, renderEmptyState, renderLoadingState } from "../shared/withChartWrapper"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

/**
 * Heatmap component props
 */
export interface HeatmapProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /**
   * Array of data points with x, y, and value properties.
   * @example
   * ```ts
   * [{x: 1, y: 1, value: 10}, {x: 1, y: 2, value: 20}, {x: 2, y: 1, value: 15}]
   * ```
   */
  data: TDatum[]

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
  xFormat?: (d: any) => string

  /**
   * Format function for y-axis tick labels
   */
  yFormat?: (d: any) => string

  /**
   * Color scheme for the heatmap
   * @default "blues"
   */
  colorScheme?: "blues" | "reds" | "greens" | "viridis" | "custom"

  /**
   * Custom color scale (used when colorScheme is "custom")
   * @example
   * ```ts
   * customColorScale={scaleSequential(interpolatePlasma).domain([0, 100])}
   * ```
   */
  customColorScale?: any

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
  annotations?: Record<string, any>[]

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
export function Heatmap<TDatum extends Record<string, any> = Record<string, any>>(props: HeatmapProps<TDatum>) {
  const resolved = useChartMode(props.mode, {
    width: props.width,
    height: props.height,
    showGrid: undefined,
    enableHover: props.enableHover,
    showLegend: undefined,
    title: props.title,
    xLabel: props.xLabel,
    yLabel: props.yLabel,
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
    colorScheme = "blues",
    customColorScale,
    showValues = false,
    valueFormat,
    cellBorderColor = "#fff",
    cellBorderWidth = 1,
    tooltip,
    annotations,
    frameProps = {},
    selection,
    linkedHover,
    onObservation,
    chartId,
    loading,
    emptyContent,
    showLegend: showLegendProp,
    legendPosition: legendPositionProp,
    legendInteraction
  } = props

  const width = resolved.width
  const height = resolved.height
  const enableHover = resolved.enableHover
  const title = resolved.title
  const xLabel = resolved.xLabel
  const yLabel = resolved.yLabel

  // ── Loading / empty states ──────────────────────────────────────────────
  const loadingEl = renderLoadingState(loading, width, height)
  if (loadingEl) return loadingEl
  const emptyEl = renderEmptyState(data, width, height, emptyContent)
  if (emptyEl) return emptyEl

  const safeData = data || []

  const showLegend = showLegendProp ?? false
  const legendPosition = legendPositionProp ?? "right"

  // Use a synthetic colorBy to trigger margin expansion when legend is shown
  const { margin } = useChartLegendAndMargin({
    data: safeData, colorBy: showLegend ? "value" : undefined, colorScale: undefined,
    showLegend, legendPosition, userMargin,
    defaults: resolved.marginDefaults,
  })

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: [],
    onObservation, chartType: "Heatmap", chartId
  })

  // Legend interaction (no-op for Heatmap since no colorBy categories)
  const legendState = useLegendInteraction(legendInteraction, undefined, [])

  // Merge legend selection with cross-chart selection
  const effectiveSelectionHook = useMemo(() => {
    if (legendState.legendSelectionHook) return legendState.legendSelectionHook
    return activeSelectionHook
  }, [legendState.legendSelectionHook, activeSelectionHook])

  // ── Core chart logic ───────────────────────────────────────────────────

  // Get value accessor function
  const getValueFn = useMemo(() => {
    return typeof valueAccessor === "function"
      ? (d: Record<string, any>) => valueAccessor(d as TDatum)
      : (d: Record<string, any>) => d[valueAccessor]
  }, [valueAccessor])

  // Calculate value domain
  const valueDomain = useMemo(() => {
    const values = safeData.map(getValueFn)
    return [Math.min(...values), Math.max(...values)] as [number, number]
  }, [safeData, getValueFn])

  // Create color scale
  const colorScale = useMemo(() => {
    if (colorScheme === "custom" && customColorScale) {
      return customColorScale
    }

    const interpolators = {
      blues: interpolateBlues,
      reds: interpolateReds,
      greens: interpolateGreens,
      viridis: interpolateViridis
    }

    const interpolator = interpolators[colorScheme as keyof typeof interpolators] || interpolateBlues

    return scaleSequential(interpolator).domain(valueDomain)
  }, [colorScheme, customColorScale, valueDomain])

  // Get unique x and y values for bin sizing
  const { xBinCount, yBinCount } = useMemo(() => {
    const getX = resolveAccessor(xAccessor)
    const getY = resolveAccessor(yAccessor)

    return {
      xBinCount: new Set(safeData.map(getX)).size,
      yBinCount: new Set(safeData.map(getY)).size
    }
  }, [safeData, xAccessor, yAccessor])

  // Transform data to summary format for StreamXYFrame
  const summaryData = useMemo(() => {
    return { coordinates: safeData }
  }, [safeData])

  // Summary style function
  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const value = getValueFn(d)
      return {
        fill: colorScale(value),
        stroke: cellBorderColor,
        strokeWidth: cellBorderWidth
      }
    }
  }, [getValueFn, colorScale, cellBorderColor, cellBorderWidth])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, effectiveSelectionHook, selection),
    [baseSummaryStyle, effectiveSelectionHook, selection]
  )

  // Summary render function (for value labels)
  const summaryRenderMode = useMemo(() => {
    if (!showValues) return undefined

    const midpoint = (valueDomain[0] + valueDomain[1]) / 2

    return (d: Record<string, any>, i: number) => {
      const value = getValueFn(d)
      const displayValue = valueFormat ? valueFormat(value) : String(value)

      return (
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fill={getValueFn(d) > midpoint ? "#fff" : "#000"}
          fontSize="12px"
        >
          {displayValue}
        </text>
      )
    }
  }, [showValues, getValueFn, valueFormat, valueDomain])

  // Default tooltip showing x, y, and value
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    { label: accessorName(valueAccessor), accessor: valueAccessor, role: "value" },
  ]), [xAccessor, yAccessor, xLabel, yLabel, valueAccessor])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "Heatmap",
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
      valueAccessor,
    },
  })
  if (error) return <ChartError componentName="Heatmap" message={error} width={width} height={height} />

  // Build gradient legend
  const gradientLegend = useMemo(() => {
    if (!showLegend) return undefined
    const gradientConfig: GradientLegendConfig = {
      colorFn: (v: number) => colorScale(v),
      domain: valueDomain,
      label: typeof valueAccessor === "string" ? valueAccessor : "value",
      format: valueFormat,
    }
    return { gradient: gradientConfig }
  }, [showLegend, colorScale, valueDomain, valueAccessor, valueFormat])

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "heatmap",
    data: safeData,
    xAccessor,
    yAccessor,
    valueAccessor,
    colorScheme: colorScheme !== "custom" ? colorScheme : undefined,
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
    ...(gradientLegend && { legend: gradientLegend, legendPosition }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: normalizeTooltip(tooltip) || defaultTooltipContent,
    ...((linkedHover || onObservation) && { customHoverBehavior }),
    ...(annotations && annotations.length > 0 && { annotations }),
    ...frameProps
  }

  return <SafeRender componentName="Heatmap" width={width} height={height}><StreamXYFrame {...streamProps} /></SafeRender>
}
Heatmap.displayName = "Heatmap"
