import { describe, it, expect } from "vitest"
import { validateProps } from "./validateProps"

describe("validateProps typo-aware suggestions", () => {
  it("suggests closest prop name for typos", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      lineWdith: 3, // typo of lineWidth
    })
    expect(result.valid).toBe(false)
    const typoError = result.errors.find(e => e.includes("lineWdith"))
    expect(typoError).toBeDefined()
    expect(typoError).toContain('Did you mean "lineWidth"')
  })

  it("suggests colorBy for colrBy", () => {
    const result = validateProps("Scatterplot", {
      data: [{ x: 1, y: 2 }],
      colrBy: "type",
    })
    const typoError = result.errors.find(e => e.includes("colrBy"))
    expect(typoError).toContain('Did you mean "colorBy"')
  })

  it("lists all valid props when no close match", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      zzzzNotAProp: true,
    })
    const err = result.errors.find(e => e.includes("zzzzNotAProp"))
    expect(err).toContain("Valid props:")
  })

  it("validates correctly when all props are known", () => {
    const result = validateProps("LineChart", {
      data: [{ x: 1, y: 2 }],
      xAccessor: "x",
      yAccessor: "y",
      lineWidth: 2,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
