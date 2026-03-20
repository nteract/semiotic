import { vi } from "vitest"
import { heatmapCanvasRenderer } from "./heatmapCanvasRenderer"
import { scaleLinear } from "d3-scale"
import type { HeatcellSceneNode, SceneNode, StreamScales, StreamLayout } from "../types"
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

function makeHeatcellNode(overrides: Partial<HeatcellSceneNode> = {}): HeatcellSceneNode {
  return {
    type: "heatcell",
    x: 10,
    y: 20,
    w: 25,
    h: 15,
    fill: "#0868ac",
    datum: {},
    ...overrides
  }
}

describe("heatmapCanvasRenderer", () => {
  it("renders a heatcell with correct fill and dimensions", () => {
    const ctx = createMockCanvasContext()
    const node = makeHeatcellNode({ fill: "#e41a1c" })

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fillStyle).toBe("#e41a1c")
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 25, 15)
  })

  it("renders cell border with white stroke", () => {
    const ctx = createMockCanvasContext()
    const node = makeHeatcellNode()

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeStyle).toBe("#fff")
    expect(ctx.lineWidth).toBe(1)
    expect(ctx.strokeRect).toHaveBeenCalledWith(10, 20, 25, 15)
  })

  it("sets globalAlpha from style.opacity (decay)", () => {
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

    const node = makeHeatcellNode()
    node.style = { opacity: 0.4 }

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues[0]).toBe(0.4)
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })

  it("renders pulse overlay when _pulseIntensity > 0", () => {
    const ctx = createMockCanvasContext()
    const node = makeHeatcellNode({
      _pulseIntensity: 0.5,
      _pulseColor: "rgba(255,0,0,0.6)"
    })

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // fillRect: once for the cell, once for the pulse overlay
    expect(ctx.fillRect).toHaveBeenCalledTimes(2)
    // strokeRect: once for the cell border
    expect(ctx.strokeRect).toHaveBeenCalledTimes(1)
  })

  it("uses default pulse color when _pulseColor is absent", () => {
    const ctx = createMockCanvasContext()
    const fillStyles: string[] = []
    const origFillRect = ctx.fillRect as ReturnType<typeof vi.fn>
    origFillRect.mockImplementation(() => {
      fillStyles.push(ctx.fillStyle as string)
    })

    const node = makeHeatcellNode({ _pulseIntensity: 1.0 })

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Second fillRect call uses pulse color
    expect(fillStyles[1]).toBe("rgba(255,255,255,0.6)")
  })

  it("does not render pulse overlay when _pulseIntensity is 0", () => {
    const ctx = createMockCanvasContext()
    const node = makeHeatcellNode({ _pulseIntensity: 0 })

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Only one fillRect for the cell itself
    expect(ctx.fillRect).toHaveBeenCalledTimes(1)
  })

  it("handles empty node array without crashing", () => {
    const ctx = createMockCanvasContext()

    heatmapCanvasRenderer(ctx, [], makeScales(), makeLayout())

    expect(ctx.fillRect).not.toHaveBeenCalled()
    expect(ctx.strokeRect).not.toHaveBeenCalled()
  })

  it("filters out non-heatcell nodes", () => {
    const ctx = createMockCanvasContext()
    const pointNode: SceneNode = {
      type: "point",
      x: 0, y: 0, r: 5,
      style: { fill: "#ccc" },
      datum: {}
    }

    heatmapCanvasRenderer(ctx, [pointNode], makeScales(), makeLayout())

    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("renders multiple heatcells", () => {
    const ctx = createMockCanvasContext()
    const nodes = [
      makeHeatcellNode({ x: 0, y: 0 }),
      makeHeatcellNode({ x: 25, y: 0 }),
      makeHeatcellNode({ x: 50, y: 0 })
    ]

    heatmapCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    expect(ctx.fillRect).toHaveBeenCalledTimes(3)
    expect(ctx.strokeRect).toHaveBeenCalledTimes(3)
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

    const node1 = makeHeatcellNode()
    node1.style = { opacity: 0.3 }
    const node2 = makeHeatcellNode()
    node2.style = { opacity: 0.8 }

    heatmapCanvasRenderer(ctx, [node1, node2], makeScales(), makeLayout())

    // Each node: set opacity, then reset to 1
    expect(alphaValues).toEqual([0.3, 1, 0.8, 1])
  })

  it("does not set globalAlpha when style has no opacity", () => {
    const ctx = createMockCanvasContext()
    const node = makeHeatcellNode()
    // HeatcellSceneNode has an optional style property used for decay/transition opacity

    heatmapCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // globalAlpha should only be set once (the reset to 1)
    expect(ctx.globalAlpha).toBe(1)
  })
})
