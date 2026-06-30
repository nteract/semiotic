/**
 * useSyncedPushData — keep a push-API chart's buffer in sync with a
 * controlled React array.
 *
 * The push API (`ref.current.push` / `pushMany` / `update` / `remove` /
 * `clear`) is imperative on purpose, but applications usually hold their
 * rows in React state and want the chart to *mirror* that state. Writing
 * that reconciliation by hand — diff by id, push new rows, update changed
 * ones, remove gone ones, and start clean when the source resets — is
 * fiddly and easy to get subtly wrong (StrictMode double-mounts, handle
 * swaps on theme/key changes). This hook is that reconciliation, once.
 *
 * It is the controlled-data companion to {@link useStreamStatus}: the same
 * "wrap any push-API ref" contract, and it works uniformly across realtime
 * and non-realtime push HOCs (XY, ordinal, network). Pass it the same `ref`
 * you give the chart, your current rows, and an `id` accessor.
 *
 * Pass `data` to this hook, **not** to the chart — the chart's `data` prop
 * is for static mode and clears the buffer on every render.
 *
 * @example
 * ```tsx
 * const ref = useRef(null)
 * const [points, setPoints] = useState([])
 * useSyncedPushData(ref, points, { id: "id" })
 * // changing `points` pushes/updates/removes to match; theme toggles via
 * // resetKey clear and rebuild.
 * useSyncedPushData(ref, points, { id: "id", resetKey: theme })
 *
 * <RealtimeLineChart ref={ref} timeAccessor="t" valueAccessor="v" pointIdAccessor="id" />
 * ```
 */
"use client"
import { useEffect, useMemo, useRef } from "react"
import type { Datum } from "./datumTypes"

/**
 * The slice of a chart's imperative handle this hook drives. Every Semiotic
 * push-API handle (realtime + non-realtime HOCs) satisfies it structurally;
 * each method is optional so the hook degrades gracefully on handles that
 * only support a subset (e.g. append-only).
 */
export interface SyncedPushHandle<T = Datum> {
  push?: (datum: T) => unknown
  pushMany?: (data: T[]) => unknown
  update?: (id: string, updater: (datum: T) => T) => unknown
  remove?: (id: string | string[]) => unknown
  clear?: () => unknown
}

/** An id accessor: a field name, or a function of the row (and its index). */
export type PushIdAccessor<T> = keyof T | ((datum: T, index: number) => string | number | null | undefined)

export interface SyncedPushDataOptions<T = Datum> {
  /**
   * Identifies a row so it can be updated/removed in place. A field name
   * (`"id"`) or a function. Omit it and rows are keyed by index — fine for
   * append-mostly streams, but reorders/removals then read positionally.
   */
  id?: PushIdAccessor<T>
  /**
   * Clear the buffer and re-sync from scratch whenever this value changes.
   * Use it for things that invalidate the whole series — a theme remount, a
   * mode switch, a new data source. The handle identity changing (chart
   * remount) always forces a reset too.
   */
  resetKey?: unknown
}

function normalizeIdAccessor<T>(
  id: PushIdAccessor<T> | undefined,
): ((datum: T, index: number) => string) | null {
  if (id == null) return null
  if (typeof id === "function") {
    return (datum, index) => {
      const value = id(datum, index)
      return value == null ? String(index) : String(value)
    }
  }
  return (datum, index) => {
    const value = (datum as Record<string, unknown>)[id as string]
    return value == null ? String(index) : String(value)
  }
}

/**
 * Pure reconciliation: bring `handle`'s buffer from `previousById` to `rows`,
 * issuing the minimal push/update/remove calls, and return the new id→row map.
 *
 * Exported for direct use and unit testing. The hook is a thin
 * effect wrapper around this. Rows are matched by `getId`; a row whose
 * reference changed is `update`d in place (or removed + re-pushed when the
 * handle has no `update`).
 */
export function syncPushBuffer<T = Datum>(
  handle: SyncedPushHandle<T>,
  previousById: Map<string, T>,
  rows: ReadonlyArray<T>,
  getId: ((datum: T, index: number) => string) | null,
): Map<string, T> {
  const next = new Map<string, T>()
  rows.forEach((row, index) => {
    next.set(getId ? getId(row, index) : String(index), row)
  })

  const removed: string[] = []
  previousById.forEach((_row, id) => {
    if (!next.has(id)) removed.push(id)
  })
  if (removed.length > 0) handle.remove?.(removed)

  const pushed: T[] = []
  next.forEach((row, id) => {
    const previous = previousById.get(id)
    if (previous === undefined) {
      pushed.push(row)
    } else if (previous !== row) {
      if (handle.update) handle.update(id, () => row)
      else {
        handle.remove?.(id)
        pushed.push(row)
      }
    }
  })
  if (pushed.length > 0) {
    if (handle.pushMany) handle.pushMany(pushed)
    else if (handle.push) for (const row of pushed) handle.push(row)
  }

  return next
}

/**
 * Mirror a controlled React array into a push-API chart's buffer.
 *
 * @param ref      The same ref you pass to the chart's `ref` prop.
 * @param data     The rows the chart should currently show.
 * @param options  `id` accessor and optional `resetKey`.
 */
export function useSyncedPushData<T = Datum>(
  ref: React.RefObject<SyncedPushHandle<T> | null>,
  data: ReadonlyArray<T>,
  options: SyncedPushDataOptions<T> = {},
): void {
  const { id, resetKey } = options
  const getId = useMemo(() => normalizeIdAccessor(id), [id])
  const stateRef = useRef<{
    map: Map<string, T>
    handle: SyncedPushHandle<T> | null
    resetKey: unknown
  }>({ map: new Map(), handle: null, resetKey: undefined })

  useEffect(() => {
    const handle = ref.current
    if (!handle) return
    const state = stateRef.current

    // Reset on a fresh handle (remount) or an explicit resetKey change.
    if (state.handle !== handle || state.resetKey !== resetKey) {
      handle.clear?.()
      state.map = new Map()
      state.handle = handle
      state.resetKey = resetKey
    }

    state.map = syncPushBuffer(handle, state.map, data, getId)
  }, [ref, data, getId, resetKey])
}
