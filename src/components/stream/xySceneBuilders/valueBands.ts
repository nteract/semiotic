import type { HatchFill } from "../../charts/shared/hatchFill"
import type { ValueBand } from "../../realtime/types"

type BandFill = string | HatchFill

interface ResolvedValueBand {
  upTo: number
  fill: BandFill
}

/**
 * Valid bands in value order. A band without a finite `upTo` covers every
 * value above the previous band; bands after it are unreachable and dropped.
 */
export function normalizeValueBands(bands: ValueBand[] | undefined): ResolvedValueBand[] | undefined {
  if (!Array.isArray(bands)) return undefined
  const valid = bands.filter(
    (band): band is ValueBand =>
      !!band && (typeof band.fill === "string" || (typeof band.fill === "object" && band.fill !== null))
  )
  const bounded = valid
    .filter((band) => typeof band.upTo === "number" && Number.isFinite(band.upTo))
    .map((band) => ({ upTo: band.upTo as number, fill: band.fill }))
    .sort((a, b) => a.upTo - b.upTo)
  const open = valid.find((band) => typeof band.upTo !== "number" || !Number.isFinite(band.upTo))
  const resolved = open ? [...bounded, { upTo: Infinity, fill: open.fill }] : bounded
  return resolved.length > 0 ? resolved : undefined
}

/**
 * Split the value range a bar covers (`from`–`to`, either order) at the band
 * edges. Parts no band covers take `baseFill`. Empty when the bar has no
 * height.
 */
export function valueBandSegments(
  bands: ResolvedValueBand[],
  from: number,
  to: number,
  baseFill: BandFill | undefined,
): Array<{ from: number; to: number; fill: BandFill | undefined }> {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  if (!(hi > lo)) return []
  const segments: Array<{ from: number; to: number; fill: BandFill | undefined }> = []
  let lower = -Infinity
  for (const band of bands) {
    const start = Math.max(lower, lo)
    const end = Math.min(band.upTo, hi)
    if (end > start) segments.push({ from: start, to: end, fill: band.fill })
    lower = band.upTo
    if (lower >= hi) break
  }
  if (lower < hi) segments.push({ from: Math.max(lower, lo), to: hi, fill: baseFill })
  return segments
}
