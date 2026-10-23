import { scaleLinear, type ScaleLinear } from "d3-scale"

export const HEATMAP_BAND_TICKS = Symbol.for("semiotic.heatmapBandTicks")
const HEATMAP_BAND_COPY = Symbol.for("semiotic.heatmapBandCopy")

export type HeatmapBandTick = {
  value: number
  label: string | number | Date
}

/** Integer tick positions for a static heatmap axis, or null for a linear scale. */
export function heatmapBandTicks(
  scale: object | null | undefined
): HeatmapBandTick[] | null {
  if (!scale) return null
  const ticks = (scale as { [HEATMAP_BAND_TICKS]?: HeatmapBandTick[] })[HEATMAP_BAND_TICKS]
  return ticks && ticks.length > 0 ? ticks : null
}

/**
 * Keep the tick list on scale copies. A resize copies the scale and changes
 * its range; a second resize copies that copy. The symbol is not enumerable,
 * so d3's copy does not carry it.
 */
export function attachHeatmapBandTicks<Scale extends object>(
  scale: Scale,
  ticks: HeatmapBandTick[]
): Scale {
  Object.defineProperty(scale, HEATMAP_BAND_TICKS, {
    value: ticks,
    enumerable: false,
    configurable: true,
  })
  const copyable = scale as Scale & {
    copy?: () => Scale
    [HEATMAP_BAND_COPY]?: boolean
  }
  if (typeof copyable.copy === "function" && !copyable[HEATMAP_BAND_COPY]) {
    const original = copyable.copy
    Object.defineProperty(copyable, HEATMAP_BAND_COPY, { value: true })
    copyable.copy = function copyWithHeatmapBandTicks(this: Scale) {
      return attachHeatmapBandTicks(original.call(this), ticks)
    }
  }
  return scale
}

/**
 * Index scale whose `scale(i)` is the center of column or row `i`.
 * Domain `[-0.5, n - 0.5]` keeps the existing cell geometry: index 0 is
 * centered in the first cell, and the last index is centered in the last.
 */
export function heatmapBandScale(
  labels: Array<string | number | Date>,
  range: [number, number]
): ScaleLinear<number, number> {
  const scale = scaleLinear()
    .domain([-0.5, Math.max(labels.length - 0.5, 0.5)])
    .range(range)
  return attachHeatmapBandTicks(
    scale,
    labels.map((label, value) => ({ value, label }))
  )
}

/** Cell index for a data key, or null when the key is not a column or row. */
export function heatmapBandIndex(
  ticks: HeatmapBandTick[],
  value: unknown
): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    if (!Number.isFinite(time)) return null
    return ticks.find((tick) =>
      tick.label instanceof Date && tick.label.getTime() === time
    )?.value ?? null
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const numeric = ticks.find((tick) =>
      typeof tick.label === "number" && tick.label === value
    )
    if (numeric) return numeric.value
    return ticks.find((tick) =>
      tick.label instanceof Date && tick.label.getTime() === value
    )?.value ?? null
  }
  if (typeof value === "string") {
    return ticks.find((tick) =>
      typeof tick.label === "string" && tick.label === value
    )?.value ?? null
  }
  return null
}

/**
 * Project a data key through a static heatmap band scale.
 * Linear and time scales keep their existing value mapping.
 */
export function projectHeatmapBandValue(
  scale: ((value: number) => number) | null | undefined,
  value: unknown
): number | null {
  if (!scale) return null
  const ticks = heatmapBandTicks(scale)
  if (!ticks) return scale(value as number)
  const index = heatmapBandIndex(ticks, value)
  return index == null ? null : scale(index)
}
