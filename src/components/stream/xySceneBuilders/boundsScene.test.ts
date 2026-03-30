import { describe, it, expect } from "vitest"
import { buildBoundsForGroup } from "./boundsScene"
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

describe("buildBoundsForGroup", () => {
  it("returns null when getBounds is not set", () => {
    const ctx = makeCtx()
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).toBeNull()
  })

  it("returns null when fewer than 2 valid data points", () => {
    const ctx = makeCtx({
      getBounds: () => 5,
    })
    // Only one valid point
    const data = [{ x: 1, y: 10 }]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).toBeNull()
  })

  it("returns null when all data points have null/NaN values", () => {
    const ctx = makeCtx({
      getBounds: () => 5,
    })
    const data = [
      { x: NaN, y: 10 },
      { x: 2, y: null },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).toBeNull()
  })

  it("produces an AreaSceneNode with topPath = y+offset, bottomPath = y-offset", () => {
    const ctx = makeCtx({
      getBounds: (d) => d.offset,
    })
    const data = [
      { x: 10, y: 50, offset: 10 },
      { x: 20, y: 60, offset: 15 },
      { x: 30, y: 70, offset: 5 },
    ]
    const result = buildBoundsForGroup(ctx, data, "myGroup")

    expect(result).not.toBeNull()
    expect(result!.type).toBe("area")

    // Identity scale: pixel = data value
    // Point 1: x=10, y=50, offset=10 → top=[10, 60], bottom=[10, 40]
    // Point 2: x=20, y=60, offset=15 → top=[20, 75], bottom=[20, 45]
    // Point 3: x=30, y=70, offset=5  → top=[30, 75], bottom=[30, 65]
    expect(result!.topPath).toEqual([
      [10, 60],
      [20, 75],
      [30, 75],
    ])
    expect(result!.bottomPath).toEqual([
      [10, 40],
      [20, 45],
      [30, 65],
    ])
  })

  it("null/NaN X or Y values are skipped from paths", () => {
    const ctx = makeCtx({
      getBounds: () => 5,
    })
    const data = [
      { x: 1, y: 10 },
      { x: null, y: 20 },   // null X → skipped
      { x: 3, y: NaN },     // NaN Y → skipped
      { x: NaN, y: 40 },    // NaN X → skipped
      { x: 5, y: 50 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // Only x=1 and x=5 are valid
    expect(result!.topPath.length).toBe(2)
    expect(result!.bottomPath.length).toBe(2)

    expect(result!.topPath[0]).toEqual([1, 15])  // y=10+5
    expect(result!.topPath[1]).toEqual([5, 55])   // y=50+5
    expect(result!.bottomPath[0]).toEqual([1, 5]) // y=10-5
    expect(result!.bottomPath[1]).toEqual([5, 45]) // y=50-5
  })

  it("zero offset produces topPath == bottomPath", () => {
    const ctx = makeCtx({
      getBounds: () => 0,
    })
    const data = [
      { x: 10, y: 30 },
      { x: 20, y: 50 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // Zero offset → both paths at the y value
    expect(result!.topPath).toEqual([
      [10, 30],
      [20, 50],
    ])
    expect(result!.bottomPath).toEqual([
      [10, 30],
      [20, 50],
    ])
  })

  it("null offset produces topPath == bottomPath (same as zero)", () => {
    const ctx = makeCtx({
      getBounds: () => null,
    })
    const data = [
      { x: 10, y: 30 },
      { x: 20, y: 50 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // null offset treated same as 0 in the !offset branch
    expect(result!.topPath).toEqual(result!.bottomPath)
    expect(result!.topPath).toEqual([
      [10, 30],
      [20, 50],
    ])
  })

  it("negative offset produces inverted band (top below bottom)", () => {
    const ctx = makeCtx({
      getBounds: () => -10,
    })
    const data = [
      { x: 5, y: 50 },
      { x: 15, y: 80 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // Negative offset: y + (-10) = y - 10 for top, y - (-10) = y + 10 for bottom
    // Point 1: top=[5, 40], bottom=[5, 60]
    // Point 2: top=[15, 70], bottom=[15, 90]
    expect(result!.topPath).toEqual([
      [5, 40],
      [15, 70],
    ])
    expect(result!.bottomPath).toEqual([
      [5, 60],
      [15, 90],
    ])
  })

  it("style comes from resolveBoundsStyle", () => {
    const boundsStyle = { fill: "rgba(0,100,200,0.3)", stroke: "none" }
    const ctx = makeCtx({
      getBounds: () => 5,
      resolveBoundsStyle: () => boundsStyle,
    })
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    expect(result!.style).toEqual(boundsStyle)
  })

  it("resolveBoundsStyle receives group name and sample datum", () => {
    let receivedGroup: string | undefined
    let receivedDatum: any
    const ctx = makeCtx({
      getBounds: () => 5,
      resolveBoundsStyle: (group: string, datum?: Record<string, any>) => {
        receivedGroup = group
        receivedDatum = datum
        return { fill: "#ccc" }
      },
    })
    const data = [
      { x: 1, y: 10, label: "first" },
      { x: 2, y: 20, label: "second" },
    ]
    buildBoundsForGroup(ctx, data, "myGroup")

    expect(receivedGroup).toBe("myGroup")
    expect(receivedDatum).toEqual({ x: 1, y: 10, label: "first" })
  })

  it("path point count matches valid data point count", () => {
    const ctx = makeCtx({
      getBounds: () => 3,
    })
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: null }, // invalid
      { x: 3, y: 30 },
      { x: 4, y: 40 },
      { x: NaN, y: 50 }, // invalid
      { x: 6, y: 60 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // 4 valid points (x=1,3,4,6)
    expect(result!.topPath.length).toBe(4)
    expect(result!.bottomPath.length).toBe(4)
    // Verify they match
    expect(result!.topPath.length).toBe(result!.bottomPath.length)
  })

  it("node is marked as non-interactive", () => {
    const ctx = makeCtx({
      getBounds: () => 5,
    })
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    expect(result!.interactive).toBe(false)
  })

  it("group and datum are set on the returned node", () => {
    const ctx = makeCtx({
      getBounds: () => 5,
    })
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ]
    const result = buildBoundsForGroup(ctx, data, "seriesA")

    expect(result).not.toBeNull()
    expect(result!.group).toBe("seriesA")
    expect(result!.datum).toBe(data)
  })

  it("applies scale transformation to coordinates", () => {
    const double = (v: number) => v * 2
    const doubleScale = Object.assign(double, { domain: () => [0, 50], range: () => [0, 100] })
    const ctx = makeCtx({
      scales: { x: doubleScale, y: doubleScale } as any,
      getBounds: (d) => d.offset,
    })
    const data = [
      { x: 5, y: 10, offset: 3 },
      { x: 15, y: 20, offset: 7 },
    ]
    const result = buildBoundsForGroup(ctx, data, "default")

    expect(result).not.toBeNull()
    // x=5 → scale(5)=10, y=10, offset=3 → top: scale(13)=26, bottom: scale(7)=14
    // x=15 → scale(15)=30, y=20, offset=7 → top: scale(27)=54, bottom: scale(13)=26
    expect(result!.topPath).toEqual([
      [10, 26],
      [30, 54],
    ])
    expect(result!.bottomPath).toEqual([
      [10, 14],
      [30, 26],
    ])
  })
})
