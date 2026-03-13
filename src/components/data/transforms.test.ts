import { describe, it, expect } from "vitest"
import { bin, rollup, groupBy, pivot } from "./transforms"

// ── bin ────────────────────────────────────────────────────────────────

describe("bin", () => {
  const data = [
    { v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 },
    { v: 6 }, { v: 7 }, { v: 8 }, { v: 9 }, { v: 10 }
  ]

  it("bins numeric data into specified number of bins", () => {
    const result = bin(data, { field: "v", bins: 5 })
    expect(result).toHaveLength(5)
    // Each bin gets a category label and a count
    for (const b of result) {
      expect(b).toHaveProperty("category")
      expect(b).toHaveProperty("value")
      expect(typeof b.category).toBe("string")
      expect(typeof b.value).toBe("number")
    }
    // Total count should equal data length
    const total = result.reduce((sum, b) => sum + b.value, 0)
    expect(total).toBe(10)
  })

  it("returns empty array for empty data", () => {
    expect(bin([], { field: "v" })).toEqual([])
  })

  it("handles data where all values are the same", () => {
    const same = [{ v: 5 }, { v: 5 }, { v: 5 }]
    const result = bin(same, { field: "v" })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(3)
    expect(result[0].category).toBe("5-5")
  })

  it("filters NaN values", () => {
    const withNaN = [{ v: 1 }, { v: "bad" }, { v: 3 }]
    const result = bin(withNaN as any, { field: "v", bins: 2 })
    const total = result.reduce((sum, b) => sum + b.value, 0)
    expect(total).toBe(2)
  })

  it("uses custom domain when provided", () => {
    const result = bin(data, { field: "v", bins: 5, domain: [0, 20] })
    expect(result).toHaveLength(5)
    // First bin label should start at 0, not at 1
    expect(result[0].category).toMatch(/^0/)
  })

  it("handles value at exact max (bin boundary)", () => {
    // Value 10 should end up in the last bin, not overflow
    const result = bin([{ v: 0 }, { v: 10 }], { field: "v", bins: 5 })
    const total = result.reduce((sum, b) => sum + b.value, 0)
    expect(total).toBe(2)
  })

  it("defaults to 10 bins", () => {
    const result = bin(data, { field: "v" })
    expect(result).toHaveLength(10)
  })
})

// ── rollup ─────────────────────────────────────────────────────────────

describe("rollup", () => {
  const data = [
    { region: "North", sales: 10 },
    { region: "North", sales: 20 },
    { region: "South", sales: 30 },
    { region: "South", sales: 5 },
    { region: "East", sales: 15 }
  ]

  it("sums values by group (default)", () => {
    const result = rollup(data, { groupBy: "region", value: "sales" })
    expect(result).toHaveLength(3)
    const north = result.find(d => d.region === "North")
    expect(north?.value).toBe(30)
    const south = result.find(d => d.region === "South")
    expect(south?.value).toBe(35)
  })

  it("counts values by group", () => {
    const result = rollup(data, { groupBy: "region", value: "sales", agg: "count" })
    const north = result.find(d => d.region === "North")
    expect(north?.value).toBe(2)
  })

  it("computes mean by group", () => {
    const result = rollup(data, { groupBy: "region", value: "sales", agg: "mean" })
    const north = result.find(d => d.region === "North")
    expect(north?.value).toBe(15)
  })

  it("computes min by group", () => {
    const result = rollup(data, { groupBy: "region", value: "sales", agg: "min" })
    const south = result.find(d => d.region === "South")
    expect(south?.value).toBe(5)
  })

  it("computes max by group", () => {
    const result = rollup(data, { groupBy: "region", value: "sales", agg: "max" })
    const south = result.find(d => d.region === "South")
    expect(south?.value).toBe(30)
  })

  it("preserves group key in output", () => {
    const result = rollup(data, { groupBy: "region", value: "sales" })
    for (const d of result) {
      expect(d).toHaveProperty("region")
      expect(d).toHaveProperty("value")
    }
  })
})

// ── groupBy ────────────────────────────────────────────────────────────

describe("groupBy", () => {
  const data = [
    { region: "North", x: 1, y: 10 },
    { region: "North", x: 2, y: 20 },
    { region: "South", x: 1, y: 5 },
    { region: "South", x: 2, y: 15 }
  ]

  it("groups rows by key into line-chart format", () => {
    const result = groupBy(data, { key: "region" })
    expect(result).toHaveLength(2)
    const north = result.find(g => g.id === "North")!
    expect(north.coordinates).toHaveLength(2)
    expect(north.coordinates[0].x).toBe(1)
  })

  it("filters to specified fields when provided", () => {
    const result = groupBy(data, { key: "region", fields: ["x", "y"] })
    const north = result.find(g => g.id === "North")!
    // Should have x and y but NOT region
    expect(north.coordinates[0]).toHaveProperty("x")
    expect(north.coordinates[0]).toHaveProperty("y")
    expect(north.coordinates[0]).not.toHaveProperty("region")
  })

  it("includes all fields when fields option is omitted", () => {
    const result = groupBy(data, { key: "region" })
    const south = result.find(g => g.id === "South")!
    // Should include region in the coordinate data (shallow copy)
    expect(south.coordinates[0]).toHaveProperty("region")
  })

  it("returns empty array for empty data", () => {
    expect(groupBy([], { key: "region" })).toEqual([])
  })

  it("does not mutate original data", () => {
    const original = [{ region: "A", x: 1 }]
    const result = groupBy(original, { key: "region" })
    result[0].coordinates[0].x = 999
    expect(original[0].x).toBe(1)
  })
})

// ── pivot ──────────────────────────────────────────────────────────────

describe("pivot", () => {
  const wide = [
    { month: "Jan", revenue: 100, cost: 60 },
    { month: "Feb", revenue: 120, cost: 70 }
  ]

  it("pivots wide data to long format", () => {
    const result = pivot(wide, { columns: ["revenue", "cost"] })
    // 2 rows × 2 columns = 4 output rows
    expect(result).toHaveLength(4)
  })

  it("preserves non-pivoted columns as base", () => {
    const result = pivot(wide, { columns: ["revenue", "cost"] })
    for (const d of result) {
      expect(d).toHaveProperty("month")
    }
  })

  it("creates name and value fields by default", () => {
    const result = pivot(wide, { columns: ["revenue", "cost"] })
    const janRevenue = result.find(d => d.month === "Jan" && d.name === "revenue")
    expect(janRevenue?.value).toBe(100)
    const febCost = result.find(d => d.month === "Feb" && d.name === "cost")
    expect(febCost?.value).toBe(70)
  })

  it("uses custom nameField and valueField", () => {
    const result = pivot(wide, {
      columns: ["revenue", "cost"],
      nameField: "metric",
      valueField: "amount"
    })
    const janRevenue = result.find(d => d.month === "Jan" && d.metric === "revenue")
    expect(janRevenue?.amount).toBe(100)
  })

  it("handles single column pivot", () => {
    const result = pivot(wide, { columns: ["revenue"] })
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe("revenue")
    expect(result[0].month).toBe("Jan")
  })

  it("handles missing column values as undefined", () => {
    const sparse = [{ month: "Jan", revenue: 100 }]
    const result = pivot(sparse, { columns: ["revenue", "cost"] })
    const cost = result.find(d => d.name === "cost")
    expect(cost?.value).toBeUndefined()
  })
})
