import { describe, expect, it, vi } from "vitest"
import { fromArrow } from "./fromArrow"
import type { ArrowTableLike } from "./fromArrow"

vi.spyOn(console, "warn").mockImplementation(() => {})

/** Build a minimal duck-typed Arrow table from column arrays. */
function mockTable(columns: Record<string, unknown[]>): ArrowTableLike {
  const names = Object.keys(columns)
  const numRows = names.length ? columns[names[0]].length : 0
  return {
    numRows,
    schema: { fields: names.map((name) => ({ name })) },
    getChild: (name) => (columns[name] ? { get: (i: number) => columns[name][i] } : null),
  }
}

describe("fromArrow", () => {
  it("materializes column-oriented Arrow data into row objects", () => {
    const table = mockTable({
      region: ["North", "South"],
      revenue: [128, 92],
    })
    expect(fromArrow(table)).toEqual([
      { region: "North", revenue: 128 },
      { region: "South", revenue: 92 },
    ])
  })

  it("returns a real Array (the data path requires Array.isArray)", () => {
    const rows = fromArrow(mockTable({ x: [1, 2] }))
    expect(Array.isArray(rows)).toBe(true)
  })

  it("projects a subset of columns when fields is given", () => {
    const table = mockTable({ a: [1, 2], b: [3, 4], c: [5, 6] })
    const rows = fromArrow(table, { fields: ["a", "c"] })
    expect(rows).toEqual([
      { a: 1, c: 5 },
      { a: 2, c: 6 },
    ])
  })

  it("coerces in-range bigint to number by default, leaves out-of-range as bigint", () => {
    const table = mockTable({ small: [5n, 6n], huge: [9007199254740993n, 1n] })
    const rows = fromArrow(table)
    expect(rows[0].small).toBe(5)
    expect(typeof rows[0].small).toBe("number")
    expect(typeof rows[0].huge).toBe("bigint") // exceeds MAX_SAFE_INTEGER → preserved
  })

  it("leaves bigint untouched when coerceBigInt is false", () => {
    const rows = fromArrow(mockTable({ n: [5n] }), { coerceBigInt: false })
    expect(rows[0].n).toBe(5n)
  })

  it("passes Date and other values through unchanged", () => {
    const d = new Date("2026-06-21T00:00:00Z")
    const rows = fromArrow(mockTable({ t: [d], label: ["x"] }))
    expect(rows[0].t).toBe(d)
    expect(rows[0].label).toBe("x")
  })

  it("warns and skips a requested column not in the schema", () => {
    const rows = fromArrow(mockTable({ a: [1] }), { fields: ["a", "missing"] })
    expect(rows).toEqual([{ a: 1 }])
  })

  it("returns [] for an empty table and for a non-table input", () => {
    expect(fromArrow(mockTable({ a: [] }))).toEqual([])
    expect(fromArrow(undefined as unknown as ArrowTableLike)).toEqual([])
  })
})
