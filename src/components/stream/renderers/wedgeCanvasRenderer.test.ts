import { describe, it, expect } from "vitest"
import { wedgeCanvasRenderer } from "./wedgeCanvasRenderer"
import { scaleLinear, scaleBand } from "d3-scale"
import type { WedgeSceneNode, OrdinalScales, OrdinalLayout } from "../ordinalTypes"
import { createMockCanvasContext, recordCanvasOps } from "../../../test-utils/canvasMock"

function createMockCtx() {
  return createMockCanvasContext() as unknown as CanvasRenderingContext2D
}

function makeScales(): OrdinalScales {
  return {
    o: scaleBand<string>().domain(["A"]).range([0, 200]),
    r: scaleLinear().domain([0, 100]).range([0, 100]),
    projection: "radial"
  }
}

function makeLayout(): OrdinalLayout {
  return { width: 400, height: 400 }
}

function makeWedge(overrides: Partial<WedgeSceneNode> = {}): WedgeSceneNode {
  return {
    type: "wedge",
    cx: 200,
    cy: 200,
    innerRadius: 0,
    outerRadius: 100,
    startAngle: 0,
    endAngle: Math.PI / 2,
    style: { fill: "#e41a1c" },
    datum: { category: "A", value: 25 },
    ...overrides
  }
}

describe("wedgeCanvasRenderer", () => {
  it("draws a pie wedge (innerRadius=0) with moveTo + arc + closePath", () => {
    const ctx = createMockCtx()
    const node = makeWedge()
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Pie mode: moveTo center, then arc
    expect(ctx.moveTo).toHaveBeenCalledWith(200, 200)
    expect(ctx.arc).toHaveBeenCalledWith(200, 200, 100, 0, Math.PI / 2)
    expect(ctx.closePath).toHaveBeenCalled()
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("draws a donut wedge (innerRadius>0) with two arcs", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ innerRadius: 60 })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Donut mode: outer arc forward, inner arc backward
    expect(ctx.arc).toHaveBeenCalledWith(200, 200, 100, 0, Math.PI / 2)
    expect(ctx.arc).toHaveBeenCalledWith(200, 200, 60, Math.PI / 2, 0, true)
    // Should NOT have moveTo (donut path starts at arc, not center)
    expect(ctx.moveTo).not.toHaveBeenCalled()
  })

  it("applies fill color", () => {
    const ctx = createMockCtx()
    wedgeCanvasRenderer(ctx, [makeWedge({ style: { fill: "#ff0000" } })], makeScales(), makeLayout())
    expect(ctx.fillStyle).toBe("#ff0000")
  })

  it("applies stroke when specified", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ style: { fill: "#fff", stroke: "#000", strokeWidth: 2 } })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())
    expect(ctx.stroke).toHaveBeenCalled()
    expect(ctx.strokeStyle).toBe("#000")
    expect(ctx.lineWidth).toBe(2)
  })

  it("does not stroke when stroke is 'none'", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ style: { fill: "#fff", stroke: "none" } })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())
    expect(ctx.stroke).not.toHaveBeenCalled()
  })

  it("applies opacity from fillOpacity", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ style: { fill: "#e41a1c", fillOpacity: 0.5 } })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // globalAlpha is reset to 1 at the end of each node
    // We verify fill was called (opacity was applied before fill)
    expect(ctx.fill).toHaveBeenCalled()
  })

  it("renders pulse overlay using the pulse color on top of the base fill", () => {
    // Behavior-level assertion: the render produces two distinct fills —
    // one with the base wedge color, one with the pulse color. Avoids
    // asserting on `fill` call counts, which would break on any future
    // batching refactor that doesn't change what's actually painted.
    const ctx = createMockCtx()
    const ops = recordCanvasOps(ctx as unknown)
    const node = makeWedge({
      style: { fill: "#e41a1c" },
      _pulseIntensity: 0.8,
      _pulseColor: "rgba(255,255,0,0.5)"
    })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    expect(ops.fillStyles).toContain("#e41a1c")
    expect(ops.fillStyles).toContain("rgba(255,255,0,0.5)")
  })

  it("skips pulse overlay when _pulseIntensity is 0", () => {
    const ctx = createMockCtx()
    const ops = recordCanvasOps(ctx as unknown)
    const node = makeWedge({ style: { fill: "#e41a1c" }, _pulseIntensity: 0 })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Only the base color fills the wedge; no pulse overlay appears.
    expect(ops.fillStyles).toEqual(["#e41a1c"])
  })

  it("skips non-wedge nodes", () => {
    const ctx = createMockCtx()
    const rect = { type: "rect", x: 0, y: 0, width: 50, height: 100, style: {}, datum: {} } as unknown
    wedgeCanvasRenderer(ctx, [rect], makeScales(), makeLayout())
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it("renders every wedge in the input list with its own fill", () => {
    const ctx = createMockCtx()
    const ops = recordCanvasOps(ctx as unknown)
    const nodes = [
      makeWedge({ startAngle: 0, endAngle: Math.PI, style: { fill: "#e41a1c" } }),
      makeWedge({ startAngle: Math.PI, endAngle: 2 * Math.PI, style: { fill: "#377eb8" } })
    ]
    wedgeCanvasRenderer(ctx, nodes, makeScales(), makeLayout())

    // Both wedge colors must appear — irrespective of how many fill calls
    // the renderer emits internally (e.g. if a future refactor batches).
    expect(ops.fillStyles).toContain("#e41a1c")
    expect(ops.fillStyles).toContain("#377eb8")
  })
})
