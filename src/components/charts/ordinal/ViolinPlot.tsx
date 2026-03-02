"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

/**
 * ViolinPlot component props
 */
export interface ViolinPlotProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /**
   * Array of data points with category and value.
   * @example
   * ```ts
   * [
   *   {category: 'Group A', value: 10},
   *   {category: 'Group A', value: 12},
   *   {category: 'Group A', value: 15},
   *   {category: 'Group B', value: 20}
   * ]
   * ```
   */
  data: TDatum[]

  /**
   * Field name or function to access category values
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>

  /**
   * Field name or function to access numeric values
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>

  /**
   * Chart orientation
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal"

  /**
   * Number of bins for the violin kernel density estimation
   * @default 25
   */
  bins?: number

  /**
   * Curve interpolation for the violin shape
   * @default "catmullRom"
   */
  curve?: string

  /**
   * Show interquartile range (IQR) overlay on the violin
   * @default true
   */
  showIQR?: boolean

  /**
   * Label for the category axis
   */
  categoryLabel?: string

  /**
   * Label for the value axis
   */
  valueLabel?: string

  /**
   * Format function for value axis tick labels
   */
  valueFormat?: (d: number | string) => string

  /**
   * Field name or function to determine violin color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.group}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Padding between categories (in pixels)
   * @default 20
   */
  categoryPadding?: number

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
   * Additional OrdinalFrame props for advanced customization
   * For full control, consider using OrdinalFrame directly
   * @see https://semiotic.nteract.io/guides/ordinal-frame
   */
  frameProps?: Partial<Omit<OrdinalFrameProps, "data" | "size">>
}

/**
 * ViolinPlot - Visualize data distributions with smooth density curves.
 *
 * A simplified wrapper around OrdinalFrame for creating violin plots.
 * Combines the benefits of box plots and histograms by showing the full
 * distribution shape of the data.
 *
 * @example
 * ```tsx
 * <ViolinPlot
 *   data={[
 *     {category: 'Group A', value: 10},
 *     {category: 'Group A', value: 12},
 *     {category: 'Group A', value: 15},
 *     {category: 'Group A', value: 18},
 *     {category: 'Group B', value: 20},
 *     {category: 'Group B', value: 22}
 *   ]}
 *   categoryLabel="Group"
 *   valueLabel="Value"
 *   showIQR
 * />
 * ```
 */
export function ViolinPlot<TDatum extends Record<string, any> = Record<string, any>>(props: ViolinPlotProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    orientation = "vertical",
    bins = 25,
    curve = "catmullRom",
    showIQR = true,
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    categoryPadding = 20,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {},
    selection,
    linkedHover
  } = props

  const safeData = data || []

  // ── Selection hooks (always called) ────────────────────────────────────

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [typeof categoryAccessor === "string" ? categoryAccessor : ""])

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  // ── Core chart logic ───────────────────────────────────────────────────

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Summary style function for violins
  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR

      return {
        fill: color,
        stroke: color,
        fillOpacity: 0.6
      }
    }
  }, [colorBy, colorScale])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, activeSelectionHook, selection),
    [baseSummaryStyle, activeSelectionHook, selection]
  )

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

    if (orientation === "vertical") {
      // Vertical: category on bottom, value on left
      axesConfig.push({
        orient: "left",
        label: valueLabel,
        tickFormat: valueFormat,
        ...(showGrid && { tickLineGenerator: () => null })
      })

      if (categoryLabel) {
        axesConfig.push({
          orient: "bottom",
          label: categoryLabel
        })
      }
    } else {
      // Horizontal: category on left, value on bottom
      if (categoryLabel) {
        axesConfig.push({
          orient: "left",
          label: categoryLabel
        })
      }

      axesConfig.push({
        orient: "bottom",
        label: valueLabel,
        tickFormat: valueFormat,
        ...(showGrid && { tickLineGenerator: () => null })
      })
    }

    return axesConfig
  }, [orientation, categoryLabel, valueLabel, valueFormat, showGrid])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : !!colorBy

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: safeData,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, safeData, colorScale])

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

  // Default tooltip for summary hover (violin distribution info)
  const defaultTooltipContent = useMemo(() => {
    const getVal = resolveAccessor<number>(valueAccessor)

    return (d: Record<string, any>) => {
      const pieces = d.pieces || []
      const values = pieces.map((p: Record<string, any>) => Number(getVal(p))).filter((v: number) => !isNaN(v)).sort((a: number, b: number) => a - b)
      const n = values.length

      const fmt = (v: unknown) => typeof v === "number" ? v.toLocaleString() : String(v ?? "")

      let stats: { label: string; value: string }[] = []
      if (n >= 2) {
        const q = (p: number) => {
          const i = p * (n - 1)
          const lo = Math.floor(i)
          const hi = Math.ceil(i)
          return values[lo] + (values[hi] - values[lo]) * (i - lo)
        }
        stats = [
          { label: "Count", value: fmt(n) },
          { label: "Median", value: fmt(q(0.5)) },
          { label: "Min", value: fmt(values[0]) },
          { label: "Max", value: fmt(values[n - 1]) },
        ]
      } else if (n === 1) {
        stats = [
          { label: "Count", value: fmt(n) },
          { label: "Value", value: fmt(values[0]) },
        ]
      }

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{String(d.key)}</div>
          {stats.map(s => (
            <div key={s.label} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <span>{s.label}</span>
              <span>{s.value}</span>
            </div>
          ))}
        </div>
      )
    }
  }, [valueAccessor])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "ViolinPlot",
    data: safeData,
    accessors: {
      categoryAccessor,
      valueAccessor,
    },
  })
  if (error) return <ChartError componentName="ViolinPlot" message={error} width={width} height={height} />

  // Build summaryType config
  const summaryType = useMemo(() => {
    const config: Record<string, any> = {
      type: "violin",
      bins: bins ?? 25,
      curve: curve ?? "catmullRom"
    }
    if (showIQR) {
      config.showIQR = true
    }
    return config
  }, [bins, curve, showIQR])

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    summaryType: summaryType as any,
    summaryStyle,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    axes: axes as any,
    summaryHoverAnnotation: enableHover,
    margin,
    oPadding: categoryPadding,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    ...(linkedHover && { customHoverBehavior }),
    // Allow frameProps to override defaults
    transition: true,
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
ViolinPlot.displayName = "ViolinPlot"
