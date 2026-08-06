import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  resolveCurveFactory,
  resolveCanvasFill,
  resolveCanvasPaint,
  buildLinearFillGradient,
  paintNetworkFill,
  paintNetworkStroke,
} from "./canvasRenderHelpers"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"
import type { Style } from "../types"

describe("canvasRenderHelpers", () => {
  let ctx: CanvasRenderingContext2D
  beforeEach(() => {
    ctx = createMockCanvasContext() as object as CanvasRenderingContext2D
  })

  describe("resolveCurveFactory", () => {
    it("returns null for linear and undefined (single sentinel for the linear-fallback branch)", () => {
      expect(resolveCurveFactory(undefined)).toBeNull()
      expect(resolveCurveFactory("linear")).toBeNull()
    })

    it("returns a d3-shape factory for every supported curve token", () => {
      for (const token of [
        "monotoneX", "monotoneY", "cardinal", "catmullRom",
        "step", "stepBefore", "stepAfter", "basis", "natural",
      ] as const) {
        expect(resolveCurveFactory(token)).toBeTypeOf("function")
      }
    })
  })

  describe("resolveCanvasFill", () => {
    it("returns the fallback when fill is null or undefined", () => {
      expect(resolveCanvasFill(ctx, null, "#fallback")).toBe("#fallback")
      expect(resolveCanvasFill(ctx, undefined, "#fallback")).toBe("#fallback")
    })

    it("passes CanvasPattern values through untouched", () => {
      const pattern = {} as CanvasPattern
      expect(resolveCanvasFill(ctx, pattern, "#fallback")).toBe(pattern)
    })

    it("uses the inline var() fallback when CSS resolution can't reach a canvas", () => {
      // The mock context has no DOM `canvas` ancestor, so
      // `resolveCSSColor` short-circuits to `match[2]?.trim() || value`:
      // `var(--x, #abcdef)` resolves to `#abcdef`, but `var(--x)` returns
      // the original literal string (which is truthy and so is passed
      // through by `resolveCanvasFill` rather than swapped for the
      // helper's fallback). Matches the pre-extraction inline form
      // `(resolveCSSColor(ctx, X)) || fallback` — the fallback only
      // engages on a falsy result, not on a "still unresolved" string.
      expect(resolveCanvasFill(ctx, "var(--missing, #abcdef)", "#fallback")).toBe("#abcdef")
      expect(resolveCanvasFill(ctx, "var(--missing)", "#fallback")).toBe("var(--missing)")
    })
  })

  describe("resolveCanvasPaint", () => {
    it("uses the caller fallback for an unresolved CSS variable", () => {
      expect(resolveCanvasPaint(ctx, "var(--missing)", "#fallback")).toBe(
        "#fallback"
      )
    })

    it("resolves inline CSS fallbacks and preserves CanvasPattern values", () => {
      expect(
        resolveCanvasPaint(ctx, "var(--missing, #abcdef)", "#fallback")
      ).toBe("#abcdef")
      const pattern = {} as CanvasPattern
      expect(resolveCanvasPaint(ctx, pattern, "#fallback")).toBe(pattern)
    })
  })

  describe("buildLinearFillGradient", () => {
    it("returns null with fewer than 2 valid stops", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { stops: [{ offset: 0, color: "red" }] },
        "#000",
        0, 0, 0, 100,
      )
      expect(grad).toBeNull()
    })

    it("filters non-finite offsets before checking the 2-stop minimum", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { stops: [
          { offset: 0, color: "red" },
          { offset: NaN, color: "green" },
        ]},
        "#000",
        0, 0, 0, 100,
      )
      // Only one finite offset → null, not a partially-built gradient.
      expect(grad).toBeNull()
    })

    it("builds a gradient when at least 2 valid stops are present", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { stops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "blue" },
        ]},
        "#000",
        0, 0, 0, 100,
      )
      expect(grad).toBeTruthy()
    })

    it("builds an inherited-color opacity gradient", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { stops: [
          { offset: 0, opacity: 0.9 },
          { offset: 1, opacity: 0.1 },
        ] },
        "#4e79a7",
        0, 0, 0, 100,
      )
      expect(grad).toBeTruthy()
    })

    it("returns null for non-finite opacities (NaN-→broken-rgba protection)", () => {
      expect(
        buildLinearFillGradient(ctx, { stops: [
          { offset: 0, opacity: NaN },
          { offset: 1, opacity: 0 },
        ] }, "#000", 0, 0, 0, 100),
      ).toBeNull()
      expect(
        buildLinearFillGradient(ctx, { stops: [
          { offset: 0, opacity: 1 },
          { offset: 1, opacity: Infinity },
        ] }, "#000", 0, 0, 0, 100),
      ).toBeNull()
    })
  })

  describe("paintNetworkFill", () => {
    it("does not invoke paint when style.fill is unset", () => {
      const paint = vi.fn()
      paintNetworkFill(ctx, {} as Style, "#007bff", paint)
      expect(paint).not.toHaveBeenCalled()
    })

    it("resolves fillStyle from the fallback and invokes paint", () => {
      const paint = vi.fn()
      paintNetworkFill(ctx, { fill: "#ff0000" } as Style, "#007bff", paint)
      expect(paint).toHaveBeenCalledOnce()
      expect((ctx as unknown as { fillStyle: string }).fillStyle).toBe("#ff0000")
    })

    it("combines opacity × fillOpacity into globalAlpha when fillOpacity is set", () => {
      const paint = vi.fn()
      paintNetworkFill(ctx, { fill: "#ff0000", opacity: 0.5, fillOpacity: 0.4 } as Style, "#007bff", paint)
      expect((ctx as unknown as { globalAlpha: number }).globalAlpha).toBeCloseTo(0.2)
    })

    it("leaves globalAlpha untouched when fillOpacity is unset", () => {
      const mutableCtx = ctx as unknown as { globalAlpha: number }
      mutableCtx.globalAlpha = 0.75
      const paint = vi.fn()
      paintNetworkFill(ctx, { fill: "#ff0000", opacity: 0.5 } as Style, "#007bff", paint)
      expect(mutableCtx.globalAlpha).toBe(0.75)
    })
  })

  describe("paintNetworkStroke", () => {
    it("does not invoke paint when style.stroke is unset", () => {
      const paint = vi.fn()
      paintNetworkStroke(ctx, {} as Style, paint)
      expect(paint).not.toHaveBeenCalled()
    })

    it("does not invoke paint when style.stroke is \"none\" (the stroke=\"none\" canvas trap)", () => {
      // `strokeStyle = "none"` is rejected by a real canvas context, which
      // silently keeps the default black and still strokes — regression
      // coverage for that trap: "none" must short-circuit before paint().
      const paint = vi.fn()
      paintNetworkStroke(ctx, { stroke: "none" } as Style, paint)
      expect(paint).not.toHaveBeenCalled()
    })

    it("resolves strokeStyle/lineWidth/globalAlpha and invokes paint for a real color", () => {
      const paint = vi.fn()
      paintNetworkStroke(ctx, { stroke: "#00ff00", strokeWidth: 3, opacity: 0.6 } as Style, paint)
      expect(paint).toHaveBeenCalledOnce()
      const mutableCtx = ctx as unknown as { strokeStyle: string; lineWidth: number; globalAlpha: number }
      expect(mutableCtx.strokeStyle).toBe("#00ff00")
      expect(mutableCtx.lineWidth).toBe(3)
      expect(mutableCtx.globalAlpha).toBe(0.6)
    })

    it("defaults lineWidth to 1 and globalAlpha to 1 when unset", () => {
      const paint = vi.fn()
      paintNetworkStroke(ctx, { stroke: "#00ff00" } as Style, paint)
      const mutableCtx = ctx as unknown as { lineWidth: number; globalAlpha: number }
      expect(mutableCtx.lineWidth).toBe(1)
      expect(mutableCtx.globalAlpha).toBe(1)
    })

    it("combines opacity × strokeOpacity for a translucent network border", () => {
      const paint = vi.fn()
      paintNetworkStroke(
        ctx,
        { stroke: "#00ff00", opacity: 0.5, strokeOpacity: 0.4 } as Style,
        paint,
      )
      expect((ctx as unknown as { globalAlpha: number }).globalAlpha).toBeCloseTo(0.2)
    })
  })
})
