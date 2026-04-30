import { describe, it, expect } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig, NetworkCircleNode, NetworkLineEdge } from "./networkTypes"
import type { NetworkLayoutContext } from "./networkCustomLayout"

function baseConfig(extra: Partial<NetworkPipelineConfig> = {}): NetworkPipelineConfig {
  return {
    chartType: "force",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    ...extra,
  }
}

describe("NetworkPipelineStore customNetworkLayout", () => {
  it("invokes customLayout instead of plugin dispatch", () => {
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return {
        sceneNodes: ctx.nodes.map<NetworkCircleNode>((n, i) => ({
          type: "circle",
          cx: i * 20,
          cy: 50,
          r: 5,
          style: { fill: ctx.resolveColor(n.id) },
          datum: n,
          id: n.id,
        })),
        sceneEdges: [],
        labels: [],
      }
    }

    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      layoutConfig: { greeting: "hi" },
    }))
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
      [],
      [400, 200]
    )
    store.buildScene([400, 200])

    expect(store.sceneNodes).toHaveLength(3)
    expect(store.sceneNodes[0].type).toBe("circle")
    expect(captured).not.toBeNull()
    expect(captured!.config).toEqual({ greeting: "hi" })
    expect(captured!.dimensions.plot).toEqual({ x: 0, y: 0, width: 400, height: 200 })
    expect(typeof captured!.resolveColor).toBe("function")
  })

  it("resolveColor returns stable colors for the same key", () => {
    let resolveColor: ((k: string) => string) | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      resolveColor = ctx.resolveColor
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      colorScheme: ["#ff0000", "#00ff00", "#0000ff"],
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    const c1 = resolveColor!("alpha")
    const c2 = resolveColor!("alpha")
    expect(c1).toBe(c2)
    expect(["#ff0000", "#00ff00", "#0000ff"]).toContain(c1)
  })

  it("resolveColor honors named d3 schemes (e.g. tableau10)", () => {
    // Regression: original implementation only handled array-form
    // colorScheme — a string like "tableau10" silently fell through to
    // the fallback palette.
    let resolveColor: ((k: string) => string) | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      resolveColor = ctx.resolveColor
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
      colorScheme: "tableau10",
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    const colors = ["alpha", "beta", "gamma"].map((k) => resolveColor!(k))
    // Tableau10's first color is #4e79a7 — at least one of three keys
    // should land on a Tableau10 entry, not the schemeCategory10 fallback.
    const tableau10 = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"]
    expect(colors.some((c) => tableau10.includes(c))).toBe(true)
  })

  it("runLayout bumps layoutVersion when customLayout is supplied", () => {
    // Regression: the customLayout escape hatch in runLayout used to
    // return early without incrementing layoutVersion, so push-mode
    // React subscribers never saw the change.
    const layout = () => ({ sceneNodes: [], sceneEdges: [], labels: [] })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    const before = store.layoutVersion
    store.runLayout([100, 100])
    expect(store.layoutVersion).toBeGreaterThan(before)
  })

  it("captures overlays returned by customLayout", () => {
    const overlay = { _sentinel: true } as unknown as React.ReactNode
    const layout = () => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      overlays: overlay,
    })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.customLayoutOverlays).toBe(overlay)
  })

  it("clears overlays when customLayout is removed", () => {
    const layout = () => ({
      sceneNodes: [],
      sceneEdges: [],
      labels: [],
      overlays: { _sentinel: true } as unknown as React.ReactNode,
    })
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])
    expect(store.customLayoutOverlays).not.toBeNull()

    // Reconfigure to a built-in chart type without customLayout
    store.updateConfig({ ...baseConfig(), customNetworkLayout: undefined })
    store.buildScene([100, 100])
    expect(store.customLayoutOverlays).toBeNull()
  })

  it("renders empty scene when layout throws", () => {
    const layout = () => { throw new Error("boom") }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded([{ id: "a" }], [], [100, 100])
    store.buildScene([100, 100])

    expect(store.sceneNodes).toEqual([])
    expect(store.sceneEdges).toEqual([])
    expect(store.labels).toEqual([])
  })

  it("wraps raw nodes in RealtimeNode with user data on `node.data`", () => {
    // Regression: recipes (flextree, dagre) initially read `node.x`/`node.y`
    // directly, but `ingestBounded` produces `{ ...createNode(id), data: raw }`
    // — so user-supplied positions live on `node.data`, not the wrapper.
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded(
      [{ id: "a", x: 100, y: 50, label: "Alpha" }],
      [],
      [400, 200]
    )
    store.buildScene([400, 200])

    const node = captured!.nodes[0]
    // The wrapper itself defaults to 0 — user fields live on `node.data`.
    expect(node.x).toBe(0)
    expect(node.y).toBe(0)
    expect(node.data).toMatchObject({ id: "a", x: 100, y: 50, label: "Alpha" })
  })

  it("supports user-emitted line edges", () => {
    const layout = (ctx: NetworkLayoutContext) => {
      const positions = new Map<string, { x: number; y: number }>()
      ctx.nodes.forEach((n, i) => positions.set(n.id, { x: i * 50, y: 100 }))
      const sceneNodes: NetworkCircleNode[] = ctx.nodes.map((n) => ({
        type: "circle",
        cx: positions.get(n.id)!.x,
        cy: positions.get(n.id)!.y,
        r: 4,
        style: { fill: ctx.resolveColor(n.id) },
        datum: n,
        id: n.id,
      }))
      const sceneEdges: NetworkLineEdge[] = ctx.edges.map((e) => {
        const s = typeof e.source === "string" ? e.source : e.source.id
        const t = typeof e.target === "string" ? e.target : e.target.id
        return {
          type: "line",
          x1: positions.get(s)!.x,
          y1: positions.get(s)!.y,
          x2: positions.get(t)!.x,
          y2: positions.get(t)!.y,
          style: { stroke: "#999" },
          datum: e,
          source: s,
          target: t,
        }
      })
      return { sceneNodes, sceneEdges, labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({
      customNetworkLayout: layout,
    }))
    store.ingestBounded(
      [{ id: "a" }, { id: "b" }],
      [{ source: "a", target: "b" }],
      [400, 200]
    )
    store.buildScene([400, 200])

    expect(store.sceneNodes).toHaveLength(2)
    expect(store.sceneEdges).toHaveLength(1)
    expect(store.sceneEdges[0].type).toBe("line")
  })
})
