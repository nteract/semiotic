import { describe, expect, it } from "vitest"
import {
  countPairwiseCrossings,
  orderByBarycenter,
  orderExactSmall,
  packBandsBySilhouette,
  placeWithMinGap,
  refineByAdjacentSwaps,
} from "./layout1d"

describe("placeWithMinGap", () => {
  it("finds the weighted isotonic placement while preserving gaps and bounds", () => {
    const placed = placeWithMinGap({
      desired: [8, 2, 4],
      minGaps: [3, 2],
      weights: [1, 2, 1],
      min: 0,
      max: 12,
    })
    expect(placed[1] - placed[0]).toBeGreaterThanOrEqual(3)
    expect(placed[2] - placed[1]).toBeGreaterThanOrEqual(2)
    expect(placed[0]).toBeGreaterThanOrEqual(0)
    expect(placed[2]).toBeLessThanOrEqual(12)
  })

  it("keeps gaps when the supplied bounds are infeasible", () => {
    expect(placeWithMinGap({ desired: [0, 0], minGaps: [10], min: 5, max: 8 }))
      .toEqual([5, 15])
  })
})

describe("packBandsBySilhouette", () => {
  it("uses the worst simultaneous adjacent extent rather than independent peaks", () => {
    const packed = packBandsBySilhouette([
      [{ at: 0, before: 0, after: 8 }, { at: 10, before: 0, after: 1 }],
      [{ at: 0, before: 1, after: 0 }, { at: 10, before: 7, after: 0 }],
    ], 2)
    expect(packed.adjacentClearance).toEqual([9])
    expect(packed.positions).toEqual([0, 11])
  })
})

describe("guarded ordering kit", () => {
  const crossingCost = (order: readonly string[]) => {
    const position = new Map(order.map((id, i) => [id, i]))
    return countPairwiseCrossings(
      [["A", "D"], ["B", "C"]] as const,
      ([source, target]) => [position.get(source)!, position.get(target)!],
    )
  }

  it("counts strict inversions but not shared-position fans", () => {
    expect(countPairwiseCrossings(
      [[[0, 3]], [[1, 2]]] as const,
      (d) => d[0],
    )).toBe(1)
    expect(countPairwiseCrossings(
      [[[0, 2]], [[0, 3]]] as const,
      (d) => d[0],
    )).toBe(0)
  })

  it("exact, barycenter, and transpose searches never worsen caller cost", () => {
    const initial = ["A", "B", "D", "C"]
    const relations = [
      { source: "A", target: "D", weight: 1 },
      { source: "B", target: "C", weight: 1 },
    ]
    const exact = orderExactSmall(initial, crossingCost)
    const bary = orderByBarycenter(initial, relations, crossingCost, {
      compare: (a, b) => a < b ? -1 : a > b ? 1 : 0,
    })
    const refined = refineByAdjacentSwaps(initial, crossingCost)
    expect(crossingCost(exact)).toBeLessThanOrEqual(crossingCost(initial))
    expect(crossingCost(bary)).toBeLessThanOrEqual(crossingCost(initial))
    expect(crossingCost(refined)).toBeLessThanOrEqual(crossingCost(initial))
  })

  it("honors a deterministic evaluation budget", () => {
    let evaluations = 0
    orderExactSmall([1, 2, 3, 4], () => ++evaluations, { maxEvaluations: 5 })
    expect(evaluations).toBe(5)
  })
})
