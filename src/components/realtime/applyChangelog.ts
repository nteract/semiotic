import type { Datum } from "../charts/shared/datumTypes"
import type { RealtimeFrameHandle } from "./types"

export type ChangelogOp<T extends Datum = Datum> =
  | { op: "insert" | "upsert"; row: T; id?: string }
  | { op: "update"; row: T; id?: string }
  | { op: "delete" | "retract"; id?: string; row?: T }

export interface ApplyChangelogOptions<T extends Datum = Datum> {
  /** Identity field or accessor. Must match the chart's `pointIdAccessor`. */
  key: string | ((row: T) => string)
  /** Collapse the batch to the last op per key. Default true. */
  coalesce?: boolean
}

export interface ApplyChangelogResult {
  applied: number
  upserts: number
  retracts: number
}

function resolveKey<T extends Datum>(
  op: ChangelogOp<T>,
  key: ApplyChangelogOptions<T>["key"],
): string | undefined {
  if (typeof op.id === "string" && op.id.length > 0) return op.id
  if (!op.row) return undefined
  if (typeof key === "function") return key(op.row)
  const value = op.row[key]
  return value == null ? undefined : String(value)
}

function indexByKey<T extends Datum>(
  rows: T[],
  key: ApplyChangelogOptions<T>["key"],
): Set<string> {
  const ids = new Set<string>()
  for (const row of rows) {
    const id = typeof key === "function" ? key(row) : row[key]
    if (id != null) ids.add(String(id))
  }
  return ids
}

/**
 * Map a Flink / Debezium / Kafka Streams changelog onto a realtime handle.
 *
 * Semantics:
 *   • `insert` / `upsert` / `update` — `update` when the id is already in
 *     the buffer, otherwise `push`.
 *   • `delete` / `retract` — `remove(id)`.
 *   • Batches coalesce by key (last op wins) unless `coalesce: false`.
 *
 * The chart must set `pointIdAccessor` to the same identity as `key`.
 */
export function applyChangelog<T extends Datum = Datum>(
  handle: Pick<RealtimeFrameHandle<T>, "push" | "pushMany" | "update" | "remove" | "getData">,
  events: ReadonlyArray<ChangelogOp<T>>,
  options: ApplyChangelogOptions<T>,
): ApplyChangelogResult {
  const coalesce = options.coalesce !== false
  const ops = coalesce
    ? Array.from(
        events.reduce((byKey, op) => {
          const id = resolveKey(op, options.key)
          if (id) byKey.set(id, op)
          return byKey
        }, new Map<string, ChangelogOp<T>>()).values(),
      )
    : [...events]

  const present = indexByKey(handle.getData(), options.key)
  const inserts: T[] = []
  let upserts = 0
  let retracts = 0
  let applied = 0

  const flushInserts = () => {
    if (inserts.length === 0) return
    handle.pushMany(inserts)
    applied += inserts.length
    upserts += inserts.length
    inserts.length = 0
  }

  for (const op of ops) {
    const id = resolveKey(op, options.key)
    if (!id) continue
    if (op.op === "delete" || op.op === "retract") {
      flushInserts()
      handle.remove(id)
      present.delete(id)
      retracts += 1
      applied += 1
      continue
    }
    if (!op.row) continue
    if (present.has(id)) {
      flushInserts()
      handle.update(id, () => op.row as T)
      upserts += 1
      applied += 1
    } else {
      inserts.push(op.row)
      present.add(id)
    }
  }
  flushInserts()

  return { applied, upserts, retracts }
}
