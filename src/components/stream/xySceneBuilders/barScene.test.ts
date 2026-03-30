import { describe, it, expect } from "vitest"
import { buildBarScene } from "./barScene"
import type { XYSceneContext } from "./types"

function makeCtx(overrides: Partial<XYSceneContext> = {}): XYSceneContext {
  const identity = (v: number) => v
  const identityScale = Object.assign(identity, { domain: () => [0, 100], range: () => [0, 400] })
  return {
    scales: { x: identityScale, y: identityScale } as any,
    config: {},
    getX: (d) => d.x,
    getY: (d) => d.y,
    resolveLineStyle: () => ({ stroke: "#000" }),
    resolveAreaStyle: () => ({ fill: "#000" }),
    resolveBoundsStyle: () => ({ fill: "#ccc" }),
    resolveColorMap: () => new Map(),
    resolveGroupColor: () => null,
    groupData: (data) => {
      const map = new Map<string, any[]>()
      for (const d of data) {
        const key = d.group ?? "default"
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push(d)
      }
      return Array.from(map, ([key, data]) => ({ key, data }))
    },
    ...overrides,
  }
}

describe("buildBarScene", () => {
  it("returns empty when no binSize configured", () => {
    const ctx = makeCtx({ config: {} })
    const result = buildBarScene(ctx, [{ x: 10, y: 1 }])
    expect(result.nodes).toHaveLength(0)
    expect(result.binBoundaries).toHaveLength(0)
  })

  it("bins data by binSize and produces correct bin boundaries", () => {
    // binSize=10, data at x=5 and x=15 => bins [0,10) and [10,20)
    const data = [
      { x: 5, y: 1 },
      { x: 15, y: 1 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(2)
    expect(result.binBoundaries).toEqual([0, 10, 20])
  })

  it("returns binBoundaries array alongside nodes", () => {
    const data = [
      { x: 25, y: 1 },
      { x: 35, y: 1 },
      { x: 45, y: 1 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    // bins: [20,30), [30,40), [40,50) => boundaries 20,30,40,50
    expect(result.binBoundaries).toEqual([20, 30, 40, 50])
  })

  it("bar heights match count of data in each bin (value summed by y)", () => {
    // Two points in same bin [10,20), y values 1 and 1 => total=2
    // Identity scale: bar height = |scale.y(0) - scale.y(2)| = |0 - 2| = 2
    const data = [
      { x: 10, y: 1 },
      { x: 15, y: 1 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(1)
    const node = result.nodes[0] as any
    // With identity scales, the datum total should be 2 (sum of y values)
    expect(node.datum.total).toBe(2)
    expect(node.datum.binStart).toBe(10)
    expect(node.datum.binEnd).toBe(20)
  })

  it("bars outside X domain are clamped — bins beyond domain produce no nodes", () => {
    // Domain is [0, 100]. Data at x=150 creates bin [150, 160).
    // clampedStart = max(150, 0) = 150, clampedEnd = min(160, 100) = 100
    // clampedStart >= clampedEnd (150 >= 100) => bin is skipped
    const data = [
      { x: 50, y: 1 },
      { x: 150, y: 1 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    // Only the bin [50, 60) should produce a node
    expect(result.nodes).toHaveLength(1)
    expect((result.nodes[0] as any).datum.binStart).toBe(50)
    // But binBoundaries still includes the out-of-domain bin from computeBins
    expect(result.binBoundaries).toContain(150)
    expect(result.binBoundaries).toContain(160)
  })

  it("category stacking: multiple categories stack within same bin", () => {
    const data = [
      { x: 5, y: 3, cat: "A" },
      { x: 7, y: 2, cat: "B" },
    ]
    const ctx = makeCtx({
      config: { binSize: 10, barColors: { A: "red", B: "blue" } },
      getCategory: (d) => d.cat,
    })
    const result = buildBarScene(ctx, data)
    // Same bin [0, 10), two categories => two rect nodes stacked
    expect(result.nodes).toHaveLength(2)

    const nodeA = result.nodes.find((n) => (n as any).group === "A") as any
    const nodeB = result.nodes.find((n) => (n as any).group === "B") as any
    expect(nodeA).toBeDefined()
    expect(nodeB).toBeDefined()

    // A is drawn first (barColors key order: A, B)
    // A: base=0, top=3. B: base=3, top=5.
    // With identity scales: A rect y = min(0, 3) = 0, h = 3
    //                       B rect y = min(3, 5) = 3, h = 2
    expect(nodeA.datum.categoryValue).toBe(3)
    expect(nodeB.datum.categoryValue).toBe(2)
    expect(nodeA.y).toBe(0)
    expect(nodeA.h).toBe(3)
    expect(nodeB.y).toBe(3)
    expect(nodeB.h).toBe(2)
  })

  it("category colors come from barColors config", () => {
    const data = [
      { x: 5, y: 1, cat: "X" },
      { x: 7, y: 1, cat: "Y" },
    ]
    const ctx = makeCtx({
      config: { binSize: 10, barColors: { X: "#ff0000", Y: "#00ff00" } },
      getCategory: (d) => d.cat,
    })
    const result = buildBarScene(ctx, data)
    const nodeX = result.nodes.find((n) => (n as any).group === "X") as any
    const nodeY = result.nodes.find((n) => (n as any).group === "Y") as any
    expect(nodeX.style.fill).toBe("#ff0000")
    expect(nodeY.style.fill).toBe("#00ff00")
  })

  it("categories not in barColors get default fill", () => {
    const data = [{ x: 5, y: 1, cat: "Z" }]
    const ctx = makeCtx({
      config: { binSize: 10, barColors: { A: "red" } },
      getCategory: (d) => d.cat,
    })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(1)
    expect((result.nodes[0] as any).style.fill).toBe("#4e79a7")
  })

  it("empty bins are skipped — no zero-height bars", () => {
    // binSize=10, data only in [20,30) — no data in [0,10) or [10,20)
    const data = [{ x: 25, y: 1 }]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(1)
    expect((result.nodes[0] as any).datum.binStart).toBe(20)
  })

  it("gap is applied to bar width — bars are narrower than full bin width", () => {
    // Identity scale: bin [0,10) => rawX0=0, rawX1=10, rawWidth=10
    // gap=1, rawWidth(10) > gap+1(2) so effectiveGap=1
    // x0 = 0 + 0.5 = 0.5, barWidth = 10 - 1 = 9
    const data = [{ x: 5, y: 1 }]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    const node = result.nodes[0] as any
    expect(node.x).toBe(0.5)
    expect(node.w).toBe(9)
  })

  it("barCategoryCache maintains stable category order across calls", () => {
    // First call: categories A, B
    const data1 = [
      { x: 5, y: 1, cat: "A" },
      { x: 5, y: 1, cat: "B" },
    ]
    const ctx = makeCtx({
      config: { binSize: 10, barColors: { A: "red", B: "blue" } },
      getCategory: (d) => d.cat,
    }) as XYSceneContext

    buildBarScene(ctx, data1)
    expect(ctx.barCategoryCache).toBeDefined()
    expect(ctx.barCategoryCache!.order).toEqual(["A", "B"])

    // Second call with same categories — cache key matches, same order returned
    const data2 = [
      { x: 15, y: 1, cat: "B" },
      { x: 15, y: 1, cat: "A" },
    ]
    const firstCache = ctx.barCategoryCache
    buildBarScene(ctx, data2)
    // Cache object should be reused (same reference) since the key matches
    expect(ctx.barCategoryCache).toBe(firstCache)
  })

  it("barCategoryCache updates when new categories appear", () => {
    const data1 = [{ x: 5, y: 1, cat: "A" }]
    const ctx = makeCtx({
      config: { binSize: 10, barColors: { A: "red" } },
      getCategory: (d) => d.cat,
    }) as XYSceneContext

    buildBarScene(ctx, data1)
    const firstOrder = ctx.barCategoryCache!.order.slice()

    // New category C appears
    const data2 = [
      { x: 5, y: 1, cat: "A" },
      { x: 5, y: 1, cat: "C" },
    ]
    buildBarScene(ctx, data2)
    // A stays first (from barColors), C is appended (unlisted, sorted)
    expect(ctx.barCategoryCache!.order).toEqual(["A", "C"])
  })

  it("without getCategory, single bar per bin with default fill", () => {
    const data = [
      { x: 5, y: 3 },
      { x: 7, y: 4 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(1)
    const node = result.nodes[0] as any
    expect(node.style.fill).toBe("#007bff")
    expect(node.datum.total).toBe(7)
    expect(node.group).toBeUndefined()
  })

  it("handles data exactly at bin boundaries", () => {
    // x=10 with binSize=10: floor(10/10)*10 = 10, so bin is [10, 20)
    // x=20 => bin [20, 30)
    const data = [
      { x: 10, y: 1 },
      { x: 20, y: 1 },
    ]
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, data)
    expect(result.nodes).toHaveLength(2)
    const starts = result.nodes.map((n) => (n as any).datum.binStart).sort((a: number, b: number) => a - b)
    expect(starts).toEqual([10, 20])
  })

  it("empty data produces no nodes", () => {
    const ctx = makeCtx({ config: { binSize: 10 } })
    const result = buildBarScene(ctx, [])
    expect(result.nodes).toHaveLength(0)
    expect(result.binBoundaries).toHaveLength(0)
  })
})
