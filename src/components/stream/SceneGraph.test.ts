import { buildLineNode, buildAreaNode, buildStackedAreaNodes } from "./SceneGraph"
import type { StreamScales } from "./types"
import { scaleLinear } from "d3-scale"

function makeScales(w = 100, h = 100): StreamScales {
  return {
    x: scaleLinear().domain([0, 10]).range([0, w]),
    y: scaleLinear().domain([0, 10]).range([h, 0])
  }
}

describe("SceneGraph — buildLineNode", () => {
  it("produces a sorted path by x pixel coordinate", () => {
    const data = [
      { x: 5, y: 2 },
      { x: 1, y: 8 },
      { x: 9, y: 4 },
      { x: 3, y: 6 }
    ]
    const scales = makeScales()
    const node = buildLineNode(
      data, scales,
      d => d.x, d => d.y,
      { stroke: "#000" }
    )

    // Path should be sorted by x pixel coordinate
    for (let i = 1; i < node.path.length; i++) {
      expect(node.path[i][0]).toBeGreaterThanOrEqual(node.path[i - 1][0])
    }
  })

  it("keeps datum array aligned with sorted path", () => {
    const data = [
      { x: 9, y: 1, id: "c" },
      { x: 1, y: 5, id: "a" },
      { x: 5, y: 3, id: "b" }
    ]
    const scales = makeScales()
    const node = buildLineNode(
      data, scales,
      d => d.x, d => d.y,
      { stroke: "#000" }
    )

    // datum[i] should correspond to path[i]
    const sortedDatum = node.datum as Record<string, any>[]
    expect(sortedDatum[0].id).toBe("a") // x=1 is smallest
    expect(sortedDatum[1].id).toBe("b") // x=5
    expect(sortedDatum[2].id).toBe("c") // x=9
  })

  it("keeps rawValues aligned with sorted path", () => {
    const data = [
      { x: 10, y: 99 },
      { x: 0, y: 11 }
    ]
    const scales = makeScales()
    const node = buildLineNode(
      data, scales,
      d => d.x, d => d.y,
      { stroke: "#000" }
    )

    // rawValues[0] should correspond to x=0 (y=11), rawValues[1] to x=10 (y=99)
    expect(node.rawValues![0]).toBe(11)
    expect(node.rawValues![1]).toBe(99)
  })

  it("handles empty data", () => {
    const node = buildLineNode([], makeScales(), d => d.x, d => d.y, { stroke: "#000" })
    expect(node.path).toHaveLength(0)
    expect(node.rawValues).toHaveLength(0)
    expect(node.datum).toHaveLength(0)
  })

  it("filters NaN values before sorting", () => {
    const data = [
      { x: 5, y: 2 },
      { x: NaN, y: 3 },
      { x: 1, y: NaN },
      { x: 3, y: 6 }
    ]
    const scales = makeScales()
    const node = buildLineNode(
      data, scales,
      d => d.x, d => d.y,
      { stroke: "#000" }
    )

    expect(node.path).toHaveLength(2) // only x=5,y=2 and x=3,y=6 survive
    expect(node.path[0][0]).toBeLessThan(node.path[1][0]) // sorted
  })
})

describe("SceneGraph — buildAreaNode", () => {
  it("produces sorted topPath and bottomPath", () => {
    const data = [
      { x: 8, y: 3 },
      { x: 2, y: 7 },
      { x: 5, y: 5 }
    ]
    const scales = makeScales()
    const node = buildAreaNode(
      data, scales,
      d => d.x, d => d.y,
      0, { fill: "#000" }
    )

    for (let i = 1; i < node.topPath.length; i++) {
      expect(node.topPath[i][0]).toBeGreaterThanOrEqual(node.topPath[i - 1][0])
      expect(node.bottomPath[i][0]).toBeGreaterThanOrEqual(node.bottomPath[i - 1][0])
    }
  })

  it("topPath and bottomPath have matching x coordinates", () => {
    const data = [
      { x: 7, y: 3, y0: 1 },
      { x: 2, y: 8, y0: 2 }
    ]
    const scales = makeScales()
    const node = buildAreaNode(
      data, scales,
      d => d.x, d => d.y,
      0, { fill: "#000" },
      undefined,
      d => d.y0
    )

    expect(node.topPath[0][0]).toBe(node.bottomPath[0][0])
    expect(node.topPath[1][0]).toBe(node.bottomPath[1][0])
  })
})

describe("SceneGraph — buildStackedAreaNodes", () => {
  it("produces sorted paths (inherently sorted by xValues)", () => {
    const groups = [
      { key: "a", data: [{ x: 3, y: 10 }, { x: 1, y: 20 }] },
      { key: "b", data: [{ x: 3, y: 5 }, { x: 1, y: 15 }] }
    ]
    const scales = makeScales()
    const { nodes } = buildStackedAreaNodes(
      groups, scales,
      d => d.x, d => d.y,
      (g) => ({ fill: g === "a" ? "red" : "blue" })
    )

    for (const node of nodes) {
      for (let i = 1; i < node.topPath.length; i++) {
        expect(node.topPath[i][0]).toBeGreaterThanOrEqual(node.topPath[i - 1][0])
      }
    }
  })
})
