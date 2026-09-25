import { describe, expect, it } from "vitest"
import { extractXYNavPoints, extractOrdinalNavPoints, extractGeoNavPoints, navPointToHover } from "./keyboardNav"
import { findNearestOrdinalNode } from "./OrdinalCanvasHitTester"
import { ordinalHitToHover } from "./ordinalFrameInteraction"
import type { BoxplotSceneNode, OrdinalSceneNode } from "./ordinalTypes"
import type { CandlestickSceneNode } from "./types"
import type { GeoLineSceneNode } from "./geoTypes"

const raw = { category: "Alpha", value: 20 }
const stats = { n: 5, min: 1, q1: 2, median: 3, q3: 4, max: 5, mean: 3 }
const box: BoxplotSceneNode = {
  type: "boxplot", x: 50, y: 60, projection: "vertical", columnWidth: 20,
  minPos: 10, q1Pos: 20, medianPos: 35, q3Pos: 60, maxPos: 80,
  stats, datum: [raw], category: "Alpha", style: {}
}

describe("keyboard coverage for pointer-interactive marks", () => {
  it.each(["vertical", "horizontal"] as const)("focuses the %s box IQR and carries pointer-equivalent stats", projection => {
    const node = { ...box, projection }
    const points = extractOrdinalNavPoints([node])
    expect(points).toHaveLength(1)
    expect(points[0]).toMatchObject(projection === "vertical"
      ? { x: 50, y: 40, w: 20, h: 40, shape: "rect" }
      : { x: 40, y: 60, w: 40, h: 20, shape: "rect" })
    const hover = navPointToHover(points[0])
    const hit = findNearestOrdinalNode([node], points[0].x, points[0].y, 0)!
    const pointer = ordinalHitToHover(hit, { chartType: "boxplot", oAccessor: "category", rAccessor: "value" })
    expect(hover.data).toBe(pointer.data)
    expect(hover.stats).toBe(pointer.stats)
    expect(hover.category).toBe(pointer.category)
  })

  it("focuses violin and ridgeline bounds without dropping category statistics", () => {
    const node: OrdinalSceneNode = {
      type: "violin", translateX: 0, translateY: 0, pathString: "M10,20L90,140Z",
      bounds: { x: 10, y: 20, width: 80, height: 120 }, stats,
      datum: [raw], category: "Alpha", style: {}
    }
    const [point] = extractOrdinalNavPoints([node])
    expect(point).toMatchObject({ x: 50, y: 80, shape: "rect", w: 80, h: 120 })
    expect(navPointToHover(point)).toMatchObject({ data: raw, stats, category: "Alpha" })
    expect(extractOrdinalNavPoints([{ ...node, bounds: undefined }])).toEqual([])
  })

  it("outlines trapezoids and visible connectors, including their authored row", () => {
    const nodes: OrdinalSceneNode[] = [
      { type: "trapezoid", points: [[0, 0], [100, 0], [80, 40], [20, 40]], style: {}, datum: raw, category: "Alpha" },
      { type: "connector", x1: 80, y1: 40, x2: 120, y2: 80, style: { stroke: "black" }, datum: [raw], group: "series" },
      { type: "connector", x1: 0, y1: 0, x2: 20, y2: 20, style: { stroke: "none" }, datum: raw }
    ]
    const points = extractOrdinalNavPoints(nodes)
    expect(points).toHaveLength(2)
    expect(points[0]).toMatchObject({ x: 50, y: 20, shape: "path", pathData: "M0,0L100,0L80,40L20,40Z", datum: raw })
    expect(points[1]).toMatchObject({ x: 100, y: 60, shape: "path", pathData: "M80,40L120,80", datum: raw })
  })

  it.each([false, true])("focuses candlestick and range bodies (range: %s)", isRange => {
    const node: CandlestickSceneNode = {
      type: "candlestick", x: 40, openY: 20, closeY: 60, highY: 10, lowY: 90,
      bodyWidth: 8, upColor: "green", downColor: "red", wickColor: "black", wickWidth: 1,
      isUp: true, isRange, datum: raw
    }
    expect(extractXYNavPoints([node])).toEqual([
      { x: 40, y: isRange ? 50 : 40, shape: "rect", w: 8, h: isRange ? 80 : 40, datum: raw, group: "_default" }
    ])
  })

  it("anchors a geo flow at half its rendered length and outlines the full path", () => {
    const node: GeoLineSceneNode = { type: "line", path: [[0, 0], [10, 0], [100, 0], [100, 40]], datum: raw, style: {} }
    expect(extractGeoNavPoints([node])).toEqual([
      { x: 70, y: 0, datum: raw, shape: "path", pathData: "M0,0L10,0L100,0L100,40" }
    ])
    expect(extractGeoNavPoints([{ ...node, path: [[0, 0]] }])).toEqual([])
    expect(extractGeoNavPoints([{ ...node, path: [[0, 0], [0, 0]] }])).toEqual([])
    expect(extractGeoNavPoints([{ ...node, datum: null }])).toEqual([])
  })
})
