import { describe, expect, it, vi } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkCustomLayout } from "./networkCustomLayout"
import type { NetworkPipelineConfig } from "./networkTypes"

const size: [number, number] = [400, 300]
const nodes = [
  { id: "a", value: 1 },
  { id: "b", value: 2 }
]
const edges = [{ source: "a", target: "b", value: 1 }]
const geometry: NetworkCustomLayout = (ctx) => ({
  sceneNodes: ctx.nodes.map((node, i) => ({
    type: "circle",
    cx: ctx.dimensions.width / 2,
    cy: 30 + i * 30,
    r: 5,
    id: node.id,
    style: { fill: ctx.resolveColor(node.id) },
    datum: node
  })),
  htmlMarks: ctx.nodes.map((node) => ({
    id: node.id,
    x: ctx.dimensions.width / 2,
    y: 0,
    width: 20,
    height: 20,
    content: null
  }))
})

function fixture(extra: Partial<NetworkPipelineConfig> = {}) {
  const layout = vi.fn(geometry)
  const store = new NetworkPipelineStore({
    chartType: "force",
    customNetworkLayout: layout,
    ...extra
  })
  store.ingestBounded(nodes, edges, size)
  store.buildScene(size)
  expect(layout).toHaveBeenCalledTimes(1)
  return { store, layout }
}

describe("network custom layout reuse", () => {
  it("retains geometry, HTML marks and readback for identical builds and paint-only config", () => {
    const { store, layout } = fixture({ themeSemantic: { primary: "red" } })
    const scene = store.sceneNodes
    const result = store.lastCustomLayoutResult
    for (let i = 0; i < 5; i++) store.buildScene([...size])
    store.updateConfig({
      edgeOpacity: 0.2,
      showParticles: true,
      themeSemantic: { primary: "red" }
    })
    store.buildScene(size)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(store.sceneNodes).toBe(scene)
    expect(store.lastCustomLayoutResult).toBe(result)
    expect(store.customLayoutHtmlMarks).toBe(result?.htmlMarks)
  })

  it.each([
    { layoutConfig: { gap: 40 } },
    { themeSemantic: { primary: "blue" } },
    { themeCategorical: ["blue", "green"] },
    { colorScheme: ["orange", "purple"] },
    { layoutSelection: { isActive: true, predicate: () => false } }
  ])("invalidates a changed context field: %j", (patch) => {
    const { store, layout } = fixture()
    store.updateConfig(patch)
    store.buildScene(size)
    store.buildScene(size)
    expect(layout).toHaveBeenCalledTimes(2)
    const context = layout.mock.calls[1][0]
    if (patch.layoutConfig) expect(context.config).toBe(patch.layoutConfig)
    if (patch.themeSemantic)
      expect(context.theme.semantic).toBe(patch.themeSemantic)
    if (patch.themeCategorical)
      expect(context.theme.categorical).toEqual(patch.themeCategorical)
    if (patch.layoutSelection)
      expect(context.selection).toBe(patch.layoutSelection)
  })

  it("invalidates either dimension, callback identity, and an explicit relayout", () => {
    const { store, layout } = fixture()
    store.buildScene([700, 300])
    expect(store.sceneNodes[0]).toMatchObject({ cx: 350 })
    expect(store.customLayoutHtmlMarks[0].x).toBe(350)
    store.buildScene([700, 500])
    expect(layout).toHaveBeenCalledTimes(3)
    const replacement = vi.fn(geometry)
    store.updateConfig({ customNetworkLayout: replacement })
    store.buildScene(size)
    store.runLayout(size)
    store.buildScene(size)
    store.buildScene(size)
    expect(replacement).toHaveBeenCalledTimes(2)
  })

  it("observes every mutable topology operation, including pushes before runLayout", () => {
    const { store, layout } = fixture()
    const check = (count: number, ids: string[]) => {
      store.buildScene(size)
      store.buildScene(size)
      expect(layout).toHaveBeenCalledTimes(count)
      expect(store.sceneNodes.map((node) => node.id)).toEqual(ids)
    }
    store.ingestEdge({ source: "b", target: "c", value: 1 })
    check(2, ["a", "b", "c"])
    store.updateNode("a", (datum) => ({ ...datum, value: 9 }))
    check(3, ["a", "b", "c"])
    expect(layout.mock.calls[2][0].nodes[0].data?.value).toBe(9)
    store.updateEdge("a", "b", (datum) => ({ ...datum, value: 7 }))
    check(4, ["a", "b", "c"])
    store.removeEdge("a", "b")
    check(5, ["a", "b", "c"])
    store.removeNode("c")
    check(6, ["a", "b"])
    store.ingestBounded([{ id: "d" }], [], size)
    check(7, ["d"])
    store.clear()
    check(8, [])
    store.ingestBounded(nodes, edges, size)
    check(9, ["a", "b"])
  })

  it("retains an intentionally empty successful result", () => {
    const layout = vi.fn<NetworkCustomLayout>(() => ({}))
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: layout
    })
    store.buildScene(size)
    store.buildScene(size)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(store.lastCustomLayoutResult).toEqual({})
  })

  it("keeps the restyle fast path when a selection is followed by a paint invalidation", () => {
    const layout = vi.fn<NetworkCustomLayout>((ctx) => ({
      ...geometry(ctx),
      restyle: (_node, selection) => ({
        opacity: selection?.isActive ? 0.25 : 1
      })
    }))
    const store = new NetworkPipelineStore({
      chartType: "force",
      customNetworkLayout: layout
    })
    store.ingestBounded(nodes, edges, size)
    store.buildScene(size)
    const selection = { isActive: true, predicate: () => false }
    store.setLayoutSelection(selection)
    store.restyleScene(selection)
    store.buildScene(size)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(store.sceneNodes[0].style.opacity).toBe(0.25)
    store.setLayoutSelection(null)
    store.buildScene(size)
    expect(layout).toHaveBeenCalledTimes(1)
    expect(store.sceneNodes[0].style.opacity).toBe(1)
  })

  it("retries failures without replacing the last good geometry", () => {
    const { store, layout } = fixture()
    const scene = store.sceneNodes
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      layout.mockImplementationOnce(() => {
        throw new Error("retry me")
      })
      store.buildScene([500, 300])
      expect(store.sceneNodes).toBe(scene)
      expect(store.lastCustomLayoutFailure).not.toBeNull()
      store.buildScene([500, 300])
      store.buildScene([500, 300])
      expect(layout).toHaveBeenCalledTimes(3)
      expect(store.lastCustomLayoutFailure).toBeNull()
      expect(store.sceneNodes[0]).toMatchObject({ cx: 250 })
    } finally {
      error.mockRestore()
    }
  })
})
