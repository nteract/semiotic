import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { ledgerValue } from "./ledger"
import { operationalLabel } from "./motifs"
import { prepareNetworkAtlas } from "./prepare"
import { publishPreparedAtlas } from "./publish"
import {
  followSupportedRoute,
  getMotifPrevalence,
  getMotifWitness,
  getResidualConnections,
  getSectionMeasures
} from "./queries"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "./types"

const FIXTURE_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../scripts/network-atlas/fixtures"
)

function loadJson(name: string): {
  spec: NetworkAtlasSpec
  source: NetworkAtlasSource
  expected: Record<string, unknown>
} {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, name), "utf8"))
}

describe("etl-snapshot-v1 kernel", () => {
  const fixture = loadJson("etl-snapshot-v1.json")
  const prepared = prepareNetworkAtlas(fixture.spec, fixture.source)
  if (!prepared.ok) {
    throw new Error(prepared.issues.map((issue) => issue.message).join("; "))
  }
  const { atlas } = prepared
  const expected = fixture.expected as {
    admitted: number
    completedAtLoad: number
    deadLetter: number
    queuedHot: number
    backboneEdgeIds: string[]
    residualEdgeIds: string[]
    fanOutHub: string
    fanOutDestinations: string[]
    fanInHub: string
    fanInSources: string[]
    serialChainContains: string[]
    unknownNodeIds: string[]
  }

  it("keeps conservation 60 = 45 + 5 + 10", () => {
    expect(ledgerValue(atlas.ledger, "work-items", "ingest")?.value).toBe(60)
    expect(ledgerValue(atlas.ledger, "completed", "load")?.value).toBe(45)
    expect(ledgerValue(atlas.ledger, "work-items", "dead_letter")?.value).toBe(5)
    expect(ledgerValue(atlas.ledger, "queued", "write_hot")?.value).toBe(10)
    expect(45 + 5 + 10).toBe(expected.admitted)
  })

  it("indexes ordinal sections without using a render transform", () => {
    expect(atlas.sections.sectionIds).toEqual(["ingest", "enrich", "write", "load"])
    expect(atlas.sections.nodeIdsBySection.ingest).toEqual(["upstream", "ingest"])
    expect(getSectionMeasures(atlas, "ingest", { measureId: "work-items" }).value).toBe(60)
  })

  it("matches fan-out, fan-in, and a serial chain through ingest → enrich", () => {
    const fanOut = atlas.motifs.matches.find((match) => match.template === "fan-out")
    const fanIn = atlas.motifs.matches.find((match) => match.template === "fan-in")
    expect(fanOut?.roles.source).toBe(expected.fanOutHub)
    expect(fanOut?.roles.destinations).toEqual(expect.arrayContaining(expected.fanOutDestinations))
    expect(fanIn?.roles.destination).toBe(expected.fanInHub)
    expect(fanIn?.roles.sources).toEqual(expect.arrayContaining(expected.fanInSources))
    expect(operationalLabel(fanIn!)).toBeUndefined()
    const chain = atlas.motifs.matches.find(
      (match) =>
        match.template === "serial-chain" &&
        expected.serialChainContains.every((id) => match.nodePath.includes(id))
    )
    expect(chain).toBeDefined()
  })

  it("does not implement diamond AND/OR semantics", () => {
    const diamond = getMotifPrevalence(atlas, { template: "split-rejoin-diamond" })
    expect(atlas.motifs.unsupportedTemplates).toContain("split-rejoin-diamond")
    expect(diamond.status).toBe("unknown")
    expect(diamond.limitations).toContain("unsupported-template")
  })

  it("keeps e9 residual and covers every original edge id", () => {
    expect(atlas.forest.backboneEdgeIds.sort()).toEqual([...expected.backboneEdgeIds].sort())
    expect(atlas.residualEdges.residualEdgeIds).toEqual(expected.residualEdgeIds)
    const union = new Set([
      ...atlas.forest.backboneEdgeIds,
      ...atlas.residualEdges.residualEdgeIds
    ])
    expect([...union].sort()).toEqual(atlas.residualEdges.originalEdgeIds.sort())
    expect(
      atlas.forest.backboneEdgeIds.some((id) => atlas.residualEdges.residualEdgeIds.includes(id))
    ).toBe(false)
  })

  it("returns residual e9 from enrich with endpoint identity", () => {
    const residual = getResidualConnections(atlas, "enrich")
    expect(residual.value).toEqual([
      { edgeId: "e9", source: "enrich", target: "dead_letter" }
    ])
  })

  it("agrees across section measures, ledger, and motif support counts", () => {
    const ingest = getSectionMeasures(atlas, "ingest", { measureId: "work-items" })
    const enrich = ledgerValue(atlas.ledger, "work-items", "enrich")
    expect(ingest.value).toBe(enrich?.value)
    const fanOut = atlas.motifs.matches.find((match) => match.template === "fan-out")
    expect(fanOut).toBeDefined()
    expect(atlas.completeness.nodes.upstream).toBe("unknown")
  })

  it("distinguishes completion-section prevalence from interval intersection", () => {
    const completionWrite = getMotifPrevalence(atlas, {
      template: "serial-chain",
      window: { kind: "completion", sectionId: "write" }
    })
    const intersectionWrite = getMotifPrevalence(atlas, {
      template: "serial-chain",
      window: { kind: "intersection", sectionId: "write" }
    })
    expect(completionWrite.value?.matchCount).toBe(0)
    expect(intersectionWrite.value?.matchCount ?? 0).toBeGreaterThan(0)
  })

  it("does not invent journeys when traces are missing", () => {
    const route = followSupportedRoute(atlas, { fromNode: "ingest" })
    expect(route.status).toBe("unknown")
    expect(route.limitations).toContain("missing-traces")
  })

  it("keeps motif and ledger facts when the display backbone ranking changes", () => {
    const tree = prepareNetworkAtlas(
      {
        ...fixture.spec,
        forest: {
          display: {
            ...fixture.spec.forest.display,
            rankingPolicyId: "tree-only"
          }
        }
      },
      fixture.source
    )
    expect(tree.ok).toBe(true)
    if (!tree.ok) return
    expect(tree.atlas.motifs.matches.map((match) => match.id).sort()).toEqual(
      atlas.motifs.matches.map((match) => match.id).sort()
    )
    expect(ledgerValue(tree.atlas.ledger, "queued", "write_hot")?.value).toBe(10)
    const union = new Set([
      ...tree.atlas.forest.backboneEdgeIds,
      ...tree.atlas.residualEdges.residualEdgeIds
    ])
    expect([...union].sort()).toEqual(tree.atlas.residualEdges.originalEdgeIds.sort())
    expect(tree.atlas.completeness.nodes.upstream).toBe("unknown")
  })

  it("refuses to publish an obsolete generation over a newer one", () => {
    const store = new Map()
    const newer = prepareNetworkAtlas(fixture.spec, fixture.source, { generation: 2 })
    const older = prepareNetworkAtlas(fixture.spec, fixture.source, { generation: 1 })
    expect(newer.ok && older.ok).toBe(true)
    if (!newer.ok || !older.ok) return
    expect(publishPreparedAtlas(store, newer.atlas).published).toBe(true)
    expect(publishPreparedAtlas(store, older.atlas)).toEqual({
      published: false,
      reason: "obsolete-revision"
    })
    expect(store.get(newer.atlas.sourceGraphRef)?.provenance.generation).toBe(2)
  })
})

