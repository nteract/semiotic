import { describe, expect, it } from "vitest"
import {
  constrainZoom,
  fitZoom,
  getNetworkContentBounds,
  panZoom,
  zoomAt
} from "./geometry"
import {
  invertNetworkRect,
  normalizeNetworkView,
  projectNetworkPoint
} from "../networkViewTransform"
import { resolveNetworkPointerHit } from "../networkFrameInteraction"

const plot = { x: 30, y: 20, width: 400, height: 300 }
describe("network camera geometry", () => {
  it("keeps the world point under the cursor fixed and round-trips negative coordinates", () => {
    const from = { x: -170, y: 35, k: 0.5 },
      cursor = { x: 123, y: 82 }
    const world = {
      x: (cursor.x - from.x) / from.k,
      y: (cursor.y - from.y) / from.k
    }
    const next = zoomAt(from, 2.7, cursor, plot, {})
    expect(projectNetworkPoint(world, next)).toEqual(cursor)
    expect(
      invertNetworkRect({ ...cursor, width: 270, height: 135 }, next)
    ).toEqual({ ...world, width: 100, height: 50 })
  })
  it("enforces scale and pan bounds, centering content smaller than the viewport", () => {
    const options = {
      minZoom: 0.5,
      maxZoom: 2,
      panBounds: { x: -100, y: -50, width: 600, height: 500 }
    }
    expect(constrainZoom({ x: 900, y: -900, k: 8 }, plot, options)).toEqual({
      x: 200,
      y: -600,
      k: 2
    })
    expect(constrainZoom({ x: 100, y: -100, k: 0.01 }, plot, options)).toEqual({
      x: 100,
      y: 50,
      k: 0.5
    })
    expect(
      constrainZoom({ x: 0, y: 0, k: 1 }, plot, { minZoom: 3, maxZoom: 2 }).k
    ).toBe(3)
    expect(normalizeNetworkView({ x: NaN, y: 0, k: 0 })).toEqual({
      x: 0,
      y: 0,
      k: 1
    })
  })
  it("respects independent locks and zooms at the center of locked axes", () => {
    const view = { x: 20, y: 40, k: 1 }
    expect(panZoom(view, 50, 60, plot, { pan: "x" })).toEqual({
      x: 70,
      y: 40,
      k: 1
    })
    expect(zoomAt(view, 2, { x: 10, y: 10 }, plot, { pan: false })).toEqual({
      x: -160,
      y: -70,
      k: 2
    })
    expect(
      zoomAt(view, 2, { x: 10, y: 10 }, plot, { zoomEnabled: false })
    ).toBe(view)
    expect(zoomAt(view, 2, { x: 10, y: 10 }, plot, { locked: true })).toBe(view)
  })
  it("fits all retained boxes rather than just mounted cards, and clamps fit scale", () => {
    const bounds = getNetworkContentBounds({
      sceneNodes: [
        { type: "circle", cx: -100, cy: -50, r: 10, style: {}, datum: {} }
      ],
      htmlMarks: [
        { id: "far", x: 1000, y: 800, width: 300, height: 100, content: null }
      ]
    })!
    expect(bounds).toEqual({ x: -110, y: -60, width: 1410, height: 960 })
    const view = fitZoom(bounds, plot, { fitPadding: 20 })!
    expect(view.k).toBeCloseTo(360 / 1410)
    expect(
      projectNetworkPoint(
        { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        view
      )
    ).toEqual({ x: 200, y: 150 })
    expect(fitZoom(bounds, plot, { minZoom: 0.5 })!.k).toBe(0.5)
    expect(getNetworkContentBounds({})).toBeNull()
    expect(fitZoom({ x: 0, y: 0, width: 0, height: 1 }, plot, {})).toBeNull()
  })
  it("checks viewport bounds before inverse projection and keeps edge tolerance in screen pixels", () => {
    const base = {
      canvasRect: new DOMRect(100, 50, 460, 340),
      margin: { left: 30, top: 20 },
      adjustedWidth: 400,
      adjustedHeight: 300,
      sceneNodes: [],
      sceneEdges: [
        {
          type: "line" as const,
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 100,
          style: {},
          datum: { id: "edge" }
        }
      ],
      nodeQuadtree: null,
      maxNodeRadius: 0
    }
    for (const k of [0.25, 1, 3]) {
      const viewTransform = { k, x: -100 * k + 50, y: -100 * k + 50 }
      const test = (dy: number) =>
        resolveNetworkPointerHit({
          ...base,
          viewTransform,
          clientX: 190,
          clientY: 120 + dy
        })
      expect(test(4).kind).toBe("hit")
      expect(test(6).kind).toBe("miss")
      expect(
        resolveNetworkPointerHit({
          ...base,
          viewTransform,
          clientX: 120,
          clientY: 120
        }).kind
      ).toBe("miss-outside")
    }
  })
})
