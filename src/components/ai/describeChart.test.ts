import { describe, it, expect } from "vitest"
import { describeChart } from "./describeChart"

describe("describeChart — L1 encoding", () => {
  it("names the chart type and what's mapped to each channel (XY)", () => {
    const r = describeChart("LineChart", { data: [{ month: 1, sales: 10 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l1"] })
    expect(r.levels.l1).toBe("A line chart of sales by month.")
    expect(r.text).toBe(r.levels.l1)
  })

  it("notes the series split", () => {
    const r = describeChart("LineChart", { data: [{ month: 1, sales: 10, region: "W" }], xAccessor: "month", yAccessor: "sales", lineBy: "region" }, { levels: ["l1"] })
    expect(r.levels.l1).toContain("split by region")
  })

  it("describes bar charts by value and category", () => {
    const r = describeChart("BarChart", { data: [{ category: "A", value: 1 }], categoryAccessor: "category", valueAccessor: "value" }, { levels: ["l1"] })
    expect(r.levels.l1).toBe("A bar chart of value by category.")
  })

  it("describes a network by its node and edge counts", () => {
    const r = describeChart("ForceDirectedGraph", { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }], edges: [{ source: "a", target: "b" }] })
    expect(r.levels.l1).toBe("A network graph with 3 nodes and 1 edge.")
    expect(r.levels.l2).toBeUndefined() // no measure → no statistics level
    expect(r.levels.l3).toBeUndefined()
  })
})

describe("describeChart — L2 statistics", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 },
  ]
  it("reports range, extrema labels, and mean", () => {
    const r = describeChart("LineChart", { data, xAccessor: "month", yAccessor: "sales" }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("sales ranges from 100 (Jan) to 250 (Feb)")
    expect(r.levels.l2).toContain("mean")
    expect(r.levels.l2).toContain("3 points")
  })

  it("summarizes part-to-whole as a total plus largest/smallest segment", () => {
    const r = describeChart("PieChart", {
      data: [{ category: "A", value: 10 }, { category: "B", value: 30 }, { category: "C", value: 20 }],
      categoryAccessor: "category", valueAccessor: "value",
    }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("3 segments totaling 60")
    expect(r.levels.l2).toContain("Largest is B at 30")
    expect(r.levels.l2).toContain("smallest is A at 10")
  })

  it("formats large numbers compactly", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 6500000 }, { m: 2, v: 7200000 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l2"] })
    expect(r.levels.l2).toContain("6.5M")
    expect(r.levels.l2).toContain("7.2M")
  })

  it("says so when no data is loaded (push mode)", () => {
    const r = describeChart("LineChart", { xAccessor: "month", yAccessor: "sales" })
    expect(r.levels.l2).toBe("No data is loaded yet.")
  })
})

describe("describeChart — L3 trend", () => {
  it("describes a monotonic rise as a peak at the end", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 200 }, { month: "Mar", sales: 350 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales rises from 100 (Jan) to a peak of 350 (Mar).")
  })

  it("describes a peak-then-fall shape when the high is interior", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 400 }, { month: "Mar", sales: 250 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales climbs to a peak of 400 (Feb), then falls to 250 (Mar).")
  })

  it("describes a valley-then-recovery shape when the low is interior", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 400 }, { month: "Feb", sales: 100 }, { month: "Mar", sales: 350 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall sales drops to a low of 100 (Feb), then recovers to 350 (Mar).")
  })

  it("describes a rise to a peak, then a crash to the end (interior peak dominates net direction)", () => {
    const r = describeChart("LineChart", {
      data: [{ m: 1, v: 4200 }, { m: 2, v: 6800 }, { m: 3, v: 9100 }, { m: 4, v: 2100 }],
      xAccessor: "m", yAccessor: "v",
    }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall v climbs to a peak of 9,100 (3), then falls to 2,100 (4).")
  })

  it("describes a fall to a low at the end", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 300 }, { m: 2, v: 200 }, { m: 3, v: 100 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("Overall v falls from 300 (1) to a low of 100 (3).")
  })

  it("calls a flat series flat", () => {
    const r = describeChart("LineChart", { data: [{ m: 1, v: 100 }, { m: 2, v: 101 }, { m: 3, v: 100 }], xAccessor: "m", yAccessor: "v" }, { levels: ["l3"] })
    expect(r.levels.l3).toContain("ends roughly where it started")
  })

  it("reports highest/lowest category for bars (no false trend)", () => {
    const r = describeChart("BarChart", { data: [{ category: "A", value: 10 }, { category: "B", value: 30 }], categoryAccessor: "category", valueAccessor: "value" }, { levels: ["l3"] })
    expect(r.levels.l3).toBe("The highest category is B and the lowest is A.")
  })
})

describe("describeChart — composition", () => {
  it("joins requested levels into text, in L1→L2→L3 order", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }, { month: "Feb", sales: 200 }], xAccessor: "month", yAccessor: "sales" })
    expect(r.text.startsWith("A line chart of sales by month.")).toBe(true)
    expect(r.text).toContain("sales ranges from")
    expect(r.text).toContain("Overall sales rises")
  })

  it("respects a restricted level set", () => {
    const r = describeChart("LineChart", { data: [{ month: "Jan", sales: 100 }], xAccessor: "month", yAccessor: "sales" }, { levels: ["l1"] })
    expect(r.levels.l2).toBeUndefined()
    expect(r.levels.l3).toBeUndefined()
    expect(r.text).toBe(r.levels.l1)
  })

  it("never throws on a malformed config", () => {
    expect(() => describeChart("LineChart", { data: "nope" as unknown as [] })).not.toThrow()
    expect(() => describeChart("Mystery", {})).not.toThrow()
  })
})
