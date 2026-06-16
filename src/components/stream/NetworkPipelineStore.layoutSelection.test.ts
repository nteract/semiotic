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
})
