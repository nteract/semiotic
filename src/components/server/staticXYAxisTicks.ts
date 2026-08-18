import type { ReactNode } from "react"
import { isTimeLandmark } from "../stream/hitTestUtils"
import {
  filterTicksByPixelDistance,
  hasSameTickLabel,
} from "../stream/axisTickUtils"
import type { XYFrameAxisConfig } from "../stream/xyFrameAxisTypes"
import type { AxisExtentMode } from "../charts/shared/axisExtent"

type AxisTickValue = number | Date

export type StaticAxisTick = {
  value: AxisTickValue
  pixel: number
  label: ReactNode
}

type StaticAxisScale = {
  (value: AxisTickValue): number
  domain(): readonly AxisTickValue[]
}

type StaticAxisFormatter = (
  value: AxisTickValue,
  index?: number,
  allTicks?: number[],
) => ReactNode

export function createStaticAxisTicks(options: {
  values: AxisTickValue[]
  scale: StaticAxisScale
  format: StaticAxisFormatter
}): StaticAxisTick[] {
  const { values, scale, format } = options
  const allTicks = values.map((value) => value.valueOf())
  return values.map((value, index) => ({
    value,
    pixel: scale(value),
    label: format(value, index, allTicks),
  }))
}

/** Match SVGOverlay's deterministic label-width estimate. */
export function staticAxisLabelWidth(label: ReactNode): number {
  if (typeof label === "string") return label.length * 6.5
  if (typeof label === "number") return String(label).length * 6.5
  return 60
}

/**
 * Apply the same collision, duplicate-label, and include-max rules as the
 * live SVGOverlay. Keeping this server-side makes a static export retain the
 * readable endpoint set rather than serializing every crowded candidate.
 */
export function resolveStaticAxisTicks(options: {
  candidates: StaticAxisTick[]
  scale: StaticAxisScale
  minPixelDistance: number
  includeMax?: boolean
  extentMode?: AxisExtentMode
  hasExplicitTickValues?: boolean
  dedupeLabels?: boolean
  includeDomainMax?: boolean
  format: StaticAxisFormatter
}): StaticAxisTick[] {
  const {
    candidates,
    scale,
    minPixelDistance,
    includeMax,
    extentMode,
    hasExplicitTickValues,
    dedupeLabels = true,
    includeDomainMax = true,
    format,
  } = options
  let ticks = filterTicksByPixelDistance(candidates, minPixelDistance)

  if (dedupeLabels && ticks.length > 1) {
    ticks = ticks.filter((tick, index) =>
      index === 0 || !hasSameTickLabel(tick.label, ticks[index - 1].label)
    )
  }

  if (
    !includeDomainMax ||
    !includeMax ||
    ticks.length === 0 ||
    extentMode === "exact" ||
    hasExplicitTickValues
  ) {
    return ticks
  }

  const domain = scale.domain()
  const domainMax = domain[domain.length - 1]
  if (domainMax == null) return ticks
  const maxPixel = scale(domainMax)
  const nearestPixel = ticks[ticks.length - 1].pixel
  if (Math.abs(maxPixel - nearestPixel) <= 1) return ticks

  const allTicks = candidates.map((tick) => tick.value.valueOf())
  const maxTick: StaticAxisTick = {
    value: domainMax,
    pixel: maxPixel,
    label: format(domainMax, ticks.length, allTicks),
  }
  if (Math.abs(maxPixel - nearestPixel) < minPixelDistance && ticks.length > 1) {
    ticks = ticks.slice(0, -1)
  }
  return [...ticks, maxTick]
}

export function isStaticAxisLandmark(
  landmarkTicks: XYFrameAxisConfig["landmarkTicks"],
  tick: StaticAxisTick,
  index: number,
  ticks: StaticAxisTick[],
): boolean {
  if (!landmarkTicks) return false
  if (typeof landmarkTicks === "function") {
    return landmarkTicks(tick.value, index)
  }
  return isTimeLandmark(tick.value, index > 0 ? ticks[index - 1].value : undefined)
}
