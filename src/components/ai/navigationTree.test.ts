import { describe, it, expect } from "vitest"
import { buildNavigationTree, flattenVisible, countNodes, type NavTreeNode } from "./navigationTree"

const childrenRoles = (n: NavTreeNode) => (n.children ?? []).map((c) => c.role)
const childrenLabels = (n: NavTreeNode) => (n.children ?? []).map((c) => c.label)

describe("buildNavigationTree — single-series XY", () => {
  const data = [
    { month: "Jan", sales: 100 },
    { month: "Feb", sales: 250 },
    { month: "Mar", sales: 180 },
  ]
  const tree = buildNavigationTree("LineChart", { data, xAccessor: "month", yAccessor: "sales" })

  it("roots at the chart with an L1–L3 label", () => {
    expect(tree.role).toBe("chart")
    expect(tree.level).toBe(1)
    expect(tree.label).toContain("A line chart of sales by month")
  })

  it("leads with axis-context nodes, then datum leaves", () => {
    const roles = childrenRoles(tree)
    expect(roles).toEqual(["axis", "axis", "datum", "datum", "datum"])
    const [xAxis, vAxis] = tree.children!
    expect(xAxis.label).toContain("X axis: month, Jan to Mar (3 points)")
    expect(vAxis.label).toContain("Value axis: sales, 100 to 250")
  })

  it("labels each leaf as 'dimension: value' and carries the datum + value", () => {
    const leaves = tree.children!.filter((c) => c.role === "datum")
    expect(leaves.map((l) => l.label)).toEqual(["Jan: 100", "Feb: 250", "Mar: 180"])
    expect(leaves[1].value).toBe(250)
    expect(leaves[1].datum).toEqual({ month: "Feb", sales: 250 })
    expect(leaves[1].level).toBe(2)
  })
})

describe("buildNavigationTree — multi-series", () => {
  const data = [
    { month: "Jan", sales: 100, region: "West" },
    { month: "Feb", sales: 200, region: "West" },
    { month: "Jan", sales: 50, region: "East" },
    { month: "Feb", sales: 80, region: "East" },
  ]
  const tree = buildNavigationTree("LineChart", { data, xAccessor: "month", yAccessor: "sales", lineBy: "region" })

  it("reports distinct dimension values on the axis (not raw-array first/last)", () => {
    // x repeats across series (Jan/Feb per region) — axis must read Jan to Feb.
    const xAxis = tree.children!.find((c) => c.role === "axis")!
    expect(xAxis.label).toContain("X axis: month, Jan to Feb (4 points)")
  })

  it("creates one series branch per group, each with its own datum leaves", () => {
    const seriesNodes = tree.children!.filter((c) => c.role === "series")
    expect(seriesNodes).toHaveLength(2)
    expect(seriesNodes[0].label).toContain("Series West:")
    expect(seriesNodes[0].children!.every((c) => c.role === "datum")).toBe(true)
    expect(seriesNodes[0].children!).toHaveLength(2)
    expect(seriesNodes[0].children![0].level).toBe(3) // chart → series → datum
  })
})

describe("buildNavigationTree — part-to-whole & caps & degradation", () => {
  it("lists pie segments as leaves with no axis nodes", () => {
    const tree = buildNavigationTree("PieChart", {
      data: [{ category: "A", value: 10 }, { category: "B", value: 30 }],
      categoryAccessor: "category", valueAccessor: "value",
    })
    expect(childrenRoles(tree)).toEqual(["datum", "datum"])
    expect(childrenLabels(tree)).toEqual(["A: 10", "B: 30"])
  })

  it("caps leaves per branch and notes the elision", () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 10 }))
    const tree = buildNavigationTree("LineChart", { data, xAccessor: "x", yAccessor: "y" }, { maxLeaves: 3 })
    const leaves = tree.children!.filter((c) => c.role === "datum")
    expect(leaves).toHaveLength(4) // 3 + elision note
    expect(leaves[3].label).toBe("…and 7 more points")
  })

  it("degrades to a root-only node for families without a measure-over-dimension", () => {
    const tree = buildNavigationTree("ForceDirectedGraph", { nodes: [{ id: "a" }, { id: "b" }], edges: [] })
    expect(tree.role).toBe("chart")
    expect(tree.children).toEqual([])
    expect(tree.label).toContain("network graph")
  })

  it("degrades when data is absent (push mode)", () => {
    const tree = buildNavigationTree("LineChart", { xAccessor: "x", yAccessor: "y" })
    expect(tree.children).toEqual([])
  })
})

describe("flattenVisible & countNodes", () => {
  const data = [
    { m: "Jan", v: 1, g: "A" }, { m: "Feb", v: 2, g: "A" },
    { m: "Jan", v: 3, g: "B" },
  ]
  const tree = buildNavigationTree("LineChart", { data, xAccessor: "m", yAccessor: "v", lineBy: "g" })

  it("shows only the root's children when only the root is expanded", () => {
    const visible = flattenVisible(tree, new Set([tree.id]))
    // root + 2 axis + 2 series (series children hidden)
    expect(visible).toHaveLength(5)
    expect(visible[0]).toBe(tree)
  })

  it("reveals a series' leaves once it's expanded", () => {
    const seriesA = tree.children!.find((c) => c.role === "series")!
    const visible = flattenVisible(tree, new Set([tree.id, seriesA.id]))
    expect(visible.some((n) => n.id === seriesA.children![0].id)).toBe(true)
  })

  it("counts every node in the tree", () => {
    // root + 2 axis + 2 series + (2 + 1) leaves = 8
    expect(countNodes(tree)).toBe(8)
  })
})
