/**
 * Shared identity-keyed mutation helpers for family pipeline stores.
 *
 * XY/Ordinal/Network stores each own their buffers, but remove/update by
 * stable id follow the same shape: resolve ids → scan buffer → rebuild.
 * Centralizing the pure scan logic keeps behavior aligned without forcing
 * a single mega-class.
 */
import type { Datum } from "../charts/shared/datumTypes"

export function toIdSet(id: string | string[]): Set<string> {
  return new Set(Array.isArray(id) ? id : [id])
}

/**
 * Remove rows whose id is in `ids`. Returns `{ kept, removed }` where
 * `kept` preserves original order.
 */
export function partitionById(
  data: readonly Datum[],
  ids: Set<string>,
  getId: (d: Datum) => string
): { kept: Datum[]; removed: Datum[] } {
  const kept: Datum[] = []
  const removed: Datum[] = []
  for (const d of data) {
    if (ids.has(getId(d))) removed.push(d)
    else kept.push(d)
  }
  return { kept, removed }
}

/**
 * Apply an updater to rows matching `ids`. Returns updated rows (the new
 * objects) and the full next array (order preserved).
 */
export function updateById(
  data: readonly Datum[],
  ids: Set<string>,
  getId: (d: Datum) => string,
  updater: (d: Datum) => Datum
): { next: Datum[]; updated: Datum[] } {
  const next: Datum[] = []
  const updated: Datum[] = []
  for (const d of data) {
    if (ids.has(getId(d))) {
      const u = updater(d)
      next.push(u)
      updated.push(u)
    } else {
      next.push(d)
    }
  }
  return { next, updated }
}
