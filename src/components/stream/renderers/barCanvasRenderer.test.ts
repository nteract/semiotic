import { vi } from "vitest"
import { barCanvasRenderer } from "./barCanvasRenderer"
import { scaleLinear } from "d3-scale"
import type { RectSceneNode, SceneNode, StreamScales, StreamLayout } from "../types"
import { createMockCanvasContext as _createCtx } from "../../../test-utils/canvasMock"

function createMockCanvasContext() {
  return _createCtx() as unknown as CanvasRenderingContext2D
}

function makeScales(): StreamScales {
  return {
    x: scaleLinear().domain([0, 100]).range([0, 500]),
    y: scaleLinear().domain([0, 100]).range([300, 0])
  }
}

function makeLayout(): StreamLayout {
  return { width: 500, height: 300 }
}

function makeRectNode(overrides: Partial<RectSceneNode> = {}): RectSceneNode {
  return {
    type: "rect",
    x: 10,
    y: 20,
    w: 50,
    h: 100,
    style: { fill: "#007bff" },
    datum: {},
    ...overrides
  }
}

describe("barCanvasRenderer", () => {
  it("renders a bar with correct fill and dimensions", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({ style: { fill: "#e41a1c" } })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fillStyle).toBe("#e41a1c")
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 50, 100)
  })

  it("uses default fill when none specified", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({ style: {} })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fillStyle).toBe("#007bff")
  })

  it("applies stroke when style.stroke is set", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({
      style: { fill: "#007bff", stroke: "#333", strokeWidth: 2 }
    })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeStyle).toBe("#333")
    expect(ctx.lineWidth).toBe(2)
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 50, 100)
  })

  it("uses default strokeWidth of 1 when not specified", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({ style: { fill: "#007bff", stroke: "#000" } })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.lineWidth).toBe(1)
  })

  it("does not stroke when no stroke style is set", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({ style: { fill: "#007bff" } })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })

  it("sets globalAlpha from style.opacity", () => {
    const ctx = createMockCanvasContext()
    const alphaValues: number[] = []
    let _alpha = 1
    Object.defineProperty(ctx, "globalAlpha", {
      get: () => _alpha,
      set: (v: number) => {
        _alpha = v
        alphaValues.push(v)
      }
    })

    const node = makeRectNode({ style: { fill: "#007bff", opacity: 0.4 } })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues[0]).toBe(0.4)
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })

  it("renders pulse overlay when _pulseIntensity > 0", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({
      _pulseIntensity: 0.6,
      _pulseColor: "rgba(0,255,0,0.6)"
    })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // fillRect called twice: once for the bar, once for the pulse overlay
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
    // Both at same position/dimensions
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 50, 100)
  })

  it("uses default pulse color when _pulseColor is absent", () => {
    const ctx = createMockCanvasContext()
    const fillStyles: string[] = []
    const origFillRect = ctx.fillRect as ReturnType<typeof vi.fn>
    origFillRect.mockImplementation(() => {
      fillStyles.push(ctx.fillStyle as string)
    })

    const node = makeRectNode({ _pulseIntensity: 1.0 })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Second fillRect call should use the default pulse color
    expect(fillStyles[1]).toBe("rgba(255,255,255,0.6)")
  })

  it("does not render pulse overlay when _pulseIntensity is 0", () => {
    const ctx = createMockCanvasContext()
    const node = makeRectNode({ _pulseIntensity: 0 })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Only one fillRect for the bar itself
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
  })

  it("handles empty node array without crashing", () => {
    const ctx = createMockCanvasContext()

    barCanvasRenderer(ctx, [], makeScales(), makeLayout())

    expect(ctx.fillRect).not.toHaveBeenCalled()
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })

  it("filters out non-rect nodes", () => {
    const ctx = createMockCanvasContext()
    const pointNode: SceneNode = {
      type: "point",
      x: 0, y: 0, r: 5,
      style: { fill: "#ccc" },
      datum: {}
    }

    barCanvasRenderer(ctx, [pointNode], makeScales(), makeLayout())

    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("renders multiple bars", () => {
    const ctx = createMockCanvasContext()
    const nodes = [
      makeRectNode({ x: 0, y: 0, w: 10, h: 20 }),
      makeRectNode({ x: 15, y: 0, w: 10, h: 40 }),
      makeRectNode({ x: 30, y: 0, w: 10, h: 60 })
    ]

    barCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    expect(ctx.fillRect).toHaveBeenCalledTimes(3)
  })

  it("resets globalAlpha to 1 after each node", () => {
    const ctx = createMockCanvasContext()
    const alphaValues: number[] = []
    let _alpha = 1
    Object.defineProperty(ctx, "globalAlpha", {
      get: () => _alpha,
      set: (v: number) => {
        _alpha = v
        alphaValues.push(v)
      }
    })

    const nodes = [
      makeRectNode({ style: { fill: "#f00", opacity: 0.3 } }),
      makeRectNode({ style: { fill: "#0f0", opacity: 0.7 } })
    ]

    barCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    expect(alphaValues).toEqual([0.3, 1, 0.7, 1])
  })

  it("handles icon mode by calling save/clip/restore", () => {
    const ctx = createMockCanvasContext()
    const fakeIcon = {} as HTMLImageElement
    const node = makeRectNode({
      w: 30,
      h: 100,
      style: { icon: fakeIcon }
    })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.save).toHaveBeenCalled()
    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.rect).toHaveBeenCalled()
    expect(ctx.clip).toHaveBeenCalled()
    expect(ctx.restore).toHaveBeenCalled()
    // In icon mode, fillRect should not be called for the bar fill
    // (only for pulse if present)
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("handles decay via reduced style.opacity", () => {
    const ctx = createMockCanvasContext()
    const alphaValues: number[] = []
    let _alpha = 1
    Object.defineProperty(ctx, "globalAlpha", {
      get: () => _alpha,
      set: (v: number) => {
        _alpha = v
        alphaValues.push(v)
      }
    })

    const node = makeRectNode({ style: { fill: "#007bff", opacity: 0.15 } })

    barCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues[0]).toBe(0.15)
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })

  describe("gradientFill", () => {
    it("switches fillStyle to a CanvasGradient when fillGradient + colorStops are set", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        roundedEdge: "top",
        fillGradient: { colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      expect(ctx.createLinearGradient).toHaveBeenCalled()
      // fillStyle is the gradient object returned by the mock (an object
      // with addColorStop), not a color string.
      expect(typeof ctx.fillStyle).toBe("object")
    })

    it("falls back to solid fill when fillGradient has < 2 colorStops", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        style: { fill: "#abcdef" },
        roundedEdge: "top",
        fillGradient: { colorStops: [{ offset: 0, color: "#ff0000" }] },
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      expect(ctx.fillStyle).toBe("#abcdef")
    })

    it("vertical positive bar (roundedEdge=top): gradient runs top → bottom", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        x: 10, y: 20, w: 50, h: 100,
        roundedEdge: "top",
        fillGradient: { colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      // tip (top) at y=20, base at y=120 — gradient along the y-axis only.
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(10, 20, 10, 120)
    })

    it("vertical negative bar (roundedEdge=bottom): gradient runs bottom → top", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        x: 10, y: 20, w: 50, h: 100,
        roundedEdge: "bottom",
        fillGradient: { colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      // Negative bars point downward, so tip is at y+h and base at y.
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(10, 120, 10, 20)
    })

    it("horizontal positive bar (roundedEdge=right): gradient runs right → left", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        x: 10, y: 20, w: 80, h: 20,
        roundedEdge: "right",
        fillGradient: { colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      // Tip (right) at x+w=90, base at x=10 — gradient along x-axis only.
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(90, 20, 10, 20)
    })

    it("horizontal negative bar (roundedEdge=left): gradient runs left → right", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        x: 10, y: 20, w: 80, h: 20,
        roundedEdge: "left",
        fillGradient: { colorStops: [
          { offset: 0, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      expect(ctx.createLinearGradient).toHaveBeenCalledWith(10, 20, 90, 20)
    })

    it("returns null when filtering NaN offsets leaves < 2 valid stops", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        style: { fill: "#abcdef" },
        roundedEdge: "top",
        // Two configured stops, but one has a NaN offset → only 1 survives.
        fillGradient: { colorStops: [
          { offset: NaN, color: "#ff0000" },
          { offset: 1, color: "#0000ff" },
        ]},
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      // Falls back to the solid node.style.fill — no gradient created.
      expect(ctx.createLinearGradient).not.toHaveBeenCalled()
      expect(ctx.fillStyle).toBe("#abcdef")
    })

    it("opacity-form gradient works through the rounded-corner path too", () => {
      const ctx = createMockCanvasContext()
      const node = makeRectNode({
        style: { fill: "#3366cc" },
        roundedTop: 6,
        roundedEdge: "top",
        fillGradient: { topOpacity: 0.8, bottomOpacity: 0.05 },
      })
      barCanvasRenderer(ctx, [node], makeScales(), makeLayout())
      expect(ctx.createLinearGradient).toHaveBeenCalled()
    })
  })
})
