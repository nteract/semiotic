import { describe, expect, it } from "vitest"
import { OrdinalPipelineStore } from "./OrdinalPipelineStore"
import {
  classifyOrdinalConfigPatch,
  ORDINAL_CONFIG_PATCH_DEPENDENCIES,
} from "./ordinalPipelineUpdateResults"
import type { OrdinalPipelineConfig } from "./ordinalTypes"

function makeConfig(
  overrides: Partial<OrdinalPipelineConfig> = {}
): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    runtimeMode: "bounded",
    windowSize: 10,
    windowMode: "sliding",
    extentPadding: 0.1,
    projection: "vertical",
    categoryAccessor: "category",
    valueAccessor: "value",
    dataIdAccessor: "id",
    ...overrides
  }
}

describe("OrdinalPipelineStore update-result reference path", () => {
  it("reports data/domain/scene work while preserving the established ingest API", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    const rows = [
      { id: "a", category: "A", value: 2 },
      { id: "b", category: "B", value: 3 }
    ]

    expect(store.ingest({ inserts: rows, bounded: true })).toBe(true)
    const result = store.getLastUpdateResult()

    expect(result.changeSet).toEqual({ kind: "replace", count: 2 })
    expect([...result.changed]).toEqual([
      "data",
      "domain",
      "layout",
      "scene-geometry",
      "data-paint",
      "overlay",
      "accessibility",
      "evidence"
    ])
    expect(result.revisions).toMatchObject({
      data: 1,
      domain: 1,
      layout: 1,
      sceneGeometry: 1,
      dataPaint: 1,
      accessibility: 1,
      evidence: 1
    })

    expect(store.remove("missing")).toEqual([])
    const noOp = store.getLastUpdateResult()
    expect(noOp.changeSet).toEqual({ kind: "remove", count: 0 })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(result.revisions)

    expect(store.update("a", (datum) => ({ ...datum, value: 5 }))).toEqual([
      { id: "a", category: "A", value: 2 }
    ])
    const updated = store.getLastUpdateResult()
    expect(updated.changeSet).toEqual({ kind: "update", count: 1 })
    expect(updated.changed.has("data")).toBe(true)
    expect(updated.revisions.data).toBe(2)
  })

  it("distinguishes domain/style config patches from exact no-ops", () => {
    const store = new OrdinalPipelineStore(makeConfig())
    store.ingestWithResult({
      inserts: [{ id: "a", category: "A", value: 2, nextValue: 20 }],
      bounded: true
    })

    const accessor = store.updateConfigWithResult({ valueAccessor: "nextValue" })
    expect(accessor.changeSet).toEqual({ kind: "config", keys: ["valueAccessor"] })
    expect(accessor.changed).toEqual(expect.any(Set))
    expect(accessor.changed.has("domain")).toBe(true)
    expect(accessor.changed.has("scene-geometry")).toBe(true)
    expect(accessor.revisions.data).toBe(1)
    expect(accessor.revisions.domain).toBe(2)

    const noOp = store.updateConfigWithResult({ valueAccessor: "nextValue" })
    expect(noOp.changeSet).toEqual({ kind: "config", keys: [] })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(accessor.revisions)

    const style = store.updateConfigWithResult({
      pieceStyle: () => ({ fill: "tomato" })
    })
    expect(style.changed.has("scene-style")).toBe(true)
    expect(style.changed.has("data-paint")).toBe(true)
    expect(style.revisions.sceneStyle).toBe(1)
  })

  it("makes restyle and clear outcomes explicit without changing their APIs", () => {
    const store = new OrdinalPipelineStore(makeConfig())

    store.restyleScene(null)
    const restyle = store.getLastUpdateResult()
    expect(restyle.changeSet).toEqual({ kind: "restyle" })
    expect(restyle.changed.size).toBe(0)

    store.clear()
    const cleared = store.getLastUpdateResult()
    expect(cleared.changeSet).toEqual({ kind: "clear" })
    expect(cleared.changed.has("data")).toBe(true)
    expect(cleared.revisions.data).toBe(1)
  })

  it("declares retained-data, order, style, and future-only config patch effects", () => {
    const store = new OrdinalPipelineStore(makeConfig())

    const accessor = store.updateConfigWithResult({ valueAccessor: "nextValue" })
    expect(classifyOrdinalConfigPatch(accessor.changeSet.keys ?? []).retainedData).toBe("rebuild")
    expect(ORDINAL_CONFIG_PATCH_DEPENDENCIES.valueAccessor.retainedData).toBe("rebuild")
    expect(accessor.changed.has("domain")).toBe(true)
    expect(accessor.changed.has("layout")).toBe(true)

    const order = store.updateConfigWithResult({ oSort: "desc" })
    expect(classifyOrdinalConfigPatch(order.changeSet.keys ?? []).retainedData).toBe("preserve")
    expect(order.changed.has("layout")).toBe(true)
    expect(order.changed.has("domain")).toBe(false)

    const style = store.updateConfigWithResult({ pieceStyle: () => ({ fill: "steelblue" }) })
    expect(style.changed.has("scene-style")).toBe(true)
    expect(style.changed.has("layout")).toBe(false)

    const futureOnly = store.updateConfigWithResult({ clock: () => 0 })
    expect(futureOnly.changeSet).toEqual({ kind: "config", keys: ["clock"] })
    expect(futureOnly.changed.size).toBe(0)
    expect(futureOnly.revisions).toEqual(style.revisions)
  })
})
