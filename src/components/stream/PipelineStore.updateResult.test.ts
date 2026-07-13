import { describe, expect, it } from "vitest"
import { PipelineStore, type PipelineConfig } from "./PipelineStore"
import {
  classifyXYConfigPatch,
  XY_CONFIG_PATCH_DEPENDENCIES,
} from "./pipelineStoreUpdateResults"

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    chartType: "line",
    runtimeMode: "bounded",
    windowSize: 10,
    windowMode: "sliding",
    arrowOfTime: "right",
    extentPadding: 0.1,
    xAccessor: "x",
    yAccessor: "y",
    ...overrides,
  }
}

describe("PipelineStore update-result reference path", () => {
  it("reports data/domain/scene work while preserving the established ingest boolean API", () => {
    const store = new PipelineStore(makeConfig())
    const rows = [{ x: 1, y: 2 }, { x: 2, y: 3 }]

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
      "evidence",
    ])
    expect(result.revisions).toMatchObject({
      data: 1,
      domain: 1,
      layout: 1,
      sceneGeometry: 1,
      dataPaint: 1,
      accessibility: 1,
      evidence: 1,
    })

    // Same bounded array remains a no-op under the original ingest contract;
    // the result path makes that explicit rather than reusing stale changes.
    const noOp = store.ingestWithResult({ inserts: rows, bounded: true })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(result.revisions)
  })

  it("classifies accessor/config changes conservatively and leaves exact no-ops alone", () => {
    const store = new PipelineStore(makeConfig())
    store.ingestWithResult({ inserts: [{ x: 1, y: 2, nextY: 20 }], bounded: true })

    const changed = store.updateConfigWithResult({ yAccessor: "nextY" })
    expect(changed.changeSet).toEqual({ kind: "config", keys: ["yAccessor"] })
    expect(changed.changed).toEqual(expect.any(Set))
    expect([...changed.changed]).toEqual(expect.arrayContaining([
      "domain",
      "layout",
      "scene-geometry",
      "data-paint",
      "accessibility",
      "evidence",
    ]))
    expect(changed.revisions.data).toBe(1)
    expect(changed.revisions.domain).toBe(2)

    const noOp = store.updateConfigWithResult({ yAccessor: "nextY" })
    expect(noOp.changeSet).toEqual({ kind: "config", keys: [] })
    expect(noOp.changed.size).toBe(0)
    expect(noOp.revisions).toEqual(changed.revisions)
  })

  it("adds a scene-style revision when a style config changes", () => {
    const store = new PipelineStore(makeConfig())
    const result = store.updateConfigWithResult({ lineStyle: { stroke: "tomato" } })

    expect(result.changed.has("scene-style")).toBe(true)
    expect(result.changed.has("data-paint")).toBe(true)
    expect(result.revisions.sceneStyle).toBe(1)
  })

  it("declares retained-data, scale, style, and future-only config patch effects", () => {
    const store = new PipelineStore(makeConfig())

    const accessor = store.updateConfigWithResult({ yAccessor: "nextY" })
    expect(classifyXYConfigPatch(accessor.changeSet.keys ?? []).retainedData).toBe("rebuild")
    expect(XY_CONFIG_PATCH_DEPENDENCIES.yAccessor.retainedData).toBe("rebuild")
    expect(accessor.changed.has("domain")).toBe(true)
    expect(accessor.changed.has("layout")).toBe(true)

    const scale = store.updateConfigWithResult({ xExtent: [0, 10] })
    expect(classifyXYConfigPatch(scale.changeSet.keys ?? []).retainedData).toBe("preserve")
    expect(scale.changed.has("domain")).toBe(true)
    expect(scale.changed.has("scene-geometry")).toBe(true)

    const style = store.updateConfigWithResult({ lineStyle: { stroke: "steelblue" } })
    expect(style.changed.has("scene-style")).toBe(true)
    expect(style.changed.has("layout")).toBe(false)

    const futureOnly = store.updateConfigWithResult({ maxCapacity: 100 })
    expect(futureOnly.changeSet).toEqual({ kind: "config", keys: ["maxCapacity"] })
    expect(futureOnly.changed.size).toBe(0)
    expect(futureOnly.revisions).toEqual(style.revisions)
  })
})
