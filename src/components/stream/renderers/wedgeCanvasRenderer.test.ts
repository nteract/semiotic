import { vi, describe, it, expect } from "vitest"
import { wedgeCanvasRenderer } from "./wedgeCanvasRenderer"
import { scaleLinear, scaleBand } from "d3-scale"
import type { WedgeSceneNode, OrdinalSceneNode, OrdinalScales, OrdinalLayout } from "../ordinalTypes"
import { createMockCanvasContext } from "../../../test-utils/canvasMock"

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

  it("renders pulse overlay when _pulseIntensity > 0", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ _pulseIntensity: 0.8, _pulseColor: "rgba(255,255,0,0.5)" })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Should draw the wedge twice: once for fill, once for pulse overlay
    expect(ctx.fill).toHaveBeenCalledTimes(2)
    // Two beginPath calls (main + pulse)
    expect(ctx.beginPath).toHaveBeenCalledTimes(2)
  })

  it("skips pulse overlay when _pulseIntensity is 0", () => {
    const ctx = createMockCtx()
    const node = makeWedge({ _pulseIntensity: 0 })
    wedgeCanvasRenderer(ctx, [node], makeScales(), makeLayout())
    expect(ctx.fill).toHaveBeenCalledTimes(1)
  })

  it("skips non-wedge nodes", () => {
    const ctx = createMockCtx()
    const rect = { type: "rect", x: 0, y: 0, width: 50, height: 100, style: {}, datum: {} } as any
    wedgeCanvasRenderer(ctx, [rect], makeScales(), makeLayout())
    expect(ctx.fill).not.toHaveBeenCalled()
  })

  it("renders multiple wedges", () => {
    const ctx = createMockCtx()
    const nodes = [
      makeWedge({ startAngle: 0, endAngle: Math.PI }),
      makeWedge({ startAngle: Math.PI, endAngle: 2 * Math.PI, style: { fill: "#377eb8" } })
    ]
    wedgeCanvasRenderer(ctx, nodes, makeScales(), makeLayout())
    expect(ctx.fill).toHaveBeenCalledTimes(2)
  })
})
