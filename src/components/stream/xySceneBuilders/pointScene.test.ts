import { describe, it, expect } from "vitest"
import { buildPointScene } from "./pointScene"
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

describe("buildPointScene", () => {
  it("emits a PointSceneNode for each datum at correct x,y coordinates", () => {
    const data = [
      { x: 10, y: 20 },
      { x: 50, y: 60 },
      { x: 90, y: 5 },
    ]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(3)
    expect(nodes[0]).toMatchObject({ type: "point", x: 10, y: 20 })
    expect(nodes[1]).toMatchObject({ type: "point", x: 50, y: 60 })
    expect(nodes[2]).toMatchObject({ type: "point", x: 90, y: 5 })
    // Each node should carry its original datum
    expect(nodes[0].datum).toBe(data[0])
    expect(nodes[2].datum).toBe(data[2])
  })

  it("skips data with null X values", () => {
    const data = [
      { x: null, y: 20 },
      { x: 10, y: 30 },
    ]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ x: 10, y: 30 })
  })

  it("skips data with null Y values", () => {
    const data = [
      { x: 10, y: null },
      { x: 20, y: 40 },
    ]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ x: 20, y: 40 })
  })

  it("skips data with NaN X or Y values", () => {
    const data = [
      { x: NaN, y: 10 },
      { x: 10, y: NaN },
      { x: 30, y: 40 },
    ]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({ x: 30, y: 40 })
  })

  it("uses default radius of 5 for scatter chartType", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({ config: { chartType: "scatter" } })
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].r).toBe(5)
  })

  it("uses default radius of 10 for bubble chartType", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx({ config: { chartType: "bubble" } })
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(1)
    expect(nodes[0].r).toBe(10)
  })

  it("applies size accessor with sizeRange scaling", () => {
    const data = [
      { x: 10, y: 10, size: 0 },
      { x: 20, y: 20, size: 50 },
      { x: 30, y: 30, size: 100 },
    ]
    const ctx = makeCtx({
      config: { chartType: "scatter", sizeRange: [4, 20] as [number, number] },
      getSize: (d) => d.size,
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(3)
    // min size value (0) → sizeRange[0] = 4
    expect(nodes[0].r).toBe(4)
    // mid size value (50) → midpoint = 12
    expect(nodes[1].r).toBe(12)
    // max size value (100) → sizeRange[1] = 20
    expect(nodes[2].r).toBe(20)
  })

  it("uses default sizeRange [3, 15] when none specified", () => {
    const data = [
      { x: 10, y: 10, size: 0 },
      { x: 20, y: 20, size: 100 },
    ]
    const ctx = makeCtx({
      config: { chartType: "scatter" },
      getSize: (d) => d.size,
    })
    const nodes = buildPointScene(ctx, data)

    // min → 3, max → 15
    expect(nodes[0].r).toBe(3)
    expect(nodes[1].r).toBe(15)
  })

  it("produces midpoint radius when all size values are equal", () => {
    const data = [
      { x: 10, y: 10, size: 42 },
      { x: 20, y: 20, size: 42 },
    ]
    const ctx = makeCtx({
      config: { chartType: "scatter", sizeRange: [4, 20] as [number, number] },
      getSize: (d) => d.size,
    })
    const nodes = buildPointScene(ctx, data)

    // When minSize === maxSize, returns average of sizeRange
    expect(nodes[0].r).toBe(12)
    expect(nodes[1].r).toBe(12)
  })

  it("does not apply sizeScale when pointStyle is set (pointStyle takes precedence)", () => {
    const data = [
      { x: 10, y: 10, size: 0 },
      { x: 20, y: 20, size: 100 },
    ]
    const ctx = makeCtx({
      config: {
        chartType: "scatter",
        sizeRange: [4, 20] as [number, number],
        pointStyle: (d: any) => ({ fill: "red", r: 7 }),
      },
      getSize: (d) => d.size,
    })
    const nodes = buildPointScene(ctx, data)

    // pointStyle returns r=7, and sizeScale is not built when pointStyle exists
    expect(nodes[0].r).toBe(7)
    expect(nodes[1].r).toBe(7)
  })

  it("applies color accessor when pointStyle returns no fill", () => {
    const colorMap = new Map([
      ["A", "#ff0000"],
      ["B", "#00ff00"],
    ])
    const data = [
      { x: 10, y: 10, cat: "A" },
      { x: 20, y: 20, cat: "B" },
    ]
    const ctx = makeCtx({
      config: {
        chartType: "scatter",
        // pointStyle must return style WITHOUT fill for colorMap to kick in
        pointStyle: () => ({ opacity: 0.9 }),
      },
      getColor: (d) => d.cat,
      resolveColorMap: () => colorMap,
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes).toHaveLength(2)
    expect(nodes[0].style.fill).toBe("#ff0000")
    expect(nodes[1].style.fill).toBe("#00ff00")
  })

  it("does not apply colorMap when default style already has fill", () => {
    // The default style (no pointStyle) sets fill: "#4e79a7"
    // colorMap only applies when !style.fill, so default fill wins
    const colorMap = new Map([["A", "#ff0000"]])
    const data = [{ x: 10, y: 10, cat: "A" }]
    const ctx = makeCtx({
      getColor: (d) => d.cat,
      resolveColorMap: () => colorMap,
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].style.fill).toBe("#4e79a7")
  })

  it("does not override fill from pointStyle with colorMap", () => {
    const colorMap = new Map([["A", "#ff0000"]])
    const data = [{ x: 10, y: 10, cat: "A" }]
    const ctx = makeCtx({
      config: {
        chartType: "scatter",
        pointStyle: () => ({ fill: "#purple" }),
      },
      getColor: (d) => d.cat,
      resolveColorMap: () => colorMap,
    })
    const nodes = buildPointScene(ctx, data)

    // pointStyle set fill explicitly — colorMap should NOT override it
    expect(nodes[0].style.fill).toBe("#purple")
  })

  it("uses default style when no pointStyle is provided", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].style).toEqual({ fill: "#4e79a7", opacity: 0.8 })
  })

  it("returns empty array for empty data", () => {
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, [])

    expect(nodes).toEqual([])
  })

  it("sets pointId when getPointId is provided", () => {
    const data = [
      { x: 10, y: 20, id: "point-1" },
      { x: 30, y: 40, id: "point-2" },
    ]
    const ctx = makeCtx({
      getPointId: (d) => d.id,
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].pointId).toBe("point-1")
    expect(nodes[1].pointId).toBe("point-2")
  })

  it("does not set pointId when getPointId is not provided", () => {
    const data = [{ x: 10, y: 20 }]
    const ctx = makeCtx()
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].pointId).toBeUndefined()
  })

  it("applies pointStyle function to each node", () => {
    const data = [
      { x: 10, y: 20, importance: "high" },
      { x: 30, y: 40, importance: "low" },
    ]
    const ctx = makeCtx({
      config: {
        chartType: "scatter",
        pointStyle: (d: any) => ({
          fill: d.importance === "high" ? "red" : "gray",
          opacity: d.importance === "high" ? 1 : 0.3,
          r: d.importance === "high" ? 8 : 4,
        }),
      },
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].style.fill).toBe("red")
    expect(nodes[0].style.opacity).toBe(1)
    expect(nodes[0].r).toBe(8)
    expect(nodes[1].style.fill).toBe("gray")
    expect(nodes[1].style.opacity).toBe(0.3)
    expect(nodes[1].r).toBe(4)
  })

  it("applies scale transforms to x and y coordinates", () => {
    const double = (v: number) => v * 2
    const doubleScale = Object.assign(double, { domain: () => [0, 100], range: () => [0, 800] })
    const data = [{ x: 10, y: 25 }]
    const ctx = makeCtx({
      scales: { x: doubleScale, y: doubleScale } as any,
    })
    const nodes = buildPointScene(ctx, data)

    expect(nodes[0].x).toBe(20)
    expect(nodes[0].y).toBe(50)
  })

  it("skips NaN size values and uses default radius instead", () => {
    const data = [
      { x: 10, y: 20, size: NaN },
      { x: 30, y: 40, size: 50 },
    ]
    const ctx = makeCtx({
      config: { chartType: "scatter", sizeRange: [4, 20] as [number, number] },
      getSize: (d) => d.size,
    })
    const nodes = buildPointScene(ctx, data)

    // Only size=50 is valid for scale computation, so minSize === maxSize === 50
    // That means sizeScale returns midpoint = (4 + 20) / 2 = 12
    // For the NaN datum, sizeScale won't be applied, so it keeps the default r = 5
    expect(nodes[0].r).toBe(5)
    expect(nodes[1].r).toBe(12)
  })
})
