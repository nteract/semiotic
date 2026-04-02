import { describe, it, expect } from "vitest"
import { buildMixedScene } from "./mixedScene"
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
    resolveAreaStyle: () => ({ fill: "#000", fillOpacity: 0.5 }),
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

describe("buildMixedScene", () => {
  const data = [
    { x: 10, y: 20, group: "A" },
    { x: 30, y: 40, group: "A" },
    { x: 10, y: 15, group: "B" },
    { x: 30, y: 35, group: "B" },
    { x: 10, y: 10, group: "C" },
    { x: 30, y: 25, group: "C" },
  ]

  it("renders area nodes for groups in areaGroups, line nodes for others", () => {
    const ctx = makeCtx({ config: { areaGroups: new Set(["A", "B"]) } })
    const nodes = buildMixedScene(ctx, data)

    const areaNodes = nodes.filter(n => n.type === "area")
    const lineNodes = nodes.filter(n => n.type === "line")

    expect(areaNodes).toHaveLength(2)
    expect(lineNodes).toHaveLength(1)
    expect((lineNodes[0] as any).group).toBe("C")
  })

  it("renders all as lines when areaGroups is empty", () => {
    const ctx = makeCtx({ config: { areaGroups: new Set() } })
    const nodes = buildMixedScene(ctx, data)

    expect(nodes.filter(n => n.type === "line")).toHaveLength(3)
    expect(nodes.filter(n => n.type === "area")).toHaveLength(0)
  })

  it("attaches gradientFill only to area nodes", () => {
    const gradient = { topOpacity: 0.8, bottomOpacity: 0.1 }
    const ctx = makeCtx({ config: { areaGroups: new Set(["A"]), gradientFill: gradient } })
    const nodes = buildMixedScene(ctx, data)

    const areaNodes = nodes.filter(n => n.type === "area") as any[]
    const lineNodes = nodes.filter(n => n.type === "line") as any[]

    expect(areaNodes[0].fillGradient).toEqual(gradient)
    // Line nodes should NOT have fillGradient
    for (const ln of lineNodes) {
      expect(ln.fillGradient).toBeUndefined()
    }
  })

  it("attaches strokeGradient to both area and line nodes when lineGradient is set", () => {
    const lineGrad = { colorStops: [{ offset: 0, color: "blue" }, { offset: 1, color: "red" }] }
    const ctx = makeCtx({ config: { areaGroups: new Set(["A"]), lineGradient: lineGrad } })
    const nodes = buildMixedScene(ctx, data)

    for (const node of nodes) {
      expect((node as any).strokeGradient).toEqual(lineGrad)
    }
  })

  it("attaches curve to all nodes when set", () => {
    const ctx = makeCtx({ config: { areaGroups: new Set(["A"]), curve: "monotoneX" } })
    const nodes = buildMixedScene(ctx, data)

    for (const node of nodes) {
      expect((node as any).curve).toBe("monotoneX")
    }
  })
})
