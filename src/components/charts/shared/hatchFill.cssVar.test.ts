import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createMockCanvasContext, type CanvasContextMock } from "../../../test-utils/canvasMock"
import { resolveHatchCanvasPattern, type HatchFill } from "./hatchFill"
import { clearCSSColorCache } from "../../stream/renderers/resolveCSSColor"
import { barFunnelHatchRenderer } from "../../stream/renderers/barFunnelCanvasRenderer"
import type { OrdinalLayout, OrdinalScales, RectSceneNode } from "../../stream/ordinalTypes"

const hatch: HatchFill = {
  type: "hatch",
  background: "var(--semiotic-warning, #fde68a)",
  stroke: "var(--semiotic-text, #92400e)",
  spacing: 5
}

function targetContext() {
  const canvas = document.createElement("canvas")
  canvas.style.setProperty("--semiotic-warning", "#ffd166")
  canvas.style.setProperty("--semiotic-text", "#403300")
  document.body.appendChild(canvas)
  const ctx = createMockCanvasContext(canvas) as unknown as CanvasRenderingContext2D
  const pattern: CanvasPattern = { setTransform: vi.fn() }
  const createPattern = vi.spyOn(ctx, "createPattern").mockReturnValue(pattern)
  return { ctx, pattern, createPattern }
}

describe("canvas hatch lifecycle and CSS colors", () => {
  let tile: CanvasContextMock
  beforeEach(() => {
    tile = createMockCanvasContext()
    tile.fillRect = vi.fn(() => ({ fill: tile.fillStyle, opacity: tile.globalAlpha }))
    vi.stubGlobal("OffscreenCanvas", undefined)
    vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(tile as unknown as CanvasRenderingContext2D)
  })
  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("paints resolved CSS colors into the tile and reuses it until the theme changes", () => {
    const { ctx, pattern, createPattern } = targetContext()
    expect(resolveHatchCanvasPattern(hatch, ctx)).toBe(pattern)
    expect(tile.fillRect).toHaveNthReturnedWith(1, { fill: "#ffd166", opacity: 1 })
    expect(tile.fillRect).toHaveNthReturnedWith(2, { fill: "#403300", opacity: 1 })
    expect(resolveHatchCanvasPattern({ ...hatch }, ctx)).toBe(pattern)
    expect(createPattern).toHaveBeenCalledOnce()

    ctx.canvas.style.setProperty("--semiotic-warning", "#aabbcc")
    clearCSSColorCache()
    resolveHatchCanvasPattern(hatch, ctx)
    expect(createPattern).toHaveBeenCalledTimes(2)
    expect(tile.fillRect).toHaveNthReturnedWith(3, { fill: "#aabbcc", opacity: 1 })
  })

  it("keeps cached patterns with their owning canvas context", () => {
    const first = targetContext()
    const second = targetContext()
    expect(resolveHatchCanvasPattern(hatch, first.ctx)).toBe(first.pattern)
    expect(resolveHatchCanvasPattern(hatch, second.ctx)).toBe(second.pattern)
    expect(second.createPattern).toHaveBeenCalledOnce()
  })

  it("retries after pattern creation is unavailable instead of caching the failure", () => {
    const { ctx, pattern, createPattern } = targetContext()
    createPattern.mockReturnValueOnce(null)
    expect(resolveHatchCanvasPattern(hatch, ctx)).toBeNull()
    expect(resolveHatchCanvasPattern(hatch, ctx)).toBe(pattern)
    expect(createPattern).toHaveBeenCalledTimes(2)
  })

  it.each([true, false])("resolves CSS-variable bar-funnel fills (pattern available: %s)", (available) => {
    const { ctx, pattern, createPattern } = targetContext()
    if (!available) createPattern.mockReturnValue(null)
    const node: RectSceneNode = {
      type: "rect", x: 0, y: 0, w: 100, h: 20,
      style: { fill: "var(--semiotic-warning, #fde68a)" },
      datum: { __barFunnelIsDropoff: true }
    }
    barFunnelHatchRenderer(ctx, [node], {} as OrdinalScales, {} as OrdinalLayout)
    expect(tile.fillRect).toHaveNthReturnedWith(1, { fill: "#ffd166", opacity: 1 })
    expect(ctx.fillStyle).toBe(available ? pattern : "#ffd166")
    expect(ctx.fill).toHaveBeenCalledOnce()
  })

  it("uses the border fallback for an empty bar-funnel fill", () => {
    const { ctx } = targetContext()
    ctx.canvas.style.setProperty("--semiotic-border", "#123456")
    const node: RectSceneNode = {
      type: "rect", x: 0, y: 0, w: 100, h: 20,
      style: { fill: "" }, datum: { __barFunnelIsDropoff: true }
    }
    barFunnelHatchRenderer(ctx, [node], {} as OrdinalScales, {} as OrdinalLayout)
    expect(tile.fillRect).toHaveNthReturnedWith(1, { fill: "#123456", opacity: 1 })
  })
})
