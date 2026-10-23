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
import { heatmapBandTicks, type HeatmapBandTick } from "./heatmapBandTicks"

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
  const bandTicks = axis?.tickValues ? null : heatmapBandTicks(scale)
  const values = bandTicks
    ? bandTicks.map((tick) => tick.value)
    : (axis?.tickValues ?? ticksForMode(scale, count, extentMode))
  const labelByValue = bandTicks
    ? new Map(bandTicks.map((tick) => [tick.value, tick.label]))
    : null
  const displayValue = (value: number | Date): string | number | Date =>
    labelByValue?.get(Number(value)) ?? value
  const rawValues = values.map((value) => {
    const shown = displayValue(value)
    return shown instanceof Date
      ? shown.valueOf()
      : typeof shown === "number"
        ? shown
        : Number(shown)
  })
  const formatter: AxisTickFormatter =
    axis?.tickFormat ||
    options.format ||
    (bandTicks
      ? heatmapBandTickFormatter(bandTicks)
      : domain[0] instanceof Date || values[0] instanceof Date
        ? makeDateTickFormatter([
            domain[0].valueOf(),
            domain[domain.length - 1].valueOf()
          ])
        : numericTickFormatter(rawValues))
  // Preserve the existing value-only vertical formatter contract.
  // Band ticks format the category or date label, not the cell index.
  const format = (value: number | Date, index: number) => {
    const shown = displayValue(value)
    return horizontal ? formatter(shown, index, rawValues) : formatter(shown)
  }
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
  // Index-aware user formatters (adaptiveTimeTicks) label a tick against its
  // neighbours, so they relabel whatever survives thinning, against the
  // rendered ticks, before duplicates are dropped and again at the end.
  // Built-in formatters keep their candidate labels.
  const relabel =
    horizontal && (axis?.tickFormat || options.format)
      ? (list: AxisTick[]) => {
          const rendered = list.map((tick) => {
            const shown = displayValue(tick.value)
            return shown instanceof Date ? shown.valueOf() : Number(shown)
          })
          return list.map((tick, index) => ({
            ...tick,
            label: formatter(displayValue(tick.value), index, rendered)
          }))
        }
      : undefined
  let ticks = filterTicksByPixelDistance(candidates, minPx)
  if (relabel) ticks = relabel(ticks)
  if (ticks.length > 1) {
    ticks = ticks.filter(
      (tick, index) =>
        index === 0 || !hasSameTickLabel(tick.label, ticks[index - 1].label)
    )
  }
  // Explicit values already lock the endpoints; exact ticks include them.
  if (
    axis?.includeMax &&
    !bandTicks &&
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
  return relabel ? relabel(ticks) : ticks
}

function heatmapBandTickFormatter(ticks: HeatmapBandTick[]): AxisTickFormatter {
  const labels = ticks.map((tick) => tick.label)
  const labelAt = (value: string | number | Date) =>
    ticks.find((tick) => tick.value === Number(value))?.label ?? value
  if (labels.length > 0 && labels.every((label) => label instanceof Date)) {
    const times = labels.map((label) => (label as Date).getTime())
    const format = makeDateTickFormatter([Math.min(...times), Math.max(...times)])
    return (value, index, all) => {
      const label = labelAt(value)
      return label instanceof Date ? format(label, index, all) : String(label)
    }
  }
  if (labels.every((label) => typeof label === "number" && Number.isFinite(label))) {
    const format = numericTickFormatter(labels as number[])
    return (value) => {
      const label = labelAt(value)
      return format(typeof label === "number" ? label : Number(value))
    }
  }
  return (value) => String(labelAt(value))
}
