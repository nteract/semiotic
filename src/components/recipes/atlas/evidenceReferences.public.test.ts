import { describe, expect, it } from "vitest"
import {
  followSupportedRoute,
  getBypassWitness,
  getDependencyExclusion,
  getRequiredPaths,
  getSectionMeasures,
  prepareNetworkAtlas,
  validateAtlas,
  type EvidenceStatus,
  type NetworkAtlasSource,
  type NetworkAtlasSpec
} from "semiotic/atlas/core"
import { prepareNetworkAtlasAsync } from "semiotic/recipes/core"

function fixture() {
  const spec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    coordinate: { kind: "ordinal", sectionIds: ["s"] },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "test",
    measures: { count: { unitKind: "stock", countUnit: "entity" } },
    motifs: {
      catalogId: "atlas-phase1",
      catalogVersion: "0.1.0",
      countUnit: "entity",
      anchor: "completion"
    },
    forest: {
      display: {
        kind: "rooted-backbone",
        roots: ["r"],
        rankingPolicyId: "rooted-traversal:id-asc"
      },
      requiredPaths: { roots: ["r"], relationScopeId: "directed-admitted" }
    },
    dataRevision: "1",
    temporal: { kind: "snapshot" }
  }
  const source: NetworkAtlasSource = {
    graphRef: "scoped",
    revision: "1",
    nodes: ["r", "a", "b", "c", "t", "noise", "u", "v"].map((id) => ({
      id,
      sectionId: "s"
    })),
    edges: [
      ["ra", "r", "a"],
      ["ab", "a", "b"],
      ["bt", "b", "t"],
      ["ac", "a", "c"],
      ["ct", "c", "t"],
      ["ba", "b", "a"],
      ["ab2", "a", "b"],
      ["rn", "r", "noise"],
      ["uv", "u", "v"]
    ].map(([id, source, target]) => ({ id, source, target })),
    measureValues: [],
    occurrences: [
      {
        id: "via-b",
        entityId: "one",
        nodePath: ["r", "a", "b", "a", "b", "t"],
        complete: true
      },
      {
        id: "via-c",
        entityId: "two",
        nodePath: ["r", "a", "c", "t"],
        complete: true
      },
      {
        id: "noise-trace",
        entityId: "three",
        nodePath: ["r", "noise"],
        complete: true
      },
      {
        id: "partial",
        entityId: "four",
        nodePath: ["a", "c", "t"],
        complete: false,
        missingPrehistory: true
      }
    ]
  }
  return { spec, source }
}

function prepared() {
  const { spec, source } = fixture()
  const result = prepareNetworkAtlas(spec, source)
  if (!result.ok) throw new Error(JSON.stringify(result.issues))
  return result.atlas
}

describe("scoped Atlas evidence through public queries", () => {
  it("cites only admitted root-to-target relations, retaining parallel edges and cycles", () => {
    const atlas = prepared()
    const result = getRequiredPaths(atlas, "t")
    expect(result.value?.dominatorIds).toEqual(["r", "a"])
    expect(result.evidenceRefs).toEqual([
      "ra",
      "ab",
      "bt",
      "ac",
      "ct",
      "ba",
      "ab2"
    ])
    expect(getRequiredPaths(atlas, "u").evidenceRefs).toEqual([])
    expect(getRequiredPaths(atlas, "absent").evidenceRefs).toEqual([])
  })

  it("cites the relevant removal cut for absent bypasses and exclusions", () => {
    const atlas = prepared()
    const bypass = getBypassWitness(atlas, { target: "t", avoiding: ["a"] })
    expect(bypass.value).toEqual({ exists: false })
    expect(bypass.evidenceRefs).toEqual(["ra", "ab", "ac", "ba", "ab2"])
    const exclusion = getDependencyExclusion(atlas, ["a", "u"])
    expect(exclusion.value?.lostNodeIds.slice().sort()).toEqual([
      "a",
      "b",
      "c",
      "t"
    ])
    expect(exclusion.evidenceRefs).toEqual(bypass.evidenceRefs)
    expect(getDependencyExclusion(atlas, []).evidenceRefs).toEqual([])
    const witness = getBypassWitness(atlas, { target: "t", avoiding: ["b"] })
    expect(witness.value?.path?.edgeIds).toEqual(["ra", "ac", "ct"])
    expect(witness.evidenceRefs).toEqual(witness.value?.path?.edgeIds)
    expect(
      getBypassWitness(atlas, { target: "u", avoiding: ["a"] }).evidenceRefs
    ).toEqual([])
  })

  it("returns unique matching occurrence ids for next-hop, via and full-route queries", () => {
    const atlas = prepared()
    expect(followSupportedRoute(atlas, { fromNode: "a" }).evidenceRefs).toEqual(
      ["via-b", "via-c"]
    )
    expect(
      followSupportedRoute(atlas, { fromNode: "a", viaNode: "b" }).evidenceRefs
    ).toEqual(["via-b"])
    expect(
      followSupportedRoute(atlas, { route: ["a", "b", "t"] }).evidenceRefs
    ).toEqual(["via-b"])
    expect(
      followSupportedRoute(atlas, { route: ["b", "a", "c"] }).evidenceRefs
    ).toEqual([])
    expect(followSupportedRoute(atlas, { fromNode: "t" }).evidenceRefs).toEqual(
      []
    )
    expect(followSupportedRoute(atlas, { route: ["a"] }).evidenceRefs).toEqual(
      []
    )
  })

  it("rejects ambiguous occurrence ids through synchronous and asynchronous preparation", async () => {
    const { spec, source } = fixture()
    source.occurrences![1].id = source.occurrences![0].id
    expect(prepareNetworkAtlas(spec, source)).toMatchObject({
      ok: false,
      issues: expect.arrayContaining([
        expect.objectContaining({ kind: "duplicate-occurrence" })
      ])
    })
    expect(await prepareNetworkAtlasAsync(spec, source)).toEqual(
      prepareNetworkAtlas(spec, source)
    )
  })
})

