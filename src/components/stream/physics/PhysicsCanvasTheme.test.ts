import { afterEach, describe, expect, it } from "vitest"
import { _resetCSSColorCacheForTest } from "../renderers/resolveCSSColor"
import {
  physicsCanvasColorWithAlpha,
  resolvePhysicsCanvasTheme
} from "./PhysicsCanvasTheme"

afterEach(() => {
  _resetCSSColorCacheForTest()
})

function canvasContext(): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas")
  document.body.appendChild(canvas)
  return canvas.getContext("2d") as CanvasRenderingContext2D
}

describe("physics canvas theme", () => {
  it("resolves Semiotic CSS variables for canvas-safe colors", () => {
    const ctx = canvasContext()
    try {
      ctx.canvas.style.setProperty("--semiotic-bg", "#101820")
      ctx.canvas.style.setProperty("--semiotic-primary", "#3366ff")
      ctx.canvas.style.setProperty("--semiotic-danger", "#cc2233")
      ctx.canvas.style.setProperty("--semiotic-text", "#eeeeee")
      ctx.canvas.style.setProperty("--semiotic-text-secondary", "#99aabb")

      const theme = resolvePhysicsCanvasTheme(ctx)
      expect(theme.background).toBe("#101820")
      expect(theme.primary).toBe("#3366ff")
      expect(theme.danger).toBe("#cc2233")
      expect(theme.text).toBe("#eeeeee")
      expect(theme.gutterFill).toBe("rgba(153, 170, 187, 0.14)")
      expect(theme.openWindowFill).toBe("rgba(51, 102, 255, 0.07)")
      expect(theme.closedWindowStroke).toBe("rgba(204, 34, 51, 0.55)")
    } finally {
      ctx.canvas.remove()
    }
  })

  it("falls back to docs-shell variables outside a ThemeProvider", () => {
    const ctx = canvasContext()
    try {
      ctx.canvas.style.setProperty("--surface-1", "#f5f7fb")
      ctx.canvas.style.setProperty("--accent", "#4455aa")
      ctx.canvas.style.setProperty("--viz-4", "#dd3344")
      ctx.canvas.style.setProperty("--text-secondary", "#667788")

      const theme = resolvePhysicsCanvasTheme(ctx)
      expect(theme.background).toBe("#f5f7fb")
      expect(theme.primary).toBe("#4455aa")
      expect(theme.danger).toBe("#dd3344")
      expect(theme.textSecondary).toBe("#667788")
    } finally {
      ctx.canvas.remove()
    }
  })

  it("converts hex and rgb colors to rgba opacity variants", () => {
    expect(physicsCanvasColorWithAlpha("#abc", 0.5)).toBe(
      "rgba(170, 187, 204, 0.5)"
    )
    expect(physicsCanvasColorWithAlpha("#112233", 0.25)).toBe(
      "rgba(17, 34, 51, 0.25)"
    )
    expect(physicsCanvasColorWithAlpha("rgb(1, 2, 3)", 0.2)).toBe(
      "rgba(1, 2, 3, 0.2)"
    )
    expect(physicsCanvasColorWithAlpha("rgba(1, 2, 3, 0.8)", 0.4)).toBe(
      "rgba(1, 2, 3, 0.4)"
    )
  })
})
