import fixture from "../fixtures/supplier-redundancy-v1.json"
import { prepareNetworkAtlas } from "semiotic/atlas/core"
import { prepareDependencyForest } from "semiotic/atlas/core"
import type { NetworkAtlasSource, NetworkAtlasSpec } from "semiotic/atlas/core"

/** The browser, static edition and tests share the admitted synthetic fixture. */
export function supplierStory(bypass = false, reverseBackbone = false) {
  const spec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    coordinate: {
      kind: "ordinal",
      sectionIds: ["Origin", "Upstream", "Suppliers", "Product"]
    },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "synthetic-supplier-snapshot",
    measures: {
      allocation: {
        unitKind: "rate",
        countUnit: "work-item",
        timeDenominator: "week"
      },
      capacity: {
        unitKind: "capacity",
        countUnit: "work-item",
        timeDenominator: "week"
      }
    },
    motifs: {
      catalogId: "atlas-core",
      catalogVersion: "1",
      countUnit: "embedding",
      anchor: "completion"
    },
    forest: {
      display: {
        kind: "rooted-backbone",
        roots: [fixture.graph.root],
        rankingPolicyId: `rooted-traversal:id-${reverseBackbone ? "desc" : "asc"}`
      },
      requiredPaths: {
        roots: [fixture.graph.root],
        relationScopeId: "directed-admitted"
      }
    },
    dataRevision: `synthetic-suppliers:${bypass ? "zero-capacity-bypass" : "original"}`,
    temporal: { kind: "snapshot" }
  }
  const sections: Record<string, string> = {
    world: "Origin",
    X: "Upstream",
    Y: "Upstream",
    A: "Suppliers",
    B: "Suppliers",
    C: "Suppliers",
    product: "Product"
  }
  const source: NetworkAtlasSource = {
    graphRef: fixture.id,
    revision: spec.dataRevision,
    nodes: [...fixture.graph.nodes, ...(bypass ? ["Y"] : [])].map((id) => ({
      id,
      sectionId: sections[id]
    })),
    edges: [
      ...fixture.graph.edges,
      ...(bypass
        ? [
            { id: "wY", source: "world", target: "Y" },
            { id: "YA", source: "Y", target: "A" }
          ]
        : [])
    ],
    measureValues: [
      ...Object.entries(fixture.inputs.suppliers).map(([subjectId, value]) => ({
        measureId: "allocation",
        subjectId,
        value,
        status: "exact" as const
      })),
      {
        measureId: "capacity",
        subjectId: "C",
        value: fixture.inputs.cExpandableTo,
        status: "exact"
      },
      ...(bypass
        ? [
            {
              measureId: "capacity",
              subjectId: "Y",
              value: 0,
              status: "exact" as const
            }
          ]
        : [])
    ]
  }
  const prepared = prepareNetworkAtlas(spec, source)
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
  const projection = prepareDependencyForest(prepared.atlas, {
    rankingPolicyId: reverseBackbone
      ? "rooted-traversal:id-desc"
      : "rooted-traversal:id-asc"
  })
  const exposed = fixture.inputs.dependsOnX.reduce(
    (total, id) =>
      total +
      fixture.inputs.suppliers[id as keyof typeof fixture.inputs.suppliers],
    0
  )
  const remaining = fixture.inputs.cExpandableTo
  return {
    projection,
    fixture,
    measures: {
      exposureBps: (10000 * exposed) / fixture.inputs.demandPerWeek,
      remaining,
      shortfallBps:
        (10000 * (fixture.inputs.demandPerWeek - remaining)) /
        fixture.inputs.demandPerWeek,
      additional:
        (fixture.inputs.demandPerWeek *
          fixture.inputs.outputRetentionTargetBps) /
          10000 -
        remaining
    }
  }
}
