// Pure helpers for the ProcessSankey default tooltip body. Kept
// separate from `ProcessSankey.tsx` so they can be unit-tested without
// rendering React, and so future tooltip variants (sparkline, deltas,
// full series) can compose against the same row-shaping primitives.

import type { ProcessSankeyNodeData } from "./algorithm.js"

export interface MassHistoryRow {
  t: number
  total: number
}

export interface MassHistoryRowMarked extends MassHistoryRow {
  /** "min" | "q25" | "median" | "q75" | "max" — present only when the
   *  full series was condensed via `pickMassQuantiles`. */
  mark?: string
}

/**
 * Distinct (time, total-mass) tuples drawn from a node's sample series.
 * The same `(t, total)` pair never appears twice — the layout's
 * same-time pre/post sample collapse is preserved here. Returns an
 * empty array when `data` has no samples (or is undefined).
 */
export function massHistoryRows(data: ProcessSankeyNodeData | undefined): MassHistoryRow[] {
  if (!data) return []
  const seen = new Set<string>()
  const rows: MassHistoryRow[] = []
  for (const s of data.samples) {
    const total = s.topMass + s.botMass
    const key = `${s.t}:${total}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ t: s.t, total })
  }
  return rows
}

/** Number of quantile picks emitted on truncation. Fixed at five —
 *  `min`, `q25`, `median`, `q75`, `max` — because the picks are
 *  semantic (named labels), not cap-driven. The `truncateAt` parameter
 *  on `pickMassQuantiles` controls *when* to truncate, not how many to
 *  return. */
export const QUANTILE_PICK_COUNT = 5

/**
 * Condense a row series down to the five mass-quantile picks —
 * `min`, `q25`, `median`, `q75`, `max` — re-sorted by time so the
 * tooltip table reads chronologically. Returns the input unchanged
 * when its length is at or below `truncateAt` (default 5).
 *
 * Same-time collisions are deduplicated, so very small or very flat
 * series may yield fewer than five output rows even when truncation
 * fires; the marks attached are the first ones encountered for each
 * surviving timestamp, which keeps `min` and `max` stable when ties
 * are present.
 *
 * Note: `truncateAt` is the *trigger threshold*, not the output cap —
 * once truncation fires, the output always emits the five quantile
 * picks. To raise/lower the threshold without changing the picks,
 * pass a different `truncateAt`; to vary the picks, fork this util.
 */
export function pickMassQuantiles(
  rows: MassHistoryRow[],
  truncateAt = QUANTILE_PICK_COUNT
): MassHistoryRowMarked[] {
  if (rows.length <= truncateAt) return rows.slice()
  const sorted = [...rows].sort((a, b) => a.total - b.total)
  const lastIdx = sorted.length - 1
  const picks: MassHistoryRowMarked[] = [
    { ...sorted[0], mark: "min" },
    { ...sorted[Math.floor(lastIdx * 0.25)], mark: "q25" },
    { ...sorted[Math.floor(lastIdx * 0.5)], mark: "median" },
    { ...sorted[Math.floor(lastIdx * 0.75)], mark: "q75" },
    { ...sorted[lastIdx], mark: "max" },
  ]
  const seenT = new Set<number>()
  const dedup: MassHistoryRowMarked[] = []
  for (const p of picks) {
    if (seenT.has(p.t)) continue
    seenT.add(p.t)
    dedup.push(p)
  }
  return dedup.sort((a, b) => a.t - b.t)
}
