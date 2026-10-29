import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import { numericTickFormatter } from "../charts/shared/numericTickFormatter"
import { dropRepeatedTickLabels, resolveAxisTickCount } from "./axisTickUtils"
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

export interface OrdinalValueTick {
  value: number
  pixel: number
  label: string
}

/**
 * Positioned, labelled value-axis ticks for ordinal frames. Live axes,
 * underlay grids, and static exports all read this one list, so a tick whose
 * label repeats its neighbour is dropped from labels and grid alike — the
 * same rule XY axes apply.
 */
export function ordinalValueTicks(
  scales: OrdinalScales,
  layout: { width: number; height: number },
  mode?: AxisExtentMode,
  values?: number[],
  format?: (value: number) => string
): OrdinalValueTick[] {
  const raw = ordinalAxisTicks(scales, layout, mode, values)
  const label = format || numericTickFormatter(raw)
  return dropRepeatedTickLabels(
    raw.map((value) => ({ value, pixel: scales.r(value), label: label(value) }))
  )
}
