"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useSortedData, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

/**
 * BarChart component props
 */
export interface BarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  sort?: boolean | "asc" | "desc" | ((a: Record<string, any>, b: Record<string, any>) => number)
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

/**
 * BarChart - Visualize categorical data with bars.
 */
export function BarChart<TDatum extends Record<string, any> = Record<string, any>>(props: BarChartProps<TDatum>) {
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
    categoryLabel,
    valueLabel,
    valueFormat,
    colorBy,
    colorScheme = "category10",
    sort = false,
    barPadding = 5,
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

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: colorBy ? [typeof colorBy === "string" ? colorBy : ""] : [],
    unwrapData: true
  })

  // ── Core chart logic ───────────────────────────────────────────────────

  const sortedData = useSortedData(safeData, sort, valueAccessor)
  const colorScale = useColorScale(safeData, colorBy, colorScheme)

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      const baseStyle: Record<string, string | number> = {}
      if (colorBy) {
        baseStyle.fill = getColor(d, colorBy, colorScale)
      } else {
        baseStyle.fill = DEFAULT_COLOR
      }
      return baseStyle
    }
  }, [colorBy, colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: sortedData, colorBy, colorScale, showLegend, userMargin
  })

  // Default tooltip
  const defaultTooltipContent = useMemo(() => {
    const showColorField = colorBy && colorBy !== categoryAccessor
    return (d: Record<string, any>) => {
      const datum = d.data || d
      const cat = typeof categoryAccessor === "function" ? categoryAccessor(datum as TDatum) : datum[categoryAccessor]
      const val = typeof valueAccessor === "function" ? valueAccessor(datum as TDatum) : datum[valueAccessor]
      const colorVal = showColorField
        ? (typeof colorBy === "function" ? (colorBy as Function)(datum) : datum[colorBy as string])
        : null
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(cat)}</div>
          <div style={{ marginTop: "4px" }}>
            {typeof val === "number" ? val.toLocaleString() : String(val)}
          </div>
          {colorVal != null && (
            <div style={{ marginTop: "2px", opacity: 0.8 }}>
              {typeof colorBy === "string" ? colorBy : "group"}: {String(colorVal)}
            </div>
          )}
        </div>
      )
    }
  }, [categoryAccessor, valueAccessor, colorBy])

  // Validate data (after all hooks)
  const error = validateArrayData({
    componentName: "BarChart",
    data: safeData,
    accessors: { categoryAccessor, valueAccessor },
  })
  if (error) return <ChartError componentName="BarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "bar",
    data: sortedData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    projection: orientation === "horizontal" ? "horizontal" : "vertical",
    pieceStyle,
    size: [width, height],
    margin,
    barPadding,
    enableHover,
    showAxes: true,
    oLabel: categoryLabel,
    rLabel: valueLabel,
    rFormat: valueFormat as any,
    showGrid,
    oSort: sort as any,
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
BarChart.displayName = "BarChart"
