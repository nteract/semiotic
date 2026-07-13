import { describe, expect, it } from "vitest"
import { NetworkPipelineStore } from "./NetworkPipelineStore"
import {
  classifyNetworkConfigPatch,
  NETWORK_CONFIG_PATCH_DEPENDENCIES,
} from "./networkPipelineUpdateResults"
import type { NetworkPipelineConfig } from "./networkTypes"

function makeConfig(overrides: Partial<NetworkPipelineConfig> = {}): NetworkPipelineConfig {
  return {
    chartType: "sankey",
    nodeIDAccessor: "id",
    sourceAccessor: "source",
    targetAccessor: "target",
    valueAccessor: "value",
    ...overrides,
  }
}

describe("NetworkPipelineStore update-result reference path", () => {
  it("reports bounded and streaming topology changes without changing the legacy APIs", () => {
    const store = new NetworkPipelineStore(makeConfig())

    const bounded = store.ingestBoundedWithResult(
      [{ id: "A" }, { id: "B" }],
      [{ source: "A", target: "B", value: 2 }],
      [600, 400],
    )
    expect(bounded.changeSet).toEqual({ kind: "replace", count: 3 })
    expect([...bounded.changed]).toEqual(expect.arrayContaining([
      "data",
      "domain",
      "layout",
      "scene-geometry",
      "data-paint",
      "accessibility",
      "evidence",
    ]))

    expect(store.ingestEdge({ source: "A", target: "B", value: 1 })).toBe(true)
    const streamed = store.getLastUpdateResult()
    expect(streamed.changeSet).toEqual({ kind: "ingest", count: 1 })
    expect(streamed.revisions.data).toBe(2)

    expect(store.updateNode("missing", (datum) => datum)).toBeNull()
    const noOp = store.getLastUpdateResult()
    expect(noOp.changeSet).toEqual({ kind: "update", count: 0 })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(streamed.revisions)
  })

  it("distinguishes meaningful config changes from an equivalent config", () => {
    const store = new NetworkPipelineStore(makeConfig())
    const changedConfig = makeConfig({
      nodeStyle: () => ({ fill: "tomato" }),
      valueAccessor: "weight",
    })

    const changed = store.updateConfigWithResult(changedConfig)
    expect(changed.changeSet).toEqual(expect.objectContaining({
      kind: "config",
      keys: expect.arrayContaining(["nodeStyle", "valueAccessor"]),
    }))
    expect(changed.changed.has("domain")).toBe(true)
    expect(changed.changed.has("scene-style")).toBe(true)
    expect(changed.changed.has("data-paint")).toBe(true)

    const noOp = store.updateConfigWithResult(changedConfig)
    expect(noOp.changeSet).toEqual({ kind: "config", keys: [] })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(changed.revisions)
  })

  it("declares retained-data, layout, style, and exact no-op patch effects", () => {
    const store = new NetworkPipelineStore(makeConfig())
    const order = (a: unknown, b: unknown) => String(a).localeCompare(String(b))
    const nodeStyle = () => ({ fill: "steelblue" })

    const accessor = store.updateConfigWithResult({ valueAccessor: "weight" })
    expect(accessor.changeSet).toEqual({ kind: "config", keys: ["valueAccessor"] })
    expect(classifyNetworkConfigPatch(accessor.changeSet.keys ?? []).retainedData).toBe("rebuild")
    expect(NETWORK_CONFIG_PATCH_DEPENDENCIES.valueAccessor.retainedData).toBe("rebuild")
    expect(accessor.changed).toEqual(expect.any(Set))
    expect(accessor.changed.has("domain")).toBe(true)
    expect(accessor.changed.has("layout")).toBe(true)
    expect(accessor.changed.has("scene-geometry")).toBe(true)
    expect(accessor.changed.has("data-paint")).toBe(true)

    const layout = store.updateConfigWithResult({ edgeSort: order })
    expect(classifyNetworkConfigPatch(layout.changeSet.keys ?? []).retainedData).toBe("preserve")
    expect(layout.changed.has("layout")).toBe(true)
    expect(layout.changed.has("domain")).toBe(false)

    const style = store.updateConfigWithResult({ nodeStyle })
    expect(style.changed.has("scene-style")).toBe(true)
    expect(style.changed.has("data-paint")).toBe(true)
    expect(style.changed.has("layout")).toBe(false)

    const exactNoOp = store.updateConfigWithResult({ nodeStyle })
    expect(exactNoOp.changeSet).toEqual({ kind: "config", keys: [] })
    expect(exactNoOp.changed.size).toBe(0)
    expect(exactNoOp.revisions).toEqual(style.revisions)
  })
})
