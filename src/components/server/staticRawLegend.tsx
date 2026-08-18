import * as React from "react"
import type { LegendLayout, LegendValue } from "../types/legendTypes"
import {
  resolveLegendPlacement,
  type AxisChromeInput,
} from "../legendLayout"

/**
 * Position caller-supplied legend nodes with the same geometry as the live
 * overlay. Unlike configured legends, React nodes cannot be measured before
 * render; `resolveLegendPlacement` intentionally uses the shared fallback
 * box for that case.
 */
export function renderStaticRawLegend(
  legend: React.ReactNode,
  size: readonly [number, number],
  margin: { top: number; right: number; bottom: number; left: number },
  position: "right" | "left" | "top" | "bottom" = "right",
  legendLayout?: LegendLayout,
  axisChrome?: AxisChromeInput,
): React.ReactNode {
  if (legend == null || legend === false) return null
  const { x, y } = resolveLegendPlacement(legend as LegendValue, {
    totalWidth: size[0],
    totalHeight: size[1],
    margin,
    position,
    legendLayout,
    axisChrome,
  })
  return <g transform={`translate(${x}, ${y})`}>{legend}</g>
}
