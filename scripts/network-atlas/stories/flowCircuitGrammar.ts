import { prepareNetworkAtlas } from "semiotic/atlas/core"
import { prepareFlowCircuit } from "semiotic/atlas/core"
import { admitCircuitEdition } from "semiotic/atlas/core"
import type { NetworkAtlasSpec } from "semiotic/atlas/core"
import type { CircuitEdition, CircuitNodeSemantics } from "semiotic/atlas/core"

/** Adversarial module vocabulary: declarations are explicit; readings are unknown. */
export function flowCircuitGrammar(declareJoins = true) {
  const nodes = [
    { id: "source", sectionId: "Input" },
    { id: "a", sectionId: "Work" },
    { id: "b", sectionId: "Work" },
    { id: "join", sectionId: "Decisions" },
    { id: "select", sectionId: "Decisions" },
    { id: "gate", sectionId: "Output" },
    { id: "unknown", sectionId: "Output", completeness: "unknown" as const }
  ]
  const edges = [
    { id: "sa", source: "source", target: "a" },
    { id: "sa-parallel", source: "source", target: "a" },
    { id: "sb", source: "source", target: "b" },
    { id: "aj", source: "a", target: "join" },
    { id: "bj", source: "b", target: "join" },
    { id: "as", source: "a", target: "select" },
    { id: "bs", source: "b", target: "select" },
    { id: "jg", source: "join", target: "gate" },
    { id: "sg", source: "select", target: "gate" },
    { id: "su", source: "select", target: "unknown" },
    { id: "gg", source: "gate", target: "gate" },
    { id: "return", source: "gate", target: "source" }
  ]
  const spec: NetworkAtlasSpec = {
    schemaVersion: "0.2",
    coordinate: {
      kind: "ordinal",
      sectionIds: ["Input", "Work", "Decisions", "Output"]
    },
    relations: {
      directed: true,
      edgeIdRequired: true,
      parallelEdges: "keep-by-id",
      selfLoops: "keep-by-id"
    },
    evidencePolicyId: "circuit-grammar-v1",
    measures: {},
    motifs: {
      catalogId: "atlas-core",
      catalogVersion: "1",
      countUnit: "embedding",
      anchor: "completion"
    },
    forest: {
      display: {
        kind: "rooted-backbone",
        roots: ["source"],
        rankingPolicyId: "rooted-traversal:id-asc"
      },
      requiredPaths: { roots: ["source"], relationScopeId: "directed-admitted" }
    },
    dataRevision: "circuit-grammar-v1",
    temporal: { kind: "window", start: 0, end: 1 }
  }
  const prepared = prepareNetworkAtlas(spec, {
    graphRef: "circuit-grammar",
    revision: spec.dataRevision,
    nodes,
    edges,
    measureValues: []
  })
  if (!prepared.ok) throw new Error(JSON.stringify(prepared.issues))
  const semantics: CircuitNodeSemantics[] = nodes.map(({ id }) => ({
    nodeId: id,
    label: {
      source: "Input",
      a: "Work A",
      b: "Work B",
      join: "Join",
      select: "Select",
      gate: "Dependency",
      unknown: "Unknown"
    }[id]!,
    unit: "records",
    ...(id === "source" ? { routing: "Declared split between A and B" } : {}),
    ...(id === "a" ? { queueDiscipline: "fifo" as const } : {}),
    ...(declareJoins && ["join", "select"].includes(id)
      ? {
          join: {
            kind: id === "join" ? ("all" as const) : ("first-success" as const),
            memberNodeIds: ["a", "b"]
          }
        }
      : {}),
    ...(id === "gate" ? { dependencyNodeIds: ["a"] } : {})
  }))
  const circuit = prepareFlowCircuit(prepared.atlas, semantics)
  const edition: CircuitEdition = {
    id: `circuit-grammar:${declareJoins ? "declared" : "unclassified"}`,
    synthetic: true,
    sourceRevision: circuit.atlas.provenance.sourceRevision,
    analysisRevision: circuit.atlas.analysisRevision,
    kind: "observed",
    label: "Module grammar · readings unmeasured",
    unit: "records",
    timing: "incomplete",
    individualTimings: "unavailable",
    assumptions: [
      "This synthetic graph demonstrates declared apparatus, not measured process behavior.",
      "Join members are A and B; completed members, winning alternatives, cancellations and blocked work are unmeasured.",
      "The dependency on A is a separate declared rule; the return edge does not establish a retry episode.",
      "Parallel edges, a self-loop, a backward return and unknown upstream coverage retain their original identities."
    ],
    evidenceRefs: ["flowCircuitGrammar.ts:circuit-grammar-v1"],
    entries: [
      {
        id: "unmeasured",
        at: 0,
        nodes: Object.fromEntries(
          nodes.map(({ id }) => [
            id,
            {
              arrivals: null,
              completions: null,
              capacity: null,
              queued: null,
              status: "incomplete" as const
            }
          ])
        ),
        flows: edges.map((edge) => ({
          edgeId: edge.id,
          perSecond: null,
          unit: "records"
        })),
        totals: {
          arrivals: null,
          completions: null,
          capacity: null,
          queued: null,
          roots: null,
          attempts: null,
          retries: null,
          successes: null,
          errors: null
        }
      }
    ]
  }
  return { circuit, edition: admitCircuitEdition(circuit, edition) }
}
