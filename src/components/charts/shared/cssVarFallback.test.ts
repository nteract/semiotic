import { describe, expect, it } from "vitest"
import { cssVarFallback, isCssVarPaint } from "./cssVarFallback"

describe("cssVarFallback", () => {
  it("returns the literal fallback of a var() paint", () => {
    expect(cssVarFallback("var(--semiotic-bg, #ffffff)")).toBe("#ffffff")
    expect(cssVarFallback("var(--a, rgba(0, 0, 0, 0.5))")).toBe("rgba(0, 0, 0, 0.5)")
  })

  it("follows nested fallbacks", () => {
    expect(cssVarFallback("var(--a, var(--b, #123))")).toBe("#123")
    expect(cssVarFallback("var(--a, var(--b))")).toBeUndefined()
  })

  it("returns undefined without a fallback and passes literals through", () => {
    expect(cssVarFallback("var(--a)")).toBeUndefined()
    expect(cssVarFallback("#abc")).toBe("#abc")
    expect(cssVarFallback("color-mix(in srgb, var(--a) 50%, white)")).toBeUndefined()
  })

  it("detects var() paints", () => {
    expect(isCssVarPaint("var(--a)")).toBe(true)
    expect(isCssVarPaint("#abc")).toBe(false)
    expect(isCssVarPaint(undefined)).toBe(false)
  })
})
