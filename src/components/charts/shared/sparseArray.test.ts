import { describe, expect, it } from "vitest"
import { EMPTY_ARRAY, filterSparseArray } from "./sparseArray"

describe("filterSparseArray", () => {
  it("returns the shared frozen empty array for absent data", () => {
    expect(filterSparseArray(null)).toBe(EMPTY_ARRAY)
    expect(filterSparseArray(undefined)).toBe(EMPTY_ARRAY)
    expect(Object.isFrozen(EMPTY_ARRAY)).toBe(true)
  })

  it("preserves clean array identity, including empty and frozen arrays", () => {
    const empty: object[] = []
    const rows = Object.freeze([{ id: "a" }, { id: "b" }])
    expect(filterSparseArray(empty)).toBe(empty)
    expect(filterSparseArray(rows)).toBe(rows)
  })

  it("omits holes, absent rows, and primitives while retaining records in order", () => {
    const first = { id: "a" }
    const last = { id: "b" }
    const rows = [first, undefined, null, undefined, "invalid", 0, false, Symbol(), 1n, last]
    delete rows[1]
    const filtered = filterSparseArray(rows as (typeof first | null | undefined)[])
    expect(filtered).toEqual([first, last])
    expect(filtered[0]).toBe(first)
    expect(filtered[1]).toBe(last)
    expect(rows.length).toBe(10)
    expect(1 in rows).toBe(false)
  })

  it("filters frozen input and retains object kinds accepted by the chart boundary", () => {
    const record = { id: "a" }
    const date = new Date(0)
    const nested: object[] = []
    const rows = Object.freeze([null, record, date, nested])
    expect(filterSparseArray(rows)).toEqual([record, date, nested])
    expect(rows[0]).toBeNull()
  })
})
