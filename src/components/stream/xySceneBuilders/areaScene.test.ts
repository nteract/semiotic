import { describe, it, expect } from "vitest"
import { buildAreaScene, buildStackedAreaScene } from "./areaScene"
import type { XYSceneContext } from "./types"

/** Minimal identity scales for testing — no pixel transform */
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

describe("buildAreaScene", () => {
  it("emits point nodes when pointStyle is set", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]
    const ctx = makeCtx({
      config: { pointStyle: () => ({ fill: "red", r: 4 }) },
    })
    const nodes = buildAreaScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point")
    expect(pointNodes.length).toBe(3)
  })

  it("does not emit point nodes without pointStyle", () => {
    const data = [{ x: 1, y: 10 }, { x: 2, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildAreaScene(ctx, data)
    expect(nodes.filter((n) => n.type === "point").length).toBe(0)
  })
})

describe("buildStackedAreaScene", () => {
  const stackedData = [
    { x: 1, y: 10, group: "A" },
    { x: 2, y: 20, group: "A" },
    { x: 1, y: 5, group: "B" },
    { x: 2, y: 15, group: "B" },
  ]

  it("emits point nodes at stacked cumulative Y", () => {
    const ctx = makeCtx({
      config: { pointStyle: () => ({ fill: "blue", r: 3 }) },
    })
    const nodes = buildStackedAreaScene(ctx, stackedData)
    const pointNodes = nodes.filter((n) => n.type === "point") as any[]
    expect(pointNodes.length).toBe(4)

    // Groups sorted by key: A first, then B stacks on top
    // Group A: x=1→y=10, x=2→y=20 (baseline 0)
    // Group B: x=1→y=10+5=15, x=2→y=20+15=35
    const pointsAtX1 = pointNodes.filter((n: any) => n.x === 1)
    const pointsAtX2 = pointNodes.filter((n: any) => n.x === 2)
    expect(pointsAtX1.map((n: any) => n.y).sort()).toEqual([10, 15])
    expect(pointsAtX2.map((n: any) => n.y).sort()).toEqual([20, 35])
  })

  it("uses normalized Y when normalize is true", () => {
    const ctx = makeCtx({
      config: { normalize: true, pointStyle: () => ({ fill: "blue", r: 3 }) },
    })
    const nodes = buildStackedAreaScene(ctx, stackedData)
    const pointNodes = nodes.filter((n) => n.type === "point") as any[]
    expect(pointNodes.length).toBe(4)

    // At x=1: total=15. A=10/15≈0.667, B=(10+5)/15=1.0
    // At x=2: total=35. A=20/35≈0.571, B=(20+15)/35=1.0
    const pointsAtX1 = pointNodes.filter((n: any) => n.x === 1)
    const bTopAtX1 = Math.max(...pointsAtX1.map((n: any) => n.y))
    expect(bTopAtX1).toBeCloseTo(1.0, 5)
  })

  it("skips datums with null Y in stacked point emission", () => {
    const data = [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: null, group: "A" },
      { x: 1, y: 5, group: "B" },
      { x: 2, y: 15, group: "B" },
    ]
    const ctx = makeCtx({
      config: { pointStyle: () => ({ fill: "blue", r: 3 }) },
    })
    const nodes = buildStackedAreaScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point")
    // x=2 group A has null Y → should be skipped, so only 3 points
    expect(pointNodes.length).toBe(3)
  })

  it("assigns same stacked Y to duplicate datums at same x", () => {
    const data = [
      { x: 1, y: 5, group: "A" },
      { x: 1, y: 3, group: "A" }, // duplicate x within group
      { x: 1, y: 10, group: "B" },
    ]
    const ctx = makeCtx({
      config: { pointStyle: () => ({ fill: "blue", r: 3 }) },
    })
    const nodes = buildStackedAreaScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point") as any[]

    // Group A at x=1: aggregated y=5+3=8, both datums get stacked Y=8
    const groupAPoints = pointNodes.filter((n: any) => n.datum.group === "A")
    expect(groupAPoints.length).toBe(2)
    expect(groupAPoints[0].y).toBe(groupAPoints[1].y)
    expect(groupAPoints[0].y).toBe(8)

    // Group B at x=1: stacked on top of 8, y=8+10=18
    const groupBPoints = pointNodes.filter((n: any) => n.datum.group === "B")
    expect(groupBPoints[0].y).toBe(18)
  })

  it("does not emit point nodes without pointStyle", () => {
    const ctx = makeCtx()
    const nodes = buildStackedAreaScene(ctx, stackedData)
    expect(nodes.filter((n) => n.type === "point").length).toBe(0)
  })
})
