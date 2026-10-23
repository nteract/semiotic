import { scaleLinear, type ScaleLinear } from "d3-scale"

export const HEATMAP_BAND_TICKS = Symbol.for("semiotic.heatmapBandTicks")

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

export function attachHeatmapBandTicks<Scale extends object>(
  scale: Scale,
  ticks: HeatmapBandTick[]
): Scale {
  Object.defineProperty(scale, HEATMAP_BAND_TICKS, {
    value: ticks,
    enumerable: false,
  })
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
