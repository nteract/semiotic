import * as React from "react"
import type { StreamLayout, StreamScales, StreamXYFrameProps } from "../stream/types"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import type { SemioticTheme } from "../store/themeCore"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import { axisTickCount, defaultTickFormat } from "../stream/axisTickUtils"
import { resolveAxisLineStyle, resolveGridDash } from "../stream/svgOverlayUtils"
import { themeStyles } from "./themeResolver"
import {
  createStaticAxisTicks,
  resolveStaticAxisTicks,
  staticAxisLabelWidth,
} from "./staticXYAxisTicks"

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
  const xExtentMode = xAxis?.extent ?? axisExtent
  const yExtentMode = yAxis?.extent ?? axisExtent
  const xTickCount = xExtentMode === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.width / 70)))
  const yTickCount = yExtentMode === "exact"
    ? 5
    : Math.min(5, Math.max(2, Math.floor(layout.height / 30)))
  const rawXTicks = xAxis?.tickValues ?? ticksForMode(
    scales.x,
    axisTickCount(xAxis, xTickCount),
    xExtentMode,
  )
  const xFormatter = xAxis?.tickFormat || formatProps?.xFormat || formatProps?.tickFormatTime || defaultTickFormat
  const xCandidates = createStaticAxisTicks({
    values: rawXTicks,
    scale: scales.x,
    format: xFormatter,
  })
  const xMaxLabelWidth = xCandidates.reduce(
    (max, tick) => Math.max(max, staticAxisLabelWidth(tick.label)),
    0,
  )
  const xMinPixelDistance = xAxis?.autoRotate
    ? Math.max(20, Math.min(xMaxLabelWidth + 8, 55))
    : Math.max(55, xMaxLabelWidth + 8)
  const xTicks = resolveStaticAxisTicks({
    candidates: xCandidates,
    scale: scales.x,
    minPixelDistance: xMinPixelDistance,
    includeMax: xAxis?.includeMax,
    extentMode: xExtentMode,
    hasExplicitTickValues: Boolean(xAxis?.tickValues),
    format: xFormatter,
  })

  const rawYTicks = yAxis?.tickValues ?? ticksForMode(
    scales.y,
    axisTickCount(yAxis, yTickCount),
    yExtentMode,
  )
  const yFormatter = yAxis?.tickFormat || formatProps?.yFormat || formatProps?.tickFormatValue || defaultTickFormat
  const yTickFormatter = (value: number | Date) => yFormatter(value as number)
  const yTicks = resolveStaticAxisTicks({
    candidates: createStaticAxisTicks({
      values: rawYTicks,
      scale: scales.y,
      format: yTickFormatter,
    }),
    scale: scales.y,
    minPixelDistance: 22,
    includeMax: yAxis?.includeMax,
    extentMode: yExtentMode,
    hasExplicitTickValues: Boolean(yAxis?.tickValues),
    format: yTickFormatter,
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
