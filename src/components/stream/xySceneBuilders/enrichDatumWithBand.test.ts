/**
 * Coverage for `enrichDatumWithBand` — the shared helper that attaches
 * `band: { y0, y1 }` and `bands: [...]` to a hovered datum so user
 * tooltip functions and the default tooltip can surface envelope
 * values without re-running the accessors themselves.
 *
 * Used by pointer hover, keyboard navigation, and per-series enrichment
 * in multi-mode tooltips — one helper, three call sites, identical
 * shape.
 */
import { describe, it, expect } from "vitest"
import { enrichDatumWithBand, type ResolvedRibbon } from "./ribbonScene"

function makeBandRibbon(overrides: Partial<ResolvedRibbon> = {}): ResolvedRibbon {
  return {
    kind: "band",
    getTop: (d: any) => d.hi,
    getBottom: (d: any) => d.lo,
    perSeries: true,
    interactive: false,
    ...overrides,
  }
}

function makeBoundsRibbon(): ResolvedRibbon {
  return {
    kind: "bounds",
    getTop: (d: any) => d.y + 5,
    getBottom: (d: any) => d.y - 5,
    perSeries: true,
    interactive: false,
  }
}

describe("enrichDatumWithBand", () => {
  it("returns the input datum unchanged when no ribbons configured", () => {
    const datum = { x: 1, y: 10 }
    expect(enrichDatumWithBand(datum, undefined)).toBe(datum)
    expect(enrichDatumWithBand(datum, [])).toBe(datum)
  })

  it("returns a fresh empty object when datum is null/undefined", () => {
    expect(enrichDatumWithBand(null, [makeBandRibbon()])).toEqual({})
    expect(enrichDatumWithBand(undefined, [makeBandRibbon()])).toEqual({})
  })

  it("attaches band and bands when a single band ribbon is configured", () => {
    const datum = { x: 1, y: 10, lo: 5, hi: 15 }
    const enriched = enrichDatumWithBand(datum, [makeBandRibbon()])
    expect(enriched).not.toBe(datum) // shallow copy — original not mutated
    expect(enriched.band).toEqual({ y0: 5, y1: 15 })
    expect(enriched.bands).toEqual([{ y0: 5, y1: 15 }])
  })

  it("preserves all original fields on the enriched datum", () => {
    const datum = { x: 1, y: 10, lo: 5, hi: 15, label: "first" }
    const enriched = enrichDatumWithBand(datum, [makeBandRibbon()])
    expect(enriched.x).toBe(1)
    expect(enriched.y).toBe(10)
    expect(enriched.label).toBe("first")
  })

  it("does NOT mutate the input datum", () => {
    const datum = { x: 1, y: 10, lo: 5, hi: 15 }
    enrichDatumWithBand(datum, [makeBandRibbon()])
    expect("band" in datum).toBe(false)
    expect("bands" in datum).toBe(false)
  })

  it("supports multiple bands — bands array has one entry per ribbon", () => {
    const datum = { x: 1, p10: 0, p25: 5, p75: 15, p90: 20 }
    const enriched = enrichDatumWithBand(datum, [
      makeBandRibbon({
        getTop: (d: any) => d.p90,
        getBottom: (d: any) => d.p10,
      }),
      makeBandRibbon({
        getTop: (d: any) => d.p75,
        getBottom: (d: any) => d.p25,
      }),
    ])
    expect(enriched.bands).toEqual([
      { y0: 0, y1: 20 },
      { y0: 5, y1: 15 },
    ])
    // `band` is the first band for the single-band shorthand
    expect(enriched.band).toEqual({ y0: 0, y1: 20 })
  })

  it("skips bands whose accessors return NaN at this datum", () => {
    const datum = { x: 1, lo: 5, hi: 15 } as any
    const enriched = enrichDatumWithBand(datum, [
      makeBandRibbon(), // valid
      makeBandRibbon({
        getTop: () => Number.NaN,
        getBottom: () => Number.NaN,
      }),
    ])
    // Only the valid band makes it through
    expect(enriched.bands).toEqual([{ y0: 5, y1: 15 }])
  })

  it("returns the input datum unchanged when all bands yield NaN", () => {
    const datum = { x: 1 }
    const enriched = enrichDatumWithBand(datum, [
      makeBandRibbon({
        getTop: () => Number.NaN,
        getBottom: () => Number.NaN,
      }),
    ])
    expect(enriched).toBe(datum)
  })

  it("excludes bounds-kind ribbons from the enrichment contract", () => {
    const datum = { x: 1, y: 10, lo: 5, hi: 15 }
    const enriched = enrichDatumWithBand(datum, [
      makeBoundsRibbon(),
      makeBandRibbon(),
    ])
    // Bounds is decorative; only band-kind ribbons populate the array.
    expect(enriched.bands).toEqual([{ y0: 5, y1: 15 }])
  })

  it("returns the input when only bounds ribbons are configured (no bands)", () => {
    const datum = { x: 1, y: 10 }
    const enriched = enrichDatumWithBand(datum, [makeBoundsRibbon()])
    expect(enriched).toBe(datum)
    expect("band" in enriched).toBe(false)
  })
})
