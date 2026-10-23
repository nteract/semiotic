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

type BandScale = ((value: number) => number) & { domain?: () => unknown[] }

/**
 * Project one band edge. An omitted bound is the plot edge (`scale` of the
 * domain endpoint). An explicit key goes through the cell index. A missing
 * key is null — it is not a pixel.
 */
export function projectHeatmapBandBound(
  scale: BandScale | null | undefined,
  explicit: unknown,
  endpoint: 0 | 1
): number | null {
  if (typeof scale !== "function") return null
  if (explicit == null) {
    const edge = scale.domain?.()?.[endpoint]
    if (edge == null) return null
    const px = scale(edge instanceof Date ? edge.getTime() : Number(edge))
    return Number.isFinite(px) ? px : null
  }
  const px = projectHeatmapBandValue(scale, explicit)
  return px != null && Number.isFinite(px) ? px : null
}

/** Map a data value, including one that falls between keys, back to a pixel. */
export function projectHeatmapBandDataValue(
  scale: ((value: number) => number) | null | undefined,
  value: number | Date
): number | null {
  const numeric = value instanceof Date ? value.getTime() : value
  if (!scale || !Number.isFinite(numeric)) return null
  const ticks = heatmapBandTicks(scale)
  if (!ticks) return scale(numeric)
  const keys = heatmapBandNumericKeys(ticks)
  if (!keys) return scale(numeric)
  const exact = keys.findIndex((key) => key === numeric)
  if (exact >= 0) return scale(exact)
  const index = heatmapBandIndexForValue(keys, numeric)
  return index == null ? null : scale(index)
}

/**
 * Project a fitted coordinate. Numeric and date bands interpolate between
 * keys. A categorical anchor stays an exact lookup.
 */
export function projectHeatmapBandComputedValue(
  scale: ((value: number) => number) | null | undefined,
  value: unknown
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return projectHeatmapBandDataValue(scale, value)
  }
  return projectHeatmapBandValue(scale, value)
}

/**
 * Scale adapter for marginal binning. A band scale's domain is cell indexes,
 * so a histogram of the raw keys would see an empty domain. This adapter's
 * domain is the key extent, and calls project through those keys.
 */
export function heatmapDataScale<Scale extends (value: number) => number>(
  scale: Scale
): Scale {
  const ticks = heatmapBandTicks(scale)
  if (!ticks) return scale
  const keys = heatmapBandNumericKeys(ticks)
  if (!keys) return scale
  const start = Math.min(keys[0], keys[keys.length - 1])
  const end = Math.max(keys[0], keys[keys.length - 1])
  const domain: [number, number] = start === end ? [start - 0.5, end + 0.5] : [start, end]
  const project = (value: number) => {
    const px = projectHeatmapBandDataValue(scale, value)
    return px == null ? Number.NaN : px
  }
  return Object.assign(project, {
    domain: () => domain.slice() as [number, number],
  }) as unknown as Scale
}

type InvertibleScale = {
  (value: number): number
  invert: (pixel: number) => number
}

/**
 * Invert a pixel to the brush's data coordinate.
 * Numeric and date bands interpolate between adjacent keys.
 * A categorical band has no numeric range, so the cell index is returned.
 */
export function invertHeatmapBandValue(
  scale: InvertibleScale,
  pixel: number
): number {
  const ticks = heatmapBandTicks(scale)
  if (!ticks) return scale.invert(pixel)
  return heatmapBandValueAtIndex(ticks, scale.invert(pixel))
}

function heatmapBandNumericKeys(ticks: HeatmapBandTick[]): number[] | null {
  const numeric = ticks.every((tick) => typeof tick.label === "number" && Number.isFinite(tick.label))
  if (numeric) return ticks.map((tick) => tick.label as number)
  const dates = ticks.every((tick) => tick.label instanceof Date && Number.isFinite((tick.label as Date).getTime()))
  if (dates) return ticks.map((tick) => (tick.label as Date).getTime())
  return null
}

function heatmapBandValueAtIndex(ticks: HeatmapBandTick[], index: number): number {
  const keys = heatmapBandNumericKeys(ticks)
  if (!keys) return index
  // One cell still spans the plot. A gap of one index keeps the domain
  // edges on opposite sides of the key so a brush has a nonzero width.
  if (keys.length === 1) return keys[0] + index
  if (index <= 0) return keys[0] + index * (keys[1] - keys[0])
  const last = keys.length - 1
  if (index >= last) return keys[last] + (index - last) * (keys[last] - keys[last - 1])
  const i = Math.floor(index)
  return keys[i] + (index - i) * (keys[i + 1] - keys[i])
}

function heatmapBandIndexForValue(keys: number[], value: number): number | null {
  if (keys.length < 2) return keys.length === 1 ? value - keys[0] : null
  for (let i = 0; i < keys.length - 1; i++) {
    const start = keys[i]
    const end = keys[i + 1]
    if (start === end) continue
    const lo = Math.min(start, end)
    const hi = Math.max(start, end)
    if (value >= lo && value <= hi) return i + (value - start) / (end - start)
  }
  const firstGap = keys[1] - keys[0]
  if (firstGap !== 0 && (value - keys[0]) / firstGap < 0) {
    return (value - keys[0]) / firstGap
  }
  const last = keys.length - 1
  const lastGap = keys[last] - keys[last - 1]
  if (lastGap !== 0 && (value - keys[last]) / lastGap > 0) {
    return last + (value - keys[last]) / lastGap
  }
  return null
}
