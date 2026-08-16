"use client"

import { useMemo } from "react"
import type { ReactNode } from "react"
import { ticksForMode } from "../charts/shared/axisExtent"
import type { StreamScales, XYFrameAxisConfig } from "./types"
import { defaultTickFormat, filterTicksByPixelDistance } from "./axisTickUtils"
import { jaggedBaselinePath, resolveAxisLineStyle, resolveGridDash } from "./svgOverlayUtils"

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
    if (!scales) return []
    const bottomAxis = axes?.find(a => a.orient === "bottom")
    const topAxis = axes?.find(a => a.orient === "top")
    const xAxis = bottomAxis ?? topAxis
    const extentMode = xAxis?.extent ?? axisExtent
    const fmt = xAxis?.tickFormat || xFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(width / 70))
    const requested = xAxis?.ticks ?? 5
    const tickCount = extentMode === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    const rawTicks = xAxis?.tickValues ?? ticksForMode(scales.x, tickCount, extentMode)
    const rawValues = rawTicks.map(v => v.valueOf())
    const candidates = rawTicks.map((v, i) => ({
      value: v,
      pixel: scales.x(v),
      label: fmt(v, i, rawValues),
    }))
    const maxLabelWidth = candidates.reduce(
      (max, candidate) => Math.max(
        max,
        typeof candidate.label === "string"
          ? candidate.label.length * 6.5
          : typeof candidate.label === "number"
            ? String(candidate.label).length * 6.5
            : 60,
      ),
      0,
    )
    return filterTicksByPixelDistance(candidates, Math.max(55, maxLabelWidth + 8))
  }, [scales, axes, xFormat, width, axisExtent])

  const yTicks = useMemo(() => {
    if (!scales) return []
    const leftAxis = axes?.find(a => a.orient === "left")
    const rightAxis = axes?.find(a => a.orient === "right")
    const yAxis = leftAxis ?? rightAxis
    const extentMode = yAxis?.extent ?? axisExtent
    const fmt = yAxis?.tickFormat || yFormat || defaultTickFormat
    const maxFit = Math.max(2, Math.floor(height / 30))
    const requested = yAxis?.ticks ?? 5
    const tickCount = extentMode === "exact" ? Math.max(2, requested) : Math.min(requested, maxFit)
    const rawTicks = yAxis?.tickValues ?? ticksForMode(scales.y, tickCount, extentMode)
    const candidates = rawTicks.map(v => ({
      value: v,
      pixel: scales.y(v),
      label: fmt(v),
    }))
    return filterTicksByPixelDistance(candidates, 22)
  }, [scales, axes, yFormat, height, axisExtent])

  const hasGrid = showGrid && scales
  const hasBaselines = showAxes && scales
  if (!hasGrid && !hasBaselines) return null

  const bottomAxis = axes?.find(a => a.orient === "bottom")
  const topAxis = axes?.find(a => a.orient === "top")
  const leftAxis = axes?.find(a => a.orient === "left")
  const rightAxis = axes?.find(a => a.orient === "right")
  const xAxis = bottomAxis ?? topAxis
  const yAxis = leftAxis ?? rightAxis
  const xOrient = bottomAxis ? "bottom" : topAxis ? "top" : "bottom"
  const yOrient = leftAxis ? "left" : rightAxis ? "right" : "left"
  const xBaselineY = xOrient === "top" ? 0 : height
  const yBaselineX = yOrient === "right" ? width : 0
  const showXBaseline = hasBaselines && (xAxis ? xAxis.baseline !== false : true)
  const showYBaseline = hasBaselines && (yAxis ? yAxis.baseline !== false : true)
  const xJagged = xAxis?.jaggedBase || false
  const yJagged = yAxis?.jaggedBase || false
  const xAxisLine = resolveAxisLineStyle(xAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
  const yAxisLine = resolveAxisLineStyle(yAxis?.axisStyle, { stroke: "var(--semiotic-border, #ccc)", strokeWidth: 1 })
  const xGridLine = resolveAxisLineStyle(xAxis?.gridStyle, { stroke: "var(--semiotic-grid, #e0e0e0)", strokeWidth: 1 })
  const yGridLine = resolveAxisLineStyle(yAxis?.gridStyle, { stroke: "var(--semiotic-grid, #e0e0e0)", strokeWidth: 1 })
  const xGridDash = resolveGridDash(xAxis?.gridStyle)
  const yGridDash = resolveGridDash(yAxis?.gridStyle)

  return (
    <svg
      width={totalWidth}
      height={totalHeight}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        {hasGrid && (
          <g className="stream-grid">
            {xAxis?.grid !== false && xTicks.map((tick, i) => (
              <line
                key={`xgrid-${i}`}
                x1={tick.pixel}
                y1={0}
                x2={tick.pixel}
                y2={height}
                {...xGridLine}
                strokeDasharray={xGridDash ?? xGridLine.strokeDasharray}
              />
            ))}
            {yAxis?.grid !== false && yTicks.map((tick, i) => (
              <line
                key={`ygrid-${i}`}
                x1={0}
                y1={tick.pixel}
                x2={width}
                y2={tick.pixel}
                {...yGridLine}
                strokeDasharray={yGridDash ?? yGridLine.strokeDasharray}
              />
            ))}
          </g>
        )}

        {showXBaseline && !xJagged && (
          <line x1={0} y1={xBaselineY} x2={width} y2={xBaselineY} {...xAxisLine} />
        )}
        {xJagged && (
          <path d={jaggedBaselinePath(xOrient, width, height)} fill="none" {...xAxisLine} />
        )}
        {showYBaseline && !yJagged && (
          <line x1={yBaselineX} y1={0} x2={yBaselineX} y2={height} {...yAxisLine} />
        )}
        {yJagged && (
          <path d={jaggedBaselinePath(yOrient, width, height)} fill="none" {...yAxisLine} />
        )}
      </g>
    </svg>
  )
}
