"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamXYFrame from "../../stream/StreamXYFrame"
import type { StreamXYFrameProps, MarginalGraphicsConfig } from "../../stream/types"
import { getColor, getSize } from "../shared/colorUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import { buildDefaultTooltip, accessorName } from "../shared/tooltipUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedBrush, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useBrushSelection } from "../../store/useSelection"

/**
 * Scatterplot component props
 */
export interface ScatterplotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /** Array of data points. Each point should have x and y properties. */
  data: TDatum[]
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
export function Scatterplot<TDatum extends Record<string, any> = Record<string, any>>(props: ScatterplotProps<TDatum>) {
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
    colorBy,
    colorScheme = "category10",
    sizeBy,
    sizeRange = [3, 15],
    pointRadius = 5,
    pointOpacity = 0.8,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    marginalGraphics,
    frameProps = {},
    selection,
    linkedHover,
    linkedBrush
  } = props

  const safeData = data || []

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection,
    linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : []
  })

  const brushConfig = normalizeLinkedBrush(linkedBrush)

  const brushHook = useBrushSelection({
    name: brushConfig?.name || "__unused_brush__",
    xField: brushConfig?.xField || (typeof xAccessor === "string" ? xAccessor : undefined),
    yField: brushConfig?.yField || (typeof yAccessor === "string" ? yAccessor : undefined)
  })

  // ── Core chart logic ───────────────────────────────────────────────────

  const colorScale = useColorScale(safeData, colorBy, colorScheme)

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
      baseStyle.fill = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR
      baseStyle.r = sizeBy
        ? getSize(d, sizeBy, sizeRange, sizeDomain)
        : pointRadius
      return baseStyle
    }
  }, [colorBy, colorScale, sizeBy, sizeRange, sizeDomain, pointRadius, pointOpacity])

  const pointStyle = useMemo(
    () => wrapStyleWithSelection(basePointStyle, activeSelectionHook, selection),
    [basePointStyle, activeSelectionHook, selection]
  )

  // Legend + margin
  const { legend, margin } = useChartLegendAndMargin({
    data: safeData,
    colorBy,
    colorScale,
    showLegend,
    userMargin
  })

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
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="Scatterplot" message={error} width={width} height={height} />

  const streamProps: StreamXYFrameProps = {
    chartType: "scatter",
    data: safeData,
    xAccessor,
    yAccessor,
    colorAccessor: colorBy || undefined,
    sizeAccessor: sizeBy || undefined,
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
    ...(marginalGraphics && { marginalGraphics }),
    ...frameProps
  }

  return <StreamXYFrame {...streamProps} />
}
Scatterplot.displayName = "Scatterplot"
