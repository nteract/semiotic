import { describe, it, expect } from "vitest"
import { mergeShapeStyle, hasPrimitiveOverrides } from "./mergeShapeStyle"

describe("hasPrimitiveOverrides", () => {
  it("returns false for empty overrides", () => {
    expect(hasPrimitiveOverrides({})).toBe(false)
  })

  it("returns false when all override fields are undefined", () => {
    expect(hasPrimitiveOverrides({ stroke: undefined, strokeWidth: undefined, opacity: undefined })).toBe(false)
  })

  it("returns true for any set field", () => {
    expect(hasPrimitiveOverrides({ stroke: "red" })).toBe(true)
    expect(hasPrimitiveOverrides({ strokeWidth: 2 })).toBe(true)
    expect(hasPrimitiveOverrides({ opacity: 0.5 })).toBe(true)
  })

  it("returns true even when field is set to falsy-but-defined value", () => {
    // opacity 0 and strokeWidth 0 are valid and should count as "set"
    expect(hasPrimitiveOverrides({ opacity: 0 })).toBe(true)
    expect(hasPrimitiveOverrides({ strokeWidth: 0 })).toBe(true)
  })
})

describe("mergeShapeStyle", () => {
  it("returns the input function unchanged when no overrides are set", () => {
    const styleFn = () => ({ fill: "red" })
    const out = mergeShapeStyle(styleFn, {})
    expect(out).toBe(styleFn)
  })

  it("returns a no-op identity function when both styleFn and overrides are empty", () => {
    const out = mergeShapeStyle(undefined, {})
    expect(out()).toEqual({})
  })

  it("overlays a single override on base style output", () => {
    const styleFn = () => ({ fill: "red" })
    const out = mergeShapeStyle(styleFn, { stroke: "black" })
    expect(out()).toEqual({ fill: "red", stroke: "black" })
  })

  it("overlays all three overrides when all are set", () => {
    const styleFn = () => ({ fill: "red" })
    const out = mergeShapeStyle(styleFn, { stroke: "black", strokeWidth: 2, opacity: 0.5 })
    expect(out()).toEqual({ fill: "red", stroke: "black", strokeWidth: 2, opacity: 0.5 })
  })

  it("top-level override wins over style function return for matching keys", () => {
    const styleFn = () => ({ fill: "red", stroke: "blue" })
    const out = mergeShapeStyle(styleFn, { stroke: "green" })
    // Intent: explicit top-level stroke wins over per-datum stroke
    expect(out()).toEqual({ fill: "red", stroke: "green" })
  })

  it("preserves non-override fields from styleFn output", () => {
    const styleFn = () => ({ fill: "red", stroke: "blue", strokeDasharray: "2,4", customField: 42 })
    const out = mergeShapeStyle(styleFn, { stroke: "green" })
    expect(out()).toEqual({ fill: "red", stroke: "green", strokeDasharray: "2,4", customField: 42 })
  })

  it("threads arguments through to the underlying styleFn", () => {
    const styleFn = (d: { cat: string }) => ({ fill: d.cat === "A" ? "red" : "blue" })
    const out = mergeShapeStyle(styleFn, { stroke: "black" })
    expect(out({ cat: "A" })).toEqual({ fill: "red", stroke: "black" })
    expect(out({ cat: "B" })).toEqual({ fill: "blue", stroke: "black" })
  })

  it("returns a function producing just the overrides when styleFn is undefined", () => {
    const out = mergeShapeStyle(undefined, { stroke: "black", opacity: 0.3 })
    expect(out()).toEqual({ stroke: "black", opacity: 0.3 })
  })

  it("handles strokeWidth 0 as a valid override (not treated as unset)", () => {
    const styleFn = () => ({ fill: "red", strokeWidth: 2 })
    const out = mergeShapeStyle(styleFn, { strokeWidth: 0 })
    expect(out()).toEqual({ fill: "red", strokeWidth: 0 })
  })

  it("handles opacity 0 as a valid override (not treated as unset)", () => {
    const styleFn = () => ({ fill: "red", opacity: 1 })
    const out = mergeShapeStyle(styleFn, { opacity: 0 })
    expect(out()).toEqual({ fill: "red", opacity: 0 })
  })

  it("tolerates styleFn returning null/undefined", () => {
    const styleFn = (() => null) as unknown as () => Record<string, any>
    const out = mergeShapeStyle(styleFn, { stroke: "black" })
    expect(out()).toEqual({ stroke: "black" })
  })

  it("doesn't share the patch object across calls (avoids mutation leaks)", () => {
    const styleFn = () => ({ fill: "red" })
    const out = mergeShapeStyle(styleFn, { stroke: "black" })
    const first = out() as Record<string, any>
    first.stroke = "MUTATED"
    const second = out() as Record<string, any>
    expect(second.stroke).toBe("black")
  })
})
