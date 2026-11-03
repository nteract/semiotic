import { describe, expect, it, vi } from "vitest"
import {
  countPairwiseCrossings,
  orderByBarycenter,
  orderExactSmall,
  packBandsBySilhouette,
  placeWithMinGap,
  refineByAdjacentSwaps,
  type SilhouetteSample,
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

  it("consumes simultaneous steps together and keeps the last duplicate sample", () => {
    const packed = packBandsBySilhouette([
      [],
      [{ at: 0, before: 2, after: 9 }, { at: 3, before: 4, after: 1 }],
      [
        { at: 3, before: 100, after: 0 },
        { at: 3, before: 6, after: 3 },
        { at: 5, before: 8, after: 2 }
      ],
      []
    ], 2)
    // The 9-unit upper step ends exactly when the 6-unit lower step begins.
    // Neither that transient sum nor the overwritten 100-unit sample exists.
    expect(packed.adjacentClearance).toEqual([4, 9, 3])
    expect(packed.positions).toEqual([0, 6, 17, 22])
    expect(packBandsBySilhouette([])).toEqual({ adjacentClearance: [], positions: [] })
    expect(packBandsBySilhouette([[]])).toEqual({ adjacentClearance: [], positions: [0] })
  })

  it("matches direct step-function evaluation across staggered and duplicate samples", () => {
    const bands: SilhouetteSample[][] = Array.from({ length: 7 }, (_, band) =>
      Array.from({ length: band * 40 }, (_, i) => ({
        at: Math.floor(i / 2) * 3 - band,
        before: (i * 7 + band) % 19,
        after: (i * 13 + band) % 23
      }))
    )
    const expected = bands.slice(1).map((lower, i) => {
      const upper = bands[i]
      const times = new Set([...upper, ...lower].map((sample) => sample.at))
      let clearance = 0
      for (const at of times) {
        const after = upper.findLast((sample) => sample.at <= at)?.after ?? 0
        const before = lower.findLast((sample) => sample.at <= at)?.before ?? 0
        clearance = Math.max(clearance, after + before)
      }
      return clearance
    })
    expect(packBandsBySilhouette(bands).adjacentClearance).toEqual(expected)
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
    const cost = vi.fn(() => 0)
    orderExactSmall([1, 2, 3, 4], cost, { maxEvaluations: 5 })
    expect(cost).toHaveBeenCalledTimes(5)
  })
})
