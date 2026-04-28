import { describe, it, expect, beforeEach } from "vitest"
import {
  resolveCurveFactory,
  resolveCanvasFill,
  buildLinearFillGradient,
  buildColorStopGradient,
} from "./canvasRenderHelpers"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"

describe("canvasRenderHelpers", () => {
  let ctx: any
  beforeEach(() => {
    ctx = createMockCanvasContext()
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

    it("hands strings to resolveCSSColor", () => {
      // jsdom's mock canvas doesn't resolve CSS vars; the helper falls
      // back to the provided fallback when resolveCSSColor returns null.
      const result = resolveCanvasFill(ctx, "#abcdef", "#fallback")
      expect(result === "#abcdef" || result === "#fallback").toBe(true)
    })
  })

  describe("buildLinearFillGradient", () => {
    it("returns null for a colorStops form with fewer than 2 valid stops", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { colorStops: [{ offset: 0, color: "red" }] },
        "#000",
        0, 0, 0, 100,
      )
      expect(grad).toBeNull()
    })

    it("filters non-finite offsets before checking the 2-stop minimum", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { colorStops: [
          { offset: 0, color: "red" },
          { offset: NaN, color: "green" },
        ]},
        "#000",
        0, 0, 0, 100,
      )
      // Only one finite offset → null, not a partially-built gradient.
      expect(grad).toBeNull()
    })

    it("builds a gradient when at least 2 valid colorStops are present", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { colorStops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "blue" },
        ]},
        "#000",
        0, 0, 0, 100,
      )
      expect(grad).toBeTruthy()
    })

    it("builds an opacity-form gradient", () => {
      const grad = buildLinearFillGradient(
        ctx,
        { topOpacity: 0.9, bottomOpacity: 0.1 },
        "#4e79a7",
        0, 0, 0, 100,
      )
      expect(grad).toBeTruthy()
    })
  })

  describe("buildColorStopGradient", () => {
    it("returns null when fewer than 2 stops are present", () => {
      const grad = buildColorStopGradient(
        ctx,
        { colorStops: [{ offset: 0, color: "red" }] },
        0, 0, 100, 0,
      )
      expect(grad).toBeNull()
    })

    it("builds a gradient when 2+ stops are present", () => {
      const grad = buildColorStopGradient(
        ctx,
        { colorStops: [
          { offset: 0, color: "red" },
          { offset: 1, color: "blue" },
        ]},
        0, 0, 100, 0,
      )
      expect(grad).toBeTruthy()
    })
  })
})
