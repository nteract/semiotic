import { findNearestNode } from "./CanvasHitTester"
import type { LineSceneNode, AreaSceneNode, PointSceneNode, RectSceneNode } from "./types"
import { quadtree } from "d3-quadtree"

describe("CanvasHitTester — findNearestNode", () => {
  it("finds nearest point on a sorted line path", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [[10, 50], [30, 40], [50, 30], [70, 20], [90, 10]],
      rawValues: [5, 6, 7, 8, 9],
      style: { stroke: "#000" },
      datum: [
        { x: 1, v: 5 },
        { x: 3, v: 6 },
        { x: 5, v: 7 },
        { x: 7, v: 8 },
        { x: 9, v: 9 }
      ]
    }

    const result = findNearestNode([line], 50, 30)
    expect(result).not.toBeNull()
    expect(result!.datum.x).toBe(5) // closest to px=50
    expect(result!.distance).toBeCloseTo(0, 5)
  })

  it("returns correct datum for line hit at edge", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [[0, 100], [50, 50], [100, 0]],
      rawValues: [0, 5, 10],
      style: { stroke: "#000" },
      datum: [{ id: "first" }, { id: "mid" }, { id: "last" }]
    }

    // Hit near the last point
    const result = findNearestNode([line], 98, 2)
    expect(result).not.toBeNull()
    expect(result!.datum.id).toBe("last")
  })

  it("finds nearest point in scatter", () => {
    const points: PointSceneNode[] = [
      { type: "point", x: 20, y: 80, r: 5, style: { fill: "red" }, datum: { id: "a" } },
      { type: "point", x: 60, y: 40, r: 5, style: { fill: "blue" }, datum: { id: "b" } },
      { type: "point", x: 80, y: 20, r: 5, style: { fill: "green" }, datum: { id: "c" } }
    ]

    const result = findNearestNode(points, 62, 42)
    expect(result).not.toBeNull()
    expect(result!.datum.id).toBe("b")
  })

  it("respects maxDistance threshold", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [[50, 50]],
      style: { stroke: "#000" },
      datum: [{ id: "only" }]
    }

    // Far away — should miss
    const result = findNearestNode([line], 200, 200, 30)
    expect(result).toBeNull()
  })

  it("handles area node hit testing with sorted topPath", () => {
    const area: AreaSceneNode = {
      type: "area",
      topPath: [[10, 80], [50, 50], [90, 20]],
      bottomPath: [[10, 100], [50, 100], [90, 100]],
      style: { fill: "#000" },
      datum: [{ x: 1 }, { x: 5 }, { x: 9 }]
    }

    const result = findNearestNode([area], 48, 52)
    expect(result).not.toBeNull()
    expect(result!.x).toBeCloseTo(50, 0)
  })

  it("handles empty scene", () => {
    const result = findNearestNode([], 50, 50)
    expect(result).toBeNull()
  })

  it("handles line with empty path", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [],
      style: { stroke: "#000" },
      datum: []
    }
    const result = findNearestNode([line], 50, 50)
    expect(result).toBeNull()
  })

  it("quadtree fast path returns nearest point", () => {
    const points: PointSceneNode[] = [
      { type: "point", x: 10, y: 10, r: 5, style: { fill: "red" }, datum: { id: "a" } },
      { type: "point", x: 50, y: 50, r: 5, style: { fill: "blue" }, datum: { id: "b" } },
      { type: "point", x: 90, y: 90, r: 5, style: { fill: "green" }, datum: { id: "c" } },
      { type: "point", x: 200, y: 200, r: 5, style: { fill: "purple" }, datum: { id: "d" } }
    ]

    const qt = quadtree<PointSceneNode>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(points)

    const result = findNearestNode(points, 52, 48, 30, qt)
    expect(result).not.toBeNull()
    expect(result!.datum.id).toBe("b")
    expect(result!.distance).toBeLessThan(10)
  })

  it("falls back to linear scan when quadtree candidate fails hitTestPoint", () => {
    // Point A is closest in Euclidean distance but has r=1, so hitTestPoint
    // rejects it (dist > r + 5 = 6). Point B is farther but has r=20 so it passes.
    const pointA: PointSceneNode = {
      type: "point", x: 100, y: 100, r: 1, style: { fill: "red" }, datum: { id: "a" }
    }
    const pointB: PointSceneNode = {
      type: "point", x: 120, y: 100, r: 20, style: { fill: "blue" }, datum: { id: "b" }
    }

    const points: PointSceneNode[] = [pointA, pointB]

    const qt = quadtree<PointSceneNode>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll(points)

    // Query at (110, 100): 10px from A (r=1, hit radius = 6 → miss),
    // 10px from B (r=20, hit radius = 25 → hit).
    // Quadtree returns A (nearest center), hitTestPoint rejects A,
    // so linear scan should find B.
    const result = findNearestNode(points, 110, 100, 30, qt)
    expect(result).not.toBeNull()
    expect(result!.datum.id).toBe("b")
  })

  it("quadtree does not interfere with non-point node types", () => {
    const point: PointSceneNode = {
      type: "point", x: 200, y: 200, r: 5, style: { fill: "red" }, datum: { id: "pt" }
    }
    const rect: RectSceneNode = {
      type: "rect", x: 40, y: 40, w: 30, h: 30,
      style: { fill: "blue" }, datum: { id: "rect" }
    }
    const line: LineSceneNode = {
      type: "line",
      path: [[50, 10], [50, 50], [50, 90]],
      style: { stroke: "#000" },
      datum: [{ id: "l1" }, { id: "l2" }, { id: "l3" }]
    }

    const scene = [point, rect, line]

    const qt = quadtree<PointSceneNode>()
      .x((d) => d.x)
      .y((d) => d.y)
      .addAll([point])

    // Query near the rect center (55, 55) — point is far away at (200,200).
    // The rect should be hit via linear scan despite the quadtree being present.
    const rectResult = findNearestNode(scene, 55, 55, 30, qt)
    expect(rectResult).not.toBeNull()
    expect(rectResult!.datum.id).toBe("rect")

    // Query near the line path at (50, 5) — outside the rect, near line's first point (50,10)
    const lineResult = findNearestNode(scene, 50, 5, 30, qt)
    expect(lineResult).not.toBeNull()
    expect(lineResult!.datum.id).toBe("l1")
  })
})
