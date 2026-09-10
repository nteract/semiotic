import * as React from "react"
import type { XYFrameAxisConfig } from "./xyFrameAxisTypes"
import type { AxisTick } from "./xyAxisTicks"
import { resolveXYAxes } from "./resolveXYAxes"
import { resolveAxisLineStyle, resolveGridDash } from "./svgOverlayUtils"

/** Identical grid chrome for the canvas underlay and its visible overlay fallback. */
export function XYGrid({
  axes,
  xTicks,
  yTicks,
  width,
  height
}: {
  axes?: XYFrameAxisConfig[]
  xTicks: AxisTick[]
  yTicks: AxisTick[]
  width: number
  height: number
}) {
  const { xAxis, yAxis } = resolveXYAxes(axes)
  return (
    <g className="stream-grid">
      {[xAxis, yAxis].map((axis, dimension) => {
        if (axis?.grid === false) return null
        const vertical = dimension === 0
        const style = resolveAxisLineStyle(axis?.gridStyle, {
          stroke: "var(--semiotic-grid, #e0e0e0)",
          strokeWidth: 1
        })
        return (vertical ? xTicks : yTicks).map((tick, index) => (
          <line
            key={`${dimension}-${index}`}
            x1={vertical ? tick.pixel : 0}
            y1={vertical ? 0 : tick.pixel}
            x2={vertical ? tick.pixel : width}
            y2={vertical ? height : tick.pixel}
            {...style}
            strokeDasharray={
              resolveGridDash(axis?.gridStyle) ?? style.strokeDasharray
            }
          />
        ))
      })}
    </g>
  )
}
