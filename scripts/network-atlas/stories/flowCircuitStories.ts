import etlFixture from "../fixtures/etl-hot-partition-v1.json"
import retryFixture from "../fixtures/retry-incident-v1.json"
import { prepareNetworkAtlas } from "semiotic/atlas/core"
import { prepareFlowCircuit } from "semiotic/atlas/core"
import { admitCircuitEdition } from "semiotic/atlas/core"
import { buildEtlEdition, buildRetryEdition } from "./flowCircuitStoryEditions"
import type {
  AtlasNode,
  AtlasEdge,
  AtlasOccurrence,
  NetworkAtlasSpec
} from "semiotic/atlas/core"
import type { CircuitNodeSemantics } from "semiotic/atlas/core"

export const circuitStoryDictionary = {
  rate: "Transferred volume during the declared interval, per second; every pipe names its unit.",
  queue:
    "Work remaining at the observation time. Null means unmeasured, not zero.",
  capacity: "Installed service capacity, separate from measured completions.",
  roots:
    "Requests crossing the external boundary; retries never create new roots.",
  attempts: "Inventory visits including first attempts and retry attempts.",
  timing:
    "Synthetic aggregate observations every 10 seconds; individual event times are unavailable.",
  model:
    "A separate conditional calculation; observed tape entries are preserved."
}

export function flowCircuitStory(
  story: "etl" | "retry",
  options: {
    reverseBackbone?: boolean
    hotPartitions?: number
    retryBudget?: number
  } = {}
) {
  const partitions = Array.from({ length: 8 }, (_, index) => `p${index + 1}`)
  const nodes: AtlasNode[] =
    story === "etl"
      ? [
          { id: "source", sectionId: "Intake" },
          { id: "router", sectionId: "Distribute" },
          ...partitions.map((id) => ({ id, sectionId: "Partitions" })),
          { id: "output", sectionId: "Output" }
        ]
      : [
          { id: "boundary", sectionId: "Boundary" },
          { id: "inventory", sectionId: "Inventory" },
          { id: "retry", sectionId: "Retry policy" },
          { id: "outcome", sectionId: "Outcomes" }
        ]
  const edges: AtlasEdge[] =
    story === "etl"
      ? [
          { id: "intake", source: "source", target: "router" },
          ...partitions.flatMap((id) => [
            { id: `in:${id}`, source: "router", target: id },
            { id: `out:${id}`, source: id, target: "output" }
          ])
        ]
      : [
          { id: "external", source: "boundary", target: "inventory" },
          { id: "retry-offer", source: "inventory", target: "retry" },
          { id: "retry-return", source: "retry", target: "inventory" },
          { id: "outcomes", source: "inventory", target: "outcome" }
        ]
  const semantics: CircuitNodeSemantics[] = nodes.map((node) => ({
    nodeId: node.id,
    label:
      node.id.startsWith("p") && story === "etl"
        ? `Partition ${node.id.slice(1)}`
        : node.id[0].toUpperCase() + node.id.slice(1),
    unit:
      story === "etl"
        ? "records"
        : ["boundary", "outcome"].includes(node.id)
          ? "roots"
          : "attempts",
    ...(node.id === "router" && {
      routing: "Measured key-partition assignment"
    }),
    ...(partitions.includes(node.id) && { queueDiscipline: "fifo" as const }),
    ...(node.id === "inventory" && {
      retryPolicy:
        "Admitted repeated inventory visits; individual service times unavailable"
    })
  }))
  // This explicitly authored synthetic cohort supplies motif/route support.
  // It does not claim that a rate-only production observation reveals routes.
  const occurrences: AtlasOccurrence[] =
    story === "retry"
      ? [
          {
            id: "synthetic-retry-cohort",
            entityId: "synthetic-roots",
            entityCount: retryFixture.inputs.rootsPerSecond,
            nodePath: [
              "boundary",
              "inventory",
              "retry",
              "inventory",
              "retry",
              "inventory"
            ],
            complete: false
          }
        ]
      : []
  const fixture = story === "etl" ? etlFixture : retryFixture
  const spec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    coordinate: {
      kind: "ordinal",
      sectionIds: [...new Set(nodes.map((node) => node.sectionId!))]
    },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "synthetic-circuit-intervals-v1",
    measures: {},
    motifs: {
      catalogId: "atlas-core",
      catalogVersion: "1",
      countUnit: "entity",
      anchor: "completion"
    },
    forest: {
      display: {
        kind: "rooted-backbone",
        roots: [nodes[0].id],
        rankingPolicyId: "rooted-traversal:id-asc"
      },
      requiredPaths: {
        roots: [nodes[0].id],
        relationScopeId: "directed-admitted"
      }
    },
    dataRevision: `${fixture.id}:circuit-v1`,
    temporal: { kind: "window", start: 0, end: 60 }
  }
  const prepared = prepareNetworkAtlas(spec, {
    graphRef: fixture.id,
    revision: spec.dataRevision,
    nodes,
    edges,
    occurrences,
    measureValues: []
  })
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
  const circuit = prepareFlowCircuit(prepared.atlas, semantics, {
    rankingPolicyId: options.reverseBackbone
      ? "rooted-traversal:id-desc"
      : "rooted-traversal:id-asc"
  })
  const observed =
    story === "etl"
      ? buildEtlEdition(circuit, etlFixture.inputs)
      : buildRetryEdition(circuit, retryFixture.inputs)
  const modeled =
    story === "etl"
      ? buildEtlEdition(circuit, etlFixture.inputs, options.hotPartitions ?? 4)
      : buildRetryEdition(
          circuit,
          retryFixture.inputs,
          options.retryBudget ?? 1
        )
  return {
    circuit,
    observed: admitCircuitEdition(circuit, observed),
    modeled: admitCircuitEdition(circuit, modeled),
    dictionary: circuitStoryDictionary,
    fixture
  }
}
