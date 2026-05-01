import { describe, it, expect } from "vitest"
import {
  resolveCustomLayoutPalette,
  buildResolveColor,
  schemeCategory10,
  STREAMING_PALETTE,
} from "./customLayoutPalette"

describe("resolveCustomLayoutPalette", () => {
  it("returns explicit array as-is", () => {
    const palette = resolveCustomLayoutPalette(["#f00", "#0f0"], undefined, schemeCategory10)
    expect(palette).toEqual(["#f00", "#0f0"])
  })

  it("resolves named d3 schemes", () => {
    const palette = resolveCustomLayoutPalette("tableau10", undefined, schemeCategory10)
    expect(palette.length).toBe(10)
    expect(palette[0]).toBe("#4e79a7") // first tableau10 color
  })

  it("falls through unknown name to themeCategorical", () => {
    const palette = resolveCustomLayoutPalette("not-a-scheme", ["#abc", "#def"], schemeCategory10)
    expect(palette).toEqual(["#abc", "#def"])
  })

  it("falls through to fallback when nothing else is available", () => {
    const palette = resolveCustomLayoutPalette(undefined, undefined, schemeCategory10)
    expect(palette).toBe(schemeCategory10)
  })

  it("treats empty colorScheme array as undefined (regression)", () => {
    // Regression: previously returned [] as-is, leading to NaN in
    // buildResolveColor's modulo. Empty arrays now fall through to
    // themeCategorical / fallback so the resolver always has at least
    // one color.
    const palette = resolveCustomLayoutPalette([], ["#abc"], schemeCategory10)
    expect(palette).toEqual(["#abc"])
  })

  it("treats empty themeCategorical as undefined", () => {
    const palette = resolveCustomLayoutPalette(undefined, [], schemeCategory10)
    expect(palette).toBe(schemeCategory10)
  })
})

describe("buildResolveColor", () => {
  it("returns a stable color for the same key", () => {
    const resolve = buildResolveColor(["#f00", "#0f0", "#00f"])
    expect(resolve("alpha")).toBe(resolve("alpha"))
  })

  it("indexes into the palette via stable hash", () => {
    const resolve = buildResolveColor(["#f00", "#0f0", "#00f"])
    const colors = ["a", "b", "c", "d", "e"].map(resolve)
    for (const c of colors) {
      expect(["#f00", "#0f0", "#00f"]).toContain(c)
    }
  })

  it("returns a constant fallback when palette is empty (regression)", () => {
    // Regression: Math.abs(hash) % 0 is NaN and palette[NaN] is
    // undefined. Without an explicit guard the resolver could leak
    // undefined into scene-node fill strings. Now it returns a fixed
    // primary so something readable still draws.
    const resolve = buildResolveColor([])
    expect(resolve("alpha")).toBe("#4e79a7")
    expect(resolve("alpha")).toBe(resolve("beta")) // constant
  })
})

describe("re-exports", () => {
  it("schemeCategory10 is non-empty", () => {
    expect(schemeCategory10.length).toBeGreaterThan(0)
  })

  it("STREAMING_PALETTE is non-empty", () => {
    expect(STREAMING_PALETTE.length).toBeGreaterThan(0)
  })
})
