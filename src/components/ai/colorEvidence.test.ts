import { describe, expect, it } from "vitest"
import { parseColorEvidence, canonicalColorEvidence } from "./colorEvidence"

describe("solid CSS color evidence", () => {
  it.each([
    "#0f0",
    "#00ff00ff",
    "rgb(0,255,0)",
    "rgb(0 100% 0 / 100%)",
    "hsl(120,100%,50%)",
    "hsl(0.3333333333333333turn 100% 50%)"
  ])("recognizes green written as %s", (value) => {
    expect(canonicalColorEvidence(value)).toBe("#00ff00")
  })

  it.each([
    "rgb(1 2 3 0.5)",
    "rgb(1,2,3 / 0.5)",
    "rgb(1 2 3 / 0.5 / 1)",
    "hsl(0 0 50%)",
    "hsl(0 101% 50%)",
    "rgba(1,2,3,2)"
  ])("rejects malformed colors: %s", (value) => {
    expect(parseColorEvidence(value)).toBeNull()
  })

  it("preserves alpha for modern rgb and hsl notation", () => {
    expect(parseColorEvidence("rgb(255 0 0 / 50%)")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.5
    })
    expect(parseColorEvidence("hsl(0 100% 50% / 25%)")).toEqual({
      r: 255,
      g: 0,
      b: 0,
      a: 0.25
    })
  })
})
