import { describe, expect, it } from "vitest"
import {
  anchorZoom,
  centerZoom,
  constrainZoom,
  fitZoom,
  getNetworkContentBounds,
  getNetworkMarkBounds,
  getNetworkMarksBounds,
  panZoom,
  unionNetworkBounds,
  usableViewport,
  zoomAt,
  zoomLimits
} from "./geometry"
import { fitNetworkView } from "../networkViewGeometry"
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
  it("contains pointed and rotated custom symbols rather than using their circle-area radius", () => {
    const triangle = getNetworkContentBounds({ sceneNodes: [{
      type: "symbol", cx: 0, cy: 0, size: 300, symbolType: "triangle", style: {}, datum: {}
    }] })!
    // d3's 300-square-pixel equilateral triangle reaches about 15.2px above
    // its center, beyond the 9.77px equal-area circle used for hit tolerance.
    expect(triangle.y).toBeLessThanOrEqual(-15.19)
    const custom = getNetworkContentBounds({ sceneNodes: [{
      type: "symbol", cx: -100, cy: 50, size: 1, rotation: Math.PI / 2,
      path: "M100,100 h100 v100 h-100z", style: {}, datum: {}
    }] })!
    // The authored square occupies [100,200] on both local axes. After a
    // quarter turn its layout bounds are [-300,-200] × [150,250].
    expect(custom.x).toBeLessThanOrEqual(-300)
    expect(custom.y).toBeLessThanOrEqual(150)
    expect(custom.x + custom.width).toBeGreaterThanOrEqual(-200)
    expect(custom.y + custom.height).toBeGreaterThanOrEqual(250)
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

  it("fits without insets exactly as before insets existed, including fractional inputs", () => {
    type Rect = { x: number; y: number; width: number; height: number }
    const previousFit = (bounds: Rect, area: Rect, fitPadding: number | undefined, [min, max]: [number, number]) => {
      const padding = Number.isFinite(fitPadding) ? Math.max(0, fitPadding!) : 24
      const k = Math.max(
        min,
        Math.min(
          max,
          Math.max(1, area.width - padding * 2) / bounds.width,
          Math.max(1, area.height - padding * 2) / bounds.height
        )
      )
      return {
        k,
        x: area.width / 2 - (bounds.x + bounds.width / 2) * k,
        y: area.height / 2 - (bounds.y + bounds.height / 2) * k
      }
    }
    const cases = [
      { bounds: { x: 0, y: 0, width: 3000, height: 600 }, plot: { x: 0, y: 0, width: 1200, height: 400 }, options: {} },
      { bounds: { x: -12.3, y: 7.7, width: 91.1, height: 13.9 }, plot: { x: 5, y: 3, width: 333.3, height: 222.2 }, options: { fitPadding: 10.5, maxZoom: 3 } },
      { bounds: { x: 1, y: 2, width: 0.3, height: 0.7 }, plot, options: { minZoom: 0.2, maxZoom: 8, fitPadding: 0 } }
    ]
    for (const { bounds, plot: area, options } of cases) {
      const previous = previousFit(bounds, area, options.fitPadding, zoomLimits(options))
      expect(fitZoom(bounds, area, options)).toEqual(constrainZoom(previous, area, options))
      expect(fitNetworkView(bounds, { ...area, x: 0, y: 0 }, options.fitPadding)).toEqual(
        previousFit(bounds, area, options.fitPadding, [Number.MIN_VALUE, Number.MAX_VALUE])
      )
    }
  })
  it("fits into the plot minus insets, with per-side padding and fit-specific limits", () => {
    const wide = { x: 0, y: 0, width: 1400, height: 600 }
    const content = { x: 0, y: 0, width: 1000, height: 300 }
    expect(usableViewport(wide, { right: 690, top: -5 })).toEqual({ x: 0, y: 0, width: 710, height: 600 })
    const view = fitZoom(content, wide, { insets: { right: 690 } })!
    expect(view.k).toBeCloseTo(662 / 1000, 12)
    expect(view.x + (content.width / 2) * view.k).toBeCloseTo(355, 9)
    expect(fitZoom(content, wide, { insets: { right: 690 } }, { maxZoom: 0.5 })!.k).toBe(0.5)
    expect(fitZoom(content, wide, { minZoom: 2 }, { maxZoom: 0.5 })!.k).toBe(2)
    const padded = fitZoom(content, wide, {}, { padding: { left: 100, right: 0, top: 0, bottom: 0 } })!
    expect(padded.k).toBeCloseTo(1.3, 12)
    expect(padded.x).toBeCloseTo(100, 9)
    // Unspecified sides keep fitPadding; null padding behaves like none.
    const partial = fitZoom(content, wide, { fitPadding: 10 }, { padding: { left: 100 } })!
    expect(partial.k).toBeCloseTo(1.29, 12)
    expect(partial.x).toBeCloseTo(100, 9)
    expect(fitZoom(content, wide, { fitPadding: null as never }, { padding: null as never })).toEqual(
      fitZoom(content, wide, {})
    )
  })
  it("centers rects and points in the usable viewport and anchors by mark centers", () => {
    const wide = { x: 0, y: 0, width: 1400, height: 600 }
    const view = { x: 10, y: 20, k: 2 }
    expect(centerZoom({ x: 100, y: 50, width: 20, height: 10 }, view, wide, { insets: { right: 690 } })).toEqual({
      k: 2,
      x: 355 - 110 * 2,
      y: 300 - 55 * 2
    })
    expect(centerZoom({ x: 0, y: 0 }, view, wide, { maxZoom: 4 }, { k: 9 })).toEqual({ k: 4, x: 700, y: 300 })
    expect(centerZoom({ x: NaN, y: 0 }, view, wide, {})).toBeNull()
    const anchored = anchorZoom(view, { x: 0, y: 0, width: 10, height: 10 }, { x: 300, y: -40, width: 30, height: 10 })
    expect(anchored).toEqual({ k: 2, x: 10 - 2 * 310, y: 20 + 2 * 40 })
  })
  it("keeps content inside the usable viewport when pan bounds apply", () => {
    const wide = { x: 0, y: 0, width: 1400, height: 600 }
    const options = { panBounds: { x: 0, y: 0, width: 300, height: 600 }, insets: { left: 100, right: 690 } }
    expect(constrainZoom({ x: 0, y: 0, k: 1 }, wide, options).x).toBe(100 + (610 - 300) / 2)
    const tight = { ...options, panBounds: { x: 0, y: 0, width: 2000, height: 600 } }
    expect(constrainZoom({ x: 500, y: 0, k: 1 }, wide, tight).x).toBe(100)
    expect(constrainZoom({ x: -5000, y: 0, k: 1 }, wide, tight).x).toBe(710 - 2000)
  })
  it("reads mark bounds from the current layout, preferring HTML marks", () => {
    const layout = {
      sceneNodes: [
        { type: "circle" as const, id: "a", cx: 10, cy: 10, r: 5, style: {}, datum: {} },
        { type: "rect" as const, id: "b", x: 0, y: 0, w: 4, h: 6, style: {}, datum: {} }
      ],
      htmlMarks: [{ id: "a", x: 1, y: 2, width: 30, height: 20, content: null }]
    }
    expect(getNetworkMarkBounds(layout, "a")).toEqual({ x: 1, y: 2, width: 30, height: 20 })
    expect(getNetworkMarkBounds(layout, "b")).toEqual({ x: 0, y: 0, width: 4, height: 6 })
    expect(getNetworkMarksBounds(layout, ["a", "missing", "b"])).toEqual({ x: 0, y: 0, width: 31, height: 22 })
    expect(unionNetworkBounds([getNetworkMarkBounds(layout, "a"), null, getNetworkMarkBounds(layout, "b")])).toEqual(
      getNetworkMarksBounds(layout, ["a", "b"])
    )
    // Layouts may reuse and update their mark objects between runs.
    layout.htmlMarks[0].x = 99
    expect(getNetworkMarkBounds(layout, "a")!.x).toBe(99)
    expect(getNetworkMarkBounds(null, "a")).toBeNull()
    expect(getNetworkMarksBounds(layout, [])).toBeNull()
    expect(unionNetworkBounds([])).toBeNull()
  })
})
