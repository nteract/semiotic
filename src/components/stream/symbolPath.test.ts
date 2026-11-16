import { describe, expect, it } from "vitest"
import { symbolExtent, symbolPathString, symbolRadius } from "./symbolPath"

describe("symbolPathString", () => {
  it("preserves subpixel area instead of imposing a one-pixel minimum", () => {
    expect(symbolPathString("square", 0.25)).toBe("M-0.25,-0.25h0.5v0.5h-0.5Z")
    expect(symbolRadius(0.25)).toBeCloseTo(Math.sqrt(0.25 / Math.PI), 12)
    expect(symbolExtent("triangle", 0.25)).toBeCloseTo(0.439, 12)
    expect(symbolRadius(0)).toBe(0)
    expect(symbolExtent("square", 0)).toBe(0)
  })
  it("falls back to a circle for inherited object-property names", () => {
    const circle = symbolPathString("circle", 64)

    expect(symbolPathString("constructor", 64)).toBe(circle)
    expect(symbolPathString("toString", 64)).toBe(circle)
    expect(symbolPathString("__proto__", 64)).toBe(circle)
  })
})

describe("symbolExtent", () => {
  function triangleExtent(size: number) {
    const halfHeight = Math.sqrt(size / (3 * Math.sqrt(3)))
    const round = (n: number) => Number(n.toFixed(3))
    // d3 rounds each vertex independently, so a bottom corner can extend
    // slightly farther than the top vertex after rounding.
    return Math.max(
      round(2 * halfHeight),
      Math.hypot(round(Math.sqrt(3) * halfHeight), round(halfHeight))
    )
  }

  it("keeps fractional sizes distinct regardless of call order", () => {
    for (const sizes of [
      [4.01, 4.49],
      [8.49, 8.01]
    ]) {
      const extents = sizes.map((size) => symbolExtent("triangle", size))
      sizes.forEach((size, i) => {
        expect(extents[i]).toBeCloseTo(triangleExtent(size), 12)
      })
      expect(extents[0]).not.toBe(extents[1])
    }
  })

  it("uses the current size for a custom path with no measurable extent", () => {
    expect(symbolExtent("triangle", 16, "M0,0Z")).toBe(symbolRadius(16))
    expect(symbolExtent("triangle", 64, "M0,0Z")).toBe(symbolRadius(64))
  })

  it("treats an empty custom path like the named shape, matching drawing", () => {
    expect(symbolExtent("triangle", 36, "")).toBeCloseTo(triangleExtent(36), 12)
    expect(symbolExtent("triangle", 36)).toBeCloseTo(triangleExtent(36), 12)
  })

  it("measures a nonempty custom path independently of the named shape and size", () => {
    expect(symbolExtent("square", 16, "M-3,4L0,0Z")).toBe(5)
    expect(symbolExtent("star", 100, "M-3,4L0,0Z")).toBe(5)
    expect(symbolExtent("star", 100, "M-6,8L0,0Z")).toBe(10)
  })
})
