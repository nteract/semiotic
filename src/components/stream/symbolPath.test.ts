import { describe, expect, it } from "vitest"
import { symbolPathString } from "./symbolPath"

describe("symbolPathString", () => {
  it("falls back to a circle for inherited object-property names", () => {
    const circle = symbolPathString("circle", 64)

    expect(symbolPathString("constructor", 64)).toBe(circle)
    expect(symbolPathString("toString", 64)).toBe(circle)
    expect(symbolPathString("__proto__", 64)).toBe(circle)
  })
})
