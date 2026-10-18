import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NetworkSceneEdge } from "./networkTypes"

type PathEdge = Exclude<NetworkSceneEdge, { type: "line" }>

describe("network edge bounds before exact Canvas hits", () => {
  let hitTest: typeof import("./NetworkCanvasHitTester").findNearestNetworkNode
  const inStroke = vi.fn(() => true)
  const inFill = vi.fn(() => false)
  const constructed = vi.fn()
  const ctx = { lineWidth: 1, isPointInStroke: inStroke, isPointInPath: inFill }
  const edge = (): PathEdge => ({
    type: "curved",
    pathD: "M-100,-100 L100,-100",
    style: { stroke: "navy", fill: "none" },
    datum: { id: "edge" }
  })

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    inStroke.mockReturnValue(true)
    inFill.mockReturnValue(false)
    vi.stubGlobal(
      "Path2D",
      class {
        constructor(d: string) {
          constructed(d)
        }
      }
    )
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      ctx as unknown as CanvasRenderingContext2D
    )
    hitTest = (await import("./NetworkCanvasHitTester")).findNearestNetworkNode
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("rejects 4,500 distant paths without constructing or querying Path2D", () => {
    const edges = Array.from({ length: 4500 }, edge)
    expect(hitTest([], edges, 1000, 1000)).toBeNull()
    expect(constructed).not.toHaveBeenCalled()
    expect(inStroke).not.toHaveBeenCalled()
    expect(hitTest([], edges, 0, -100)?.mark).toBe(edges[4499])
    expect(constructed).toHaveBeenCalledTimes(1)
  })

  it("still requires an exact hit inside the conservative bounds", () => {
    inStroke.mockReturnValue(false)
    expect(hitTest([], [edge()], 0, -100)).toBeNull()
    expect(inStroke).toHaveBeenCalledTimes(1)
  })

  it("invalidates a retained record on path changes and preserves paint order", () => {
    const bottom = edge(),
      top = { ...edge(), datum: { id: "top" } }
    const edges = [bottom, top]
    expect(hitTest([], edges, 0, -100)?.mark).toBe(top)
    top.pathD = "M900,900 L1100,900"
    expect(hitTest([], edges, 0, -100)?.mark).toBe(bottom)
    expect(hitTest([], edges, 1000, 900)?.mark).toBe(top)
    top.pathD = bottom.pathD
    edges.reverse()
    expect(hitTest([], edges, 0, -100)?.mark).toBe(bottom)
    expect(constructed).toHaveBeenCalledWith("M900,900 L1100,900")
  })

  it("reads stroke widths, interaction flags, fill and camera scale on every query", () => {
    const mark = edge(),
      edges = [mark]
    expect(hitTest([], edges, 0, 0)).toBeNull()
    mark.style.strokeWidth = 40
    expect(hitTest([], edges, 0, 0)?.mark).toBe(mark)
    mark.style.strokeWidth = 1
    expect(hitTest([], edges, 0, 0)).toBeNull()
    expect(hitTest([], edges, 0, 0, 12, null, 0, true, 0.3)?.mark).toBe(mark)
    mark.interactive = false
    expect(hitTest([], edges, 0, -100)).toBeNull()
    mark.interactive = true
    mark.style = { stroke: "none", fill: "red", opacity: 0 }
    inFill.mockReturnValue(true)
    expect(hitTest([], edges, 0, -100)?.mark).toBe(mark)
    expect(hitTest([], edges, 0, -100, 12, null, 0, false)).toBeNull()
  })

  it.each(["bezier", "ribbon", "curved"] as const)(
    "keeps filled %s interiors and node priority",
    (type) => {
      const mark: PathEdge = {
        ...edge(),
        type,
        pathD: "M-100,-100 H100 V100 H-100 Z",
        style: { fill: "red", stroke: "none" }
      }
      inFill.mockReturnValue(true)
      expect(hitTest([], [mark], 0, 0)?.mark).toBe(mark)
      const node = {
        type: "circle" as const,
        cx: 0,
        cy: 0,
        r: 10,
        style: { fill: "red" },
        datum: { id: "node" }
      }
      expect(hitTest([node], [mark], 0, 0)?.mark).toBe(node)
    }
  )

  it("falls back to exact Canvas queries when complete path bounds are unavailable", () => {
    const mark = { ...edge(), pathD: "M0 0 L100 0 L" }
    expect(hitTest([], [mark], 50, 0)?.mark).toBe(mark)
    expect(inStroke).toHaveBeenCalledTimes(1)
  })

  it("reuses geometry-only bounds across style changes, including failed parses", async () => {
    // Reimport after resetModules to observe the same parser instance as the cache.
    const parser = await import("../geometry/svgPathBounds")
    const parse = vi.spyOn(parser, "svgPathBounds")
    const mark = edge()
    hitTest([], [mark], 1000, 1000)
    mark.style.strokeWidth = 4
    hitTest([], [mark], 1000, 1000)
    expect(parse).toHaveBeenCalledTimes(1)
    mark.pathD = "M0 0 L"
    hitTest([], [mark], 0, 0)
    hitTest([], [mark], 0, 0)
    expect(parse).toHaveBeenCalledTimes(2)
  })

  it("prepares custom scene bounds before hover without constructing all Canvas paths", async () => {
    const { prepareNetworkCustomHits } =
      await import("./networkFrameCursorInteraction")
    const parser = await import("../geometry/svgPathBounds")
    const parse = vi.spyOn(parser, "svgPathBounds")
    const mark = edge()
    const { NetworkPipelineStore } = await import("./NetworkPipelineStore")
    const store = new NetworkPipelineStore({ chartType: "force" })
    store.lastCustomLayoutResult = {}
    store.sceneEdges = [mark]
    prepareNetworkCustomHits(store)
    expect(parse).toHaveBeenCalledTimes(1)
    expect(constructed).not.toHaveBeenCalled()
    hitTest([], store.sceneEdges, 0, -100)
    expect(parse).toHaveBeenCalledTimes(1)
    expect(constructed).toHaveBeenCalledTimes(1)
    mark.pathD = "M900,900 L1100,900"
    prepareNetworkCustomHits(store)
    expect(parse).toHaveBeenCalledTimes(2)
    expect(hitTest([], store.sceneEdges, 0, -100)).toBeNull()
  })

  it("does not prepare built-in scenes, opted-out layouts or decorative paths", async () => {
    const { prepareNetworkCustomHits } =
      await import("./networkFrameCursorInteraction")
    const parser = await import("../geometry/svgPathBounds")
    const parse = vi.spyOn(parser, "svgPathBounds")
    const { NetworkPipelineStore } = await import("./NetworkPipelineStore")
    const store = new NetworkPipelineStore({ chartType: "force" })
    store.sceneEdges = [edge()]
    prepareNetworkCustomHits(store)
    store.lastCustomLayoutResult = { edgeHitTesting: false }
    prepareNetworkCustomHits(store)
    store.lastCustomLayoutResult = {}
    store.sceneEdges[0].interactive = false
    prepareNetworkCustomHits(store)
    expect(parse).not.toHaveBeenCalled()
  })
})
