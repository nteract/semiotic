import type { ReactNode } from "react"
import { ticksForMode, type AxisExtentMode } from "../charts/shared/axisExtent"
import type { AxisTickFormatter, XYFrameAxisConfig } from "./xyFrameAxisTypes"
import {
  axisTickCount,
  filterTicksByPixelDistance,
  hasSameTickLabel
} from "./axisTickUtils"
import { makeDateTickFormatter } from "./xyDateTicks"
import { numericTickFormatter } from "../charts/shared/numericTickFormatter"

export interface AxisTick {
  value: number | Date
  pixel: number
  label: ReactNode
}

type AxisScale = {
  (value: number | Date): number
  domain(): (number | Date)[]
  ticks(count?: number): (number | Date)[]
}

function labelWidth(label: ReactNode): number {
  return typeof label === "string" || typeof label === "number"
    ? String(label).length * 6.5
    : 60
}

/** Use actual neighboring gaps: log scales and explicit ticks need not fill the axis. */
export function axisTicksNeedRotation(ticks: AxisTick[]): boolean {
  for (let i = 1; i < ticks.length; i++) {
    const previous = ticks[i - 1]
    const current = ticks[i]
    if (
      Math.abs(current.pixel - previous.pixel) <
      (labelWidth(previous.label) + labelWidth(current.label)) / 2 + 8
    )
      return true
  }
  return false
}

/** Shared tick selection for live axes, canvas underlays, and static exports. */
export function generateXYTicks(options: {
  scale: AxisScale
  axis?: XYFrameAxisConfig
  size: number
  horizontal?: boolean
  format?: AxisTickFormatter
  axisExtent?: AxisExtentMode
}): AxisTick[] {
  const { scale, axis, size, horizontal = false, axisExtent } = options
  const extentMode = axis?.extent ?? axisExtent
  const domain = scale.domain()
  const requested = axisTickCount(axis, 5)
  const maxFit = Math.max(2, Math.floor(size / (horizontal ? 70 : 30)))
  const count =
    extentMode === "exact"
      ? Math.max(2, requested)
      : Math.min(requested, maxFit)
  const values = axis?.tickValues ?? ticksForMode(scale, count, extentMode)
  const rawValues = values.map((value) => value.valueOf())
  const formatter: AxisTickFormatter =
    axis?.tickFormat ||
    options.format ||
    (domain[0] instanceof Date || values[0] instanceof Date
      ? makeDateTickFormatter([
          domain[0].valueOf(),
          domain[domain.length - 1].valueOf()
        ])
      : numericTickFormatter(rawValues))
  // Preserve the existing value-only vertical formatter contract.
  const format = (value: number | Date, index: number) =>
    horizontal ? formatter(value, index, rawValues) : formatter(value)
  const candidates = values.map((value, index) => ({
    value,
    pixel: scale(value),
    label: format(value, index)
  }))
  let minPx = 22
  if (horizontal) {
    const width = candidates.reduce(
      (max, tick) => Math.max(max, labelWidth(tick.label)),
      0
    )
    minPx = axis?.autoRotate
      ? Math.max(20, Math.min(width + 8, 55))
      : Math.max(55, width + 8)
  }
  let ticks = filterTicksByPixelDistance(candidates, minPx)
  if (ticks.length > 1) {
    ticks = ticks.filter(
      (tick, index) =>
        index === 0 || !hasSameTickLabel(tick.label, ticks[index - 1].label)
    )
  }
  // Explicit values already lock the endpoints; exact ticks include them.
  if (
    axis?.includeMax &&
    ticks.length > 0 &&
    extentMode !== "exact" &&
    !axis.tickValues
  ) {
    const value = domain[domain.length - 1]
    if (value != null) {
      const pixel = scale(value)
      const distance = Math.abs(pixel - ticks[ticks.length - 1].pixel)
      if (distance > 1) {
        const label = format(value, ticks.length)
        if (distance < minPx && ticks.length > 1) ticks = ticks.slice(0, -1)
        ticks = [...ticks, { value, pixel, label }]
      }
    }
  }
  return ticks
}
