import { describe, it, expect } from "vitest"
import { scaleLinear, scaleTime } from "d3-scale"
import { equidistantTicks, ticksForMode } from "./axisExtent"

describe("equidistantTicks", () => {
  it("generates N ticks evenly spaced across a linear domain, inclusive", () => {
    const s = scaleLinear().domain([0, 100])
    expect(equidistantTicks(s, 5)).toEqual([0, 25, 50, 75, 100])
    expect(equidistantTicks(s, 6)).toEqual([0, 20, 40, 60, 80, 100])
  })

  it("pins the last tick to the exact domain max (no float drift)", () => {
    // (0.13 + i * (9.87 - 0.13) / 4) for i = 0..4 — the float arithmetic
    // can leave the i=4 value at 9.870000000000001 instead of 9.87. The
    // helper short-circuits the final step to the literal domain max.
    const s = scaleLinear().domain([0.13, 9.87])
    const ticks = equidistantTicks(s, 5)
    expect(ticks[0]).toBe(0.13)
    expect(ticks[ticks.length - 1]).toBe(9.87)
    expect(ticks).toHaveLength(5)
  })

  it("works on non-round domain values (the headline use case)", () => {
    // d3-scale's `.ticks()` would round these to [3.2, 3.4, ..., 9.8] —
    // omitting both endpoints. `equidistantTicks` honors the data.
    const s = scaleLinear().domain([3.17, 9.83])
    const ticks = equidistantTicks(s, 5)
    expect(ticks[0]).toBe(3.17)
    expect(ticks[4]).toBe(9.83)
    expect(ticks[2]).toBeCloseTo(6.5, 5)
  })

  it("returns Date objects for a temporal scale", () => {
    const t0 = new Date("2026-01-01T00:00:00Z").getTime()
    const t1 = new Date("2026-12-31T00:00:00Z").getTime()
    const s = scaleTime().domain([new Date(t0), new Date(t1)])
    const ticks = equidistantTicks(s, 4)
    expect(ticks).toHaveLength(4)
    expect((ticks[0] as Date).getTime()).toBe(t0)
    expect((ticks[3] as Date).getTime()).toBe(t1)
    // Middle ticks are at 1/3 and 2/3 of the range
    const expectedMid1 = t0 + (t1 - t0) / 3
    const expectedMid2 = t0 + 2 * (t1 - t0) / 3
    expect((ticks[1] as Date).getTime()).toBeCloseTo(expectedMid1, -2)
    expect((ticks[2] as Date).getTime()).toBeCloseTo(expectedMid2, -2)
  })

  it("returns just the endpoints when count < 2", () => {
    const s = scaleLinear().domain([0, 100])
    expect(equidistantTicks(s, 1)).toEqual([0, 100])
    expect(equidistantTicks(s, 0)).toEqual([0, 100])
  })

  it("handles a zero-width domain by returning duplicated endpoints", () => {
    const s = scaleLinear().domain([42, 42])
    expect(equidistantTicks(s, 5)).toEqual([42, 42])
  })
})

describe("ticksForMode", () => {
  it("delegates to scale.ticks() when mode is 'nice' or undefined", () => {
    const s = scaleLinear().domain([0.13, 9.87])
    // d3-ticks(5) on a 0.13–9.87 domain produces a rounded set that
    // does NOT include the endpoints exactly.
    const niceTicks = ticksForMode(s, 5, "nice")
    expect(niceTicks[0]).not.toBe(0.13)
    expect(niceTicks[niceTicks.length - 1]).not.toBe(9.87)
    expect(ticksForMode(s, 5, undefined)).toEqual(niceTicks)
  })

  it("returns equidistant ticks when mode is 'exact'", () => {
    const s = scaleLinear().domain([0.13, 9.87])
    const ticks = ticksForMode(s, 5, "exact")
    expect(ticks[0]).toBe(0.13)
    expect(ticks[ticks.length - 1]).toBe(9.87)
    expect(ticks).toHaveLength(5)
  })
})
