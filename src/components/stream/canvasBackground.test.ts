import { describe, expect, it, vi } from "vitest"
import { paintCanvasBackground } from "./canvasBackground"

function mockCtx(overrides: Partial<CanvasRenderingContext2D> = {}) {
  return {
    fillStyle: "",
    fillRect: vi.fn(),
    canvas: document.createElement("canvas"),
    ...overrides
  } as unknown as CanvasRenderingContext2D
}

describe("paintCanvasBackground", () => {
  it("fills an explicit background color", () => {
    const ctx = mockCtx()
    expect(
      paintCanvasBackground(ctx, {
        background: "#112233",
        width: 100,
        height: 50
      })
    ).toBe(true)
    expect(ctx.fillStyle).toBe("#112233")
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 100, 50)
  })

  it("skips when background is transparent", () => {
    const ctx = mockCtx()
    expect(
      paintCanvasBackground(ctx, {
        background: "transparent",
        width: 10,
        height: 10
      })
    ).toBe(false)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("skips when backgroundGraphics are present", () => {
    const ctx = mockCtx()
    expect(
      paintCanvasBackground(ctx, {
        background: "#000",
        hasBackgroundGraphics: true,
        width: 10,
        height: 10
      })
    ).toBe(false)
  })

  it("uses theme background when prop is unset", () => {
    const ctx = mockCtx()
    expect(
      paintCanvasBackground(ctx, {
        themeBackground: "#fafafa",
        width: 20,
        height: 20,
        x: -5,
        y: -5
      })
    ).toBe(true)
    expect(ctx.fillStyle).toBe("#fafafa")
    expect(ctx.fillRect).toHaveBeenCalledWith(-5, -5, 20, 20)
  })

  it("ignores transparent theme fallback", () => {
    const ctx = mockCtx()
    expect(
      paintCanvasBackground(ctx, {
        themeBackground: "transparent",
        width: 10,
        height: 10
      })
    ).toBe(false)
  })
})
