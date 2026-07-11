/**
 * Coverage for the unified ribbon path through PipelineStore — both
 * public envelope APIs (`boundsAccessor` and `band`) compose into the
 * same `resolvedRibbons` array, so y-extent auto-derivation, scene
 * z-order, and tooltip enrichment all share one implementation.
 */
import { describe, it, expect } from "vitest"
import { PipelineStore } from "./PipelineStore"
import type { AreaSceneNode } from "./types"

function makeData() {
  return [
    { x: 0, y: 50, lo: 30, hi: 70 },
    { x: 1, y: 55, lo: 35, hi: 75 },
    { x: 2, y: 60, lo: 40, hi: 80 },
  ]
}

describe("PipelineStore — band prop", () => {
  it("expands y-extent to include band y0 and y1 when no yExtent is pinned", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const [lo, hi] = store.scales!.y.domain() as [number, number]
    expect(lo).toBe(30) // band low pushes the bottom past y=50
    expect(hi).toBe(80) // band high pushes the top past y=60
  })

  it("emits one area node per band per group, painted before the line", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      groupAccessor: "g",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 10, lo: 5, hi: 15, g: "A" },
        { x: 1, y: 12, lo: 6, hi: 18, g: "A" },
        { x: 0, y: 20, lo: 15, hi: 25, g: "B" },
        { x: 1, y: 22, lo: 17, hi: 27, g: "B" },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const areas = store.scene.filter((n): n is AreaSceneNode => n.type === "area")
    expect(areas).toHaveLength(2)
    // Each band area is non-interactive by default
    for (const a of areas) expect(a.interactive).toBe(false)

    // Bands come before lines in the scene array (z-order: lines on top)
    const firstLineIndex = store.scene.findIndex(n => n.type === "line")
    const lastAreaIndex = store.scene.map(n => n.type).lastIndexOf("area")
    expect(lastAreaIndex).toBeLessThan(firstLineIndex)
  })

  it("perSeries=false collapses bands into a single ribbon across all data", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      groupAccessor: "g",
      band: { y0Accessor: "lo", y1Accessor: "hi", perSeries: false },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 10, lo: 5, hi: 15, g: "A" },
        { x: 1, y: 12, lo: 6, hi: 18, g: "A" },
        { x: 0, y: 20, lo: 15, hi: 25, g: "B" },
        { x: 1, y: 22, lo: 17, hi: 27, g: "B" },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const areas = store.scene.filter((n): n is AreaSceneNode => n.type === "area")
    expect(areas).toHaveLength(1)
  })

  it("multiple bands emit multiple area nodes per group (fan chart layering)", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: [
        { y0Accessor: "p10", y1Accessor: "p90" },
        { y0Accessor: "p25", y1Accessor: "p75" },
      ],
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, p10: 30, p25: 40, p75: 60, p90: 70 },
        { x: 1, y: 55, p10: 35, p25: 45, p75: 65, p90: 75 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const areas = store.scene.filter((n): n is AreaSceneNode => n.type === "area")
    expect(areas).toHaveLength(2)
  })

  it("does not emit band nodes when band is omitted", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    expect(store.scene.some(n => n.type === "area")).toBe(false)
    expect(store.scene.some(n => n.type === "line")).toBe(true)
  })

  it("interactive=true makes the band area participate in hit testing", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi", interactive: true },
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const area = store.scene.find((n): n is AreaSceneNode => n.type === "area")
    expect(area).toBeDefined()
    expect(area!.interactive).toBe(true)
  })

  it("function accessors work as well as string accessors", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: {
        y0Accessor: (d: any) => d.range[0],
        y1Accessor: (d: any) => d.range[1],
      },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, range: [30, 70] },
        { x: 1, y: 55, range: [35, 75] },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const [lo, hi] = store.scales!.y.domain() as [number, number]
    expect(lo).toBe(30)
    expect(hi).toBe(75)
  })

  it("user-pinned yExtent wins over band auto-derivation", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
      yExtent: [0, 100],
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const [lo, hi] = store.scales!.y.domain() as [number, number]
    expect(lo).toBe(0)
    expect(hi).toBe(100)
  })

  it("removes band extrema when the datum carrying them is removed", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      pointIdAccessor: "id",
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { id: "ordinary", x: 0, y: 50, lo: 45, hi: 55 },
        { id: "extreme", x: 1, y: 60, lo: 10, hi: 100 },
      ],
      bounded: true,
    })
    expect(store.getExtents()!.y).toEqual([10, 100])

    store.remove("extreme")
    store.computeScene({ width: 400, height: 200 })

    // Before the paired extent eviction, stale band extrema survived this
    // mutation and the next scene kept the old [10, 100] y-domain.
    expect(store.scales!.y.domain()).toEqual([45, 55])
  })

  it("replaces band extrema when a datum is updated", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      pointIdAccessor: "id",
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { id: "a", x: 0, y: 50, lo: 10, hi: 100 },
        { id: "b", x: 1, y: 55, lo: 45, hi: 65 },
      ],
      bounded: true,
    })
    expect(store.getExtents()!.y).toEqual([10, 100])

    store.update("a", datum => ({ ...datum, y: 52, lo: 48, hi: 58 }))
    store.computeScene({ width: 400, height: 200 })

    expect(store.scales!.y.domain()).toEqual([45, 65])
  })

  it("inherits resolveBoundsStyle (line color @ 0.2 fillOpacity) when no style is set", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const area = store.scene.find((n): n is AreaSceneNode => n.type === "area")!
    expect(area.style.fillOpacity).toBe(0.2)
    expect(area.style.stroke).toBe("none")
  })

  it("respects an explicit static style override", () => {
    const customStyle = { fill: "#ff00ff", fillOpacity: 0.5, stroke: "none" }
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi", style: customStyle },
    })
    store.ingest({ inserts: makeData(), bounded: true })
    store.computeScene({ width: 400, height: 200 })
    const area = store.scene.find((n): n is AreaSceneNode => n.type === "area")!
    expect(area.style).toEqual(customStyle)
  })

  it("skips datums where y0 or y1 is null/NaN (gapStrategy at the band level)", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, lo: 30, hi: 70 },
        { x: 1, y: 55, lo: null, hi: 75 },   // null lo → skip
        { x: 2, y: 60, lo: 40, hi: NaN },    // NaN hi → skip
        { x: 3, y: 65, lo: 45, hi: 85 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const area = store.scene.find((n): n is AreaSceneNode => n.type === "area")!
    expect(area.topPath).toHaveLength(2)
    expect(area.bottomPath).toHaveLength(2)
  })
})

