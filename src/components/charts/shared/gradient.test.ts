import { describe, expect, it } from "vitest"
import {
  DEFAULT_GRADIENT,
  normalizeColorGradient,
  normalizeGradient,
  normalizeSemanticGradient,
  reverseGradient,
} from "./gradient"

describe("gradient normalization", () => {
  it("preserves the canonical stop config", () => {
    const gradient = {
      stops: [
        { offset: 0, color: "#f00", opacity: 0.8 },
        { offset: 1, color: "#00f", opacity: 0.2 },
      ],
    }

    expect(normalizeGradient(gradient)).toBe(gradient)
    expect(normalizeColorGradient(gradient)).toBe(gradient)
  })

  it("provides the standard inherited-color opacity gradient", () => {
    expect(normalizeGradient(true)).toBe(DEFAULT_GRADIENT)
  })

  it("normalizes supported color and opacity shorthands", () => {
    expect(normalizeGradient({
      colorStops: [
        { offset: 0, color: "#f00" },
        { offset: 1, color: "#00f" },
      ],
    })).toEqual({
      stops: [
        { offset: 0, color: "#f00" },
        { offset: 1, color: "#00f" },
      ],
    })

    expect(normalizeGradient({
      topOpacity: 0.9,
      bottomOpacity: 0.1,
    })).toEqual({
      stops: [
        { offset: 0, opacity: 0.9 },
        { offset: 1, opacity: 0.1 },
      ],
    })
  })

  it("normalizes semantic offsets and reverses them for area fill coordinates", () => {
    const semantic = normalizeSemanticGradient([
      { at: 25, color: "#f90", opacity: 0.4 },
      { at: 75, color: "#f00" },
    ])

    expect(semantic).toEqual({
      stops: [
        { offset: 0.25, color: "#f90", opacity: 0.4 },
        { offset: 0.75, color: "#f00" },
      ],
    })
    expect(reverseGradient(semantic!)).toEqual({
      stops: [
        { offset: 0.25, color: "#f00" },
        { offset: 0.75, color: "#f90", opacity: 0.4 },
      ],
    })
  })
})
