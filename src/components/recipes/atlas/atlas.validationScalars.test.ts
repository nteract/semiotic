import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { prepareNetworkAtlas, type PrepareOptions } from "./prepare"
import { validateAtlas } from "./validate"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

function fixture(): { spec: NetworkAtlasSpec; source: NetworkAtlasSource } {
  return JSON.parse(
    readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../../../../scripts/network-atlas/fixtures/etl-snapshot-v1.json"
      ),
      "utf8"
    )
  )
}

describe("Atlas scalar input contracts", () => {
  it.each([
    ["source.revision", 1n],
    ["source.graphRef", {}],
    ["spec.dataRevision", 1n],
    ["spec.evidencePolicyId", undefined],
    ["spec.motifs", {}],
    ["spec.motifs.catalogVersion", false],
    ["spec.motifs.countUnit", "constructor"],
    ["spec.motifs.anchor", "start"],
    ["spec.motifs.matchBudget", 1n],
    ["spec.motifs.matchBudget", -1],
    ["spec.motifs.matchBudget", 1.5],
    ["spec.motifs.timeWindowMs", Infinity],
    ["spec.motifs.denominatorRef", {}],
    ["spec.temporal", {}],
    ["spec.temporal", { kind: "window", start: 0 }],
    ["spec.temporal", { kind: "window", start: 1, end: 0 }],
    ["spec.temporal", { kind: "window", start: 0, end: Infinity }],
    ["spec.temporal", { kind: "window", start: "0", end: 1 }],
    ["spec.forest.display.rankingPolicyId", undefined],
    ["spec.forest.display.referencePartition", {}],
    ["spec.measures.ingest_arrival_rate.timeDenominator", {}],
    ["spec.measures.queued.description", {}],
    ["spec.relations.parallelEdges", "drop"],
    ["spec.relations.selfLoops", false],
    ["source.nodes.0.sectionId", Object.create(null)],
    ["source.nodes.0.completeness", "constructor"],
    ["source.measureValues.0.status", "unsupported"]
  ] as Array<[string, unknown]>)(
    "returns issues for malformed %s",
    (path, value) => {
      const input = fixture()
      const parts = path.split(".")
      let parent = input as unknown as Record<string, unknown>
      for (const part of parts.slice(0, -1))
        parent = parent[part] as Record<string, unknown>
      parent[parts[parts.length - 1]] = value
      expect(validateAtlas(input.spec, input.source).ok).toBe(false)
      const result = prepareNetworkAtlas(input.spec, input.source)
      expect(result.ok).toBe(false)
      expect(result.issues.some(({ severity }) => severity === "fatal")).toBe(
        true
      )
    }
  )

  it.each([
    { entityCount: 1n },
    { entityCount: -1 },
    { entityCount: NaN },
    { complete: undefined },
    { complete: "false" },
    { missingPrehistory: "false" },
    { partition: {} },
    { groupKeys: [] },
    { groupKeys: { cohort: {} } }
  ])("rejects malformed occurrence evidence case %#", (override) => {
    const { spec, source } = fixture()
    const occurrences = [
      {
        id: "visit",
        entityId: "entity",
        nodePath: ["ingest"],
        complete: true,
        ...override
      }
    ]
    const result = prepareNetworkAtlas(spec, {
      ...source,
      occurrences
    } as NetworkAtlasSource)
    expect(result.ok).toBe(false)
    expect(result.issues.some(({ kind }) => kind === "occurrence")).toBe(true)
  })

  it.each([
    null,
    { generation: 1n },
    { generation: Infinity },
    { generation: -1 },
    { generation: 0.5 }
  ])("rejects invalid generation options case %#", (options) => {
    const { spec, source } = fixture()
    expect(
      prepareNetworkAtlas(spec, source, options as PrepareOptions)
    ).toMatchObject({
      ok: false,
      issues: [{ kind: "generation", severity: "fatal" }]
    })
  })

  it("returns an issue for nonserializable spec extensions", () => {
    const { spec, source } = fixture()
    for (const extension of [1n, { spec }]) {
      const extended = Object.assign(spec, { extension })
      expect(prepareNetworkAtlas(extended, source)).toMatchObject({
        ok: false,
        issues: [{ kind: "spec-serialization", severity: "fatal" }]
      })
    }
  })

  it("preserves valid zero budgets, temporal bounds, and incomplete evidence", () => {
    const { spec, source } = fixture()
    spec.motifs.matchBudget = 0
    spec.motifs.timeWindowMs = 0
    spec.temporal = { kind: "window", start: 0, end: 0 }
    source.occurrences = [
      {
        id: "visit",
        entityId: "entity",
        entityCount: 0,
        nodePath: ["ingest"],
        complete: false,
        partition: "",
        missingPrehistory: false,
        groupKeys: { cohort: "" }
      }
    ]
    const result = prepareNetworkAtlas(spec, source, { generation: 0 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.atlas.provenance.generation).toBe(0)
      expect(result.atlas.provenance.temporalHorizon).toBe("window")
      expect(result.atlas.completeness.traces).toBe("incomplete")
    }
  })
})
