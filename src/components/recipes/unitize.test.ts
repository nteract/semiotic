import { describe, expect, it } from "vitest"
import { unitize, unitizeRange } from "./unitize"

describe("unitize", () => {
  it("allocates full signs plus a fractional final sign", () => {
    const result = unitize(85.6, { unit: 10 })
    expect(result.units).toHaveLength(9)
    expect(result.units.slice(0, 8).every((sign) => sign.fraction === 1)).toBe(true)
    expect(result.units[8].fraction).toBeCloseTo(0.56)
    expect(result.units[8].start).toBeCloseTo(80)
    expect(result.units[8].end).toBeCloseTo(85.6)
    expect(result.units[8].value).toBeCloseTo(5.6)
    expect(result.total).toBe(85.6)
    expect(result.shown).toBeCloseTo(85.6)
    expect(result.overflow).toBe(false)
  })

  it("produces no phantom sliver on exact multiples, including float-noise ones", () => {
    expect(unitize(175, { unit: 25 }).units).toHaveLength(7)
    // 0.7 / 0.1 === 6.999999999999999 in floating point
    const noisy = unitize(0.7, { unit: 0.1 })
    expect(noisy.units).toHaveLength(7)
    expect(noisy.units[6].fraction).toBe(1)
  })

  it("caps the tally and reports overflow", () => {
    const result = unitize(140, { unit: 10, maxUnits: 10 })
    expect(result.units).toHaveLength(10)
    expect(result.overflow).toBe(true)
    expect(result.shown).toBeCloseTo(100)
    expect(result.total).toBe(140)
  })

  it("drops trailing slivers below minFraction while keeping the ledger honest", () => {
    const arrows = unitize(176, { unit: 25, minFraction: 0.08 })
    expect(arrows.units).toHaveLength(7)
    expect(arrows.shown).toBeCloseTo(175)
    expect(arrows.total).toBe(176)
    // A partial above the threshold survives.
    const kept = unitize(211, { unit: 25, minFraction: 0.08 })
    expect(kept.units).toHaveLength(9)
    expect(kept.units[8].fraction).toBeCloseTo(0.44)
  })

  it("returns empty tallies for invalid input", () => {
    expect(unitize(0, { unit: 10 }).units).toEqual([])
    expect(unitize(-4, { unit: 10 }).units).toEqual([])
    expect(unitize(NaN, { unit: 10 }).units).toEqual([])
    expect(unitize(40, { unit: 0 }).units).toEqual([])
    expect(unitize(40, { unit: -2 }).units).toEqual([])
  })
})

describe("unitizeRange", () => {
  it("splits solid and range signs at a clean scenario boundary", () => {
    const { units, rangeUnits, rangeTotal } = unitizeRange(325, 580, { unit: 25 })
    expect(units).toHaveLength(13)
    expect(units.every((sign) => sign.fraction === 1)).toBe(true)
    expect(rangeUnits).toHaveLength(11)
    expect(rangeUnits[0].index).toBe(13)
    expect(rangeUnits[0].startFraction).toBe(0)
    expect(rangeUnits[10].fraction).toBeCloseTo(0.2)
    expect(rangeTotal).toBe(580)
  })

  it("shares the boundary sign when the base value ends mid-sign", () => {
    const { units, rangeUnits } = unitizeRange(30, 70, { unit: 20 })
    expect(units).toHaveLength(2)
    expect(units[1].fraction).toBeCloseTo(0.5)
    expect(rangeUnits).toHaveLength(3)
    expect(rangeUnits[0].index).toBe(1)
    expect(rangeUnits[0].startFraction).toBeCloseTo(0.5)
    expect(rangeUnits[0].fraction).toBe(1)
    expect(rangeUnits[0].value).toBeCloseTo(10)
    expect(rangeUnits[1]).toMatchObject({ index: 2, startFraction: 0 })
    expect(rangeUnits[2].fraction).toBeCloseTo(0.5)
  })

  it("does not repaint a minFraction-dropped sliver as projection", () => {
    // Base 176 at unit 25 drops its 4% stub; the range fill must still begin
    // at the true 176 boundary (fraction 0.04 into sign 7), not at zero.
    const { units, rangeUnits } = unitizeRange(176, 250, { unit: 25, minFraction: 0.08 })
    expect(units).toHaveLength(7)
    expect(rangeUnits[0].index).toBe(7)
    expect(rangeUnits[0].startFraction).toBeCloseTo(0.04)
    expect(rangeUnits[0].fraction).toBe(1)
  })

  it("returns an empty range when rangeValue does not exceed value", () => {
    const collapsed = unitizeRange(100, 80, { unit: 10 })
    expect(collapsed.rangeUnits).toEqual([])
    expect(collapsed.rangeTotal).toBe(100)
    expect(collapsed.units).toHaveLength(10)
  })

  it("honors the cap across the combined tally", () => {
    const capped = unitizeRange(50, 500, { unit: 10, maxUnits: 12 })
    expect(capped.units).toHaveLength(5)
    expect(capped.rangeUnits).toHaveLength(7)
    expect(capped.overflow).toBe(true)
  })
})
