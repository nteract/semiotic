/**
 * Pure helpers shared by the XY and ordinal brush overlays, which both load
 * on demand: a data range to and from d3-brush pixels along one axis, where
 * a finished selection reaches on that axis, and comparing ranges.
 *
 * Consumed by: XYBrushOverlay, OrdinalBrushOverlay.
 */
import { invertHeatmapBandValue, projectHeatmapBandDataValue } from "./heatmapBandTicks"
import type { XYBrushEndMeta } from "./xyBrushTypes"

/** A scale along one brushed axis. */
export type BrushAxisScale = Parameters<typeof invertHeatmapBandValue>[0]

/** Pixels along one axis, ascending. */
export type PixelRange = [number, number]

/** A data range as ascending pixels within `[0, size]`; the whole axis when absent; `null` when unplaceable. */
export function pixelRange(
  scale: BrushAxisScale,
  range: readonly [number, number] | undefined,
  size: number
): PixelRange | null {
  if (!range) return [0, size]
  const a = projectHeatmapBandDataValue(scale, range[0])
  const b = projectHeatmapBandDataValue(scale, range[1])
  if (a == null || b == null) return null
  const low = Math.max(0, Math.min(size, Math.min(a, b)))
  const high = Math.max(0, Math.min(size, Math.max(a, b)))
  return low < high ? [low, high] : null
}

/** The data range ascending pixels cover; a vertical axis has its minimum at the bottom. */
export function rangeOf(scale: BrushAxisScale, [low, high]: readonly [number, number], vertical: boolean): [number, number] {
  return vertical
    ? [Number(invertHeatmapBandValue(scale, high)), Number(invertHeatmapBandValue(scale, low))]
    : [Number(invertHeatmapBandValue(scale, low)), Number(invertHeatmapBandValue(scale, high))]
}

/** Whether a finished selection reaches the start / end of its axis; both when cleared. */
export function axisEndMeta(
  source: XYBrushEndMeta["source"],
  selection: readonly [number, number] | null,
  size: number,
  vertical: boolean
): XYBrushEndMeta {
  if (!selection) return { source, atDomainStart: true, atDomainEnd: true }
  const [low, high] = selection
  return vertical
    ? { source, atDomainStart: high >= size - 0.5, atDomainEnd: low <= 0.5 }
    : { source, atDomainStart: low <= 0.5, atDomainEnd: high >= size - 0.5 }
}

export function sameRange(a: readonly [number, number] | undefined, b: readonly [number, number] | undefined): boolean {
  if (!a || !b) return a === b
  return a[0] === b[0] && a[1] === b[1]
}
