import { vi } from "vitest"
import { lineCanvasRenderer } from "./lineCanvasRenderer"
import { scaleLinear } from "d3-scale"
import type { LineSceneNode, SceneNode, StreamScales, StreamLayout } from "../types"
import { createMockCanvasContext as createSharedMock } from "../../../test-utils/canvasMock"

// Cast to the renderer-expected context shape — the shared mock exposes
// every method d3-shape's line generator might call (bezierCurveTo, etc.),
// which the original local stub was missing.
function createMockCanvasContext() {
  return createSharedMock() as unknown as CanvasRenderingContext2D
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

function makeLineNode(overrides: Partial<LineSceneNode> = {}): LineSceneNode {
  return {
    type: "line",
    path: [[0, 100], [50, 50], [100, 0]],
    style: { stroke: "#007bff" },
    datum: {},
    ...overrides
  }
}

describe("lineCanvasRenderer", () => {
  it("renders a line with correct stroke and path", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({ style: { stroke: "#e41a1c", strokeWidth: 3 } })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.beginPath).toHaveBeenCalled()
    expect(ctx.strokeStyle).toBe("#e41a1c")
    expect(ctx.lineWidth).toBe(3)
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 100)
    expect(ctx.lineTo).toHaveBeenCalledTimes(2)
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 50)
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 0)
    expect(ctx.stroke).toHaveBeenCalled()
  })

  it("uses default stroke and width when not specified", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({ style: {} })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.strokeStyle).toBe("#007bff")
    expect(ctx.lineWidth).toBe(2)
  })

  it("skips lines with fewer than 2 points", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({ path: [[10, 20]] })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.beginPath).not.toHaveBeenCalled()
    expect(ctx.moveTo).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
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

    const node = makeLineNode({ style: { stroke: "#007bff", opacity: 0.5 } })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues).toContain(0.5)
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })

  it("applies strokeDasharray", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      style: { stroke: "#007bff", strokeDasharray: "5,3,2" }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.setLineDash).toHaveBeenCalledWith([5, 3, 2])
  })

  it("clears lineDash when no strokeDasharray", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({ style: { stroke: "#007bff" } })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.setLineDash).toHaveBeenCalledWith([])
  })

  it("resets lineDash to empty at end", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      style: { stroke: "#007bff", strokeDasharray: "4,4" }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // setLineDash called twice: once with [4,4], once with [] at end
    expect(ctx.setLineDash).toHaveBeenCalledTimes(2)
    expect(ctx.setLineDash).toHaveBeenLastCalledWith([])
  })

  it("handles empty node array without crashing", () => {
    const ctx = createMockCanvasContext()

    lineCanvasRenderer(ctx, [], makeScales(), makeLayout())

    expect(ctx.beginPath).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it("filters out non-line nodes", () => {
    const ctx = createMockCanvasContext()
    const rectNode: SceneNode = {
      type: "rect",
      x: 0, y: 0, w: 10, h: 10,
      style: { fill: "#ccc" },
      datum: {}
    }

    lineCanvasRenderer(ctx, [rectNode], makeScales(), makeLayout())

    expect(ctx.beginPath).not.toHaveBeenCalled()
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it("renders multiple lines", () => {
    const ctx = createMockCanvasContext()
    const nodes = [
      makeLineNode({ path: [[0, 0], [10, 10]], style: { stroke: "#f00" } }),
      makeLineNode({ path: [[20, 20], [30, 30]], style: { stroke: "#0f0" } })
    ]

    lineCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    expect(ctx.beginPath).toHaveBeenCalledTimes(2)
    expect(ctx.stroke).toHaveBeenCalledTimes(2)
  })

  it("renders fill area under line when fill and fillOpacity are set", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      path: [[0, 100], [50, 50], [100, 0]],
      style: { stroke: "#007bff", fill: "#007bff", fillOpacity: 0.3 }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Should have extra beginPath for the fill area
    expect(ctx.beginPath).toHaveBeenCalledTimes(2)
    expect(ctx.closePath).toHaveBeenCalledTimes(1)
    expect(ctx.fill).toHaveBeenCalledTimes(1)
  })

  it("does not fill area when fillOpacity is 0", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      style: { stroke: "#007bff", fill: "#007bff", fillOpacity: 0 }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fill).not.toHaveBeenCalled()
    expect(ctx.closePath).not.toHaveBeenCalled()
  })

  it("does not fill area when fill is absent", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      style: { stroke: "#007bff", fillOpacity: 0.5 }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it("renders threshold-based color segments", () => {
    const ctx = createMockCanvasContext()
    const strokeStyles: string[] = []
    ;(ctx.stroke as ReturnType<typeof vi.fn>).mockImplementation(() => {
      strokeStyles.push(ctx.strokeStyle as string)
    })

    // Values go from 50 (below threshold) to 150 (above threshold) to 50 (below)
    // Threshold at 100 — crossings happen at interpolated points, not on exact values
    const node = makeLineNode({
      path: [[0, 200], [100, 100], [200, 200]],
      rawValues: [50, 150, 50],
      colorThresholds: [{ value: 100, color: "#dc3545", thresholdType: "greater" }],
      style: { stroke: "#007bff" }
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Should have multiple segments with different colors
    expect(strokeStyles.length).toBeGreaterThanOrEqual(2)
    expect(strokeStyles).toContain("#007bff")
    expect(strokeStyles).toContain("#dc3545")
  })

  it("uses fast path when colorThresholds is empty", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      colorThresholds: [],
      rawValues: [10, 20, 30]
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Fast path: single beginPath + single stroke
    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
  })

  it("uses fast path when rawValues length mismatches path length", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({
      path: [[0, 0], [50, 50], [100, 100]],
      colorThresholds: [{ value: 50, color: "#red", thresholdType: "greater" }],
      rawValues: [10, 20] // wrong length
    })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Falls through to fast path
    expect(ctx.beginPath).toHaveBeenCalledTimes(1)
    expect(ctx.stroke).toHaveBeenCalledTimes(1)
  })

  it("resets globalAlpha to 1 after rendering", () => {
    const ctx = createMockCanvasContext()
    const node = makeLineNode({ style: { stroke: "#007bff", opacity: 0.3 } })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ctx.globalAlpha).toBe(1)
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

    const node = makeLineNode({ style: { stroke: "#007bff", opacity: 0.15 } })

    lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(alphaValues).toContain(0.15)
    expect(alphaValues[alphaValues.length - 1]).toBe(1)
  })

  // ── Combinatorial coverage ─────────────────────────────────────────────
  //
  // The renderer has three orthogonal flags (curve, decay, thresholds) that
  // gate three mutually-exclusive code paths:
  //   - threshold path  → segment-colored lines, ignores curve and decay
  //   - decay path      → per-segment alpha modulation, ignores curve
  //   - fast path       → single stroke, applies curve when set
  //
  // `describe.each` exercises every (curve × decay × thresholds) combination
  // so a future refactor can't silently drop one of the path-selection
  // invariants (e.g. the "decay suppressed when thresholds are active" rule
  // at lineCanvasRenderer.ts:171 that otherwise only shows up in a single
  // existing test).

  describe("combinatorial paths (curve × decay × thresholds)", () => {
    type Curve = "none" | "step" | "monotoneX"
    const curves: Curve[] = ["none", "step", "monotoneX"]
    const decayOptions = [false, true]
    const thresholdOptions = [false, true]

    const matrix: { curve: Curve; decay: boolean; thresholds: boolean }[] = []
    for (const curve of curves) {
      for (const decay of decayOptions) {
        for (const thresholds of thresholdOptions) {
          matrix.push({ curve, decay, thresholds })
        }
      }
    }

    function makeNode(opts: { curve: Curve; decay: boolean; thresholds: boolean }): LineSceneNode {
      const node: LineSceneNode = {
        type: "line",
        path: [[0, 100], [50, 50], [100, 0]],
        style: { stroke: "#007bff" },
        datum: {}
      }
      if (opts.curve !== "none") node.curve = opts.curve
      if (opts.decay) {
        node._decayOpacities = [0.3, 0.6, 1.0]
      }
      if (opts.thresholds) {
        node.rawValues = [50, 150, 50]
        node.colorThresholds = [{ value: 100, color: "#dc3545", thresholdType: "greater" }]
      }
      return node
    }

    describe.each(matrix)(
      "curve=$curve, decay=$decay, thresholds=$thresholds",
      ({ curve, decay, thresholds }) => {
        it("renders without crashing and resets globalAlpha to 1", () => {
          const ctx = createMockCanvasContext()
          const node = makeNode({ curve, decay, thresholds })
          expect(() => lineCanvasRenderer(ctx, [node], makeScales(), makeLayout()))
            .not.toThrow()
          expect(ctx.globalAlpha).toBe(1)
          expect(ctx.stroke).toHaveBeenCalled()
        })

        if (thresholds) {
          it("takes the threshold path — multiple begin/stroke pairs, both colors present", () => {
            const ctx = createMockCanvasContext()
            const strokeStyles: string[] = []
            ;(ctx.stroke as ReturnType<typeof vi.fn>).mockImplementation(() => {
              strokeStyles.push(ctx.strokeStyle as string)
            })

            const node = makeNode({ curve, decay, thresholds })
            lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

            // Threshold path segments per-color; both base and threshold color appear.
            expect(strokeStyles.length).toBeGreaterThanOrEqual(2)
            expect(strokeStyles).toContain("#007bff")
            expect(strokeStyles).toContain("#dc3545")
            // beginPath called once per segment (more than the fast-path's single call).
            expect((ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls.length)
              .toBeGreaterThan(1)
          })
        } else if (decay) {
          it("takes the decay path — one segment per edge, varying globalAlpha, curve ignored", () => {
            const ctx = createMockCanvasContext()
            const alphaValues: number[] = []
            let _alpha = 1
            Object.defineProperty(ctx, "globalAlpha", {
              get: () => _alpha,
              set: (v: number) => { _alpha = v; alphaValues.push(v) }
            })

            const node = makeNode({ curve, decay, thresholds })
            lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

            // Decay emits one stroke per edge — path has 3 points, so 2 edges.
            expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length)
              .toBe(node.path.length - 1)
            // Each edge's alpha should be in (0, 1) exclusive (decay-modulated).
            const decayAlphas = alphaValues.filter(a => a > 0 && a < 1)
            expect(decayAlphas.length).toBeGreaterThan(0)
            // Decay path uses moveTo/lineTo even when curve is set — one
            // moveTo + one lineTo per segment.
            expect((ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls.length)
              .toBe(node.path.length - 1)
          })
        } else {
          it(`takes the fast path${curve !== "none" ? " with curve interpolation" : ""}`, () => {
            const ctx = createMockCanvasContext()
            const node = makeNode({ curve, decay, thresholds })
            lineCanvasRenderer(ctx, [node], makeScales(), makeLayout())

            // Fast path: single beginPath, single stroke.
            expect((ctx.beginPath as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
            expect((ctx.stroke as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)

            if (curve === "none") {
              // Linear fast path hits moveTo once + lineTo (path.length - 1) times.
              expect((ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
              expect((ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls.length)
                .toBe(node.path.length - 1)
            }
            // With a curve factory, d3-shape's line generator drives the context;
            // the call mix of moveTo / lineTo / bezierCurveTo depends on the
            // specific curve, so the assertion is just "it rendered without
            // falling back to the linear loop". Tested above via `stroke` count.
          })
        }
      }
    )
  })
})
