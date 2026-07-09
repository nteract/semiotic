import {
  buildLineNode,
  buildAreaNode,
  buildStackedAreaNodes,
  computeDivergingStackExtent
} from "./SceneGraph"
import type { StreamScales } from "./types"
import { scaleLinear } from "d3-scale"
import type { Datum } from "../charts/shared/datumTypes"

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
    const sortedDatum = node.datum as Datum[]
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

  it("filters ±Infinity values (matches stacked-area pipeline)", () => {
    // Regression: builders previously only rejected NaN, so Infinity
    // values leaked through and pushed scaled pixels to ±Infinity. They
    // now use Number.isFinite so all builders agree on which datums
    // count.
    const data = [
      { x: 5, y: 2 },
      { x: Infinity, y: 3 },
      { x: 1, y: -Infinity },
      { x: 3, y: 6 }
    ]
    const scales = makeScales()
    const node = buildLineNode(
      data, scales,
      d => d.x, d => d.y,
      { stroke: "#000" }
    )
    expect(node.path).toHaveLength(2)
    for (const [px, py] of node.path) {
      expect(Number.isFinite(px)).toBe(true)
      expect(Number.isFinite(py)).toBe(true)
    }
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

  it("diverging baseline stacks positives above 0 and negatives below", () => {
    // identity scales so path y equals data y
    const scales = {
      x: (v: number) => v,
      y: (v: number) => v,
      xInvert: (v: number) => v,
      yInvert: (v: number) => v
    }
    const groups = [
      { key: "risk", data: [{ x: 0, y: -2 }, { x: 1, y: -1 }] },
      { key: "benefit", data: [{ x: 0, y: 3 }, { x: 1, y: 4 }] },
      { key: "risk2", data: [{ x: 0, y: -1 }, { x: 1, y: -2 }] }
    ]
    const { nodes, stackedTops } = buildStackedAreaNodes(
      groups,
      scales as never,
      (d) => d.x,
      (d) => d.y,
      () => ({ fill: "#000" }),
      false,
      undefined,
      "diverging"
    )

    // risk: from 0 → -2 at x=0
    const risk = nodes.find((n) => n.group === "risk")!
    expect(risk.bottomPath[0][1]).toBe(0)
    expect(risk.topPath[0][1]).toBe(-2)
    // risk2: from -2 → -3 at x=0
    const risk2 = nodes.find((n) => n.group === "risk2")!
    expect(risk2.bottomPath[0][1]).toBe(-2)
    expect(risk2.topPath[0][1]).toBe(-3)
    // benefit: from 0 → 3 (independent of negatives)
    const benefit = nodes.find((n) => n.group === "benefit")!
    expect(benefit.bottomPath[0][1]).toBe(0)
    expect(benefit.topPath[0][1]).toBe(3)

    expect(stackedTops.get("risk")?.get(0)).toBe(-2)
    expect(stackedTops.get("risk2")?.get(0)).toBe(-3)
    expect(stackedTops.get("benefit")?.get(0)).toBe(3)
  })

  it("cuts area segments at zero / missing values instead of drawing flat ribbons", () => {
    const scales = {
      x: (v: number) => v,
      y: (v: number) => v,
      xInvert: (v: number) => v,
      yInvert: (v: number) => v
    }
    // benefit is active at x=0,1 then drops out; risk only at x=2,3
    const groups = [
      {
        key: "benefit",
        data: [
          { x: 0, y: 2 },
          { x: 1, y: 3 },
          { x: 2, y: 0 },
          { x: 3, y: 0 }
        ]
      },
      {
        key: "risk",
        data: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 2, y: -1 },
          { x: 3, y: -2 }
        ]
      }
    ]
    const { nodes } = buildStackedAreaNodes(
      groups,
      scales as never,
      (d) => d.x,
      (d) => d.y,
      () => ({ fill: "#000" }),
      false,
      undefined,
      "diverging"
    )
    const benefitNodes = nodes.filter((n) => n.group === "benefit")
    const riskNodes = nodes.filter((n) => n.group === "risk")
    // Each polarity is one contiguous non-zero run → one area node each
    expect(benefitNodes).toHaveLength(1)
    expect(riskNodes).toHaveLength(1)
    expect(benefitNodes[0].topPath).toHaveLength(2)
    expect(riskNodes[0].topPath).toHaveLength(2)
    // benefit path only covers x=0,1 (not flat zeros at 2,3)
    expect(benefitNodes[0].topPath.map((p) => p[0])).toEqual([0, 1])
    expect(riskNodes[0].topPath.map((p) => p[0])).toEqual([2, 3])
  })
})

describe("SceneGraph — computeDivergingStackExtent", () => {
  it("returns [sumNeg, sumPos] across x", () => {
    const [lo, hi] = computeDivergingStackExtent(
      [0, 1],
      ["a", "b", "c"],
      (k, x) => {
        if (k === "a") return 2
        if (k === "b") return -1
        return x === 0 ? -3 : 4
      }
    )
    // x=0: pos=2, neg=-4 → lo=-4, hi=2
    // x=1: pos=6, neg=-1 → lo=-4, hi=6
    expect(lo).toBe(-4)
    expect(hi).toBe(6)
  })
})
