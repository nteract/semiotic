import type { Datum } from "../charts/shared/datumTypes"
import type { OrdinalColumn } from "./ordinalTypes"

/** One rendered bar per group; normalization follows the sign of the net total. */
export function aggregateOrdinalGroups(
  data: Datum[],
  getR: (d: Datum) => number,
  getGroup?: (d: Datum) => string,
  normalize = false
): Map<string, { total: number; value: number; pieces: Datum[] }> {
  const groups = new Map<
    string,
    { total: number; value: number; pieces: Datum[] }
  >()
  for (const datum of data) {
    const value = getR(datum)
    if (!Number.isFinite(value)) continue
    const key = getGroup ? getGroup(datum) : "_default"
    let group = groups.get(key)
    if (!group) {
      group = { total: 0, value: 0, pieces: [] }
      groups.set(key, group)
    }
    group.total += value
    group.pieces.push(datum)
  }
  let total = 0
  for (const group of groups.values()) total += Math.abs(group.total)
  for (const group of groups.values()) {
    group.value = normalize && total > 0 ? group.total / total : group.total
  }
  return groups
}

/** Aggregate ordered columns once while discovering a consistent series order. */
export function aggregateOrdinalColumns(
  columns: OrdinalColumn[],
  getR: (d: Datum) => number,
  getGroup?: (d: Datum) => string,
  normalize = false
) {
  const keys = new Set<string>()
  const steps = columns.map((col) => {
    const groups = aggregateOrdinalGroups(
      col.pieceData,
      getR,
      getGroup,
      normalize
    )
    let stepTotal = 0
    for (const [key, group] of groups) {
      keys.add(key)
      stepTotal += group.total
    }
    return { col, groups, stepTotal }
  })
  return { steps, keys: [...keys] }
}
