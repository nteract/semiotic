import { vi, describe, it, expect } from "vitest"
import { boxplotCanvasRenderer } from "./boxplotCanvasRenderer"
import { scaleLinear, scaleBand } from "d3-scale"
import type { BoxplotSceneNode, OrdinalSceneNode, OrdinalScales, OrdinalLayout } from "../ordinalTypes"

function createMockCtx() {
  return {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    globalAlpha: 1,
    lineWidth: 1
  } as unknown as CanvasRenderingContext2D
}

function makeScales(): OrdinalScales {
  return {
    o: scaleBand<string>().domain(["A"]).range([0, 200]),
    r: scaleLinear().domain([0, 100]).range([300, 0]),
    projection: "vertical"
  }
}

function makeLayout(): OrdinalLayout {
  return { width: 400, height: 300 }
}

function makeBoxplot(overrides: Partial<BoxplotSceneNode> = {}): BoxplotSceneNode {
  return {
    type: "boxplot",
    x: 100,
    y: 0,
    projection: "vertical",
    columnWidth: 40,
    minPos: 250,
    q1Pos: 200,
    medianPos: 150,
    q3Pos: 100,
    maxPos: 50,
    stats: { n: 20, min: 5, q1: 25, median: 50, q3: 75, max: 95, mean: 50 },
    style: { fill: "#4e79a7", stroke: "#333", strokeWidth: 1 },
    datum: {},
    category: "A",
    ...overrides
  }
}

describe("boxplotCanvasRenderer", () => {
  it("draws whisker line from min to max (vertical)", () => {
    const ctx = createMockCtx()
    const node = makeBoxplot()
    boxplotCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Should draw a line from minPos to maxPos
    expect(ctx.moveTo).toHaveBeenCalledWith(100, 250) // x, minPos
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 50)  // x, maxPos
  })

  it("draws IQR box from q1 to q3", () => {
    const ctx = createMockCtx()
    const node = makeBoxplot()
    boxplotCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // fillRect for the IQR box: (x - halfWidth, boxTop, columnWidth, boxH)
    expect(ctx.fillRect).toHaveBeenCalledWith(80, 100, 40, 100)
    expect(ctx.strokeRect).toHaveBeenCalledWith(80, 100, 40, 100)
  })

  it("draws median line in white", () => {
    const ctx = createMockCtx()
    const node = makeBoxplot()
    boxplotCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // Median line at medianPos=150
    const moveToArgs = (ctx.moveTo as any).mock.calls
    const lineToArgs = (ctx.lineTo as any).mock.calls
    // Should have a moveTo at (80, 150) and lineTo at (120, 150) for median
    expect(moveToArgs).toContainEqual([80, 150])
    expect(lineToArgs).toContainEqual([120, 150])
  })

  it("applies fill opacity from style", () => {
    const ctx = createMockCtx()
    const node = makeBoxplot({ style: { fill: "red", fillOpacity: 0.3 } })
    boxplotCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // globalAlpha should be set to fillOpacity before fillRect
    expect(ctx.globalAlpha).toBe(1) // restored after rendering
  })

  it("renders horizontal projection", () => {
    const ctx = createMockCtx()
    const node = makeBoxplot({ projection: "horizontal" })
    boxplotCanvasRenderer(ctx, [node], makeScales(), makeLayout())

    // In horizontal mode, whisker is from (minPos, y) to (maxPos, y)
    expect(ctx.moveTo).toHaveBeenCalledWith(250, 0) // minPos, y
    expect(ctx.lineTo).toHaveBeenCalledWith(50, 0)   // maxPos, y
  })

  it("skips non-boxplot nodes", () => {
    const ctx = createMockCtx()
    const point = { type: "point", x: 50, y: 50, r: 3, style: {}, datum: {} } as any
    boxplotCanvasRenderer(ctx, [point], makeScales(), makeLayout())

    // No drawing calls for point nodes
    expect(ctx.fillRect).not.toHaveBeenCalled()
  })

  it("calls save/restore for each node", () => {
    const ctx = createMockCtx()
    boxplotCanvasRenderer(ctx, [makeBoxplot(), makeBoxplot({ x: 200 })], makeScales(), makeLayout())
    expect(ctx.save).toHaveBeenCalledTimes(2)
    expect(ctx.restore).toHaveBeenCalledTimes(2)
  })
})
