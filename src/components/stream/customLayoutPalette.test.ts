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

  it("uses an object map's values as the palette", () => {
    const palette = resolveCustomLayoutPalette(
      { North: "#f00", South: "#0f0" },
      ["#abc"],
      schemeCategory10
    )
    expect(palette).toEqual(["#f00", "#0f0"])
  })

  it("falls through an empty object map to themeCategorical", () => {
    const palette = resolveCustomLayoutPalette({}, ["#abc"], schemeCategory10)
    expect(palette).toEqual(["#abc"])
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

  it("returns the exact mapped color for keys in an object map", () => {
    const map = { North: "#f00", South: "#0f0" }
    const palette = resolveCustomLayoutPalette(map, undefined, schemeCategory10)
    const resolve = buildResolveColor(palette, map)
    expect(resolve("North")).toBe("#f00")
    expect(resolve("South")).toBe("#0f0")
  })

  it("hashes keys absent from the object map into the palette", () => {
    const map = { North: "#f00", South: "#0f0" }
    const palette = resolveCustomLayoutPalette(map, undefined, schemeCategory10)
    const resolve = buildResolveColor(palette, map)
    // "East" isn't in the map — it hashes into the map's own values.
    expect(["#f00", "#0f0"]).toContain(resolve("East"))
    expect(resolve("East")).toBe(resolve("East")) // stable
  })

  it("honors an object map even when the palette is empty", () => {
    const resolve = buildResolveColor([], { North: "#f00" })
    expect(resolve("North")).toBe("#f00")
    expect(resolve("Unmapped")).toBe("#4e79a7")
  })

  it("ignores non-object colorScheme (array / string / undefined)", () => {
    const resolve = buildResolveColor(["#f00", "#0f0"], "tableau10")
    expect(["#f00", "#0f0"]).toContain(resolve("anything"))
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
