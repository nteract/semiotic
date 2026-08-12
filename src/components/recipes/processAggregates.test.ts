import { describe, expect, it } from "vitest"
import {
  aggregateRegionCounts,
  groupCompletionRows,
  regionCountsToProjectionRows,
  type RegionCountMap
} from "./processAggregates"
import { bodyGroupSpec } from "./processPhysics"

describe("process aggregates", () => {
  it("counts unique region enters", () => {
    let counts: RegionCountMap = {}
    const region = {
      id: "impact",
      label: "First Impact",
      shape: { type: "aabb" as const, x: 0, y: 0, width: 1, height: 1 }
    }
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "a",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "a",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-enter",
      bodyId: "b",
      region
    })
    counts = aggregateRegionCounts(counts, {
      type: "region-exit",
      bodyId: "c",
      region
    })
    expect(counts.impact.count).toBe(2)
    expect(regionCountsToProjectionRows(counts)).toEqual([
      { label: "First Impact", value: 2 }
    ])
  })

  it("treats prototype-named region ids as own buckets and ignores inherited buckets", () => {
    let counts: RegionCountMap = {}
    for (const id of ["__proto__", "constructor", "toString"]) {
      counts = aggregateRegionCounts(counts, {
        type: "region-enter",
        bodyId: `body:${id}`,
        region: {
          id,
          shape: { type: "aabb", x: 0, y: 0, width: 1, height: 1 }
        }
      })
    }

    expect(Object.keys(counts)).toEqual(["__proto__", "constructor", "toString"])
    expect(
      regionCountsToProjectionRows(counts, ["__proto__", "constructor", "toString"])
    ).toEqual([
      { label: "__proto__", value: 1 },
      { label: "constructor", value: 1 },
      { label: "toString", value: 1 }
    ])
    expect(regionCountsToProjectionRows({}, ["constructor", "toString"])).toEqual([])
  })

  it("drops malformed serialized region buckets", () => {
    const counts = {
      valid: { id: "valid", count: 2, bodyIds: ["a", "b"] },
      malformed: { id: "malformed", count: 2, bodyIds: "not-an-array" }
    } as unknown as RegionCountMap

    expect(regionCountsToProjectionRows(counts)).toEqual([
      { label: "valid", value: 2 }
    ])
  })

  it("tracks group completion from absorbed members", () => {
    const group = bodyGroupSpec({
      id: "auth",
      label: "Auth",
      bodyIds: ["pr-1", "pr-2", "pr-3"],
      anchor: { x: 100, y: 50 },
      completion: { mode: "allMembersAbsorbed", targetZone: "merged" }
    })
    expect(group.anchor).toEqual({ x: 100, y: 50 })
    const partial = groupCompletionRows([group], ["pr-1", "pr-2"])
    expect(partial[0]).toMatchObject({
      complete: false,
      absorbed: 2,
      total: 3,
      missing: ["pr-3"]
    })
    const done = groupCompletionRows(
      [group],
      new Set(["pr-1", "pr-2", "pr-3"])
    )
    expect(done[0].complete).toBe(true)
  })

  it("honors any-member and weighted-threshold completion modes", () => {
    const anyMember = bodyGroupSpec({
      id: "reviewed",
      bodyIds: ["pr-1", "pr-2"],
      completion: { mode: "anyAbsorbed", targetZone: "merged" }
    })
    const featurePoints = bodyGroupSpec({
      id: "feature",
      bodyIds: ["pr-1", "pr-2", "pr-3"],
      completion: {
        mode: "threshold",
        targetZone: "merged",
        threshold: 10,
        valueByBodyId: { "pr-1": 4, "pr-2": 6, "pr-3": 3 }
      }
    })

    const partial = groupCompletionRows(
      [anyMember, featurePoints],
      new Set(["pr-1"])
    )
    expect(partial[0]).toMatchObject({
      mode: "anyAbsorbed",
      complete: true,
      absorbed: 1,
      absorbedValue: 1,
      totalValue: 2
    })
    expect(partial[1]).toMatchObject({
      mode: "threshold",
      complete: false,
      absorbed: 1,
      absorbedValue: 4,
      totalValue: 13,
      threshold: 10,
      missing: ["pr-2", "pr-3"]
    })

    const complete = groupCompletionRows(
      [featurePoints],
      new Set(["pr-1", "pr-2"])
    )
    expect(complete[0]).toMatchObject({
      complete: true,
      absorbed: 2,
      absorbedValue: 10,
      totalValue: 13,
      threshold: 10,
      missing: ["pr-3"]
    })
  })

  it("keeps all-members completion as the default and sanitizes invalid weights", () => {
    const group = bodyGroupSpec({
      id: "default",
      bodyIds: ["a", "b"],
      completion: {
        mode: "threshold",
        threshold: Number.NaN,
        valueByBodyId: { a: -2, b: 3 }
      }
    })

    const threshold = groupCompletionRows([group], ["b"])[0]
    expect(threshold).toMatchObject({
      complete: false,
      absorbedValue: 3,
      totalValue: 4,
      threshold: 4
    })

    const implicitAll = groupCompletionRows(
      [bodyGroupSpec({ id: "all", bodyIds: ["a", "b"] })],
      ["a"]
    )[0]
    expect(implicitAll).toMatchObject({
      mode: "allMembersAbsorbed",
      complete: false,
      absorbed: 1,
      total: 2
    })
  })

  it("uses only own finite weights while preserving own special member ids", () => {
    const weights = Object.create({ constructor: 100 }) as Record<string, number>
    Object.defineProperty(weights, "__proto__", {
      value: 4,
      enumerable: true
    })
    const group = bodyGroupSpec({
      id: "special",
      bodyIds: ["constructor", "__proto__"],
      completion: {
        mode: "threshold",
        threshold: 5,
        valueByBodyId: weights
      }
    })

    expect(groupCompletionRows([group], ["__proto__"])[0]).toMatchObject({
      totalValue: 5,
      absorbedValue: 4,
      complete: false
    })
  })
})
