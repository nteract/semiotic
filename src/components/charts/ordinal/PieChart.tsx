"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import OrdinalFrame from "../../OrdinalFrame"
import type { OrdinalFrameProps } from "../../types/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import type { PieceTypeSettings } from "../../types/ordinalTypes"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

/**
 * PieChart component props
 */
export interface PieChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  /**
   * Array of data points, one per slice.
   * @example
   * ```ts
   * [{category: 'A', value: 30}, {category: 'B', value: 50}, {category: 'C', value: 20}]
   * ```
   */
  data: TDatum[]

  /**
   * Field name or function to access slice labels
   * @default "category"
   */
  categoryAccessor?: ChartAccessor<TDatum, string>

  /**
   * Field name or function to access slice values
   * @default "value"
   */
  valueAccessor?: ChartAccessor<TDatum, number>

  /**
   * Field name or function to determine slice color
   * @default categoryAccessor
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Starting angle offset in degrees
   * @default 0
   */
  startAngle?: number

  /**
   * Padding between slices (in pixels)
   * @default 2
   */
  slicePadding?: number

  /**
   * Enable hover annotations
   * @default true
   */
  enableHover?: boolean

  /**
   * Show legend
   * @default true
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional OrdinalFrame props for advanced customization
   * For full control, consider using OrdinalFrame directly
   */
  frameProps?: Partial<Omit<OrdinalFrameProps, "data" | "size">>
}

/**
 * PieChart - Visualize proportions as slices of a circle.
 *
 * A simplified wrapper around OrdinalFrame with radial projection.
 *
 * @example
 * ```tsx
 * <PieChart
 *   data={[
 *     {category: 'A', value: 30},
 *     {category: 'B', value: 50},
 *     {category: 'C', value: 20}
 *   ]}
 * />
 * ```
 */
export function PieChart<TDatum extends Record<string, any> = Record<string, any>>(props: PieChartProps<TDatum>) {
  const {
    data,
    width = 400,
    height = 400,
    margin: userMargin,
    className,
    title,
    categoryAccessor = "category",
    valueAccessor = "value",
    colorBy,
    colorScheme = "category10",
    startAngle = 0,
    slicePadding = 2,
    enableHover = true,
    showLegend = true,
    tooltip,
    frameProps = {},
    selection,
    linkedHover
  } = props

  const safeData = data || []

  // Default colorBy to categoryAccessor for pie charts
  const actualColorBy = colorBy || categoryAccessor

  // ── Selection hooks (always called) ────────────────────────────────────

  const hoverConfig = normalizeLinkedHover(linkedHover, actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [])

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

  // Create color scale
  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  // Piece style function
  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

      if (actualColorBy) {
        baseStyle.fill = getColor(d, actualColorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }

      return baseStyle
    }
  }, [actualColorBy, colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  // Build legend if needed
  const legend = useMemo(() => {
    if (!showLegend) return undefined

    return createLegend({
      data: safeData,
      colorBy: actualColorBy,
      colorScale,
      getColor
    })
  }, [showLegend, safeData, actualColorBy, colorScale])

  // Adjust margin for legend if present
  const margin = useMemo(() => {
    const defaultMargin = { top: 20, bottom: 20, left: 20, right: 20 }
    const finalMargin = { ...defaultMargin, ...userMargin }

    if (legend && finalMargin.right < 120) {
      finalMargin.right = 120
    }

    return finalMargin
  }, [userMargin, legend])

  // Build type config
  const typeConfig = useMemo((): PieceTypeSettings => {
    const config: PieceTypeSettings = { type: "bar" }

    if (startAngle) {
      config.offsetAngle = startAngle
    }

    return config
  }, [startAngle])

  // ── Hover behavior ─────────────────────────────────────────────────────

  const customHoverBehavior = useCallback(
    (d: Record<string, any> | null) => {
      if (linkedHover) {
        linkedHoverHook.onHover(d)
      }
    },
    [linkedHover, linkedHoverHook]
  )

  // Default tooltip
  const defaultTooltipContent = useMemo(() => {
    return (d: Record<string, any>) => {
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(d as TDatum) : d[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(d as TDatum) : d[valueAccessor]
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "PieChart",
    data: safeData,
    accessors: {
      categoryAccessor,
      valueAccessor,
    },
  })
  if (error) return <ChartError componentName="PieChart" message={error} width={width} height={height} />

  // Build OrdinalFrame props
  const ordinalFrameProps: OrdinalFrameProps = {
    size: [width, height],
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    type: typeConfig,
    projection: "radial",
    style: pieceStyle,
    hoverAnnotation: enableHover,
    margin,
    oPadding: slicePadding,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as Function,
    ...(linkedHover && { customHoverBehavior }),
    transition: true,
    ...frameProps
  }

  return <OrdinalFrame {...ordinalFrameProps} />
}
PieChart.displayName = "PieChart"