describe("Atlas ledger uncertainty and identity", () => {
  const statuses: EvidenceStatus[] = [
    "exact",
    "estimated",
    "incomplete",
    "unknown"
  ]
  it.each(
    statuses.flatMap((left, i) =>
      statuses.map(
        (right, j) => [left, right, statuses[Math.max(i, j)]] as const
      )
    )
  )(
    "combines %s and %s as %s independent of input order",
    (left, right, expected) => {
      const { spec, source } = fixture()
      source.measureValues = [
        { measureId: "count", subjectId: "a", value: 3, status: left },
        { measureId: "count", subjectId: "b", value: 5, status: right }
      ]
      for (const rows of [
        source.measureValues,
        [...source.measureValues].reverse()
      ]) {
        const result = prepareNetworkAtlas(spec, {
          ...source,
          measureValues: rows
        })
        if (!result.ok) throw new Error(JSON.stringify(result.issues))
        expect(
          getSectionMeasures(result.atlas, "s", { measureId: "count" })
        ).toMatchObject({ value: 8, status: expected })
      }
    }
  )

  it("rejects duplicate measure/subject rows, including equal values and prototype-like ids", () => {
    for (const subjectId of ["a", "s", "__proto__"]) {
      const { spec, source } = fixture()
      const row = {
        measureId: "count",
        subjectId,
        value: 3,
        status: "exact" as const
      }
      source.measureValues = [row, { ...row }]
      expect(validateAtlas(spec, source)).toMatchObject({
        ok: false,
        issues: expect.arrayContaining([
          expect.objectContaining({ kind: "duplicate-measure-value" })
        ])
      })
      expect(prepareNetworkAtlas(spec, source).ok).toBe(false)
    }
  })

  it("preserves explicitly authored section values", () => {
    const { spec, source } = fixture()
    source.measureValues = [
      { measureId: "count", subjectId: "a", value: 3, status: "unknown" },
      { measureId: "count", subjectId: "s", value: 100, status: "estimated" }
    ]
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(
      getSectionMeasures(result.atlas, "s", { measureId: "count" })
    ).toMatchObject({ value: 100, status: "estimated" })
  })

  it("keeps delimiter-containing measure/section pairs distinct", () => {
    const { spec, source } = fixture()
    spec.coordinate = { kind: "ordinal", sectionIds: ["b\0c", "c"] }
    spec.measures = {
      a: { unitKind: "stock", countUnit: "entity" },
      "a\0b": { unitKind: "stock", countUnit: "entity" }
    }
    source.nodes = [
      { id: "r", sectionId: "b\0c" },
      { id: "n", sectionId: "c" }
    ]
    source.edges = []
    source.occurrences = []
    source.measureValues = [
      { measureId: "a", subjectId: "r", value: 3, status: "unknown" },
      { measureId: "a\0b", subjectId: "n", value: 5, status: "exact" }
    ]
    const result = prepareNetworkAtlas(spec, source)
    if (!result.ok) throw new Error(JSON.stringify(result.issues))
    expect(
      getSectionMeasures(result.atlas, "b\0c", { measureId: "a" })
    ).toMatchObject({ value: 3, status: "unknown" })
    expect(
      getSectionMeasures(result.atlas, "c", { measureId: "a\0b" })
    ).toMatchObject({ value: 5, status: "exact" })
  })
})
