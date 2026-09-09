import type { Datum } from "../shared/datumTypes"

/** Assign stable source IDs consistently in React and server builders. */
export interface PhysicsSourceState<T extends Datum> {
  seed: readonly T[]
  rows: T[]
  nextId: number
}

export function createPhysicsSourceState<T extends Datum>(
  seed: readonly T[],
  prefix: string,
  nextId = 0
): PhysicsSourceState<T> {
  const reserved = new Set(
    seed.filter((row) => row.id != null).map((row) => String(row.id))
  )
  const rows = new Map<string, T>()
  for (const row of seed) {
    let id = row.id == null ? `${prefix}-${nextId++}` : String(row.id)
    while (row.id == null && reserved.has(id)) id = `${prefix}-${nextId++}`
    reserved.add(id)
    rows.set(id, row.id == null ? { ...row, id } : row)
  }
  return { seed, rows: Array.from(rows.values()), nextId }
}
