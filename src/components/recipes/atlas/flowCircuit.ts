import { prepareDependencyForest } from "./dependencyForest"
import type { PreparedNetworkAtlas, MotifMatch } from "./types"
import type {
  CircuitNodeSemantics,
  CircuitModuleKind,
  FlowCircuitProjection
} from "./flowCircuitTypes"

const priority = ["repeated-state-episode", "fan-out", "fan-in", "serial-chain"]

function ownsRole(match: MotifMatch, nodeId: string) {
  const role =
    match.template === "repeated-state-episode"
      ? match.roles.state
      : match.template === "fan-out"
        ? match.roles.source
        : match.template === "fan-in"
          ? match.roles.destination
          : match.roles.start
  return role === nodeId
}

function moduleKind(
  semantics: CircuitNodeSemantics,
  matches: MotifMatch[],
  incoming: number,
  outgoing: number
): CircuitModuleKind {
  if (semantics.dependencyNodeIds?.length) return "dependency"
  if (semantics.join)
    return semantics.join.kind === "all" ? "join-all" : "selector"
  if (
    semantics.retryPolicy &&
    matches.some((match) => match.template === "repeated-state-episode")
  )
    return "retry"
  if (semantics.queueDiscipline) return "queue"
  if (semantics.routing && outgoing > 1) return "distributor"
  if (incoming > 1 || outgoing > 1) return "junction"
  return "stage"
}

/**
 * Role-centered motif capsules own each canonical work node exactly once.
 * All matches and every original port remain available, including overlaps.
 * Admitted semantics select apparatus; topology alone cannot invent a queue,
 * retry policy, prerequisite rule, or shared resource.
 */
export function prepareFlowCircuit(
  atlas: PreparedNetworkAtlas,
  semantics: readonly CircuitNodeSemantics[],
  options: {
    overlapPolicy?: "role-priority:id-asc"
    rankingPolicyId?: "rooted-traversal:id-asc" | "rooted-traversal:id-desc"
  } = {}
): FlowCircuitProjection {
  if (options.overlapPolicy && options.overlapPolicy !== "role-priority:id-asc")
    throw new Error("Unsupported circuit overlap policy")
  const nodeIds = new Set(atlas.source.nodes.map((node) => node.id))
  const byNode = new Map(semantics.map((row) => [row.nodeId, row]))
  if (
    byNode.size !== semantics.length ||
    semantics.some((row) => !nodeIds.has(row.nodeId))
  )
    throw new Error("Circuit semantics need unique canonical node IDs")
  for (const row of semantics) {
    if (
      !row.label.trim() ||
      !["records", "roots", "attempts"].includes(row.unit)
    )
      throw new Error("Circuit modules need a label and an explicit unit")
    const dependencies = [
      ...(row.join?.memberNodeIds ?? []),
      ...(row.dependencyNodeIds ?? [])
    ]
    if (dependencies.some((id) => !nodeIds.has(id) || id === row.nodeId))
      throw new Error("Circuit roles must reference other canonical nodes")
    if (
      row.join &&
      (row.join.memberNodeIds.length < 2 ||
        new Set(row.join.memberNodeIds).size !==
          row.join.memberNodeIds.length ||
        row.join.memberNodeIds.some(
          (id) =>
            !atlas.source.edges.some(
              (edge) => edge.source === id && edge.target === row.nodeId
            )
        ))
    )
      throw new Error("A join needs at least two distinct original input edges")
  }
  const forest = prepareDependencyForest(atlas, options)
  const modules = forest.order.map((nodeId) => {
    const declared = byNode.get(nodeId)
    if (!declared) throw new Error(`Missing circuit unit/label for ${nodeId}`)
    const related = atlas.motifs.matches.filter((match) =>
      match.nodePath.includes(nodeId)
    )
    const candidates = related
      .filter((match) => ownsRole(match, nodeId) && !match.truncation)
      .sort(
        (left, right) =>
          priority.indexOf(left.template) - priority.indexOf(right.template) ||
          left.id.localeCompare(right.id)
      )
    const ports = atlas.source.edges.flatMap((edge) => [
      ...(edge.source === nodeId
        ? [
            {
              edgeId: edge.id,
              direction: "out" as const,
              endpointId: edge.target
            }
          ]
        : []),
      ...(edge.target === nodeId
        ? [
            {
              edgeId: edge.id,
              direction: "in" as const,
              endpointId: edge.source
            }
          ]
        : [])
    ])
    return {
      id: `module:${nodeId}`,
      nodeId,
      kind: moduleKind(
        declared,
        candidates,
        new Set(
          ports
            .filter((port) => port.direction === "in")
            .map((port) => port.endpointId)
        ).size,
        new Set(
          ports
            .filter((port) => port.direction === "out")
            .map((port) => port.endpointId)
        ).size
      ),
      semantics: declared,
      selectedMatchId: candidates[0]?.id,
      relatedMatchIds: related.map((match) => match.id),
      roles: candidates[0]?.roles ?? { node: nodeId },
      ports
    }
  })
  return {
    atlas,
    overlapPolicy: "role-priority:id-asc",
    modules,
    matches: atlas.motifs.matches,
    order: forest.order,
    backboneEdgeIds: forest.forest.backboneEdgeIds,
    residualEdgeIds: forest.residual.residualEdgeIds
  }
}

export function explainCircuitModule(
  circuit: FlowCircuitProjection,
  nodeId: string
) {
  const module = circuit.modules.find((item) => item.nodeId === nodeId)
  if (!module) throw new Error("Unknown circuit module")
  return {
    ...module,
    analysisRevision: circuit.atlas.analysisRevision,
    sourceRevision: circuit.atlas.provenance.sourceRevision,
    relationScopeId: "directed-admitted",
    matches: circuit.matches.filter((match) =>
      module.relatedMatchIds.includes(match.id)
    ),
    originalEdges: circuit.atlas.source.edges.filter((edge) =>
      module.ports.some((port) => port.edgeId === edge.id)
    ),
    limitations: [
      "Module geometry does not establish capacity or operational harm."
    ]
  }
}
