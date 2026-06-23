import { describe, it, expect } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import type { NetworkPipelineConfig } from "./networkTypes"
import type { NetworkLayoutContext } from "./networkCustomLayout"
import type { Datum } from "../charts/shared/datumTypes"

function baseConfig(extra: Partial<NetworkPipelineConfig> = {}): NetworkPipelineConfig {
  return { chartType: "force", nodeIDAccessor: "id", sourceAccessor: "source", targetAccessor: "target", ...extra }
}

describe("NetworkPipelineStore — layoutSelection → ctx.selection", () => {
  it("threads the resolved selection predicate into the custom layout context", () => {
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const predicate = (d: Datum) => d.id === "a"
    const store = new NetworkPipelineStore(
      baseConfig({ customNetworkLayout: layout, layoutSelection: { isActive: true, predicate } })
    )
    store.ingestBounded([{ id: "a" }, { id: "b" }], [], [200, 100])
    store.buildScene([200, 100])

    expect(captured!.selection).toEqual({ isActive: true, predicate })
    expect(captured!.selection!.predicate({ id: "a" } as Datum)).toBe(true)
    expect(captured!.selection!.predicate({ id: "b" } as Datum)).toBe(false)
  })

  it("passes null selection when none is configured", () => {
    let captured: NetworkLayoutContext | null = null
    const layout = (ctx: NetworkLayoutContext) => {
      captured = ctx
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [200, 100])
    store.buildScene([200, 100])

    expect(captured!.selection).toBeNull()
  })

  it("re-runs the layout with the updated predicate after updateConfig (no re-ingest)", () => {
    const seen: Array<boolean | undefined> = []
    const layout = (ctx: NetworkLayoutContext) => {
      seen.push(ctx.selection?.isActive)
      return { sceneNodes: [], sceneEdges: [], labels: [] }
    }
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: layout }))
    store.ingestBounded([{ id: "a" }], [], [200, 100])
    store.buildScene([200, 100]) // selection inactive

    // Selection change arrives as a render-only config update; the frame then
    // rebuilds the scene without re-ingesting topology.
    store.updateConfig(baseConfig({ customNetworkLayout: layout, layoutSelection: { isActive: true, predicate: () => true } }))
    store.buildScene([200, 100])

    expect(seen).toEqual([undefined, true])
  })

  it("preserves layoutSelection across an updateConfig that omits it", () => {
    const sel = { isActive: true, predicate: (d: Datum) => d.id === "a" }
    const store = new NetworkPipelineStore(baseConfig({ layoutSelection: sel }))
    store.updateConfig(baseConfig()) // no layoutSelection in the new config
    expect(store.config.layoutSelection).toBe(sel)
  })
})

// The restyle channel: a layout that returns `restyle` opts into style-only
// updates — selection changes re-apply styles to the existing scene without a
// relayout (no scene-revision bump → quadtree stays valid).
describe("NetworkPipelineStore — custom-layout restyle pass", () => {
  const restyleLayout = (ctx: NetworkLayoutContext) => ({
    sceneNodes: ctx.nodes.map((n, i) => ({
      type: "circle" as const,
      cx: i * 10,
      cy: 0,
      r: 4,
      style: { fill: "#abc", opacity: 1 },
      datum: (n.data ?? n) as Datum,
      id: n.id,
    })),
    sceneEdges: [],
    restyle: (node: { datum: Datum }, selection: { isActive: boolean; predicate: (d: Datum) => boolean } | null) =>
      selection?.isActive && !selection.predicate(node.datum) ? { opacity: 0.1 } : { opacity: 1 },
  })

  function buildRestyleStore() {
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: restyleLayout }))
    store.ingestBounded([{ id: "a" }, { id: "b" }], [], [200, 100])
    store.buildScene([200, 100])
    return store
  }

  it("flags hasCustomRestyle and applies the restyle for the initial selection", () => {
    const store = buildRestyleStore()
    expect(store.hasCustomRestyle).toBe(true)
    // No active selection → everything lit.
    expect(store.sceneNodes.every((n) => n.style.opacity === 1)).toBe(true)
  })

  it("restyleScene re-applies styles WITHOUT bumping the scene revision (quadtree stays)", () => {
    const store = buildRestyleStore()
    const revBefore = (store as unknown as { _sceneNodesRevision: number })._sceneNodesRevision
    store.restyleScene({ isActive: true, predicate: (d: Datum) => d.id === "a" })
    const revAfter = (store as unknown as { _sceneNodesRevision: number })._sceneNodesRevision
    expect(revAfter).toBe(revBefore) // positions unchanged → no rebuild
    const byId = new Map(store.sceneNodes.map((n) => [n.id, n]))
    expect(byId.get("a")!.style.opacity).toBe(1)
    expect(byId.get("b")!.style.opacity).toBe(0.1)
  })

  it("restyles off the BASE style each pass (patches don't compound)", () => {
    const store = buildRestyleStore()
    store.restyleScene({ isActive: true, predicate: (d: Datum) => d.id === "a" })
    store.restyleScene({ isActive: true, predicate: (d: Datum) => d.id === "b" })
    const byId = new Map(store.sceneNodes.map((n) => [n.id, n]))
    // Second pass reflects ONLY the second selection, not an accumulation.
    expect(byId.get("a")!.style.opacity).toBe(0.1)
    expect(byId.get("b")!.style.opacity).toBe(1)
    // Base fill is preserved through restyles.
    expect(byId.get("a")!.style.fill).toBe("#abc")
  })

  it("does NOT flag restyle for a layout that omits it (falls back to rebuild path)", () => {
    const plain = (ctx: NetworkLayoutContext) => ({
      sceneNodes: ctx.nodes.map((n) => ({
        type: "circle" as const, cx: 0, cy: 0, r: 4, style: { fill: "#abc" }, datum: n as Datum, id: n.id,
      })),
      sceneEdges: [],
    })
    const store = new NetworkPipelineStore(baseConfig({ customNetworkLayout: plain }))
    store.ingestBounded([{ id: "a" }], [], [200, 100])
    store.buildScene([200, 100])
    expect(store.hasCustomRestyle).toBe(false)
    // restyleScene is a no-op when no restyle callback was supplied.
    const before = store.sceneNodes[0].style.opacity
    store.restyleScene({ isActive: true, predicate: () => false })
    expect(store.sceneNodes[0].style.opacity).toBe(before)
  })

  it("setLayoutSelection updates what the next buildScene reads, without rebuilding", () => {
    const store = buildRestyleStore()
    const rev = (store as unknown as { _sceneNodesRevision: number })._sceneNodesRevision
    store.setLayoutSelection({ isActive: true, predicate: (d: Datum) => d.id === "a" })
    expect((store as unknown as { _sceneNodesRevision: number })._sceneNodesRevision).toBe(rev)
    expect(store.config.layoutSelection?.isActive).toBe(true)
  })
})
