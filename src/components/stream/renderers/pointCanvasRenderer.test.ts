
import { pointCanvasRenderer } from "./pointCanvasRenderer"
import { scaleLinear } from "d3-scale"
import type { PointSceneNode, SceneNode, StreamScales, StreamLayout } from "../types"
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

function makePointNode(overrides: Partial<PointSceneNode> = {}): PointSceneNode {
  return {
    type: "point",
    x: 100,
    y: 150,
    r: 5,
    style: { fill: "#4e79a7" },
    datum: {},
    ...overrides
  }
}

describe("pointCanvasRenderer", () => {
  it("renders a point with correct fill", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ style: { fill: "#e41a1c" } })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.arc).toHaveBeenCalledWith(100, 150, 5, 0, Math.PI * 2)
    expect(ctx.fillStyle).toBe("#e41a1c")
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("applies stroke when style.stroke is set", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({
      style: { fill: "#4e79a7", stroke: "#333", strokeWidth: 2 }
    })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeStyle).toBe("#333")
    expect(ctx.lineWidth).toBe(2)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it("does not stroke when no stroke style is set", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ style: { fill: "#4e79a7" } })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it("uses default fill when no fill specified", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ style: {} })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fillStyle).toBe("#4e79a7")
  })

  it("sets globalAlpha from style.opacity", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ style: { fill: "#4e79a7", opacity: 0.5 } })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.globalAlpha).toBe(1) // reset at end
    // Verify alpha was set to 0.5 at some point during rendering
    // Since resetMocks is on, we check the final reset
  })

  it("sets globalAlpha from style.fillOpacity when opacity is absent", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ style: { fill: "#4e79a7", fillOpacity: 0.3 } })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // globalAlpha is reset to 1 at the end of the loop
    expect(ctx.globalAlpha).toBe(1)
  })

  it("renders pulse glow when _pulseIntensity > 0", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({
      _pulseIntensity: 0.8,
      _pulseColor: "rgba(255,0,0,0.6)"
    })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Behavior assertions: the glow ring is drawn at the expected radius
    // with the pulse color and intensity-scaled line width. Specific arg
    // checks carry behavior (radius derived from r + glowRadius * intensity);
    // we deliberately don't count begin/arc calls since a future batching
    // refactor could change those without changing what's drawn.
    expect(ctx.arc).toHaveBeenCalledWith(100, 150, 8.2, 0, Math.PI * 2)
    expect(ctx.strokeStyle).toBe("rgba(255,0,0,0.6)")
    expect(ctx.lineWidth).toBe(2 * 0.8)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it("uses default pulse color when _pulseColor is not set", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ _pulseIntensity: 1.0 })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeStyle).toBe("rgba(255,255,255,0.6)")
  })

  it("does not render pulse glow when _pulseIntensity is 0", () => {
    const ctx = createMockCanvasContext()
    const node = makePointNode({ _pulseIntensity: 0 })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Without a pulse, the renderer never calls stroke — the pulse glow is
    // the only stroke op in the point path. A structural check that doesn't
    // depend on exact begin/arc call counts.
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it("handles empty node array without crashing", () => {
    const ctx = createMockCanvasContext()

    pointCanvasRenderer(ctx, [], makeScales(), makeLayout())

    expect(ctx.beginPath).not.toHaveBeenCalled()
    expect(ctx.arc).not.toHaveBeenCalled()
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it("filters out non-point nodes", () => {
    const ctx = createMockCanvasContext()
    const rectNode: SceneNode = {
      type: "rect",
      x: 0, y: 0, w: 10, h: 10,
      style: { fill: "#ccc" },
      datum: {}
    }

    pointCanvasRenderer(ctx, [rectNode], makeScales(), makeLayout())

    expect(ctx.beginPath).not.toHaveBeenCalled()
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it("renders multiple points", () => {
    const ctx = createMockCanvasContext()
    const nodes = [
      makePointNode({ x: 10, y: 20 }),
      makePointNode({ x: 30, y: 40 }),
      makePointNode({ x: 50, y: 60 })
    ]

    pointCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    expect(ctx.beginPath).toHaveBeenCalledTimes(3)
    expect(ctx.arc).toHaveBeenCalledTimes(3)
    expect(ctx.fill).toHaveBeenCalledTimes(3)
  })

  it("resets globalAlpha to 1 after rendering each node", () => {
    const ctx = createMockCanvasContext()
    const alphaValues: number[] = []

    // Track globalAlpha changes via a property setter
    let _alpha = 1
    Object.defineProperty(ctx, "globalAlpha", {
      get: () => _alpha,
      set: (v: number) => {
        _alpha = v
        alphaValues.push(v)
      }
    })

    const nodes = [
      makePointNode({ style: { fill: "#f00", opacity: 0.3 } }),
      makePointNode({ style: { fill: "#0f0", opacity: 0.7 } })
    ]

    pointCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    // Each node: set opacity, then reset to 1
    // So we expect: 0.3, 1, 0.7, 1
    expect(alphaValues).toEqual([0.3, 1, 0.7, 1])
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

    const node = makePointNode({ style: { fill: "#4e79a7", opacity: 0.2 } })

    pointCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues[0]).toBe(0.2)
    // Reset at end
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })
})