describe("PipelineStore — boundsAccessor through the unified ribbon path", () => {
  it("composes boundsAccessor into resolvedRibbons with kind='bounds'", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: (d: any) => d.offset,
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, offset: 10 },
        { x: 1, y: 55, offset: 12 },
      ],
      bounded: true,
    })
    expect(store.resolvedRibbons).toHaveLength(1)
    expect(store.resolvedRibbons[0].kind).toBe("bounds")
    expect(store.resolvedRibbons[0].perSeries).toBe(true)
    expect(store.resolvedRibbons[0].interactive).toBe(false)
  })

  it("expands y-extent to include y ± offset (symmetric envelope)", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: (d: any) => d.offset,
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, offset: 10 },
        { x: 1, y: 60, offset: 15 },
        { x: 2, y: 55, offset: 20 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const [lo, hi] = store.scales!.y.domain() as [number, number]
    // Furthest bottom: 50 - 10 = 40; but also 55 - 20 = 35 (smallest)
    expect(lo).toBe(35)
    // Furthest top: 60 + 15 = 75
    expect(hi).toBe(75)
  })

  it("renders bounds as a non-interactive area node behind the line", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: (d: any) => d.offset,
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, offset: 10 },
        { x: 1, y: 55, offset: 12 },
        { x: 2, y: 60, offset: 8 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const areas = store.scene.filter((n): n is AreaSceneNode => n.type === "area")
    expect(areas).toHaveLength(1)
    expect(areas[0].interactive).toBe(false)
    // Bounds painted before the line
    const lineIdx = store.scene.findIndex(n => n.type === "line")
    const areaIdx = store.scene.findIndex(n => n.type === "area")
    expect(areaIdx).toBeLessThan(lineIdx)
  })

  it("bounds + band coexist — both ribbons in the scene", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: (d: any) => d.offset,
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, offset: 5, lo: 30, hi: 70 },
        { x: 1, y: 55, offset: 6, lo: 32, hi: 78 },
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const areas = store.scene.filter((n): n is AreaSceneNode => n.type === "area")
    expect(areas).toHaveLength(2) // one bounds, one band
    // Bounds composes before band in resolvedRibbons (kind order)
    expect(store.resolvedRibbons[0].kind).toBe("bounds")
    expect(store.resolvedRibbons[1].kind).toBe("band")
  })

  it("bounds + band both feed y-extent expansion", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: (d: any) => d.offset,
      band: { y0Accessor: "lo", y1Accessor: "hi" },
    })
    store.ingest({
      inserts: [
        { x: 0, y: 50, offset: 5, lo: 20, hi: 60 },  // bounds: 45-55, band: 20-60
        { x: 1, y: 55, offset: 8, lo: 25, hi: 90 },  // bounds: 47-63, band: 25-90
      ],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const [lo, hi] = store.scales!.y.domain() as [number, number]
    expect(lo).toBe(20) // band low wins
    expect(hi).toBe(90) // band high wins
  })

  it("null/zero offset produces zero-width ribbon (legacy bounds behavior)", () => {
    const store = new PipelineStore({
      chartType: "line",
      runtimeMode: "bounded",
      windowSize: 200,
      windowMode: "sliding",
      arrowOfTime: "right",
      extentPadding: 0,
      xAccessor: "x",
      yAccessor: "y",
      boundsAccessor: () => null as unknown as number,
    })
    store.ingest({
      inserts: [{ x: 0, y: 10 }, { x: 1, y: 20 }, { x: 2, y: 30 }],
      bounded: true,
    })
    store.computeScene({ width: 400, height: 200 })
    const area = store.scene.find((n): n is AreaSceneNode => n.type === "area")!
    // Zero-width ribbon: topPath and bottomPath at the same y values
    expect(area.topPath.length).toBe(area.bottomPath.length)
    expect(area.topPath.length).toBe(3)
  })
})
