import { describe, it, expect, beforeEach } from "vitest"
import {
  resolveCurveFactory,
  resolveCanvasFill,
  buildLinearFillGradient,
  buildColorStopGradient,
} from "./canvasRenderHelpers"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"

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

  describe("buildColorStopGradient", () => {
    it("returns null when fewer than 2 stops are present", () => {
      const grad = buildColorStopGradient(
        ctx,
        { stops: [{ offset: 0, color: "red" }] },
        "#000",
        0, 0, 100, 0,
      )
      expect(grad).toBeNull()
    })

    it("builds a gradient when 2+ stops are present", () => {
      const grad = buildColorStopGradient(
        ctx,
        { stops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "blue" },
        ]},
        "#000", 0, 0, 100, 0,
      )
      expect(grad).toBeTruthy()
    })

    it("filters non-finite offsets before the 2-stop minimum (avoids addColorStop IndexSizeError)", () => {
      const grad = buildColorStopGradient(
        ctx,
        { stops: [
          { offset: 0, color: "red" },
          { offset: NaN, color: "green" },
        ]},
        "#000", 0, 0, 100, 0,
      )
      expect(grad).toBeNull()
    })
  })
})
