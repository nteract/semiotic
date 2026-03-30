import { describe, it, expect } from "vitest"
import { buildLineScene } from "./lineScene"
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

describe("buildLineScene", () => {
  it("emits one LineSceneNode per group with correct path coordinates", () => {
    const data = [
      { x: 10, y: 20 },
      { x: 30, y: 40 },
      { x: 50, y: 60 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNodes = nodes.filter((n) => n.type === "line") as any[]

    expect(lineNodes.length).toBe(1)
    expect(lineNodes[0].group).toBe("default")
    // Identity scale: pixel coords === data coords
    expect(lineNodes[0].path).toEqual([
      [10, 20],
      [30, 40],
      [50, 60],
    ])
  })

  it("multiple groups produce separate line nodes", () => {
    const data = [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "A" },
      { x: 1, y: 30, group: "B" },
      { x: 2, y: 40, group: "B" },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNodes = nodes.filter((n) => n.type === "line") as any[]

    expect(lineNodes.length).toBe(2)

    const groupA = lineNodes.find((n: any) => n.group === "A")
    const groupB = lineNodes.find((n: any) => n.group === "B")
    expect(groupA).toBeDefined()
    expect(groupB).toBeDefined()

    expect(groupA.path).toEqual([
      [1, 10],
      [2, 20],
    ])
    expect(groupB.path).toEqual([
      [1, 30],
      [2, 40],
    ])
  })

  it("color threshold annotations attach to line nodes", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx({
      config: {
        annotations: [
          { type: "threshold", value: 15, color: "red", thresholdType: "greater" },
          { type: "threshold", value: 5, color: "blue" },
          { type: "label", value: 10 }, // non-threshold, should be ignored
        ],
      },
    })
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    expect(lineNode.colorThresholds).toBeDefined()
    expect(lineNode.colorThresholds.length).toBe(2)
    expect(lineNode.colorThresholds[0]).toEqual({
      value: 15,
      color: "red",
      thresholdType: "greater",
    })
    // Default thresholdType is "greater" when not specified
    expect(lineNode.colorThresholds[1]).toEqual({
      value: 5,
      color: "blue",
      thresholdType: "greater",
    })
  })

  it("threshold annotations without color are excluded", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx({
      config: {
        annotations: [
          { type: "threshold", value: 15 }, // no color → filtered out
        ],
      },
    })
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    // colorThresholds should be absent since the filtered list is empty
    expect(lineNode.colorThresholds).toBeUndefined()
  })

  it("bounds areas render behind lines when getBounds is set", () => {
    const data = [
      { x: 1, y: 10, bounds: 5 },
      { x: 2, y: 20, bounds: 3 },
      { x: 3, y: 30, bounds: 7 },
    ]
    const ctx = makeCtx({
      getBounds: (d) => d.bounds,
    })
    const nodes = buildLineScene(ctx, data)

    // Should have area node(s) before line node(s)
    const areaIndices = nodes
      .map((n, i) => (n.type === "area" ? i : -1))
      .filter((i) => i >= 0)
    const lineIndices = nodes
      .map((n, i) => (n.type === "line" ? i : -1))
      .filter((i) => i >= 0)

    expect(areaIndices.length).toBe(1)
    expect(lineIndices.length).toBe(1)
    // All area nodes come before all line nodes
    expect(Math.max(...areaIndices)).toBeLessThan(Math.min(...lineIndices))
  })

  it("curve type attached to node when config.curve is non-linear", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx({
      config: { curve: "monotoneX" },
    })
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    expect(lineNode.curve).toBe("monotoneX")
  })

  it("curve is not set when config.curve is linear", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx({
      config: { curve: "linear" },
    })
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    expect(lineNode.curve).toBeUndefined()
  })

  it("curve is not set when config.curve is absent", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    expect(lineNode.curve).toBeUndefined()
  })

  it("points emitted when pointStyle is set", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ]
    const ctx = makeCtx({
      config: { pointStyle: () => ({ fill: "red", r: 5 }) },
    })
    const nodes = buildLineScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point") as any[]

    expect(pointNodes.length).toBe(3)
    // Verify point coordinates match data
    expect(pointNodes[0].x).toBe(1)
    expect(pointNodes[0].y).toBe(10)
    expect(pointNodes[1].x).toBe(2)
    expect(pointNodes[1].y).toBe(20)
    expect(pointNodes[2].x).toBe(3)
    expect(pointNodes[2].y).toBe(30)
    // Verify radius from pointStyle
    expect(pointNodes[0].r).toBe(5)
  })

  it("no points emitted without pointStyle", () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point")

    expect(pointNodes.length).toBe(0)
  })

  it("empty data produces no nodes", () => {
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, [])

    expect(nodes.length).toBe(0)
  })

  it("line node path coordinates match scale(getX(d)), scale(getY(d))", () => {
    // Use a 2x scale to verify scaling is applied
    const double = (v: number) => v * 2
    const doubleScale = Object.assign(double, { domain: () => [0, 50], range: () => [0, 100] })
    const data = [
      { x: 5, y: 15 },
      { x: 10, y: 25 },
    ]
    const ctx = makeCtx({
      scales: { x: doubleScale, y: doubleScale } as any,
    })
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    // scale(5) = 10, scale(15) = 30, scale(10) = 20, scale(25) = 50
    expect(lineNode.path).toEqual([
      [10, 30],
      [20, 50],
    ])
  })

  it("style resolved via resolveLineStyle per group", () => {
    const data = [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "B" },
    ]
    const styleMap: Record<string, any> = {
      A: { stroke: "red", strokeWidth: 2 },
      B: { stroke: "blue", strokeWidth: 3 },
    }
    const ctx = makeCtx({
      resolveLineStyle: (group: string) => styleMap[group] ?? { stroke: "#000" },
    })
    const nodes = buildLineScene(ctx, data)
    const lineNodes = nodes.filter((n) => n.type === "line") as any[]

    const groupA = lineNodes.find((n: any) => n.group === "A")
    const groupB = lineNodes.find((n: any) => n.group === "B")

    expect(groupA.style).toEqual({ stroke: "red", strokeWidth: 2 })
    expect(groupB.style).toEqual({ stroke: "blue", strokeWidth: 3 })
  })

  it("rawValues on line node correspond to unscaled Y values", () => {
    const data = [
      { x: 1, y: 100 },
      { x: 2, y: 200 },
      { x: 3, y: 50 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    // buildLineNode sorts by x, so order is x=1,2,3 → rawValues = [100, 200, 50]
    expect(lineNode.rawValues).toEqual([100, 200, 50])
  })

  it("line path is sorted by x pixel coordinate", () => {
    // Data intentionally out of x order
    const data = [
      { x: 30, y: 1 },
      { x: 10, y: 2 },
      { x: 20, y: 3 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    // Path should be sorted by x: [10, 20, 30]
    expect(lineNode.path[0][0]).toBe(10)
    expect(lineNode.path[1][0]).toBe(20)
    expect(lineNode.path[2][0]).toBe(30)
  })

  it("points get group color via resolveGroupColor when pointStyle has no fill", () => {
    const data = [
      { x: 1, y: 10, group: "A" },
      { x: 2, y: 20, group: "A" },
    ]
    const ctx = makeCtx({
      config: { pointStyle: () => ({ r: 4 }) }, // no fill
      resolveGroupColor: (group: string) => (group === "A" ? "green" : null),
    })
    const nodes = buildLineScene(ctx, data)
    const pointNodes = nodes.filter((n) => n.type === "point") as any[]

    expect(pointNodes.length).toBe(2)
    expect(pointNodes[0].style.fill).toBe("green")
    expect(pointNodes[1].style.fill).toBe("green")
  })

  it("NaN/null values are excluded from line path", () => {
    const data = [
      { x: 1, y: 10 },
      { x: NaN, y: 20 },
      { x: 3, y: null },
      { x: 4, y: 40 },
    ]
    const ctx = makeCtx()
    const nodes = buildLineScene(ctx, data)
    const lineNode = nodes.find((n) => n.type === "line") as any

    // Only x=1 and x=4 are valid
    expect(lineNode.path.length).toBe(2)
    expect(lineNode.path[0]).toEqual([1, 10])
    expect(lineNode.path[1]).toEqual([4, 40])
  })
})