describe("match budget", () => {
  it("discloses truncation instead of returning a silent empty set", () => {
    const destinations = Array.from({ length: 8 }, (_, index) => `d${index}`)
    const spec: NetworkAtlasSpec = {
      schemaVersion: "0.2",
      coordinate: { kind: "ordinal", sectionIds: ["s"] },
      relations: {
        directed: true,
        edgeIdRequired: true,
        parallelEdges: "keep-by-id",
        selfLoops: "keep-by-id"
      },
      evidencePolicyId: "atlas-phase1-exact",
      measures: {},
      motifs: {
        catalogId: "atlas-phase1",
        catalogVersion: "0.1.0",
        countUnit: "occurrence",
        anchor: "completion",
        matchBudget: 3
      },
      forest: {
        display: { kind: "rooted-backbone", roots: ["hub"], rankingPolicyId: "main-transport" }
      },
      dataRevision: "star",
      temporal: { kind: "snapshot" }
    }
    const source: NetworkAtlasSource = {
      graphRef: "star",
      revision: "star",
      nodes: [
        { id: "hub", sectionId: "s" },
        ...destinations.map((id) => ({ id, sectionId: "s" as const }))
      ],
      edges: destinations.map((id) => ({ id: `e-${id}`, source: "hub", target: id })),
      measureValues: []
    }
    const prepared = prepareNetworkAtlas(spec, source)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    const fanOut = prepared.atlas.motifs.matches.find((match) => match.template === "fan-out")
    expect(fanOut).toBeDefined()
    expect(fanOut?.truncation).toEqual({ disclosed: true, omitted: 5, fullCount: 8 })
    expect((fanOut?.roles.destinations as string[]).length).toBe(3)
    const witness = getMotifWitness(prepared.atlas, fanOut!.id)
    expect(witness.status).toBe("truncated")
    expect(prepared.atlas.completeness.truncation?.omitted).toBe(5)
  })
})
