import { describe, expect, it } from "vitest"
import { makeShade, withAlpha } from "./recipeUtils"
import { parseColorEvidence } from "../ai/colorEvidence"

describe("recipe colors", () => {
  it.each([
    "var(--semiotic-primary, #4e79a7)",
    "currentColor",
    "oklch(60% 0.1 150)"
  ])("preserves the host-resolved base %s while shading", (color) => {
    const shade = makeShade(color)
    expect(shade(0.5)).toBe(color)
    expect(shade(0)).toContain(`color-mix(in lab, ${color} 28`)
    expect(shade(0)).toContain("white)")
    expect(shade(1)).toContain("black)")
    expect(makeShade(color, 0)(0)).toBe(color)
  })

  it.each([
    "#4e79a7cc",
    "#1238",
    "rgb(1,2,3)",
    "rgb(20% 40% 60% / 50%)",
    "hsl(240 100% 50% / 50%)"
  ])("dims %s and preserves its authored alpha", (color) => {
    const before = parseColorEvidence(color)!
    const after = parseColorEvidence(withAlpha(color, 0.2))!
    expect(after).toEqual({ ...before, a: before.a * 0.2 })
    expect(parseColorEvidence(makeShade(color)(0.5))).toEqual(before)
  })

  it("keeps named-color shading and defers alpha for host-resolved colors", () => {
    expect(parseColorEvidence(makeShade("red")(0.5))).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 1
    })
    expect(withAlpha("currentColor", 0.2)).toBe(
      "color-mix(in srgb, currentColor 20%, transparent)"
    )
    expect(withAlpha("var(--ink)", 1)).toBe("var(--ink)")
    expect(withAlpha("var(--ink)", NaN)).toBe("var(--ink)")
  })
})
