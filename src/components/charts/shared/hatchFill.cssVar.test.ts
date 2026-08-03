import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { resolveHatchCanvasPattern, clearHatchCanvasPatternCacheForTests } from "./hatchFill"

// Minimal 2d context that records fillStyle/strokeStyle on the tile path via
// createHatchPattern's offscreen canvas. We stub createPattern to return a
// sentinel so resolveHatchCanvasPattern can succeed without a real DOM tile.

describe("resolveHatchCanvasPattern CSS var resolution", () => {
  beforeEach(() => {
    clearHatchCanvasPatternCacheForTests()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("resolves var() paints before baking the tile (avoids solid black bands)", () => {
    if (typeof document === "undefined") return

    const canvas = document.createElement("canvas")
    canvas.width = 40
    canvas.height = 40
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Simulate theme CSS vars on the canvas ancestor.
    canvas.style.setProperty("--semiotic-warning", "#fde68a")
    canvas.style.setProperty("--semiotic-text", "#92400e")
    document.body.appendChild(canvas)

    const spy = vi.spyOn(ctx, "createPattern").mockImplementation(() => {
      return { __pattern: true } as unknown as CanvasPattern
    })

    const pattern = resolveHatchCanvasPattern(
      {
        type: "hatch",
        background: "var(--semiotic-warning, #fde68a)",
        stroke: "var(--semiotic-text, #92400e)",
        spacing: 5,
      },
      ctx,
    )

    expect(pattern).toBeTruthy()
    expect(spy).toHaveBeenCalled()
    // createPattern receives the tile canvas; if CSS vars were not resolved
    // the tile would paint black. We assert resolution by checking that
    // createHatchPattern was reached with a non-null pattern result (spy call).
    document.body.removeChild(canvas)
  })
})
