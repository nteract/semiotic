import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMockCanvasContext, recordCanvasOps } from "../../../test-utils/canvasMock"
import type { NetworkSceneNode } from "../networkTypes"
import type { Style } from "../types"
import { paintNetworkNodesInOrder } from "./networkNodePaintOrder"
import { paintPerspectiveFaces } from "./networkPerspectivePaint"

beforeEach(() => vi.stubGlobal("Path2D", class {}))
afterEach(() => vi.unstubAllGlobals())

const faces = [{ pathD: "M0 0L10 0L10 5Z", shade: -0.2 }]
function mark(type: "circle" | "rect" | "arc" | "symbol", style: Style): NetworkSceneNode {
  const common = { style, datum: {}, faces, pathD: "M0 0L10 0L10 10Z" }
  switch (type) {
    case "circle": return { ...common, type, cx: 5, cy: 5, r: 5 }
    case "rect": return { ...common, type, x: 0, y: 0, w: 10, h: 10 }
    case "arc": return { ...common, type, cx: 5, cy: 5, innerR: 0, outerR: 5, startAngle: 0, endAngle: Math.PI }
    case "symbol": return { ...common, type, cx: 5, cy: 5, size: 100 }
  }
}

describe.each(["circle", "rect", "arc", "symbol"] as const)("%s perspective alpha", (type) => {
  it.each([undefined, 0.5])("dims both walls and tops with fillOpacity %s", (fillOpacity) => {
    const mock = createMockCanvasContext()
    const ops = recordCanvasOps(mock)
    mock.globalAlpha = 0.3
    paintNetworkNodesInOrder(mock as unknown as CanvasRenderingContext2D, [
      mark(type, { fill: "#336699", stroke: "#112233", fillOpacity })
    ])
    expect(ops.fillAlphas).toHaveLength(2)
    for (const alpha of ops.fillAlphas) expect(alpha).toBeCloseTo(0.3 * (fillOpacity ?? 1))
    expect(ops.strokeAlphas).toEqual([0.3])
  })

  it("keeps explicit mark opacity consistent between walls and tops", () => {
    const mock = createMockCanvasContext()
    const ops = recordCanvasOps(mock)
    mock.globalAlpha = 0.3
    paintNetworkNodesInOrder(mock as unknown as CanvasRenderingContext2D, [
      mark(type, { fill: "#336699", opacity: 0.8, fillOpacity: 0.5 })
    ])
    expect(ops.fillAlphas).toHaveLength(2)
    for (const alpha of ops.fillAlphas) expect(alpha).toBeCloseTo(type === "symbol" ? 0.12 : 0.4)
  })
})

it("restores incoming alpha after painting walls and skips fully dimmed walls", () => {
  const mock = createMockCanvasContext()
  const ops = recordCanvasOps(mock)
  const ctx = mock as unknown as CanvasRenderingContext2D
  ctx.globalAlpha = 0.3
  paintPerspectiveFaces(ctx, { fill: "#336699", fillOpacity: 0.5 }, faces, "#000")
  expect(ops.fillAlphas).toEqual([0.15])
  expect(ctx.globalAlpha).toBe(0.3)
  ctx.globalAlpha = 0
  paintPerspectiveFaces(ctx, { fill: "#336699" }, faces, "#000")
  expect(ops.fillAlphas).toEqual([0.15])
  expect(ctx.globalAlpha).toBe(0)
})
