import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { syncPushBuffer, useSyncedPushData, type SyncedPushHandle } from "./useSyncedPushData"

type Row = { id: string; v: number }

function makeHandle(overrides: Partial<SyncedPushHandle<Row>> = {}) {
  const calls = {
    push: [] as Row[],
    pushMany: [] as Row[][],
    update: [] as Array<[string, (d: Row) => Row]>,
    remove: [] as Array<string | string[]>,
    clear: 0,
  }
  const handle: SyncedPushHandle<Row> = {
    push: (d) => calls.push.push(d),
    pushMany: (ds) => calls.pushMany.push(ds),
    update: (id, fn) => calls.update.push([id, fn]),
    remove: (id) => calls.remove.push(id),
    clear: () => {
      calls.clear += 1
    },
    ...overrides,
  }
  return { handle, calls }
}

const byId = (row: Row) => row.id

describe("syncPushBuffer", () => {
  it("pushes all rows on first sync via pushMany", () => {
    const { handle, calls } = makeHandle()
    const rows: Row[] = [{ id: "a", v: 1 }, { id: "b", v: 2 }]
    const map = syncPushBuffer(handle, new Map(), rows, byId)
    expect(calls.pushMany).toEqual([rows])
    expect(calls.push).toEqual([])
    expect([...map.keys()]).toEqual(["a", "b"])
  })

  it("pushes only newly-added rows on the next sync", () => {
    const { handle, calls } = makeHandle()
    const r1: Row = { id: "a", v: 1 }
    const r2: Row = { id: "b", v: 2 }
    const map = syncPushBuffer(handle, new Map(), [r1], byId)
    syncPushBuffer(handle, map, [r1, r2], byId)
    expect(calls.pushMany).toEqual([[r1], [r2]])
    expect(calls.remove).toEqual([])
  })

  it("removes rows that disappeared, batched", () => {
    const { handle, calls } = makeHandle()
    const r1: Row = { id: "a", v: 1 }
    const r2: Row = { id: "b", v: 2 }
    const map = syncPushBuffer(handle, new Map(), [r1, r2], byId)
    syncPushBuffer(handle, map, [r2], byId)
    expect(calls.remove).toEqual([["a"]])
  })

  it("updates a row in place when its reference changed but id is stable", () => {
    const { handle, calls } = makeHandle()
    const r1: Row = { id: "a", v: 1 }
    const map = syncPushBuffer(handle, new Map(), [r1], byId)
    const r1b: Row = { id: "a", v: 99 }
    syncPushBuffer(handle, map, [r1b], byId)
    expect(calls.update).toHaveLength(1)
    expect(calls.update[0][0]).toBe("a")
    expect(calls.update[0][1](r1)).toBe(r1b) // updater returns the new row
    expect(calls.push).toEqual([]) // not re-pushed
  })

  it("falls back to remove + push when the handle has no update()", () => {
    const { handle, calls } = makeHandle({ update: undefined })
    const r1: Row = { id: "a", v: 1 }
    const map = syncPushBuffer(handle, new Map(), [r1], byId)
    const r1b: Row = { id: "a", v: 2 }
    syncPushBuffer(handle, map, [r1b], byId)
    expect(calls.remove).toEqual(["a"])
    expect(calls.pushMany).toEqual([[r1], [r1b]])
  })

  it("uses push() per row when pushMany is unavailable", () => {
    const { handle, calls } = makeHandle({ pushMany: undefined })
    const rows: Row[] = [{ id: "a", v: 1 }, { id: "b", v: 2 }]
    syncPushBuffer(handle, new Map(), rows, byId)
    expect(calls.push).toEqual(rows)
  })

  it("keys by index when no id accessor is given", () => {
    const { handle, calls } = makeHandle()
    const map = syncPushBuffer(handle, new Map(), [{ id: "a", v: 1 }], null)
    expect([...map.keys()]).toEqual(["0"])
    expect(calls.pushMany[0]).toHaveLength(1)
  })
})

describe("useSyncedPushData", () => {
  it("clears and seeds on mount, then pushes incrementally", () => {
    const { handle, calls } = makeHandle()
    const ref = { current: handle } as React.RefObject<typeof handle>
    const { rerender } = renderHook(
      ({ data }: { data: Row[] }) => useSyncedPushData(ref, data, { id: "id" }),
      { initialProps: { data: [{ id: "a", v: 1 }] as Row[] } },
    )
    expect(calls.clear).toBe(1) // null → handle counts as a reset
    expect(calls.pushMany).toEqual([[{ id: "a", v: 1 }]])

    rerender({ data: [{ id: "a", v: 1 }, { id: "b", v: 2 }] })
    expect(calls.clear).toBe(1) // no extra clear on a plain data change
    expect(calls.pushMany).toEqual([[{ id: "a", v: 1 }], [{ id: "b", v: 2 }]])
  })

  it("clears and rebuilds when resetKey changes", () => {
    const { handle, calls } = makeHandle()
    const ref = { current: handle } as React.RefObject<typeof handle>
    const { rerender } = renderHook(
      ({ data, resetKey }: { data: Row[]; resetKey: string }) =>
        useSyncedPushData(ref, data, { id: "id", resetKey }),
      { initialProps: { data: [{ id: "a", v: 1 }] as Row[], resetKey: "light" } },
    )
    expect(calls.clear).toBe(1)
    rerender({ data: [{ id: "a", v: 1 }], resetKey: "dark" })
    expect(calls.clear).toBe(2) // resetKey change forces a fresh sync
  })

  it("no-ops safely when the ref is not yet attached", () => {
    const ref = { current: null } as React.RefObject<SyncedPushHandle<Row> | null>
    expect(() =>
      renderHook(() => useSyncedPushData(ref, [{ id: "a", v: 1 }] as Row[], { id: "id" })),
    ).not.toThrow()
  })
})
