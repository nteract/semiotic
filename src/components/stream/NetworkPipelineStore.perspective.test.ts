import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import type { NetworkPerspective } from "./networkPerspective"
import { registerNetworkPerspective } from "./networkPerspectiveRuntime"
import * as loader from "./networkPerspectiveLoader"

const size: [number, number] = [400, 300]
const geometry: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((node, i) => ({
    type: "circle",
    cx: 60 + i * 120,
    cy: 60 + i * 60,
    r: 10,
    style: { fill: "#4e79a7" },
    datum: node,
    id: node.id
  })),
  labels: [{ x: 60, y: 40, text: "A", anchorPoint: [60, 60] }],
  htmlMarks: [{ id: "a", x: 60, y: 60, width: 20, height: 20, content: null }]
})

function fixture(perspective?: NetworkPerspective) {
  const layout = vi.fn(geometry)
  const store = new NetworkPipelineStore({ chartType: "force", customNetworkLayout: layout, perspective })
  store.ingestBounded([{ id: "a" }, { id: "b" }], [], size)
  store.buildScene(size)
  return { store, layout }
}

beforeEach(() => registerNetworkPerspective())
afterEach(() => vi.restoreAllMocks())

describe("cached custom perspective scenes", () => {
  it.each(["military", "flat"] as const)("commits the final transition frame to %s", (type) => {
    const { store, layout } = fixture({ type: "isometric", transition: { duration: 100 } })
    store.updateConfig({ perspective: type })
    store.buildScene(size)
    store.advancePerspectiveTransition(0)
    store.buildScene(size)
    store.advancePerspectiveTransition(50)
    store.buildScene(size)
    const halfway = store.sceneNodes
    expect(store.advancePerspectiveTransition(100)).toBe(true)
    expect(store.perspective.transitioning).toBe(false)
    store.buildScene(size)
    const target = fixture(type).store
    expect(store.sceneNodes).toEqual(target.sceneNodes)
    expect(store.sceneNodes).not.toEqual(halfway)
    expect(store.labels).toEqual(target.labels)
    expect(store.customLayoutHtmlMarks).toEqual(target.customLayoutHtmlMarks)
    expect(store.lastCustomLayoutResult?.sceneNodes).toBe(store.sceneNodes)
    expect(layout).toHaveBeenCalledTimes(2)
    const settled = store.sceneNodes
    store.buildScene(size)
    expect(store.sceneNodes).toBe(settled)
  })

  it("commits reduced-motion transitions immediately", () => {
    const { store, layout } = fixture()
    store.updateConfig({ perspective: { type: "pixel", transition: true } })
    store.buildScene(size)
    expect(store.advancePerspectiveTransition(0, true)).toBe(true)
    store.buildScene(size)
    expect(store.sceneNodes).toEqual(fixture("pixel").store.sceneNodes)
    expect(layout).toHaveBeenCalledTimes(2)
  })

  it("reprojects a retained flat scene when the lazy engine arrives", async () => {
    vi.spyOn(loader, "getNetworkPerspectiveEngine").mockReturnValueOnce(null)
    const { store, layout } = fixture("isometric")
    expect(store.perspective.frame).toBeNull()
    const repaint = vi.fn(() => store.buildScene(size))
    store.perspective.onExtrasReady = repaint
    await vi.waitFor(() => expect(repaint).toHaveBeenCalled())
    expect(store.sceneNodes).toEqual(fixture("isometric").store.sceneNodes)
    expect(layout).toHaveBeenCalledTimes(1)
  })

  it("reprojects retained geometry when lazy ground extras arrive", async () => {
    const extras = vi.spyOn(loader, "getNetworkPerspectiveExtras").mockReturnValue(null)
    const perspective: NetworkPerspective = { type: "isometric", ground: { grid: true }, regions: [{ id: "r", nodes: ["a"], depth: 20 }] }
    const { store, layout } = fixture(perspective)
    const before = store.sceneNodes
    expect(store.perspective.underlay).toEqual([])
    extras.mockRestore()
    const repaint = vi.fn(() => store.buildScene(size))
    store.perspective.onExtrasReady = repaint
    await vi.waitFor(() => expect(repaint).toHaveBeenCalled())
    expect(store.perspective.underlay.length).toBeGreaterThan(0)
    expect(store.sceneNodes).not.toEqual(before)
    expect(store.sceneNodes).toEqual(fixture(perspective).store.sceneNodes)
    expect(layout).toHaveBeenCalledTimes(1)
  })
})
