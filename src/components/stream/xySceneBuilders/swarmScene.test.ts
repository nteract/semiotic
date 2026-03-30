import { describe, it, expect } from "vitest"
import { buildSwarmScene } from "./swarmScene"
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

describe("buildSwarmScene", () => {
  it("emits a PointSceneNode for each valid datum", () => {
    const data = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({ type: "point", x: 10, y: 20 })
    expect(nodes[1]).toMatchObject({ type: "point", x: 30, y: 40 })
    expect(nodes[2]).toMatchObject({ type: "point", x: 50, y: 60 })
    // Original datum preserved
    expect(nodes[0].datum).toBe(data[0])
  })

  it("skips data with null Y values", () => {
    const data = [
      { x: 10, y: null },
      { x: 20, y: 30 },
    ]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ x: 20, y: 30 })
  })

  it("skips data with NaN Y values", () => {
    const data = [
      { x: 10, y: NaN },
      { x: 20, y: 40 },
    ]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ x: 20, y: 40 })
  })

  it("applies category colors from barColors config", () => {
    const data = [
      { x: 10, y: 20, category: "errors" },
      { x: 30, y: 40, category: "warnings" },
      { x: 50, y: 60, category: "errors" },
    ]
    const ctx = makeCtx({
      config: {
        barColors: { errors: "#e45050", warnings: "#f5a623" },
      },
      getCategory: (d) => d.category,
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.fill).toBe("#e45050")
    expect(nodes[1].style.fill).toBe("#f5a623")
    expect(nodes[2].style.fill).toBe("#e45050")
  })

  it("uses default fill when category is not in barColors", () => {
    const data = [{ x: 10, y: 20, category: "unknown" }]
    const ctx = makeCtx({
      config: {
        barColors: { errors: "#e45050" },
      },
      getCategory: (d) => d.category,
    })
    const nodes = buildSwarmScene(ctx, data)

    // Default fill is "#007bff"
    expect(nodes[0].style.fill).toBe("#007bff")
  })

  it("uses default fill when no getCategory is provided", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.fill).toBe("#007bff")
  })

  it("uses swarmStyle.fill as the default fill color", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({
      config: {
        swarmStyle: { fill: "#abc123" },
      },
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.fill).toBe("#abc123")
  })

  it("applies radius from swarmStyle config", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({
      config: {
        swarmStyle: { radius: 7 },
      },
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].r).toBe(7)
  })

  it("uses default radius of 3 when swarmStyle.radius is not set", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].r).toBe(3)
  })

  it("applies opacity from swarmStyle config", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({
      config: {
        swarmStyle: { opacity: 0.5 },
      },
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.opacity).toBe(0.5)
  })

  it("uses default opacity of 0.7 when swarmStyle.opacity is not set", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.opacity).toBe(0.7)
  })

  it("applies stroke and strokeWidth from swarmStyle config", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({
      config: {
        swarmStyle: { stroke: "#000", strokeWidth: 2 },
      },
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.stroke).toBe("#000")
    expect(nodes[0].style.strokeWidth).toBe(2)
  })

  it("leaves stroke/strokeWidth undefined when swarmStyle does not set them", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].style.stroke).toBeUndefined()
    expect(nodes[0].style.strokeWidth).toBeUndefined()
  })

  it("applies scale transforms to x and y coordinates", () => {
    const double = (v: number) => v * 2
    const doubleScale = Object.assign(double, { domain: () => [0, 100], range: () => [0, 800] })
    const data = [{ x: 15, y: 25 }]
    const ctx = makeCtx({
      scales: { x: doubleScale, y: doubleScale } as any,
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].x).toBe(30)
    expect(nodes[0].y).toBe(50)
  })

  it("returns empty array for empty data", () => {
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, [])

    expect(nodes).toEqual([])
  })

  it("sets pointId when getPointId is provided", () => {
    const data = [
      { x: 10, y: 20, id: "swarm-1" },
      { x: 30, y: 40, id: "swarm-2" },
    ]
    const ctx = makeCtx({
      getPointId: (d) => d.id,
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].pointId).toBe("swarm-1")
    expect(nodes[1].pointId).toBe("swarm-2")
  })

  it("does not set pointId when getPointId is not provided", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].pointId).toBeUndefined()
  })

  it("combines all swarmStyle properties correctly", () => {
    const data = [{ x: 10, y: 20, category: "A" }]
    const ctx = makeCtx({
      config: {
        swarmStyle: { radius: 5, fill: "#default", opacity: 0.9, stroke: "#333", strokeWidth: 1 },
        barColors: { A: "#red" },
      },
      getCategory: (d) => d.category,
    })
    const nodes = buildSwarmScene(ctx, data)

    expect(nodes[0].r).toBe(5)
    // barColors override swarmStyle.fill for matching categories
    expect(nodes[0].style.fill).toBe("#red")
    expect(nodes[0].style.opacity).toBe(0.9)
    expect(nodes[0].style.stroke).toBe("#333")
    expect(nodes[0].style.strokeWidth).toBe(1)
  })
})
