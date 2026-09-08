import * as React from "react"
import type { StreamLayout, StreamScales, StreamXYFrameProps } from "../stream/types"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import type { SemioticTheme } from "../store/themeCore"
import type { AxisExtentMode } from "../charts/shared/axisExtent"
import { resolveAxisLineStyle, resolveGridDash } from "../stream/svgOverlayUtils"
import { themeStyles } from "./themeResolver"
import { generateXYTicks } from "../stream/xyAxisTicks"

/**
 * Server grid lines resolve the same filtered tick set as static axes. This
 * prevents a crowded formatter or `includeMax` from leaving a grid line with
 * no matching label (or a label without its grid line).
 */
export function renderGridSVG(
  scales: StreamScales,
  layout: StreamLayout,
  theme: SemioticTheme,
  idPrefix?: string,
  axisExtent?: AxisExtentMode,
  axes?: XYFrameAxisConfig[],
  formatProps?: Pick<
    StreamXYFrameProps,
    "xFormat" | "yFormat" | "tickFormatTime" | "tickFormatValue"
  >,
): React.ReactNode {
  const { grid } = themeStyles(theme)
  const pfx = idPrefix ? `${idPrefix}-` : ""
  const bottomAxis = axes?.find((axis) => axis.orient === "bottom")
  const topAxis = axes?.find((axis) => axis.orient === "top")
  const leftAxis = axes?.find((axis) => axis.orient === "left")
  const rightAxis = axes?.find((axis) => axis.orient === "right")
  const xAxis = bottomAxis ?? topAxis
  const yAxis = leftAxis ?? rightAxis
  const xTicks = generateXYTicks({
    scale: scales.x, axis: xAxis, size: layout.width, horizontal: true,
    format: formatProps?.xFormat || formatProps?.tickFormatTime, axisExtent,
  })
  const yTicks = generateXYTicks({
    scale: scales.y, axis: yAxis, size: layout.height,
    format: formatProps?.yFormat || formatProps?.tickFormatValue, axisExtent,
  })
  const showXGrid = xAxis?.grid !== false
  const showYGrid = yAxis?.grid !== false
  const xGridDash = resolveGridDash(xAxis?.gridStyle)
  const yGridDash = resolveGridDash(yAxis?.gridStyle)
  const xGridLine = resolveAxisLineStyle(xAxis?.gridStyle, { stroke: grid, strokeWidth: 0.5 })
  const yGridLine = resolveAxisLineStyle(yAxis?.gridStyle, { stroke: grid, strokeWidth: 0.5 })

  return (
    <g id={`${pfx}grid`} className="semiotic-grid" opacity={0.8}>
      {showXGrid && xTicks.map((tick, index) => (
        <line
          key={`gx-${index}`}
          x1={tick.pixel}
          y1={0}
          x2={tick.pixel}
          y2={layout.height}
          {...xGridLine}
          strokeDasharray={xGridDash ?? xGridLine.strokeDasharray}
        />
      ))}
      {showYGrid && yTicks.map((tick, index) => (
        <line
          key={`gy-${index}`}
          x1={0}
          y1={tick.pixel}
          x2={layout.width}
          y2={tick.pixel}
          {...yGridLine}
          strokeDasharray={yGridDash ?? yGridLine.strokeDasharray}
        />
      ))}
    </g>
  )
}
