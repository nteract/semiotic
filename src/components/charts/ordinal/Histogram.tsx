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
 * Histogram component props
 */
export interface HistogramProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
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
   * Chart orientation. Histograms are always horizontal.
   * @default "horizontal"
   * @deprecated Histograms are always horizontal. This prop is ignored.
   */
  orientation?: "horizontal"

  /**
   * Number of histogram bins
   * @default 25
   */
  bins?: number

  /**
   * Normalize bin counts per category (show relative frequencies)
   * @default false
   */
  relative?: boolean

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
   * Field name or function to determine bar color
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
 * Histogram - Visualize value distributions with binned bar charts.
 *
 * A simplified wrapper around OrdinalFrame for creating histograms.
 *
 * @example
 * ```tsx
 * <Histogram
 *   data={[
 *     {category: 'Group A', value: 10},
 *     {category: 'Group A', value: 12},
 *     {category: 'Group A', value: 15},
 *     {category: 'Group A', value: 18},
 *     {category: 'Group B', value: 20},
 *     {category: 'Group B', value: 22}
 *   ]}
 *   bins={20}
 *   categoryLabel="Group"
 *   valueLabel="Value"
 * />
 * ```
 */
export function Histogram<TDatum extends Record<string, any> = Record<string, any>>(props: HistogramProps<TDatum>) {
  const {
    data,
    width = 600,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    orientation: _orientation,
    bins = 25,
    relative = false,
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

  // Summary style function for histogram bars
  const baseSummaryStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR

      return {
        fill: color,
        stroke: color,
        fillOpacity: 0.8
      }
    }
  }, [colorBy, colorScale])

  const summaryStyle = useMemo(
    () => wrapStyleWithSelection(baseSummaryStyle, activeSelectionHook, selection),
    [baseSummaryStyle, activeSelectionHook, selection]
  )

  // Build axes configuration (always horizontal)
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

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

    return axesConfig
  }, [categoryLabel, valueLabel, valueFormat, showGrid])

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

  // Default tooltip for summary hover (histogram bins)
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const pieces = d.pieces || []
      const count = pieces.length

      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold", marginBottom: "4px" }}>{String(d.key)}</div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
            <span>Count</span>
            <span>{count.toLocaleString()}</span>
          </div>
        </div>
      )
    }
  }, [])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "Histogram",
    data: safeData,
    accessors: {
      categoryAccessor,
      valueAccessor,
    },
  })
  if (error) return <ChartError componentName="Histogram" message={error} width={width} height={height} />

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    summaryType: { type: "histogram", bins: bins ?? 25, relative } as any,
    summaryStyle,
    projection: "horizontal",
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
Histogram.displayName = "Histogram"
