import { describe, expect, it } from "vitest"
import { shadeColor } from "./colorShade"

describe("shadeColor", () => {
  it("mixes hex colors toward black and white", () => {
    expect(shadeColor("#ffffff", -0.5)).toBe("rgb(128,128,128)")
    expect(shadeColor("#000", 0.5)).toBe("rgb(128,128,128)")
    expect(shadeColor("#4e79a7", 0)).toBe("#4e79a7")
  })

  it("keeps alpha from #rrggbbaa and rgba()", () => {
    expect(shadeColor("#00000080", 1)).toBe(`rgba(255,255,255,${128 / 255})`)
    expect(shadeColor("rgba(100, 100, 100, 0.5)", -1)).toBe("rgba(0,0,0,0.5)")
    expect(shadeColor("rgb(200 100 0)", -0.5)).toBe("rgb(100,50,0)")
  })

  it("falls back to color-mix for named and variable colors", () => {
    expect(shadeColor("steelblue", -0.25)).toBe("color-mix(in srgb, steelblue 75%, black)")
    expect(shadeColor("var(--semiotic-primary)", 0.3)).toBe(
      "color-mix(in srgb, var(--semiotic-primary) 70%, white)"
    )
  })
})
