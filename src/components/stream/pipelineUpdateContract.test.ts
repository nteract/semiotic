import { describe, expect, it } from "vitest"
import {
  advanceRevisions,
  createRevisionSet,
  createUpdateResult,
} from "./pipelineUpdateContract"

describe("pipeline update contract", () => {
  it("advances only the revisions named by invalidations", () => {
    const initial = createRevisionSet()
    const next = advanceRevisions(initial, ["data", "domain", "data-paint"])

    expect(next).toMatchObject({
      data: 1,
      domain: 1,
      dataPaint: 1,
      layout: 0,
      sceneGeometry: 0,
      accessibility: 0,
    })
    expect(initial).toEqual(createRevisionSet())
  })

  it("deduplicates invalidations and snapshots change keys", () => {
    const keys = ["xAccessor", "yAccessor"]
    const result = createUpdateResult(
      { kind: "config", keys },
      ["domain", "domain", "scene-geometry"],
      createRevisionSet(),
    )
    keys.push("mutated-after-report")

    expect([...result.changed]).toEqual(["domain", "scene-geometry"])
    expect(result.revisions.domain).toBe(1)
    expect(result.revisions.sceneGeometry).toBe(1)
    expect(result.changeSet.keys).toEqual(["xAccessor", "yAccessor"])
  })

  it("preserves revisions for a no-op update", () => {
    const revisions = advanceRevisions(createRevisionSet(), ["data"])
    const result = createUpdateResult({ kind: "config" }, [], revisions)

    expect(result.changed.size).toBe(0)
    expect(result.revisions).toEqual(revisions)
  })
})
