"use client"
import { XYGrid } from "./XYGrid"
import { resolveXYAxes } from "./resolveXYAxes"

import { useMemo } from "react"
import type { ReactNode } from "react"
import type { StreamScales, XYFrameAxisConfig } from "./types"
import { generateXYTicks } from "./xyAxisTicks"
import { jaggedBaselinePath, resolveAxisLineStyle } from "./svgOverlayUtils"

/** Props for the canvas-behind grid and axis-baseline SVG layer. */
export interface SVGUnderlayProps {
  width: number
  height: number
  totalWidth: number
  totalHeight: number
  margin: { top: number; right: number; bottom: number; left: number }
  scales: StreamScales | null
  showAxes?: boolean
  axes?: XYFrameAxisConfig[]
  showGrid?: boolean
  xFormat?: (d: number | Date | string, index?: number, allTicks?: number[]) => string | ReactNode
  yFormat?: (d: number | Date | string) => string | ReactNode
  axisExtent?: import("../charts/shared/axisExtent").AxisExtentMode
}

/** Renders only grid lines and axis baselines behind the canvas. */
export function SVGUnderlay(props: SVGUnderlayProps) {
  const {
    width,
    height,
    totalWidth,
    totalHeight,
    margin,
    scales,
    showAxes,
    axes,
    showGrid,
    xFormat,
    yFormat,
    axisExtent,
  } = props
  const xTicks = useMemo(() => {
    if (!scales || !showGrid) return []
    const axis = axes?.find(a => a.orient === "bottom") ?? axes?.find(a => a.orient === "top")
    return generateXYTicks({ scale: scales.x, axis, size: width, horizontal: true, format: xFormat, axisExtent })
  }, [scales, axes, xFormat, width, axisExtent, showGrid])

  const yTicks = useMemo(() => {
    if (!scales || !showGrid) return []
    const axis = axes?.find(a => a.orient === "left") ?? axes?.find(a => a.orient === "right")
    return generateXYTicks({ scale: scales.y, axis, size: height, format: yFormat, axisExtent })
  }, [scales, axes, yFormat, height, axisExtent, showGrid])

  const hasGrid = showGrid && scales
  const hasBaselines = showAxes && scales
  if (!hasGrid && !hasBaselines) return null

  const { xAxis, yAxis, xOrient, yOrient } = resolveXYAxes(axes)
  const xBaselineY = xOrient === "top" ? 0 : height
  const yBaselineX = yOrient === "right" ? width : 0
  const showXBaseline = hasBaselines && xAxis?.visible !== false && (xAxis ? xAxis.baseline !== false : true)
  const showYBaseline = hasBaselines && yAxis?.visible !== false && (yAxis ? yAxis.baseline !== false : true)
  const xJagged = xAxis?.jaggedBase || false
  const yJagged = yAxis?.jaggedBase || false
  const xAxisLine = resolveAxisLineStyle(xAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
  const yAxisLine = resolveAxisLineStyle(yAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {hasGrid && (
          <XYGrid axes={axes} xTicks={xTicks} yTicks={yTicks} width={width} height={height} />
        )}

        {showXBaseline && !xJagged && (
          <line x1={0} y1={xBaselineY} x2={width} y2={xBaselineY} {...xAxisLine} />
        )}
        {hasBaselines && xAxis?.visible !== false && xJagged && (
          <path d={jaggedBaselinePath(xOrient, width, height)} fill="none" {...xAxisLine} />
        )}
        {showYBaseline && !yJagged && (
          <line x1={yBaselineX} y1={0} x2={yBaselineX} y2={height} {...yAxisLine} />
        )}
        {hasBaselines && yAxis?.visible !== false && yJagged && (
          <path d={jaggedBaselinePath(yOrient, width, height)} fill="none" {...yAxisLine} />
        )}
      </g>
    </svg>
  )
}
