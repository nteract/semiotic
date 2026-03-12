import { describe, it, expect } from "vitest"
import {
  getColor,
  createColorScale,
  getSize,
  COLOR_SCHEMES,
  DEFAULT_COLORS,
  DEPTH_PALETTE_COLORS,
} from "./colorUtils"

// ── COLOR_SCHEMES / DEFAULT_COLORS constants ──────────────────────────────


// ── getColor ──────────────────────────────────────────────────────────────

describe("getColor", () => {
  it("returns color from a function colorBy", () => {
    const colorFn = (d: any) => (d.value > 5 ? "red" : "blue")
    expect(getColor({ value: 10 }, colorFn)).toBe("red")
    expect(getColor({ value: 2 }, colorFn)).toBe("blue")
  })

  it("returns color from a string field with a color scale", () => {
    const scale = (v: any) => (v === "A" ? "#aaa" : "#bbb")
    expect(getColor({ category: "A" }, "category", scale)).toBe("#aaa")
    expect(getColor({ category: "B" }, "category", scale)).toBe("#bbb")
  })

  it("falls back to hash-based color when no scale is provided", () => {
    const color = getColor({ category: "X" }, "category")
    expect(typeof color).toBe("string")
    // Should be one of DEFAULT_COLORS
    expect(DEFAULT_COLORS).toContain(color)
  })

  it("returns deterministic colors for the same value", () => {
    const c1 = getColor({ cat: "foo" }, "cat")
    const c2 = getColor({ cat: "foo" }, "cat")
    expect(c1).toBe(c2)
  })

  it("handles undefined field value gracefully", () => {
    const color = getColor({}, "missing")
    expect(typeof color).toBe("string")
  })
})

// ── createColorScale ──────────────────────────────────────────────────────

describe("createColorScale", () => {
  const categoricalData = [
    { cat: "A", val: 1 },
    { cat: "B", val: 2 },
    { cat: "C", val: 3 },
    { cat: "A", val: 4 },
  ]

  it("creates an ordinal scale for categorical data with default scheme", () => {
    const scale = createColorScale(categoricalData, "cat")
    const colorA = scale("A")
    const colorB = scale("B")
    const colorC = scale("C")
    expect(typeof colorA).toBe("string")
    expect(typeof colorB).toBe("string")
    expect(typeof colorC).toBe("string")
    // Different categories get different colors
    expect(colorA).not.toBe(colorB)
    expect(colorB).not.toBe(colorC)
  })

  it("uses a custom color array as scheme", () => {
    const customColors = ["#f00", "#0f0", "#00f"]
    const scale = createColorScale(categoricalData, "cat", customColors)
    const colorA = scale("A")
    const colorB = scale("B")
    const colorC = scale("C")
    expect(customColors).toContain(colorA)
    expect(customColors).toContain(colorB)
    expect(customColors).toContain(colorC)
  })

  it("returns #999 for unknown values with custom array", () => {
    const scale = createColorScale(categoricalData, "cat", ["#f00", "#0f0", "#00f"])
    expect(scale("Z")).toBe("#999")
  })

  it("returns #999 for unknown values with named scheme", () => {
    const scale = createColorScale(categoricalData, "cat", "category10")
    expect(scale("Z")).toBe("#999")
  })

  it("handles empty data array", () => {
    const scale = createColorScale([], "cat")
    // Should still return a function
    expect(typeof scale).toBe("function")
  })

  it("handles single category", () => {
    const scale = createColorScale([{ cat: "Only" }], "cat")
    const color = scale("Only")
    expect(typeof color).toBe("string")
  })

  it("handles many categories (more than palette size)", () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ cat: `c${i}` }))
    const scale = createColorScale(data, "cat")
    // All should return valid color strings (wraps around palette)
    for (let i = 0; i < 20; i++) {
      expect(typeof scale(`c${i}`)).toBe("string")
    }
  })

  it("uses sequential scale for numeric data with a sequential scheme", () => {
    const numericData = [
      { score: 0 },
      { score: 50 },
      { score: 100 },
    ]
    const scale = createColorScale(numericData, "score", "blues")
    const c0 = scale("0" as any)
    const c100 = scale("100" as any)
    expect(typeof c0).toBe("string")
    expect(typeof c100).toBe("string")
    // Low and high values should produce different colors
    expect(c0).not.toBe(c100)
  })

  it("falls back to category10 for unknown scheme name", () => {
    const scale = createColorScale(categoricalData, "cat", "nonexistent" as any)
    // Should still produce valid colors (using default palette)
    expect(typeof scale("A")).toBe("string")
  })
})

// ── getSize ──────────────────────────────────────────────────────────────

describe("getSize", () => {
  it("returns raw value from a function sizeBy", () => {
    const sizeFn = (d: any) => d.population / 1000
    expect(getSize({ population: 5000 }, sizeFn)).toBe(5)
  })

  it("returns raw value from a string field without domain", () => {
    expect(getSize({ count: 42 }, "count")).toBe(42)
  })

  it("scales value to size range when domain is provided", () => {
    const size = getSize({ val: 50 }, "val", [5, 25], [0, 100])
    expect(size).toBe(15) // midpoint of range
  })

  it("returns min size for domain minimum", () => {
    const size = getSize({ val: 0 }, "val", [5, 25], [0, 100])
    expect(size).toBe(5)
  })

  it("returns max size for domain maximum", () => {
    const size = getSize({ val: 100 }, "val", [5, 25], [0, 100])
    expect(size).toBe(25)
  })

  it("returns midpoint size when domain min equals max", () => {
    const size = getSize({ val: 10 }, "val", [5, 25], [10, 10])
    expect(size).toBe(15) // (5 + 25) / 2
  })

  it("uses default sizeRange [3, 20] when not specified", () => {
    const size = getSize({ val: 50 }, "val", undefined, [0, 100])
    expect(size).toBe(11.5) // 3 + 0.5 * (20 - 3)
  })
})
