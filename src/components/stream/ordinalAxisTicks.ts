import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import { resolveAxisTickCount } from "./axisTickUtils"
import type { OrdinalScales } from "./ordinalTypes"

/** Existing ordinal modes retain their fixed count; rounded domains and their
 * ticks share the XY pixel budget along the value axis. */
export function ordinalAxisTickCount(
  layout: { width: number; height: number },
  projection: string,
  mode?: AxisExtentMode
): number {
  if (mode !== "rounded") return 5
  const horizontal = projection === "horizontal"
  return resolveAxisTickCount({
    size: horizontal ? layout.width : layout.height,
    orientation: horizontal ? "horizontal" : "vertical"
  })
}

export function ordinalAxisTicks(
  scales: OrdinalScales,
  layout: { width: number; height: number },
  mode?: AxisExtentMode,
  values?: number[]
): number[] {
  return (
    values ??
    ticksForMode(
      scales.r,
      ordinalAxisTickCount(layout, scales.projection, mode),
      mode
    )
  )
}
