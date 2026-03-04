"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps } from "../../stream/types"
import { getColor, getSize } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"
import { useBrushSelection } from "../../store/useSelection"

/**
 * BubbleChart component props
 */
export interface BubbleChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points. Each point should have x, y, and size properties.
   * @example
   * ```ts
   * [{x: 1, y: 10, size: 50, category: 'A'}, {x: 2, y: 20, size: 30, category: 'B'}]
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
export function BubbleChart<TDatum extends Record<string, any> = Record<string, any>>(props: BubbleChartProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    xAccessor = "x",
    yAccessor = "y",
    sizeBy,
    sizeRange = [5, 40],
    colorBy,
    colorScheme = "category10",
    bubbleOpacity = 0.6,
    bubbleStrokeWidth = 1,
    bubbleStrokeColor = "white",
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush
  } = props

  const safeData = data || []

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [])
  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // Only use the hooks when the corresponding props are provided
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  // ── Core chart logic ───────────────────────────────────────────────────

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Calculate size domain
  const sizeDomain = useMemo(() => {
    const sizes = safeData.map((d) => {
      if (typeof sizeBy === "function") {
        return sizeBy(d)
      }
      return d[sizeBy]
    })

    return [Math.min(...sizes), Math.max(...sizes)] as [number, number]
  }, [safeData, sizeBy])

  // Point style function
  const basePointStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {
        fillOpacity: bubbleOpacity,
        strokeWidth: bubbleStrokeWidth,
        stroke: bubbleStrokeColor
      }

      // Apply color
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      // Apply size
      baseStyle.r = getSize(d, sizeBy, sizeRange, sizeDomain)

      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, bubbleOpacity, bubbleStrokeWidth, bubbleStrokeColor])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, activeSelectionHook, selection),
    [basePointStyle, activeSelectionHook, selection]
  )

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: safeData,
      colorBy,
      colorScale,
      getColor,
      strokeColor: bubbleStrokeColor,
      strokeWidth: bubbleStrokeWidth
    })
  }, [shouldShowLegend, colorBy, safeData, colorScale, bubbleStrokeColor, bubbleStrokeWidth])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 50, bottom: 60, left: 70, right: 40 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    // If legend is present and right margin is too small, increase it
    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // ── Hover behavior ─────────────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        linkedHoverHook.onHover(d)
      }
    },
    [linkedHover, linkedHoverHook]
  )

  // Default tooltip showing all configured fields
  const defaultTooltipContent = useMemo(() => buildDefaultTooltip([
    { label: xLabel || accessorName(xAccessor), accessor: xAccessor, role: "x" },
    { label: yLabel || accessorName(yAccessor), accessor: yAccessor, role: "y" },
    { label: accessorName(sizeBy), accessor: sizeBy, role: "size" },
    ...(colorBy ? [{ label: accessorName(colorBy), accessor: colorBy, role: "color" as const }] : []),
  ]), [xAccessor, yAccessor, xLabel, yLabel, sizeBy, colorBy])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "BubbleChart",
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
    },
    requiredProps: { sizeBy },
  })
  if (error) return <ChartError componentName="BubbleChart" message={error} width={width} height={height} />

  // Build StreamXYFrame props
  const streamProps: StreamXYFrameProps = {
    chartType: "bubble",
    data: safeData,
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy,
    sizeRange,
    pointStyle,
    colorScheme,
    size: [width, height],
    margin,
    showAxes: true,
    xLabel,
    yLabel,
    xFormat,
    yFormat,
    enableHover,
    showGrid,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamXYFrame {...streamProps} />
}
BubbleChart.displayName = "BubbleChart"
