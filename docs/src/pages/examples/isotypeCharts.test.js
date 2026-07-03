import { describe, expect, it } from "vitest"
import { unitize, unitizeRange } from "semiotic/recipes"
import { ISOTYPE_GLYPHS, isotypeGlyphDef, unwrapIsotypeDatum } from "./isotypeCharts.jsx"

// The pages allocate every repeated-sign tally through the library's
// unitize recipe; these tests pin the contracts the layouts rely on.
describe("shared ISOTYPE chart helpers", () => {
  it("allocates repeated symbols and preserves the final partial unit", () => {
    const { units } = unitize(85.6, { unit: 10, maxUnits: 10 })
    expect(units).toHaveLength(9)
    expect(units.slice(0, 8).every((unit) => unit.fraction === 1)).toBe(true)
    expect(units[8]).toMatchObject({ index: 8 })
    expect(units[8].fraction).toBeCloseTo(0.56)
  })

  it("caps icon allocation and reports the overflow", () => {
    const capped = unitize(140, { unit: 10, maxUnits: 10 })
    expect(capped.units).toHaveLength(10)
    expect(capped.overflow).toBe(true)
    expect(unitize(40, { unit: 0, maxUnits: 10 }).units).toEqual([])
    expect(unitize(-4, { unit: 10, maxUnits: 10 }).units).toEqual([])
  })

  it("splits a projected range into solid and hatched signs at the scenario boundary", () => {
    // The 2028 premise row: solid to the 325 TWh low scenario, hatched to 580.
    const { units, rangeUnits } = unitizeRange(325, 580, { unit: 25, maxUnits: 24 })
    expect(units).toHaveLength(13)
    expect(units.every((unit) => unit.fraction === 1)).toBe(true)
    expect(rangeUnits).toHaveLength(11)
    expect(rangeUnits[0].index).toBe(13)
    expect(rangeUnits[0].startFraction).toBe(0)
    expect(rangeUnits[10].fraction).toBeCloseTo(0.2)
  })

  it("defines every sign as a feet-anchored multi-part glyph", () => {
    for (const [kind, def] of Object.entries(ISOTYPE_GLYPHS)) {
      expect(def.anchor, kind).toEqual([0.5, 1])
      expect(def.viewBox, kind).toEqual([40, 40])
      expect(def.parts.length, kind).toBeGreaterThan(0)
      for (const part of def.parts) {
        expect(part.d, kind).toMatch(/^M/)
      }
    }
    expect(isotypeGlyphDef("no-such-sign")).toBe(ISOTYPE_GLYPHS.water)
  })

  it("unwraps frame datums without changing raw rows", () => {
    const row = { id: "travis", level: 672.1 }
    expect(unwrapIsotypeDatum(row)).toBe(row)
    expect(unwrapIsotypeDatum({ data: row })).toBe(row)
    expect(unwrapIsotypeDatum({ datum: row })).toBe(row)
  })
})
