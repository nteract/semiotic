import { describe, it, expect } from "vitest"
import { applyChangelog, type ChangelogOp } from "./applyChangelog"
import type { Datum } from "../charts/shared/datumTypes"
import type { RealtimeFrameHandle } from "./types"

function fakeHandle(initial: Datum[] = []) {
  let rows = [...initial]
  const handle: Pick<RealtimeFrameHandle, "push" | "pushMany" | "update" | "remove" | "getData"> = {
    push(point) {
      rows.push(point)
    },
    pushMany(points) {
      rows.push(...points)
    },
    update(id, updater) {
      const prev: Datum[] = []
      rows = rows.map((row) => {
        if (String(row.id) !== String(id)) return row
        prev.push(row)
        return updater(row)
      })
      return prev
    },
    remove(id) {
      const ids = new Set(Array.isArray(id) ? id.map(String) : [String(id)])
      const removed = rows.filter((row) => ids.has(String(row.id)))
      rows = rows.filter((row) => !ids.has(String(row.id)))
      return removed
    },
    getData() {
      return rows
    },
  }
  return { handle, data: () => rows }
}

describe("applyChangelog", () => {
  it("inserts new keys and updates existing ones", () => {
    const { handle, data } = fakeHandle([{ id: "a", v: 1 }])
    const events: ChangelogOp[] = [
      { op: "insert", row: { id: "b", v: 2 } },
      { op: "update", row: { id: "a", v: 9 } },
    ]
    const result = applyChangelog(handle, events, { key: "id" })
    expect(result.upserts).toBe(2)
    expect(data()).toEqual([
      { id: "a", v: 9 },
      { id: "b", v: 2 },
    ])
  })

  it("coalesces a batch so the last op per key wins", () => {
    const { handle, data } = fakeHandle()
    const result = applyChangelog(
      handle,
      [
        { op: "insert", row: { id: "a", v: 1 } },
        { op: "update", row: { id: "a", v: 2 } },
        { op: "retract", id: "a" },
      ],
      { key: "id" },
    )
    expect(result.retracts).toBe(1)
    expect(data()).toEqual([])
  })

  it("retracts an existing row", () => {
    const { handle, data } = fakeHandle([{ id: "gone", v: 1 }])
    applyChangelog(handle, [{ op: "delete", id: "gone" }], { key: "id" })
    expect(data()).toEqual([])
  })
})
