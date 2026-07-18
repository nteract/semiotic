import { describe, it, expect, beforeEach } from "vitest"
import { resolveCSSColor, clearCSSColorCache, _resetCSSColorCacheForTest } from "./resolveCSSColor"

function makeCtx(varName?: string, value?: string): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas")
  if (varName && value !== undefined) {
    canvas.style.setProperty(varName, value)
  }
  document.body.appendChild(canvas)
  return { canvas } as unknown as CanvasRenderingContext2D
}

describe("resolveCSSColor", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    _resetCSSColorCacheForTest()
  })

  it("returns non-var values unchanged", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, "#ff0000")).toBe("#ff0000")
    expect(resolveCSSColor(ctx, "rgb(0,0,0)")).toBe("rgb(0,0,0)")
  })

  it("returns undefined for undefined input", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, undefined)).toBe(undefined)
  })

  it("resolves var() to computed value", () => {
    const ctx = makeCtx("--my-color", "#ff0000")
    expect(resolveCSSColor(ctx, "var(--my-color)")).toBe("#ff0000")
  })

  it("uses fallback when var is not defined", () => {
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, "var(--undefined-var, #00ff00)")).toBe("#00ff00")
  })

  it("caches resolved values across repeat calls within the same version", () => {
    const ctx = makeCtx("--color", "#abcdef")
    const first = resolveCSSColor(ctx, "var(--color)")
    // Mutate the underlying value — cache should still return original
    ctx.canvas.style.setProperty("--color", "#000000")
    const second = resolveCSSColor(ctx, "var(--color)")
    expect(first).toBe("#abcdef")
    expect(second).toBe("#abcdef")
  })

  it("invalidates cache when clearCSSColorCache is called", () => {
    const ctx = makeCtx("--color", "#abcdef")
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#abcdef")
    ctx.canvas.style.setProperty("--color", "#123456")
    clearCSSColorCache()
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#123456")
  })

  it("isolates caches between canvases", () => {
    const ctxA = makeCtx("--c", "#aaaaaa")
    const ctxB = makeCtx("--c", "#bbbbbb")
    expect(resolveCSSColor(ctxA, "var(--c)")).toBe("#aaaaaa")
    expect(resolveCSSColor(ctxB, "var(--c)")).toBe("#bbbbbb")
  })

  it("invalidates all canvases at once when cleared", () => {
    const ctxA = makeCtx("--c", "#aaaaaa")
    const ctxB = makeCtx("--c", "#bbbbbb")
    resolveCSSColor(ctxA, "var(--c)")
    resolveCSSColor(ctxB, "var(--c)")
    ctxA.canvas.style.setProperty("--c", "#111111")
    ctxB.canvas.style.setProperty("--c", "#222222")
    clearCSSColorCache()
    expect(resolveCSSColor(ctxA, "var(--c)")).toBe("#111111")
    expect(resolveCSSColor(ctxB, "var(--c)")).toBe("#222222")
  })

  it("clearCSSColorCache(canvas) accepts a canvas arg for backward compat", () => {
    const ctx = makeCtx("--color", "#abcdef")
    resolveCSSColor(ctx, "var(--color)")
    ctx.canvas.style.setProperty("--color", "#fedcba")
    clearCSSColorCache(ctx.canvas)
    expect(resolveCSSColor(ctx, "var(--color)")).toBe("#fedcba")
  })

  it("calls getComputedStyle once per (canvas, var, version) triple", () => {
    const ctx = makeCtx("--color", "#abcdef")
    const orig = window.getComputedStyle
    let calls = 0
    window.getComputedStyle = ((el: Element) => {
      calls++
      return orig.call(window, el)
    }) as typeof window.getComputedStyle

    try {
      resolveCSSColor(ctx, "var(--color)")
      resolveCSSColor(ctx, "var(--color)")
      resolveCSSColor(ctx, "var(--color)")
      expect(calls).toBe(1)
      clearCSSColorCache()
      resolveCSSColor(ctx, "var(--color)")
      expect(calls).toBe(2)
    } finally {
      window.getComputedStyle = orig
    }
  })

  it("falls back to fallback color when ctx.canvas is missing", () => {
    const ctx = { canvas: null as unknown as HTMLCanvasElement } as CanvasRenderingContext2D
    expect(resolveCSSColor(ctx, "var(--missing, #defabc)")).toBe("#defabc")
  })

  it("resolves a nested var() fallback to its innermost color", () => {
    // The Treemap cell-border stroke: both custom props unset → #fff. The old
    // regex truncated the fallback at the first ")", handing the canvas an
    // unparseable string that painted black instead.
    const ctx = makeCtx()
    expect(resolveCSSColor(ctx, "var(--semiotic-cell-border, var(--semiotic-border, #fff))")).toBe("#fff")
  })

  it("uses the inner var when the outer is unset but the inner is defined", () => {
    const ctx = makeCtx("--semiotic-border", "#cccccc")
    expect(resolveCSSColor(ctx, "var(--semiotic-cell-border, var(--semiotic-border, #fff))")).toBe("#cccccc")
  })

  it("resolves a nested var() fallback with ctx.canvas missing", () => {
    const ctx = { canvas: null as unknown as HTMLCanvasElement } as CanvasRenderingContext2D
    expect(resolveCSSColor(ctx, "var(--a, var(--b, #fff))")).toBe("#fff")
  })
})
