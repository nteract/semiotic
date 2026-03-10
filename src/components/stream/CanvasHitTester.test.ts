import { findNearestNode } from "./CanvasHitTester"
import type { LineSceneNode, AreaSceneNode, PointSceneNode } from "./types"

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
})
