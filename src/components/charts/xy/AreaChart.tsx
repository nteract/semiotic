"use client"
import * as React from "react"
import { useMemo, useCallback } from "react"
import {
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  curveBasis,
  curveCardinal,
  curveCatmullRom
} from "d3-shape"
import XYFrame from "../../XYFrame"
import type { XYFrameProps } from "../../types/xyTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, DEFAULT_COLOR } from "../shared/hooks"
import { createLegend } from "../shared/legendUtils"
import type { BaseChartProps, AxisConfig, ChartAccessor } from "../shared/types"
import { normalizeTooltip, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { normalizeLinkedHover, wrapStyleWithSelection } from "../shared/selectionUtils"
import { useSelection } from "../../store/useSelection"
import { useLinkedHover } from "../../store/useSelection"

/** Map of curve name strings to d3-shape curve functions */
const CURVE_MAP = {
  linear: curveLinear,
  monotoneX: curveMonotoneX,
  monotoneY: curveMonotoneY,
  step: curveStep,
  stepAfter: curveStepAfter,
  stepBefore: curveStepBefore,
  basis: curveBasis,
  cardinal: curveCardinal,
  catmullRom: curveCatmullRom
} as const

/**
 * AreaChart component props
 */
export interface AreaChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps, AxisConfig {
  /**
   * Array of data points, grouped by category.
   * @example
   * ```ts
   * // Multiple areas with grouping
   * [{x: 1, y: 10, category: 'A'}, {x: 2, y: 20, category: 'A'}, {x: 1, y: 15, category: 'B'}]
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
   * Field name or function to group data into multiple areas
   * @example
   * ```ts
   * areaBy="category"  // Group by category field
   * areaBy={d => d.group}  // Use function
   * ```
   */
  areaBy?: ChartAccessor<TDatum, string>

  /**
   * Field name in area objects that contains coordinate arrays
   * Used when data is in area objects format
   * @default "coordinates"
   */
  lineDataAccessor?: string

  /**
   * Field name or function to determine area color
   * @example
   * ```ts
   * colorBy="category"
   * colorBy={d => d.label}
   * ```
   */
  colorBy?: ChartAccessor<TDatum, string>

  /**
   * Color scheme for categorical data or custom colors array
   * @default "category10"
   */
  colorScheme?: string | string[]

  /**
   * Curve interpolation type
   * @default "monotoneX"
   */
  curve?: "linear" | "monotoneX" | "monotoneY" | "step" | "stepAfter" | "stepBefore" | "basis" | "cardinal" | "catmullRom"

  /**
   * Area opacity
   * @default 0.7
   */
  areaOpacity?: number

  /**
   * Show line on top of area
   * @default true
   */
  showLine?: boolean

  /**
   * Line stroke width when showLine is true
   * @default 2
   */
  lineWidth?: number

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
   * Show legend for multiple areas
   * @default true (when multiple areas)
   */
  showLegend?: boolean

  /**
   * Tooltip configuration
   */
  tooltip?: TooltipProp

  /**
   * Additional XYFrame props for advanced customization
   * For full control, consider using XYFrame directly
   * @see https://semiotic.nteract.io/guides/xy-frame
   */
  frameProps?: Partial<Omit<XYFrameProps, "lines" | "size">>
}

/**
 * AreaChart - Visualize quantities over continuous intervals with overlapping filled areas
 *
 * Each series fills from its line down to the baseline. Multiple series overlap
 * with transparency so all shapes remain visible.
 *
 * For stacked areas use {@link StackedAreaChart}.
 *
 * @example
 * ```tsx
 * <AreaChart
 *   data={[
 *     {x: 1, y: 10, category: 'A'},
 *     {x: 2, y: 20, category: 'A'},
 *     {x: 1, y: 15, category: 'B'},
 *     {x: 2, y: 25, category: 'B'}
 *   ]}
 *   areaBy="category"
 *   colorBy="category"
 *   xLabel="Time"
 *   yLabel="Value"
 * />
 * ```
 */
export function AreaChart<TDatum extends Record<string, any> = Record<string, any>>(props: AreaChartProps<TDatum>) {
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
    areaBy,
    lineDataAccessor = "coordinates",
    colorBy,
    colorScheme = "category10",
    curve = "monotoneX",
    areaOpacity = 0.7,
    showLine = true,
    lineWidth = 2,
    enableHover = true,
    showGrid = false,
    showLegend,
    tooltip,
    frameProps = {},
    selection,
    linkedHover
  } = props

  const safeData = data || []

  // ── Selection hooks (always called, conditional logic inside) ──────────

  const hoverConfig = normalizeLinkedHover(linkedHover, colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [])

  const selectionHook = useSelection({
    name: selection?.name || "__unused__",
    fields: []
  })

  const linkedHoverHook = useLinkedHover({
    name: hoverConfig?.name || "hover",
    fields: hoverConfig?.fields || []
  })

  // Only use the hooks when the corresponding props are provided
  const activeSelectionHook = selection ? { isActive: selectionHook.isActive, predicate: selectionHook.predicate } : null

  // ── Core chart logic ───────────────────────────────────────────────────

  // Check if data is in area objects format (has lineDataAccessor field)
  const isAreaObjectFormat = safeData[0]?.[lineDataAccessor] !== undefined

  // Transform data to line/area format if needed
  const areaData = useMemo(() => {
    if (isAreaObjectFormat) {
      // Data is already in area objects format
      return safeData
    }

    if (areaBy) {
      // Group data by areaBy field
      const grouped = safeData.reduce((acc, d) => {
        const key = typeof areaBy === "function" ? areaBy(d) : d[areaBy]
        if (!acc[key]) {
          const areaObj: Record<string, any> = { [lineDataAccessor]: [] }
          // Add the grouping field
          if (typeof areaBy === "string") {
            areaObj[areaBy] = key
          }
          acc[key] = areaObj
        }
        acc[key][lineDataAccessor].push(d)
        return acc
      }, {} as Record<string, Record<string, any>>)

      return Object.values(grouped)
    }

    // Single area - wrap in area object
    return [{ [lineDataAccessor]: safeData }]
  }, [safeData, areaBy, lineDataAccessor, isAreaObjectFormat])

  // Create color scale if colorBy is specified
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  // Curve function from module-level map
  const curveFunction = CURVE_MAP[curve] || curveMonotoneX

  // Area/line style function
  const baseLineStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}

      // Apply color
      const color = colorBy ? getColor(d, colorBy, colorScale) : DEFAULT_COLOR

      baseStyle.fill = color
      baseStyle.fillOpacity = areaOpacity

      if (showLine) {
        baseStyle.stroke = color
        baseStyle.strokeWidth = lineWidth
      } else {
        baseStyle.stroke = "none"
      }

      return baseStyle
    }
  }, [colorBy, colorScale, areaOpacity, showLine, lineWidth])

  const lineStyle = useMemo(
    () => wrapStyleWithSelection(baseLineStyle, activeSelectionHook, selection),
    [baseLineStyle, activeSelectionHook, selection]
  )

  // Build axes configuration
  const axes = useMemo(() => {
    const axesConfig: Array<Record<string, unknown>> = []

    // Y axis (left)
    axesConfig.push({
      orient: "left",
      label: yLabel,
      tickFormat: yFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    // X axis (bottom)
    axesConfig.push({
      orient: "bottom",
      label: xLabel,
      tickFormat: xFormat,
      ...(showGrid && { tickLineGenerator: () => null })
    })

    return axesConfig
  }, [xLabel, yLabel, xFormat, yFormat, showGrid])

  // Determine line type — always overlapping areas
  const lineType = useMemo(() => ({
    type: "area" as const,
    interpolator: curveFunction
  }), [curveFunction])

  // Determine if we should show legend
  const shouldShowLegend = showLegend !== undefined ? showLegend : areaData.length > 1

  // Build legend if needed
  const legend = useMemo(() => {
    if (!shouldShowLegend || !colorBy) return undefined

    return createLegend({
      data: areaData,
      colorBy,
      colorScale,
      getColor
    })
  }, [shouldShowLegend, colorBy, areaData, colorScale])

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

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "AreaChart",
    data: safeData,
    accessors: {
      xAccessor,
      yAccessor,
    },
  })
  if (error) return <ChartError componentName="AreaChart" message={error} width={width} height={height} />

  // Build XYFrame props
  const xyFrameProps: XYFrameProps = {
    size: [width, height],
    lines: areaData,
    xAccessor,
    yAccessor,
    lineDataAccessor,
    lineType,
    lineStyle,
    axes: axes as any,
    hoverAnnotation: enableHover,
    margin,
    ...(legend && { legend }),
    ...(className && { className }),
    ...(title && { title }),
    // Add tooltip support
    ...(tooltip && { tooltipContent: normalizeTooltip(tooltip) as Function }),
    ...(linkedHover && { customHoverBehavior }),
    // Allow frameProps to override defaults
    transition: true,
    ...frameProps
  }

  return <XYFrame {...xyFrameProps} />
}
AreaChart.displayName = "AreaChart"
