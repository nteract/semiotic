import { findNearestNode, findAllNodesAtX } from "./CanvasHitTester"
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
    // Point A is closest in Euclidean distance but has r=1 (hit radius = max(6, 12) = 12).
    // Query at 15px from A → miss. Point B is farther but has r=20 (hit radius = 25) → hit.
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

    // Query at (115, 100): 15px from A (hit radius = 12 → miss),
    // 5px from B (hit radius = 25 → hit).
    // Quadtree returns A (nearest center), hitTestPoint rejects A,
    // so linear scan should find B.
    const result = findNearestNode(points, 115, 100, 30, qt)
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

describe("hit radius defaults", () => {
  it("line hit test respects default 30px maxDistance", () => {
    // Horizontal line at y=50. Cursor at y=75 — 25px away (within 30px default).
    const line: LineSceneNode = {
      type: "line",
      path: [[10, 50], [50, 50], [90, 50]],
      style: { stroke: "#000", strokeWidth: 2 },
      datum: [{ id: "a" }, { id: "b" }, { id: "c" }],
    }
    const hit = findNearestNode([line], 50, 75) // 25px from line
    expect(hit).not.toBeNull()
    expect(hit!.distance).toBeCloseTo(25, 0)
  })

  it("line hit test rejects beyond 30px default", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [[10, 50], [50, 50], [90, 50]],
      style: { stroke: "#000", strokeWidth: 2 },
      datum: [{ id: "a" }, { id: "b" }, { id: "c" }],
    }
    const hit = findNearestNode([line], 50, 85) // 35px from line
    expect(hit).toBeNull()
  })

  it("line hit test uses custom maxDistance", () => {
    const line: LineSceneNode = {
      type: "line",
      path: [[10, 50], [50, 50], [90, 50]],
      style: { stroke: "#000", strokeWidth: 2 },
      datum: [{ id: "a" }, { id: "b" }, { id: "c" }],
    }
    // 45px away — beyond 30px default but within 50px custom
    const hit = findNearestNode([line], 50, 95, 50)
    expect(hit).not.toBeNull()
  })

  it("point hit test respects default 30px maxDistance", () => {
    const point: PointSceneNode = {
      type: "point", x: 50, y: 50, r: 5,
      style: { fill: "#000" },
      datum: { id: "p1" },
    }
    // 25px away — within 30px
    const hit = findNearestNode([point], 50, 75)
    expect(hit).not.toBeNull()
  })

  it("point hit test rejects beyond 30px default", () => {
    const point: PointSceneNode = {
      type: "point", x: 50, y: 50, r: 5,
      style: { fill: "#000" },
      datum: { id: "p1" },
    }
    // 35px away — beyond 30px
    const hit = findNearestNode([point], 50, 85)
    expect(hit).toBeNull()
  })
})

describe("findAllNodesAtX", () => {
  const lineA: LineSceneNode = {
    type: "line",
    path: [[10, 100], [50, 60], [90, 20]],
    style: { stroke: "red" },
    datum: [{ id: "a1" }, { id: "a2" }, { id: "a3" }],
    group: "Series A",
  }

  const lineB: LineSceneNode = {
    type: "line",
    path: [[10, 80], [50, 40], [90, 10]],
    style: { stroke: "blue" },
    datum: [{ id: "b1" }, { id: "b2" }, { id: "b3" }],
    group: "Series B",
  }

  const area: AreaSceneNode = {
    type: "area",
    topPath: [[10, 90], [50, 50], [90, 15]],
    bottomPath: [[10, 100], [50, 100], [90, 100]],
    style: { fill: "green", stroke: "green" },
    datum: { id: "area1" },
    group: "Area C",
  }

  it("returns all line nodes at a given X pixel", () => {
    const results = findAllNodesAtX([lineA, lineB], 50, 30)
    expect(results).toHaveLength(2)
    expect(results[0].group).toBe("Series A")
    expect(results[1].group).toBe("Series B")
  })

  it("includes area nodes", () => {
    const results = findAllNodesAtX([lineA, area], 50, 30)
    expect(results).toHaveLength(2)
    const groups = results.map(r => r.group)
    expect(groups).toContain("Series A")
    expect(groups).toContain("Area C")
  })

  it("interpolates Y between path points", () => {
    // At px=30 (between path[0].x=10 and path[1].x=50), Y should interpolate
    const results = findAllNodesAtX([lineA], 30, 30)
    expect(results).toHaveLength(1)
    // lineA: (10,100) to (50,60). At x=30: t = (30-10)/(50-10) = 0.5, y = 100 + 0.5*(60-100) = 80
    expect(results[0].y).toBeCloseTo(80, 0)
  })

  it("returns color from node style", () => {
    const results = findAllNodesAtX([lineA, lineB], 50, 30)
    expect(results[0].color).toBe("red")
    expect(results[1].color).toBe("blue")
  })

  it("returns empty when no nodes within maxXDistance", () => {
    const results = findAllNodesAtX([lineA], 200, 30)
    expect(results).toHaveLength(0)
  })

  it("ignores non-line/area nodes", () => {
    const point: PointSceneNode = {
      type: "point", x: 50, y: 50, r: 5,
      style: { fill: "orange" },
      datum: { id: "p1" },
    }
    const results = findAllNodesAtX([point as any, lineA], 50, 30)
    expect(results).toHaveLength(1)
    expect(results[0].group).toBe("Series A")
  })
})
