"use client"
import * as React from "react"
import { useMemo } from "react"
import StreamOrdinalFrame from "../../stream/StreamOrdinalFrame"
import type { StreamOrdinalFrameProps } from "../../stream/ordinalTypes"
import { getColor } from "../shared/colorUtils"
import { useColorScale, useChartSelection, useChartLegendAndMargin, DEFAULT_COLOR, resolveAccessor } from "../shared/hooks"
import type { BaseChartProps, ChartAccessor } from "../shared/types"
import { normalizeTooltip, defaultTooltipStyle, type TooltipProp } from "../../Tooltip/Tooltip"
import ChartError from "../shared/ChartError"
import { validateArrayData } from "../shared/validateChartData"
import { wrapStyleWithSelection } from "../shared/selectionUtils"

export interface GroupedBarChartProps<TDatum extends Record<string, any> = Record<string, any>> extends BaseChartProps {
  data: TDatum[]
  categoryAccessor?: ChartAccessor<TDatum, string>
  groupBy: ChartAccessor<TDatum, string>
  valueAccessor?: ChartAccessor<TDatum, number>
  orientation?: "vertical" | "horizontal"
  categoryLabel?: string
  valueLabel?: string
  valueFormat?: (d: number | string) => string
  colorBy?: ChartAccessor<TDatum, string>
  colorScheme?: string | string[]
  barPadding?: number
  enableHover?: boolean
  showGrid?: boolean
  showLegend?: boolean
  tooltip?: TooltipProp
  frameProps?: Partial<Omit<StreamOrdinalFrameProps, "data" | "size">>
}

export function GroupedBarChart<TDatum extends Record<string, any> = Record<string, any>>(props: GroupedBarChartProps<TDatum>) {
  const {
    data, width = 600, height = 400, margin: userMargin, className, title,
    categoryAccessor = "category", groupBy, valueAccessor = "value",
    orientation = "vertical", categoryLabel, valueLabel, valueFormat,
    colorBy, colorScheme = "category10", barPadding = 5,
    enableHover = true, showGrid = false, showLegend = true, tooltip,
    frameProps = {}, selection, linkedHover
  } = props

  const safeData = data || []
  const actualColorBy = colorBy || groupBy

  const { activeSelectionHook, customHoverBehavior } = useChartSelection({
    selection, linkedHover,
    fallbackFields: actualColorBy ? [typeof actualColorBy === "string" ? actualColorBy : ""] : [],
    unwrapData: true
  })

  const colorScale = useColorScale(safeData, actualColorBy, colorScheme)

  const basePieceStyle = useMemo(() => {
    return (d: Record<string, any>) => {
      if (actualColorBy) return { fill: getColor(d, actualColorBy, colorScale) }
      return { fill: DEFAULT_COLOR }
    }
  }, [actualColorBy, colorScale])

  const pieceStyle = useMemo(
    () => wrapStyleWithSelection(basePieceStyle, activeSelectionHook, selection),
    [basePieceStyle, activeSelectionHook, selection]
  )

  const { legend, margin } = useChartLegendAndMargin({
    data: safeData, colorBy: actualColorBy, colorScale, showLegend, userMargin
  })

  const defaultTooltipContent = useMemo(() => {
    const getGroup = resolveAccessor(groupBy)
    const getCat = resolveAccessor(categoryAccessor)
    const getVal = resolveAccessor<number>(valueAccessor)
    return (d: Record<string, any>) => {
      const datum = d.data || d
      return (
        <div className="semiotic-tooltip" style={defaultTooltipStyle}>
          <div style={{ fontWeight: "bold" }}>{String(getGroup(datum))}</div>
          <div style={{ marginTop: "4px" }}>
            {String(getCat(datum))} &middot; {Number(getVal(datum)).toLocaleString()}
          </div>
        </div>
      )
    }
  }, [groupBy, categoryAccessor, valueAccessor])

  const error = validateArrayData({
    componentName: "GroupedBarChart", data: safeData,
    accessors: { categoryAccessor, valueAccessor }, requiredProps: { groupBy },
  })
  if (error) return <ChartError componentName="GroupedBarChart" message={error} width={width} height={height} />

  const streamProps: StreamOrdinalFrameProps = {
    chartType: "clusterbar",
    data: safeData,
    oAccessor: categoryAccessor,
    rAccessor: valueAccessor,
    groupBy,
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
    ...(legend && { legend }),
    ...(title && { title }),
    ...(className && { className }),
    tooltipContent: (tooltip ? normalizeTooltip(tooltip) : defaultTooltipContent) as any,
    ...(linkedHover && { customHoverBehavior }),
    ...frameProps
  }

  return <StreamOrdinalFrame {...streamProps} />
}
GroupedBarChart.displayName = "GroupedBarChart"
