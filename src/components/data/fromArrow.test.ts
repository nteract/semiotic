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

describe("Arrow validation and integer boundaries", () => {
  it.each([NaN, -1, 1.5, Infinity, 2 ** 32, Number.MAX_SAFE_INTEGER])("rejects invalid row count %s without allocating", numRows => {
    const table = { ...mockTable({ x: [1] }), numRows }
    expect(fromArrow(table)).toEqual([])
  })

  it.each([{ numRows: 1, schema: {} }, { numRows: 1, schema: { fields: [null] } }, { numRows: 1, schema: { fields: [] } }])("rejects malformed table %j", table => {
    expect(fromArrow(table as unknown as ArrowTableLike)).toEqual([])
  })

  it("rejects sparse schema and projection lists without calling getChild", () => {
    const getChild = vi.fn(() => { throw new Error("invalid lookup") })
    expect(fromArrow({ numRows: 1, schema: { fields: new Array(1) }, getChild })).toEqual([])
    expect(fromArrow({ numRows: 1, schema: { fields: [{ name: "x" }] }, getChild }, { fields: new Array(1) })).toEqual([])
    expect(getChild).not.toHaveBeenCalled()
  })

  it("keeps prototype-named columns as own properties on plain rows", () => {
    const value = { inherited: "should stay in the cell" }
    const rows = fromArrow(mockTable(Object.fromEntries([["__proto__", [value]], ["constructor", [3]]])))
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype)
    expect(Object.hasOwn(rows[0], "__proto__")).toBe(true)
    expect(rows[0].__proto__).toBe(value)
    expect(rows[0].constructor).toBe(3)
    expect(rows[0].inherited).toBeUndefined()
  })

  it("preserves an unsafe integer column consistently and allows explicit conversions", () => {
    const table = mockTable({ n: [1n, 9007199254740993n, 3n, null] })
    expect(fromArrow(table).map(row => row.n)).toEqual([1n, 9007199254740993n, 3n, null])
    expect(fromArrow(table, { bigint: "string" }).map(row => row.n)).toEqual(["1", "9007199254740993", "3", null])
    expect(fromArrow(table, { bigint: "number-lossy" }).map(row => row.n)).toEqual([1, 9007199254740992, 3, null])
    expect(fromArrow(mockTable({ n: [1n] }), { bigint: "keep" })[0].n).toBe(1n)
  })
})
